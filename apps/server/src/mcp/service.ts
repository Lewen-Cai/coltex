import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import diff from 'fast-diff'
import { z } from 'zod'
import { TEXT_KEY, applyTrackedEdits, lineAt, relPos, type TextEdit } from '@coltex/review'
import { OUTPUT, type McpMode, type McpSettings, type ProjectMeta, type ProjectRole } from '@coltex/shared'
import { compileSummary, lookup, numberedLines, readLog, searchFiles } from '../ai/tools.ts'
import { findEditTarget, type MatchKind } from '../ai/match.ts'
import { applyTextDiff } from '../collab/text-diff.ts'
import { projectMembers, projects as projectsTable } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError, HttpError, NotFoundError } from '../errors.ts'
import { buildProject } from '../routes/compile.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'

/** Protocol versions this server speaks, newest first. */
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const MAX_WRITE_BYTES = 5 * 1024 * 1024
/** Edits closer together than this share the version recorded before them. */
const CHECKPOINT_GAP_MS = 10 * 60_000
/** Tool calls per person per minute, across their agents. */
const CALLS_PER_MINUTE = 240

export type McpDeps = Pick<
  Deps,
  'db' | 'projects' | 'store' | 'collab' | 'history' | 'review' | 'queue' | 'builds' | 'linkedFiles' | 'references'
> & { outputsDir: string; version: string }

/** The modes a role allows: reviewers only suggest, viewers only read and comment. */
export function allowedModes(role: ProjectRole): McpMode[] {
  if (role === 'owner' || role === 'editor') return ['manual', 'auto', 'full']
  if (role === 'reviewer') return ['manual']
  return []
}

type Caller = { projectId: string; userId: string; project: ProjectMeta; role: ProjectRole; mode: McpMode | null }

type Tool = {
  name: string
  title: string
  description: string
  input: z.ZodObject
  /** Who gets it: everyone, or only with a mode that allows changes, or only in full access. */
  needs?: 'write' | 'full'
  readOnly?: boolean
  destructive?: boolean
  run: (caller: Caller, args: any) => Promise<string>
}

type JsonRpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> }
export type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

const rpcError = (id: JsonRpcResponse['id'], code: number, message: string): JsonRpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } })

/** Words, runs of spaces and single other characters: what suggestions are made of. */
const TOKEN = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu

/**
 * Edits (old positions, ascending, as CodeMirror reports them) that turn
 * `from` into `to`, word by word: a reviewer sees "first" → "second", not the
 * whole sentence replaced. Each distinct token is diffed as one UTF-16 code
 * unit (never a surrogate, which the diff could split); with more distinct
 * tokens than that, the whole text is one replacement.
 */
export function textEdits(from: string, to: string, offset = 0): TextEdit[] {
  if (from === to) return []
  const codes = new Map<string, string>()
  const encode = (text: string) => {
    const tokens = text.match(TOKEN) ?? []
    let out = ''
    for (const tok of tokens) {
      let c = codes.get(tok)
      if (c === undefined) {
        let unit = 0x100 + codes.size
        if (unit >= 0xd800) unit += 0x800
        if (unit > 0xffff) return undefined
        c = String.fromCharCode(unit)
        codes.set(tok, c)
      }
      out += c
    }
    return { out, tokens }
  }
  const a = encode(from)
  const b = a && encode(to)
  if (!a || !b) return [{ fromA: offset, toA: offset + from.length, insert: to }]
  const edits: TextEdit[] = []
  let at = offset
  let ai = 0
  let bi = 0
  for (const [op, chunk] of diff(a.out, b.out)) {
    const n = chunk.length
    if (op === diff.EQUAL) {
      for (let k = 0; k < n; k++) at += a.tokens[ai++]!.length
      bi += n
      continue
    }
    const last = edits.at(-1)
    // A deletion next to an insertion at the same place is one replacement.
    const open = last && last.toA === at
    if (op === diff.DELETE) {
      let len = 0
      for (let k = 0; k < n; k++) len += a.tokens[ai++]!.length
      if (open) last.toA += len
      else edits.push({ fromA: at, toA: at + len, insert: '' })
      at += len
    } else {
      let text = ''
      for (let k = 0; k < n; k++) text += b.tokens[bi++]!
      if (open) last.insert += text
      else edits.push({ fromA: at, toA: at, insert: text })
    }
  }
  return edits
}

/**
 * ColTex as an MCP server, one per project (`/api/projects/<id>/mcp`), for
 * AI agents such as Claude Code or Codex signed in with the person's Git
 * token. Streamable HTTP without sessions: every POST is answered with JSON.
 * Agents read and compile freely; what they may change follows the person's
 * role and the mode they chose for the project (McpMode). Writes go through
 * the live documents like everyone's, attributed to the person.
 */
export class McpService {
  private readonly deps: McpDeps
  private readonly tools: Tool[]
  /** The last build an agent of this person started in this project, for read_log. */
  private readonly builds = new Map<string, string>()
  private readonly lastWrite = new Map<string, number>()
  private readonly calls = new Map<string, { start: number; count: number }>()

  constructor(deps: McpDeps) {
    this.deps = deps
    this.tools = this.defineTools()
  }

  // --- settings --------------------------------------------------------------

  async settings(projectId: string, userId: string): Promise<McpSettings> {
    const { role } = await this.deps.projects.requireAccess(projectId, userId, 'viewer')
    return { mode: await this.modeFor(projectId, userId, role), modes: allowedModes(role) }
  }

  async setMode(projectId: string, userId: string, mode: McpMode): Promise<McpSettings> {
    const { role } = await this.deps.projects.requireAccess(projectId, userId, 'viewer')
    if (!allowedModes(role).includes(mode)) throw new BadRequestError(`Your role in this project does not allow the ${mode} mode`)
    await this.deps.db
      .update(projectMembers)
      .set({ mcpMode: mode })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    return { mode, modes: allowedModes(role) }
  }

  /** The chosen mode, capped by the role (a demoted editor's "full" becomes what the new role allows). */
  private async modeFor(projectId: string, userId: string, role: ProjectRole): Promise<McpMode | null> {
    const allowed = allowedModes(role)
    const [row] = await this.deps.db
      .select({ mode: projectMembers.mcpMode })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    return row && allowed.includes(row.mode) ? row.mode : (allowed[0] ?? null)
  }

  // --- protocol --------------------------------------------------------------

  /** One JSON-RPC message from an agent; undefined for notifications and responses. */
  async handle(projectId: string, userId: string, message: unknown): Promise<JsonRpcResponse | undefined> {
    const req = message as Partial<JsonRpcRequest> | null
    if (!req || typeof req !== 'object' || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
      // Responses to requests we never send, or garbage.
      if (req && typeof req === 'object' && 'id' in req && !('method' in req)) return undefined
      return rpcError(null, -32600, 'Invalid request')
    }
    const id = req.id
    if (id === undefined) return undefined // a notification (initialized, cancelled, …)
    try {
      const result = await this.dispatch(projectId, userId, req.method, req.params ?? {})
      return { jsonrpc: '2.0', id, result }
    } catch (err) {
      if (err instanceof RpcError) return rpcError(id, err.code, err.message)
      throw err
    }
  }

  private async caller(projectId: string, userId: string): Promise<Caller> {
    const { project, role } = await this.deps.projects.requireAccess(projectId, userId, 'viewer')
    return { projectId, userId, project, role, mode: await this.modeFor(projectId, userId, role) }
  }

  private available(caller: Caller): Tool[] {
    return this.tools.filter(t => {
      if (t.needs === 'full') return caller.mode === 'full'
      if (t.needs === 'write') return caller.mode !== null
      return true
    })
  }

  private async dispatch(projectId: string, userId: string, method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize': {
        const caller = await this.caller(projectId, userId)
        const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
        return {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'coltex', title: 'ColTex', version: this.deps.version },
          instructions: this.instructions(caller),
        }
      }
      case 'ping':
        return {}
      case 'tools/list': {
        const caller = await this.caller(projectId, userId)
        return {
          tools: this.available(caller).map(t => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: z.toJSONSchema(t.input, { io: 'input' }),
            annotations: { title: t.title, readOnlyHint: !!t.readOnly, destructiveHint: !!t.destructive, openWorldHint: false },
          })),
        }
      }
      case 'tools/call': {
        this.countCall(userId)
        const caller = await this.caller(projectId, userId)
        const name = typeof params.name === 'string' ? params.name : ''
        const tool = this.tools.find(t => t.name === name)
        if (!tool) throw new RpcError(-32602, `Unknown tool: ${name}`)
        if (!this.available(caller).includes(tool)) {
          return toolError(
            caller.mode === null
              ? 'Your role in this project only lets an agent read and comment.'
              : `${name} needs full access. The project's owner or an editor can choose it in ColTex: Project settings → MCP.`,
          )
        }
        const args = tool.input.safeParse(params.arguments ?? {})
        if (!args.success) return toolError(`Invalid arguments: ${args.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')}`)
        try {
          return { content: [{ type: 'text', text: await tool.run(caller, args.data) }] }
        } catch (err) {
          if (err instanceof HttpError) return toolError(err.message)
          throw err
        }
      }
      case 'resources/list':
        return { resources: [] }
      case 'prompts/list':
        return { prompts: [] }
      default:
        throw new RpcError(-32601, `Method not found: ${method}`)
    }
  }

  private countCall(userId: string): void {
    const now = Date.now()
    const c = this.calls.get(userId)
    if (!c || now - c.start > 60_000) {
      this.calls.set(userId, { start: now, count: 1 })
      return
    }
    if (++c.count > CALLS_PER_MINUTE) throw new RpcError(-32000, 'Too many tool calls; wait a minute')
  }

  private instructions(caller: Caller): string {
    const writes =
      caller.mode === null
        ? 'You can read, compile and comment, but not change files (the person is a viewer).'
        : caller.mode === 'manual'
          ? 'Your edits become tracked changes (suggestions) in the person’s name, which collaborators accept or reject in ColTex.'
          : `Your edits are applied directly, as the person’s own${caller.mode === 'full' ? '; you may also delete and move files' : ''}. ColTex keeps a version from before them in the project history.`
    return [
      `This is the ColTex LaTeX project “${caller.project.name}” (main document: ${caller.project.rootFile}). Collaborators may be editing it live.`,
      writes,
      'Read a file before editing it: edit_file replaces old_text, which must occur exactly once. Compile to check your changes; read_log shows the LaTeX log.',
    ].join(' ')
  }

  // --- helpers ---------------------------------------------------------------

  private async textFiles(projectId: string): Promise<string[]> {
    const { files } = await this.deps.store.listTree(projectId)
    return files.filter(f => !f.binary && isTextPath(f.path)).map(f => f.path)
  }

  /** What collaborators see now, including edits not yet saved to disk. */
  private async readText(projectId: string, p: string): Promise<string> {
    if (!isTextPath(p)) throw new BadRequestError(`${p} is not a text file`)
    return (await this.deps.store.readFile(projectId, p)).toString('utf8')
  }

  /** Whether this person's edits are recorded as suggestions: always in manual mode, else when the project tracks them. */
  private async tracked(caller: Caller): Promise<boolean> {
    if (caller.mode === 'manual') return true
    const [row] = await this.deps.db.select({ trackChanges: projectsTable.trackChanges }).from(projectsTable).where(eq(projectsTable.id, caller.projectId))
    return !!row && (row.trackChanges.everyone || row.trackChanges.users.includes(caller.userId))
  }

  /** Before an agent's first change in a while, keep the state before it as a version of its own. */
  private async beforeWrite(caller: Caller): Promise<void> {
    const last = this.lastWrite.get(caller.projectId) ?? 0
    if (Date.now() - last > CHECKPOINT_GAP_MS) await this.deps.history.checkpoint(caller.projectId)
    this.lastWrite.set(caller.projectId, Date.now())
  }

  private async afterWrite(caller: Caller, tracked: boolean): Promise<void> {
    await this.deps.projects.touch(caller.projectId)
    this.deps.history.noteChange(caller.projectId, caller.userId, 'mcp')
    if (tracked) await this.deps.collab.reviewChanged(caller.projectId)
  }

  /** Change an existing text file's live document, as suggestions or directly. */
  private async changeDoc<T>(caller: Caller, p: string, change: (text: string) => { edits: TextEdit[]; target?: string; result: T }): Promise<T> {
    await this.readText(caller.projectId, p) // NotFound for a missing file
    const tracked = await this.tracked(caller)
    await this.beforeWrite(caller)
    const docId = await this.deps.collab.resolveDoc(caller.projectId, p)
    const result = await this.deps.collab.editDoc(caller.projectId, docId, caller.userId, doc => {
      const ytext = doc.getText(TEXT_KEY)
      const { edits, target, result } = change(ytext.toString())
      if (!edits.length) return result
      if (tracked) applyTrackedEdits(doc, edits, caller.userId, Date.now())
      else if (target !== undefined) applyTextDiff(ytext, target)
      else {
        // From the end, so earlier positions stay valid.
        for (const e of [...edits].reverse()) {
          if (e.toA > e.fromA) ytext.delete(e.fromA, e.toA - e.fromA)
          if (e.insert) ytext.insert(e.fromA, e.insert)
        }
      }
      return result
    })
    await this.afterWrite(caller, tracked)
    return result
  }

  private async findComment(caller: Caller, id: string) {
    const state = await this.deps.review.state(caller.projectId)
    const thread = state.threads.find(t => t.id === id)
    if (!thread) throw new NotFoundError(`There is no comment ${id}`)
    return thread
  }

  // --- tools -----------------------------------------------------------------

  private defineTools(): Tool[] {
    const d = this.deps
    const pathArg = z.string().min(1).describe('Project-relative path, e.g. "sections/intro.tex"')
    return [
      {
        name: 'list_files',
        title: 'List files',
        description: 'List every file and folder in the project, with sizes. The main document is marked.',
        input: z.object({}),
        readOnly: true,
        run: async caller => {
          const { files, folders } = await d.store.listTree(caller.projectId)
          const lines = files.map(f => `${f.path} (${f.size} bytes${f.binary ? ', binary' : ''}${f.path === caller.project.rootFile ? ', main document' : ''})`)
          for (const folder of folders) lines.push(`${folder}/`)
          return lines.sort().join('\n') || '(no files)'
        },
      },
      {
        name: 'read_file',
        title: 'Read file',
        description:
          'Read a text file as collaborators see it now, with line numbers ("12| text"; the numbers are not part of the file). Pending suggested insertions are included, suggested deletions are not. Large files: pass start_line/end_line (1-based, inclusive).',
        input: z.object({
          path: pathArg,
          start_line: z.number().int().min(1).optional(),
          end_line: z.number().int().min(1).optional(),
        }),
        readOnly: true,
        run: async (caller, { path: raw, start_line, end_line }) => {
          const p = cleanPath(raw)
          await d.collab.flushProject(caller.projectId)
          return numberedLines(p, await this.readText(caller.projectId, p), { start_line, end_line })
        },
      },
      {
        name: 'search',
        title: 'Search',
        description: 'Search all text files for a string or a JavaScript regular expression. Returns path:line: text.',
        input: z.object({
          query: z.string().min(1),
          regex: z.boolean().optional().describe('Treat query as a regular expression'),
          path: z.string().optional().describe('Only this file or folder'),
        }),
        readOnly: true,
        run: async (caller, args) => {
          await d.collab.flushProject(caller.projectId)
          return searchFiles(await this.textFiles(caller.projectId), p => this.readText(caller.projectId, p).catch(() => undefined), args)
        },
      },
      {
        name: 'compile',
        title: 'Compile',
        description: 'Compile the project as it is now (the same build as Recompile in ColTex) and return the status, errors and warnings.',
        input: z.object({}),
        readOnly: true,
        run: async caller => {
          const result = await buildProject(d, caller.projectId, caller.userId)
          this.builds.set(`${caller.projectId}:${caller.userId}`, result.buildId)
          return compileSummary(result)
        },
      },
      {
        name: 'read_log',
        title: 'Read compile log',
        description: 'Read the raw LaTeX log of your last compile. With query, the lines around each match; otherwise the last lines.',
        input: z.object({ query: z.string().optional().describe('Case-insensitive text to look for') }),
        readOnly: true,
        run: async (caller, { query }) => {
          const build = this.builds.get(`${caller.projectId}:${caller.userId}`)
          if (!build) return 'No compile log yet. Run compile first.'
          return readLog(path.join(d.outputsDir, caller.projectId, build, OUTPUT.log), query)
        },
      },
      {
        name: 'texlive_source',
        title: 'TeX Live source',
        description:
          'Read or search an installed TeX Live file (package .sty, class .cls, .bst, .def) to see what it really defines: options, commands, defaults.',
        input: z.object({
          name: z.string().min(1).describe('Package or file name, e.g. "booktabs", "IEEEtran.cls"'),
          query: z.string().optional().describe('Case-insensitive text to find'),
          fromLine: z.number().int().min(1).optional().describe('Without query: the first line to show'),
        }),
        readOnly: true,
        run: async (_caller, { name, query, fromLine }) => lookup(d.queue, { kind: 'source', name, query, fromLine }),
      },
      {
        name: 'list_comments',
        title: 'List comments',
        description: 'List the comment threads on the project, with their ids, where they are, the commented text and the messages.',
        input: z.object({ include_resolved: z.boolean().optional() }),
        readOnly: true,
        run: async (caller, { include_resolved }) => {
          const { threads } = await d.review.state(caller.projectId)
          const shown = threads.filter(t => include_resolved || !t.resolved)
          if (!shown.length) return 'No comments.'
          return shown
            .map(t => {
              const where = `${t.path || '(deleted file)'}${t.line ? `:${t.line}` : ''}`
              const head = `[${t.id}] ${where}${t.resolved ? ' (resolved)' : ''}${t.quote ? ` on “${t.quote.slice(0, 200)}”` : ''}`
              return [head, ...t.messages.map(m => `  ${m.name}: ${m.content}`)].join('\n')
            })
            .join('\n\n')
        },
      },
      {
        name: 'list_suggestions',
        title: 'List suggestions',
        description: 'List the tracked changes (suggested insertions and deletions) waiting to be accepted or rejected.',
        input: z.object({}),
        readOnly: true,
        run: async caller => {
          const { changes } = await d.review.state(caller.projectId)
          if (!changes.length) return 'No suggestions.'
          return changes.map(c => `${c.path}:${c.line} ${c.type === 'insert' ? 'insert' : 'delete'} by ${c.name}: “${c.text.slice(0, 200)}”`).join('\n')
        },
      },
      {
        name: 'add_comment',
        title: 'Add comment',
        description: 'Comment on a passage of a file. quote is the exact text to attach the comment to and must occur once in the file.',
        input: z.object({ path: pathArg, quote: z.string().min(1), comment: z.string().min(1).max(10_000) }),
        run: async (caller, { path: raw, quote, comment }) => {
          const p = cleanPath(raw)
          await this.readText(caller.projectId, p)
          const docId = await d.collab.resolveDoc(caller.projectId, p)
          const anchor = await d.collab.readDoc(caller.projectId, docId, doc => {
            const ytext = doc.getText(TEXT_KEY)
            const text = ytext.toString()
            const m = findEditTarget(text, quote)
            if ('error' in m) return m
            return { start: relPos(ytext, m.match.start, 0), end: relPos(ytext, m.match.end, -1), line: lineAt(text, m.match.start) }
          })
          if (!anchor) throw new NotFoundError(`${p} does not exist`)
          if ('error' in anchor) throw new BadRequestError(matchProblem(anchor.error, 'quote', p, 'count' in anchor ? anchor.count : undefined))
          const id = await d.review.createThread(caller.projectId, { userId: caller.userId, role: caller.role }, { docId, start: anchor.start, end: anchor.end, content: comment })
          return `Added comment ${id} at ${p}:${anchor.line}.`
        },
      },
      {
        name: 'reply_to_comment',
        title: 'Reply to comment',
        description: 'Reply in a comment thread (ids from list_comments).',
        input: z.object({ id: z.string().min(1), reply: z.string().min(1).max(10_000) }),
        run: async (caller, { id, reply }) => {
          await this.findComment(caller, id)
          await d.review.reply(caller.projectId, id, { userId: caller.userId, role: caller.role }, reply)
          return `Replied to comment ${id}.`
        },
      },
      {
        name: 'resolve_comment',
        title: 'Resolve comment',
        description: 'Mark a comment thread as resolved, or reopen it with resolved: false.',
        input: z.object({ id: z.string().min(1), resolved: z.boolean().default(true) }),
        run: async (caller, { id, resolved }) => {
          await this.findComment(caller, id)
          await d.review.setResolved(caller.projectId, id, { userId: caller.userId, role: caller.role }, resolved)
          return resolved ? `Resolved comment ${id}.` : `Reopened comment ${id}.`
        },
      },
      {
        name: 'list_versions',
        title: 'List versions',
        description: 'The project history: recent versions with their time, authors, what they did and the files they changed.',
        input: z.object({ limit: z.number().int().min(1).max(50).default(15) }),
        readOnly: true,
        run: async (caller, { limit }) => {
          const { versions } = await d.history.versions(caller.projectId, { limit })
          if (!versions.length) return 'No versions yet.'
          return versions
            .map(v => {
              const who = v.authors.map(a => a.name).join(', ')
              const files = v.changes.map(c => `${c.status} ${c.path}`).join(', ')
              const labels = v.labels.length ? ` [${v.labels.map(l => l.name).join(', ')}]` : ''
              return `${v.at} ${v.message}${who ? ` by ${who}` : ''}${labels}${files ? `: ${files}` : ''}`
            })
            .join('\n')
        },
      },
      {
        name: 'edit_file',
        title: 'Edit file',
        description:
          'Replace old_text with new_text in a text file. old_text must match the current text (read_file, without the line numbers) and occur exactly once; include surrounding lines if needed.',
        input: z.object({ path: pathArg, old_text: z.string().min(1), new_text: z.string() }),
        needs: 'write',
        run: async (caller, { path: raw, old_text, new_text }) => {
          const p = cleanPath(raw)
          const outcome = await this.changeDoc<{ problem: string } | { line: number; kind: MatchKind }>(caller, p, text => {
            const m = findEditTarget(text, old_text)
            if ('error' in m) return { edits: [], result: { problem: matchProblem(m.error, 'old_text', p, 'count' in m ? m.count : undefined) } }
            return {
              edits: textEdits(text.slice(m.match.start, m.match.end), new_text, m.match.start),
              result: { line: lineAt(text, m.match.start), kind: m.match.kind },
            }
          })
          if ('problem' in outcome) throw new BadRequestError(outcome.problem)
          const loose = outcome.kind === 'exact' ? '' : ' (old_text matched after normalising quotes or spacing; check the result with read_file)'
          return `Edited ${p} at line ${outcome.line}${(await this.tracked(caller)) ? ' as a suggestion' : ''}.${loose}`
        },
      },
      {
        name: 'write_file',
        title: 'Write file',
        description: 'Create a text file, or replace the whole content of one (prefer edit_file for changes to part of a file).',
        input: z.object({ path: pathArg, content: z.string() }),
        needs: 'write',
        run: async (caller, { path: raw, content }) => {
          const p = cleanPath(raw)
          if (!isTextPath(p)) throw new BadRequestError(`${p} is not a text file`)
          if (Buffer.byteLength(content) > MAX_WRITE_BYTES) throw new BadRequestError('The content is larger than 5 MB')
          const exists = await d.store.readFile(caller.projectId, p).then(
            () => true,
            err => {
              if (err instanceof NotFoundError) return false
              throw err
            },
          )
          if (exists) {
            await this.changeDoc(caller, p, text => ({ edits: textEdits(text, content), target: content, result: undefined }))
            return `Replaced the content of ${p}${(await this.tracked(caller)) ? ' as suggestions' : ''}.`
          }
          // New files can't be suggestions; reviewers may only suggest.
          if (caller.role === 'reviewer') throw new BadRequestError('Reviewers can only suggest changes to existing files')
          await this.beforeWrite(caller)
          await d.collab.mutate(caller.projectId, async () => {
            await d.store.writeFile(caller.projectId, p, content, { createOnly: true })
            await d.collab.afterWrite(caller.projectId, p, content)
          })
          await d.collab.treeChanged(caller.projectId)
          await this.afterWrite(caller, false)
          return `Created ${p}.`
        },
      },
      {
        name: 'delete_file',
        title: 'Delete file',
        description: 'Delete a file or a folder with everything in it. The project history keeps the version before.',
        input: z.object({ path: pathArg }),
        needs: 'full',
        destructive: true,
        run: async (caller, { path: raw }) => {
          const p = cleanPath(raw)
          const { folders } = await d.store.listTree(caller.projectId)
          const folder = folders.includes(p)
          await this.beforeWrite(caller)
          await d.collab.mutate(caller.projectId, async () => {
            if (folder) await d.store.deleteFolder(caller.projectId, p)
            else {
              await d.store.readFile(caller.projectId, p) // NotFound rather than rm -f
              await d.store.deleteFile(caller.projectId, p)
            }
            await d.linkedFiles.forget(caller.projectId, p)
            await d.collab.afterDelete(caller.projectId, p)
          })
          await this.afterWrite(caller, false)
          return `Deleted ${p}${folder ? '/' : ''}.`
        },
      },
      {
        name: 'move_file',
        title: 'Move or rename',
        description: 'Move or rename a file or folder. Never overwrites an existing file.',
        input: z.object({ from: pathArg, to: pathArg }),
        needs: 'full',
        destructive: true,
        run: async (caller, args) => {
          const from = cleanPath(args.from)
          const to = cleanPath(args.to)
          await this.beforeWrite(caller)
          await d.collab.mutate(caller.projectId, async () => {
            await d.store.move(caller.projectId, from, to)
            await d.projects.followMove(caller.projectId, from, to)
            await d.references.followMove(caller.projectId, from, to)
            await d.linkedFiles.followMove(caller.projectId, from, to)
            await d.collab.afterMove(caller.projectId, from, to)
          })
          await this.afterWrite(caller, false)
          return `Moved ${from} to ${to}.`
        },
      },
    ]
  }
}

class RpcError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

const toolError = (text: string) => ({ content: [{ type: 'text', text }], isError: true })

function matchProblem(error: 'not_found' | 'ambiguous' | undefined, what: string, p: string, count?: number): string {
  if (error === 'ambiguous') return `${what} occurs ${count ?? 'several'} times in ${p}; include more surrounding text so it occurs once`
  return `${what} was not found in ${p}; read the file again and copy the text exactly`
}

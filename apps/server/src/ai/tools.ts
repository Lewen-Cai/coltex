import fs from 'node:fs/promises'
import path from 'node:path'
import { Type, type Static, type TSchema } from '@earendil-works/pi-ai'
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import { AiSkillBody, OUTPUT, TexLookupJob, type CompileResult, type Diagnostic, type ProjectMeta } from '@coltex/shared'
import type { CompileQueue } from '../compile-queue.ts'
import { BadRequestError } from '../errors.ts'
import { engineFor } from '../projects/engine.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import { Changeset } from './changeset.ts'
import { draftedFiles, type LoadedSkill } from './skills.ts'

const MAX_READ_LINES = 1500
const MAX_SEARCH_RESULTS = 80
const MAX_LOG_LINES = 200

export type ToolContext = {
  project: ProjectMeta
  store: ProjectStore
  changeset: Changeset
  queue: Pick<CompileQueue, 'compile' | 'texLookup'>
  outputsDir: string
  /** Editors get the drafting tools; everyone else gets a read-only assistant. */
  canEdit: boolean
  /** The author's build the conversation is about, if any. */
  authorBuild: () => string | undefined
  /** Called after each trial compile. */
  onTrial: (result: CompileResult) => void
  /** The compiler has the package manuals (the full edition); otherwise texlive_doc isn't offered. */
  manuals?: boolean
} & SkillToolContext

export type SkillToolContext = {
  /** The skills this person can use here (read at each message). */
  skills: () => LoadedSkill[]
  /** A skill the agent drafted, shown to the person to save. */
  onProposeSkill: (skill: AiSkillBody & { files: Record<string, string> }) => void
  /** What the tool tells the agent after a draft is shown (where the person can save it). */
  proposedReply: string
}

const text = (t: string): AgentToolResult<undefined> => ({ content: [{ type: 'text', text: t }], details: undefined })

function tool<P extends TSchema>(def: {
  name: string
  label: string
  description: string
  parameters: P
  execute: (params: Static<P>, signal?: AbortSignal) => Promise<string>
}): AgentTool<P, undefined> {
  return {
    name: def.name,
    label: def.label,
    description: def.description,
    parameters: def.parameters,
    // Edits build on each other, and compiles read the draft: keep one call at a time.
    executionMode: 'sequential',
    execute: async (_id, params, signal) => text(await def.execute(params, signal)),
  }
}

export function errorCount(diagnostics: Diagnostic[]): number {
  return diagnostics.filter(d => d.level === 'error').length
}

export function formatDiagnostics(diagnostics: Diagnostic[], limit = 15): string {
  const lines: string[] = []
  const sorted = [...diagnostics].sort((a, b) => (a.level === 'error' ? 0 : 1) - (b.level === 'error' ? 0 : 1))
  for (const d of sorted.slice(0, limit)) {
    const where = d.file ? `${d.file}${d.line ? `:${d.line}` : ''}` : 'unknown location'
    const detail = d.content?.trim().split('\n').slice(0, 4).join(' | ')
    lines.push(
      `- ${d.level} at ${where}: ${d.message}${detail ? `\n    ${detail.slice(0, 300)}` : ''}${d.hint ? `\n    hint: ${d.hint.slice(0, 300)}` : ''}`,
    )
  }
  if (diagnostics.length > limit) lines.push(`- … ${diagnostics.length - limit} more`)
  return lines.join('\n')
}

export function compileSummary(result: CompileResult): string {
  const errors = errorCount(result.diagnostics)
  const warnings = result.diagnostics.filter(d => d.level !== 'error').length
  const head = `Status: ${result.status}${result.outputFiles.includes(OUTPUT.pdf) ? ' (PDF produced)' : ' (no PDF)'}; ${errors} errors, ${warnings} warnings.`
  const body = formatDiagnostics(result.diagnostics)
  return [head, body, result.message ? `Compiler message: ${result.message.slice(-1500)}` : ''].filter(Boolean).join('\n')
}

/** One-line description of a tool call for the chat transcript. */
export function describeToolCall(name: string, args: Record<string, unknown>): string {
  const p = typeof args.path === 'string' ? args.path : ''
  switch (name) {
    case 'list_files':
      return 'List project files'
    case 'read_file': {
      const range = args.start_line || args.end_line ? ` (lines ${args.start_line ?? 1}–${args.end_line ?? 'end'})` : ''
      return `Read ${p}${range}`
    }
    case 'search':
      return `Search for “${String(args.query ?? '')}”`
    case 'edit_file':
      return `Edit ${p}`
    case 'create_file':
      return `Create ${p}`
    case 'revert_file':
      return `Undo draft changes to ${p}`
    case 'compile':
      return 'Compile with proposed changes'
    case 'read_log':
      return args.query ? `Search compile log for “${String(args.query)}”` : 'Read compile log'
    case 'texlive_source':
      return args.query ? `Look up “${String(args.query)}” in ${String(args.name)}` : `Read ${String(args.name)} from TeX Live`
    case 'texlive_doc':
      return args.query ? `Search the ${String(args.name)} manual for “${String(args.query)}”` : `Read the ${String(args.name)} manual`
    case 'read_skill':
      return args.path ? `Read ${String(args.path)} of skill “${String(args.name)}”` : `Use skill “${String(args.name)}”`
    case 'propose_skill':
      return `Draft skill “${String(args.name)}”`
    default:
      return name
  }
}

/** Tools that build a draft for the author to apply. */
const DRAFT_TOOLS = new Set(['edit_file', 'create_file', 'revert_file', 'compile'])

async function lookup(ctx: ToolContext, job: TexLookupJob): Promise<string> {
  const parsed = TexLookupJob.safeParse(job)
  if (!parsed.success) return `Invalid lookup: ${parsed.error.issues[0]?.message ?? 'bad input'}`
  const r = await ctx.queue.texLookup(parsed.data)
  if (!r.found) return r.text
  return `${r.file} (${r.totalLines} lines)\n${r.text}`
}

/** Reading the person's skills and drafting new ones: in the project panel and the skills chat. */
export function skillTools(ctx: SkillToolContext): AgentTool<any, undefined>[] {
  return [
    tool({
      name: 'read_skill',
      label: 'Read skill',
      description:
        "Load one of the author's skills (listed in the system prompt): its instructions and the names of its reference files. With path, read one of those files instead.",
      parameters: Type.Object({
        name: Type.String({ description: 'The skill name' }),
        path: Type.Optional(Type.String({ description: 'A reference file of the skill' })),
      }),
      execute: async ({ name, path: file }) => {
        const skill = ctx.skills().find(s => s.name === name)
        if (!skill) throw new BadRequestError(`There is no skill named ${name}`)
        if (file) {
          const text = skill.files[file.replace(/^\.?\//, '')]
          if (text === undefined) throw new BadRequestError(`Skill ${name} has no file ${file}`)
          return text
        }
        const files = Object.keys(skill.files)
        return `# Skill: ${skill.name}\n${skill.body}${files.length ? `\n\nReference files (read with path): ${files.join(', ')}` : ''}`
      },
    }),

    tool({
      name: 'propose_skill',
      label: 'Propose skill',
      description:
        'Draft a skill for the author to save (only when they ask for one), or a new version of one of theirs (same name). It is shown to them with the option to edit and save it; nothing is saved by this call.',
      parameters: Type.Object({
        name: Type.String({ description: 'Lowercase letters, digits and hyphens, e.g. "polish-abstract"' }),
        description: Type.String({ description: 'What it does and when to use it, in one or two sentences' }),
        body: Type.String({ description: 'The instructions (the body of SKILL.md, without front matter), in Markdown' }),
        files: Type.Optional(
          Type.Array(
            Type.Object({
              path: Type.String({ description: 'Relative to the skill folder, e.g. "references/house-style.md"' }),
              content: Type.String({ description: 'The file as text' }),
            }),
            { description: 'Reference files the instructions point to, loaded only when needed' },
          ),
        ),
      }),
      execute: async ({ files, ...params }) => {
        const parsed = AiSkillBody.safeParse(params)
        if (!parsed.success) throw new BadRequestError(`Invalid skill: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
        ctx.onProposeSkill({ ...parsed.data, files: draftedFiles(files ?? []) })
        return ctx.proposedReply
      },
    }),
  ]
}

export function createTools(ctx: ToolContext): AgentTool<any, undefined>[] {
  const { store, changeset } = ctx
  let lastTrialBuild: string | undefined

  const tools = [
    tool({
      name: 'list_files',
      label: 'List files',
      description: 'List every file in the project with its size. Includes files you created in your draft.',
      parameters: Type.Object({}),
      execute: async () => {
        const { files } = await store.listTree(ctx.project.id)
        const lines = files.map(f => {
          const tags = [f.binary ? 'binary' : '', f.path === ctx.project.rootFile ? 'main document' : '', changeset.has(f.path) ? 'edited in draft' : '']
            .filter(Boolean)
            .join(', ')
          return `${f.path} (${f.size} bytes${tags ? `, ${tags}` : ''})`
        })
        for (const p of changeset.paths()) if (changeset.get(p)?.kind === 'created') lines.push(`${p} (new in draft)`)
        return lines.join('\n') || '(no files)'
      },
    }),

    tool({
      name: 'read_file',
      label: 'Read file',
      description:
        'Read a text file with line numbers. Shows your draft version if you edited it. Large files: pass start_line/end_line (1-based, inclusive).',
      parameters: Type.Object({
        path: Type.String({ description: 'Project-relative path' }),
        start_line: Type.Optional(Type.Integer({ minimum: 1 })),
        end_line: Type.Optional(Type.Integer({ minimum: 1 })),
      }),
      execute: async ({ path: raw, start_line, end_line }) => {
        const p = cleanPath(raw)
        if (!isTextPath(p)) throw new BadRequestError(`${p} is not a text file`)
        const content = await changeset.read(p)
        if (content === undefined) throw new BadRequestError(`${p} does not exist`)
        const lines = content.split('\n')
        const from = Math.max(1, start_line ?? 1)
        const to = Math.min(lines.length, end_line ?? from + MAX_READ_LINES - 1, from + MAX_READ_LINES - 1)
        const width = String(to).length
        const body = lines
          .slice(from - 1, to)
          .map((l, i) => `${String(from + i).padStart(width)}| ${l}`)
          .join('\n')
        const note = [
          changeset.has(p) ? '(your draft version)' : '',
          to < lines.length ? `(lines ${from}–${to} of ${lines.length}; read more with start_line=${to + 1})` : '',
        ]
          .filter(Boolean)
          .join(' ')
        return `${p}${note ? ` ${note}` : ''}\n${body}`
      },
    }),

    tool({
      name: 'search',
      label: 'Search',
      description:
        'Search all text files (draft versions where edited) for a string or regular expression. Returns path:line: text.',
      parameters: Type.Object({
        query: Type.String({ minLength: 1 }),
        regex: Type.Optional(Type.Boolean({ description: 'Treat query as a JavaScript regular expression' })),
        path: Type.Optional(Type.String({ description: 'Limit to this file or folder' })),
      }),
      execute: async ({ query, regex, path: within }) => {
        let re: RegExp
        try {
          re = regex ? new RegExp(query) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        } catch (err) {
          throw new BadRequestError(`Invalid regular expression: ${(err as Error).message}`)
        }
        const scope = within ? cleanPath(within) : undefined
        const { files } = await store.listTree(ctx.project.id)
        const paths = new Set(files.filter(f => !f.binary && isTextPath(f.path)).map(f => f.path))
        for (const p of changeset.paths()) paths.add(p)
        const results: string[] = []
        let total = 0
        for (const p of [...paths].sort()) {
          if (scope && p !== scope && !p.startsWith(`${scope}/`)) continue
          const content = await changeset.read(p)
          if (content === undefined) continue
          content.split('\n').forEach((line, i) => {
            if (!re.test(line)) return
            total++
            if (results.length < MAX_SEARCH_RESULTS) results.push(`${p}:${i + 1}: ${line.trim().slice(0, 200)}`)
          })
        }
        if (!total) return 'No matches.'
        return results.join('\n') + (total > results.length ? `\n… ${total - results.length} more matches` : '')
      },
    }),

    tool({
      name: 'edit_file',
      label: 'Edit file',
      description:
        'Propose an edit: replace old_text with new_text in a file. old_text must match the current (draft) content exactly, including whitespace, and occur exactly once — include a few surrounding lines if needed. The author reviews all edits as a diff before anything changes in the project.',
      parameters: Type.Object({
        path: Type.String(),
        old_text: Type.String({ description: 'Exact text to replace (unique in the file)' }),
        new_text: Type.String({ description: 'Replacement text' }),
      }),
      execute: async ({ path: p, old_text, new_text }) => {
        const { line, kind } = await changeset.edit(p, old_text, new_text)
        // Say so when the text only matched loosely, so the model re-reads before relying on details.
        const note =
          kind === 'quotes'
            ? ' old_text matched after treating curly/TeX quotes alike; the file keeps its own quotes outside your edit.'
            : kind === 'whitespace'
              ? ' old_text matched after ignoring differences in quotes and spacing; check the result with read_file if spacing matters.'
              : ''
        return `Edited ${cleanPath(p)} at line ${line} (draft).${note}`
      },
    }),

    tool({
      name: 'create_file',
      label: 'Create file',
      description: 'Propose a new text file. Fails if the file exists (use edit_file).',
      parameters: Type.Object({ path: Type.String(), content: Type.String() }),
      execute: async ({ path: p, content }) => {
        await changeset.create(p, content)
        return `Created ${cleanPath(p)} (draft).`
      },
    }),

    tool({
      name: 'revert_file',
      label: 'Revert file',
      description: 'Drop all your draft changes to one file.',
      parameters: Type.Object({ path: Type.String() }),
      execute: async ({ path: p }) =>
        changeset.revert(p) ? `Reverted your draft of ${cleanPath(p)}.` : `${cleanPath(p)} had no draft changes.`,
    }),

    tool({
      name: 'compile',
      label: 'Compile',
      description:
        'Compile the project with your draft changes applied (in a scratch copy; the project is not modified) and return status, errors and warnings. Use it to verify fixes.',
      parameters: Type.Object({}),
      execute: async () => {
        const overlay = changeset.overlay()
        const result = await ctx.queue.compile({
          projectId: ctx.project.id,
          rootFile: ctx.project.rootFile,
          engine: await engineFor(ctx.store, ctx.project, overlay),
          clean: false,
          overlay,
        })
        lastTrialBuild = result.buildId
        ctx.onTrial(result)
        return compileSummary(result)
      },
    }),

    tool({
      name: 'read_log',
      label: 'Read log',
      description:
        'Read the raw LaTeX log of the most recent compile (your last trial compile if you ran one, otherwise the author\'s). With query, returns the lines around each match; otherwise the last lines.',
      parameters: Type.Object({
        query: Type.Optional(Type.String({ description: 'Case-insensitive text to look for' })),
      }),
      execute: async ({ query }) => {
        const build = lastTrialBuild ?? ctx.authorBuild()
        if (!build) return 'No compile log is available yet. Run compile first.'
        const file = path.join(ctx.outputsDir, ctx.project.id, build, OUTPUT.log)
        const log = await fs.readFile(file, 'utf8').catch(() => undefined)
        if (log === undefined) return 'The log for that build is no longer available. Run compile.'
        const lines = log.split('\n')
        if (!query) return lines.slice(-MAX_LOG_LINES).join('\n')
        const needle = query.toLowerCase()
        const keep = new Set<number>()
        lines.forEach((l, i) => {
          if (!l.toLowerCase().includes(needle)) return
          for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 6); j++) keep.add(j)
        })
        if (!keep.size) return `“${query}” does not occur in the log.`
        const out: string[] = []
        let prev = -2
        for (const i of [...keep].sort((a, b) => a - b)) {
          if (out.length >= MAX_LOG_LINES) break
          if (i !== prev + 1) out.push('…')
          out.push(lines[i]!)
          prev = i
        }
        return out.join('\n')
      },
    }),

    tool({
      name: 'texlive_source',
      label: 'TeX Live source',
      description:
        'Read or search an installed TeX Live file (package .sty, class .cls, .bst, .def, .tex) to see what it really defines: options, commands, defaults, version. Use it to answer questions accurately instead of from memory.',
      parameters: Type.Object({
        name: Type.String({ description: 'Package or file name, e.g. "booktabs", "IEEEtran.cls", "natbib.sty"' }),
        query: Type.Optional(Type.String({ description: 'Case-insensitive text to find, e.g. "\\DeclareOption" or a command name' })),
        fromLine: Type.Optional(Type.Integer({ minimum: 1, description: 'Without query: the first line to show' })),
      }),
      execute: async ({ name, query, fromLine }) => lookup(ctx, { kind: 'source', name, query, fromLine }),
    }),

    tool({
      name: 'texlive_doc',
      label: 'Package manual',
      description:
        "Read or search a package's documentation (its manual, via texdoc) from the local TeX Live. Search with a query first; manuals are long.",
      parameters: Type.Object({
        name: Type.String({ description: 'Package name, e.g. "siunitx", "tikz" (pgf manual: "pgf"), "biblatex"' }),
        query: Type.Optional(Type.String({ description: 'Case-insensitive text to find' })),
        fromLine: Type.Optional(Type.Integer({ minimum: 1, description: 'Without query: the first line to show' })),
      }),
      execute: async ({ name, query, fromLine }) => lookup(ctx, { kind: 'doc', name, query, fromLine }),
    }),

    ...skillTools(ctx),
  ]
  // Without edit rights the assistant answers questions only: no draft, no trial builds.
  // The standard edition has no manuals: texdoc would find nothing.
  return tools.filter(t => (ctx.canEdit || !DRAFT_TOOLS.has(t.name)) && (ctx.manuals !== false || t.name !== 'texlive_doc'))
}

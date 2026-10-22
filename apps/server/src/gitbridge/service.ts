import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type { z } from 'zod'
import type { CreatedGitToken, CreateGitTokenBody, GitToken, TokenUse } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { gitTokens, projects as projectsTable } from '../db/schema.ts'
import { NotFoundError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import { git, gitOk, mergeText, SnapshotService } from '../history/snapshots.ts'
import type { ProjectService } from '../projects/service.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const BRANCH = 'refs/heads/main'
/** Bumped when the repository set-up below changes, so existing repositories get it too. */
const SETUP_VERSION = '1'

/** Refuses anything but a fast-forward of main (no other branches or tags, no deletions). */
const PRE_RECEIVE = `#!/bin/sh
# ColTex: projects have one branch, main.
while read old new ref; do
  if [ "$ref" != "refs/heads/main" ]; then
    echo "ColTex: only pushes to main are accepted (got $ref)" >&2
    exit 1
  fi
done
`

export type GitRequest = {
  method: 'GET' | 'POST'
  /** After the repository: info/refs, git-upload-pack or git-receive-pack. */
  service: string
  query: string
  headers: IncomingMessage['headers']
  body?: Readable
  remoteAddress?: string
}

/** What a token lets its holder do: act as this person, perhaps only reading, perhaps only in some projects. */
export type TokenGrant = { userId: string; readOnly: boolean; projectIds: string[] | null }

/** Whether a token reaches this project (its list, if it has one; the person's role is checked separately). */
export const grantReaches = (grant: TokenGrant, projectId: string) => !grant.projectIds || grant.projectIds.includes(projectId)

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

/**
 * The Git bridge: each project as a git repository people can clone, pull
 * and push over HTTP (like Overleaf's). The repositories live outside the
 * projects (`<dir>/<projectId>.git`). Before anyone reads or pushes, the
 * project's current files are committed to main ("Changes made in ColTex");
 * after a push, the pushed changes are written into the project like any
 * other change (live documents, history), merged with edits made meanwhile.
 * Git itself serves the protocol (`git http-backend`).
 */
export class GitBridgeService {
  private readonly db: Db
  private readonly store: ProjectStore
  private readonly collab: CollabHooks
  private readonly history: HistoryService
  private readonly projects: ProjectService
  private readonly dir: string
  private readonly snapshots: SnapshotService
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(deps: { db: Db; store: ProjectStore; collab: CollabHooks; history: HistoryService; projects: ProjectService; dir: string }) {
    this.db = deps.db
    this.store = deps.store
    this.collab = deps.collab
    this.history = deps.history
    this.projects = deps.projects
    this.dir = deps.dir
    this.snapshots = new SnapshotService(deps.dir, deps.store)
  }

  // --- tokens --------------------------------------------------------------

  async createToken(userId: string, body: z.output<typeof CreateGitTokenBody>): Promise<CreatedGitToken> {
    // Only the person's own projects (NotFound otherwise, as everywhere).
    for (const id of body.projectIds ?? []) await this.projects.requireAccess(id, userId, 'viewer')
    const token = `coltex_${crypto.randomBytes(24).toString('base64url')}`
    const id = newId()
    const [row] = await this.db
      .insert(gitTokens)
      .values({
        id,
        userId,
        name: body.name,
        tokenHash: hashToken(token),
        uses: body.uses,
        readOnly: body.readOnly,
        projectIds: body.projectIds ? [...new Set(body.projectIds)] : null,
        expiresAt: body.expiresInDays === null ? null : new Date(Date.now() + body.expiresInDays * 86_400_000),
      })
      .returning()
    const [shown] = await this.describe([row!])
    return { ...shown!, token }
  }

  async listTokens(userId: string): Promise<GitToken[]> {
    return this.describe(await this.db.select().from(gitTokens).where(eq(gitTokens.userId, userId)).orderBy(desc(gitTokens.createdAt)))
  }

  /** Rows as the settings pages show them, with the names of the projects they reach. */
  private async describe(rows: (typeof gitTokens.$inferSelect)[]): Promise<GitToken[]> {
    const ids = [...new Set(rows.flatMap(r => r.projectIds ?? []))]
    const names = new Map(
      ids.length ? (await this.db.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable).where(inArray(projectsTable.id, ids))).map(p => [p.id, p.name]) : [],
    )
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      uses: r.uses,
      readOnly: r.readOnly,
      projects: r.projectIds && r.projectIds.flatMap(id => (names.has(id) ? [{ id, name: names.get(id)! }] : [])),
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    }))
  }

  async revokeToken(userId: string, id: string): Promise<void> {
    const rows = await this.db.delete(gitTokens).where(and(eq(gitTokens.userId, userId), eq(gitTokens.id, id))).returning()
    if (!rows.length) throw new NotFoundError('Token not found')
  }

  /**
   * Whose token this is and what it may do there: Basic auth for git (the
   * user name is ignored, as on Overleaf), or a Bearer token for MCP
   * clients. Undefined for an unknown or expired token, or one not made for
   * this use.
   */
  async authenticate(authorization: string | undefined, use: TokenUse): Promise<TokenGrant | undefined> {
    let token: string
    const bearer = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')
    const basic = /^Basic\s+(\S+)$/i.exec(authorization ?? '')
    if (bearer) token = bearer[1]!
    else if (basic) {
      const decoded = Buffer.from(basic[1]!, 'base64').toString('utf8')
      token = decoded.slice(decoded.indexOf(':') + 1)
    } else return undefined
    if (!token.startsWith('coltex_')) return undefined
    const [row] = await this.db.select().from(gitTokens).where(eq(gitTokens.tokenHash, hashToken(token)))
    if (!row || !row.uses.includes(use) || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) return undefined
    // Note the use, at most once a minute.
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
      await this.db.update(gitTokens).set({ lastUsedAt: new Date() }).where(eq(gitTokens.id, row.id))
    }
    return { userId: row.userId, readOnly: row.readOnly, projectIds: row.projectIds }
  }

  // --- repositories ----------------------------------------------------------

  private repo(projectId: string): string {
    return path.join(this.dir, `${projectId}.git`)
  }

  private withLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const next = (this.locks.get(projectId) ?? Promise.resolve()).catch(() => {}).then(fn)
    this.locks.set(projectId, next)
    void next
      .finally(() => {
        if (this.locks.get(projectId) === next) this.locks.delete(projectId)
      })
      .catch(() => {})
    return next
  }

  /** Commit the project's current files to main (if anything changed) and return main. */
  private async sync(projectId: string): Promise<string> {
    await this.collab.flushProject(projectId)
    const { id } = await this.snapshots.snapshot(projectId, { kind: 'coltex', authors: [], message: 'Changes made in ColTex' })
    await this.setUp(projectId)
    return id
  }

  private async setUp(projectId: string): Promise<void> {
    const dir = this.repo(projectId)
    const current = await git(['config', '--get', 'coltex.setup'], { gitDir: dir })
    if (current.stdout.toString().trim() === SETUP_VERSION) return
    for (const [key, value] of [
      ['http.receivepack', 'true'],
      ['http.uploadpack', 'true'],
      ['receive.denyNonFastForwards', 'true'],
      ['receive.denyDeletes', 'true'],
      ['core.logAllRefUpdates', 'false'],
      ['gc.auto', '0'],
    ] as const) {
      await gitOk(['config', key, value], { gitDir: dir })
    }
    await fs.mkdir(path.join(dir, 'hooks'), { recursive: true })
    await fs.writeFile(path.join(dir, 'hooks', 'pre-receive'), PRE_RECEIVE, { mode: 0o755 })
    await gitOk(['config', 'coltex.setup', SETUP_VERSION], { gitDir: dir })
  }

  /**
   * Serve one smart-HTTP request (access already checked). Pushes are written
   * into the project before the response ends, so git reports success only
   * once the change is in.
   */
  serve(projectId: string, userId: string, req: GitRequest, res: ServerResponse): Promise<void> {
    return this.withLock(projectId, async () => {
      const before = await this.sync(projectId)
      const pushing = req.method === 'POST' && req.service === 'git-receive-pack'
      const out = await this.backend(projectId, userId, req, res, { buffer: pushing })
      if (!pushing || !out) return
      const after = (await git(['rev-parse', '--verify', '--quiet', BRANCH], { gitDir: this.repo(projectId) })).stdout.toString().trim()
      if (after && after !== before) {
        await this.apply(projectId, userId, before, after)
        // The project may now differ from the pushed commit (merged edits): record that.
        await this.sync(projectId)
      }
      res.writeHead(out.status, out.headers)
      res.end(out.body)
    })
  }

  /** Run `git http-backend` (CGI) for the request; stream its answer, or buffer it when asked. */
  private backend(
    projectId: string,
    userId: string,
    req: GitRequest,
    res: ServerResponse,
    opts: { buffer: boolean },
  ): Promise<{ status: number; headers: Record<string, string>; body: Buffer } | undefined> {
    return new Promise((resolve, reject) => {
      const env: NodeJS.ProcessEnv = {
        PATH: process.env.PATH,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_PROJECT_ROOT: this.dir,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: `/${projectId}.git/${req.service}`,
        REQUEST_METHOD: req.method,
        QUERY_STRING: req.query,
        CONTENT_TYPE: req.headers['content-type'] ?? '',
        REMOTE_USER: userId,
        REMOTE_ADDR: req.remoteAddress ?? '',
        GIT_HTTP_MAX_REQUEST_BUFFER: '100M',
      }
      if (req.headers['content-encoding']) env.HTTP_CONTENT_ENCODING = String(req.headers['content-encoding'])
      if (req.headers['git-protocol']) env.GIT_PROTOCOL = String(req.headers['git-protocol'])
      const child = spawn('git', ['http-backend'], { env })
      let head = Buffer.alloc(0)
      let parsed: { status: number; headers: Record<string, string> } | undefined
      const chunks: Buffer[] = []
      let stderr = ''
      child.stderr.on('data', (c: Buffer) => (stderr += c.toString()))
      child.on('error', reject)
      child.stdout.on('data', (chunk: Buffer) => {
        if (!parsed) {
          head = Buffer.concat([head, chunk])
          const end = head.indexOf('\r\n\r\n')
          const endLf = end < 0 ? head.indexOf('\n\n') : -1
          if (end < 0 && endLf < 0) return
          const split = end >= 0 ? end : endLf
          const sepLength = end >= 0 ? 4 : 2
          const headers: Record<string, string> = {}
          let status = 200
          for (const line of head.subarray(0, split).toString('latin1').split(/\r?\n/)) {
            const i = line.indexOf(':')
            if (i < 0) continue
            const name = line.slice(0, i).trim()
            const value = line.slice(i + 1).trim()
            if (name.toLowerCase() === 'status') status = Number.parseInt(value) || 200
            else headers[name] = value
          }
          parsed = { status, headers }
          chunk = head.subarray(split + sepLength)
          if (!opts.buffer) res.writeHead(status, headers)
        }
        if (opts.buffer) chunks.push(chunk)
        else if (chunk.length) res.write(chunk)
      })
      child.on('close', code => {
        if (!parsed) {
          reject(new Error(`git http-backend failed (${code}): ${stderr.trim()}`))
          return
        }
        if (opts.buffer) {
          resolve({ ...parsed, body: Buffer.concat(chunks) })
        } else {
          res.end()
          resolve(undefined)
        }
      })
      child.stdin.on('error', () => {})
      if (req.body) req.body.pipe(child.stdin)
      else child.stdin.end()
    })
  }

  /** Write the changes between two commits of main into the project. */
  private async apply(projectId: string, userId: string, before: string, after: string): Promise<void> {
    const dir = this.repo(projectId)
    const listing = (await gitOk(['diff', '--no-renames', '--name-status', '-z', before, after], { gitDir: dir }))
      .toString('utf8')
      .split('\0')
    const changes: { status: string; path: string }[] = []
    for (let i = 0; i + 1 < listing.length; i += 2) changes.push({ status: listing[i]!, path: listing[i + 1]! })
    if (!changes.length) return
    // A bulk change: the state before it becomes a version of its own.
    await this.history.checkpoint(projectId)
    const blob = async (commit: string, file: string) => {
      const res = await git(['cat-file', 'blob', `${commit}:${file}`], { gitDir: dir })
      return res.code === 0 ? res.stdout : undefined
    }
    for (const change of changes) {
      let file: string
      try {
        file = cleanPath(change.path)
      } catch {
        continue // a path the project can't hold (e.g. ../x)
      }
      await this.collab.mutate(projectId, async () => {
        if (change.status === 'D') {
          await this.store.deleteFile(projectId, file).catch(err => {
            if (!(err instanceof NotFoundError)) throw err
          })
          await this.collab.afterDelete(projectId, file)
          return
        }
        const theirs = (await blob(after, change.path)) ?? Buffer.alloc(0)
        let content: Buffer | string = theirs
        if (isTextPath(file)) {
          // Someone may have edited the file during the push: merge rather than overwrite.
          const base = await blob(before, change.path)
          const ours = await this.store.readFile(projectId, file).catch(() => undefined)
          if (base && ours && !ours.equals(base)) {
            content = (await mergeText(ours.toString('utf8'), base.toString('utf8'), theirs.toString('utf8'))) ?? theirs.toString('utf8')
          }
        }
        await this.store.writeFile(projectId, file, content)
        await this.collab.afterWrite(projectId, file, content.toString())
      })
    }
    await this.projects.touch(projectId)
    await this.collab.treeChanged(projectId)
    this.history.noteChange(projectId, userId, 'git')
  }

  /** Back up / restore the bridge repositories (their commit ids are what clones know). */
  bundle(projectId: string, file: string): Promise<boolean> {
    return this.snapshots.bundle(projectId, file)
  }

  restoreBundle(projectId: string, file: string): Promise<void> {
    return this.snapshots.restoreBundle(projectId, file)
  }

  deleteProject(projectId: string): Promise<void> {
    return this.snapshots.deleteProject(projectId)
  }
}

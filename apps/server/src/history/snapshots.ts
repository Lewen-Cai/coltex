import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ProjectStore } from '../storage/types.ts'

const BRANCH = 'refs/heads/main'
/** Per-repository cache of the last snapshot's file stats → blob ids, so unchanged files are not re-read. */
const INDEX_FILE = 'coltex-index.json'

type GitResult = { code: number; stdout: Buffer; stderr: string }

export function git(args: string[], opts: { gitDir?: string; input?: Buffer | string; cwd?: string } = {}): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' }
    const base = ['-c', 'core.quotePath=false']
    const child = spawn('git', opts.gitDir ? [...base, `--git-dir=${opts.gitDir}`, ...args] : [...base, ...args], {
      env,
      cwd: opts.cwd,
    })
    const out: Buffer[] = []
    let err = ''
    child.stdout.on('data', (c: Buffer) => out.push(c))
    child.stderr.on('data', (c: Buffer) => (err += c.toString()))
    child.on('error', reject)
    child.on('close', code => resolve({ code: code ?? 1, stdout: Buffer.concat(out), stderr: err }))
    child.stdin.on('error', () => {}) // git may exit before reading all input
    child.stdin.end(opts.input)
  })
}

export async function gitOk(args: string[], opts: Parameters<typeof git>[1] = {}): Promise<Buffer> {
  const res = await git(args, opts)
  if (res.code !== 0) throw new Error(`git ${args[0]} failed: ${res.stderr.trim()}`)
  return res.stdout
}

/** C-style quoting for fast-import paths (handles spaces, quotes, newlines, non-ASCII). */
function quotePath(p: string): string {
  return `"${p.replace(/[\\"]/g, c => `\\${c}`).replace(/\n/g, '\\n')}"`
}

const COMMIT_ID = /^[0-9a-f]{40,64}$/

export function isCommitId(s: string): boolean {
  return COMMIT_ID.test(s)
}

export type SnapshotMeta = {
  /** Machine-readable kind, e.g. edit, ai, restore, import, create. */
  kind: string
  /** User ids who made the changes. */
  authors: string[]
  /** One-line description. */
  message: string
  /** Extra trailers, e.g. { 'Restored-From': '<commit>' }. */
  extra?: Record<string, string>
}

export type FileChange = { status: 'added' | 'modified' | 'deleted' | 'renamed'; path: string; from?: string }

export type Snapshot = {
  id: string
  parent: string | null
  at: Date
  kind: string
  authors: string[]
  message: string
  extra: Record<string, string>
  changes: FileChange[]
}

type Index = { commit: string; files: Record<string, { size: number; modifiedAt: number; version?: string; blob: string }> }

const TRAILER = /^Coltex-([A-Za-z-]+): (.*)$/

function formatMessage(meta: SnapshotMeta): string {
  const trailers = [
    `Coltex-Kind: ${meta.kind}`,
    ...meta.authors.map(a => `Coltex-Author: ${a}`),
    ...Object.entries(meta.extra ?? {}).map(([k, v]) => `Coltex-${k}: ${v}`),
  ]
  return `${meta.message.replace(/\n/g, ' ')}\n\n${trailers.join('\n')}\n`
}

function parseMessage(body: string): Pick<Snapshot, 'kind' | 'authors' | 'message' | 'extra'> {
  const lines = body.trim().split('\n')
  const result = { kind: 'edit', authors: [] as string[], message: lines[0] ?? '', extra: {} as Record<string, string> }
  for (const line of lines.slice(1)) {
    const m = TRAILER.exec(line)
    if (!m) continue
    const [, key, value] = m as unknown as [string, string, string]
    if (key === 'Kind') result.kind = value
    else if (key === 'Author') result.authors.push(value)
    else result.extra[key] = value
  }
  return result
}

const STATUS: Record<string, FileChange['status']> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', T: 'modified' }

/** Parse NUL-separated `--name-status -z` output (renames carry two paths). */
function parseNameStatus(fields: string[]): FileChange[] {
  const changes: FileChange[] = []
  for (let i = 0; i < fields.length; ) {
    const code = fields[i++]!
    if (!code) continue
    const status = STATUS[code[0]!] ?? 'modified'
    if (code[0] === 'R' || code[0] === 'C') {
      const from = fields[i++]!
      const to = fields[i++]!
      changes.push(code[0] === 'R' ? { status: 'renamed', path: to, from } : { status: 'added', path: to })
    } else {
      changes.push({ status, path: fields[i++]! })
    }
  }
  return changes
}

/**
 * Point-in-time copies of a project's files in a bare git repository per
 * project (`<historyDir>/<projectId>.git`), outside the project directory so
 * compiles, exports and the file tree never see it. Files are read through
 * the ProjectStore, so this works for any storage driver. History is linear.
 */
export class SnapshotService {
  private readonly historyDir: string
  private readonly store: ProjectStore
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(historyDir: string, store: ProjectStore) {
    this.historyDir = historyDir
    this.store = store
  }

  private repo(projectId: string): string {
    return path.join(this.historyDir, `${projectId}.git`)
  }

  private withLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const next = (this.locks.get(projectId) ?? Promise.resolve()).catch(() => {}).then(fn)
    this.locks.set(projectId, next)
    void next.finally(() => {
      if (this.locks.get(projectId) === next) this.locks.delete(projectId)
    }).catch(() => {})
    return next
  }

  private async exists(projectId: string): Promise<boolean> {
    return fs.access(path.join(this.repo(projectId), 'HEAD')).then(
      () => true,
      () => false,
    )
  }

  private async ensureRepo(projectId: string): Promise<string> {
    const dir = this.repo(projectId)
    if (!(await this.exists(projectId))) {
      await fs.mkdir(this.historyDir, { recursive: true })
      await gitOk(['init', '--quiet', '--bare', '--initial-branch=main', dir])
    }
    return dir
  }

  async head(projectId: string): Promise<string | undefined> {
    if (!(await this.exists(projectId))) return undefined
    const res = await git(['rev-parse', '--verify', '--quiet', BRANCH], { gitDir: this.repo(projectId) })
    return res.code === 0 ? res.stdout.toString().trim() : undefined
  }

  /** Write every version to a git bundle (backups). False when the project has none yet. */
  bundle(projectId: string, file: string): Promise<boolean> {
    return this.withLock(projectId, async () => {
      if (!(await this.head(projectId))) return false
      await gitOk(['bundle', 'create', path.resolve(file), '--all'], { gitDir: this.repo(projectId) })
      return true
    })
  }

  /** Recreate a project's versions from a bundle (restore). Never replaces existing history. */
  restoreBundle(projectId: string, file: string): Promise<void> {
    return this.withLock(projectId, async () => {
      if (await this.exists(projectId)) throw new Error(`Project ${projectId} already has history`)
      const dir = await this.ensureRepo(projectId)
      await gitOk(['fetch', '--quiet', path.resolve(file), '+refs/*:refs/*'], { gitDir: dir })
    })
  }

  private async readIndex(dir: string): Promise<Index | undefined> {
    try {
      return JSON.parse(await fs.readFile(path.join(dir, INDEX_FILE), 'utf8')) as Index
    } catch {
      return undefined
    }
  }

  /**
   * Record the project's current files as a new version, unless nothing
   * changed since the last one. Callers flush open documents first
   * (`collab.flushProject`) so the snapshot matches what people see.
   */
  snapshot(projectId: string, meta: SnapshotMeta): Promise<{ id: string; created: boolean }> {
    return this.withLock(projectId, async () => {
      // Read the files first: a project deleted meanwhile throws here instead
      // of getting its repository created again.
      const { files } = await this.store.listTree(projectId)
      const dir = await this.ensureRepo(projectId)
      const parent = await this.head(projectId)
      const index = await this.readIndex(dir)
      const reusable = index && index.commit === parent ? index.files : {}
      const now = Math.floor(Date.now() / 1000)
      const msg = Buffer.from(formatMessage(meta))
      const chunks: Buffer[] = [
        Buffer.from(`commit ${BRANCH}\ncommitter ColTex <coltex@localhost> ${now} +0000\ndata ${msg.length}\n`),
        msg,
        Buffer.from(`\n${parent ? `from ${parent}\n` : ''}deleteall\n`),
      ]
      for (const f of files) {
        const known = reusable[f.path]
        if (known && f.modifiedAt !== undefined && known.size === f.size && known.modifiedAt === f.modifiedAt && known.version === f.version) {
          chunks.push(Buffer.from(`M 100644 ${known.blob} ${quotePath(f.path)}\n`))
          continue
        }
        const content = await this.store.readFile(projectId, f.path)
        chunks.push(Buffer.from(`M 100644 inline ${quotePath(f.path)}\ndata ${content.length}\n`), content, Buffer.from('\n'))
      }
      chunks.push(Buffer.from('done\n'))
      await gitOk(['fast-import', '--quiet', '--done'], { gitDir: dir, input: Buffer.concat(chunks) })
      const id = (await gitOk(['rev-parse', BRANCH], { gitDir: dir })).toString().trim()

      // Nothing changed: drop the empty commit again.
      if (parent) {
        const trees = (await gitOk(['rev-parse', `${id}^{tree}`, `${parent}^{tree}`], { gitDir: dir })).toString().split('\n')
        if (trees[0] === trees[1]) {
          await gitOk(['update-ref', BRANCH, parent, id], { gitDir: dir })
          return { id: parent, created: false }
        }
      }

      // Remember blob ids for the next snapshot.
      const blobs = new Map<string, string>()
      const listing = (await gitOk(['ls-tree', '-r', '-z', id], { gitDir: dir })).toString('utf8').split('\0')
      for (const entry of listing) {
        const tab = entry.indexOf('\t')
        if (tab > 0) blobs.set(entry.slice(tab + 1), entry.slice(0, tab).split(' ')[2]!)
      }
      const next: Index = { commit: id, files: {} }
      for (const f of files) {
        const blob = blobs.get(f.path)
        if (blob && f.modifiedAt !== undefined) next.files[f.path] = { size: f.size, modifiedAt: f.modifiedAt, version: f.version, blob }
      }
      await fs.writeFile(path.join(dir, INDEX_FILE), JSON.stringify(next))
      return { id, created: true }
    })
  }

  /** Versions, newest first. `before` pages backwards from (excluding) that version. */
  async log(projectId: string, opts: { before?: string; limit: number }): Promise<{ versions: Snapshot[]; more: boolean }> {
    const start = opts.before ?? (await this.head(projectId))
    if (!start) return { versions: [], more: false }
    if (!isCommitId(start)) throw new Error('Invalid version id')
    const dir = this.repo(projectId)
    const args = ['log', '--format=%x1e%H%x00%P%x00%ct%x00%B', `-n${opts.limit + 1}`]
    if (opts.before) args.push('--skip=1')
    const out = (await gitOk([...args, start], { gitDir: dir })).toString('utf8')
    const records = out.split('\x1e').filter(Boolean)
    const more = records.length > opts.limit
    const base = records.slice(0, opts.limit).map(record => {
      const [id, parents, time, body] = record.split('\0') as [string, string, string, string]
      return { id, parent: parents.trim().split(' ')[0] || null, at: new Date(Number(time) * 1000), ...parseMessage(body) }
    })
    // One process for all diffs: diff-tree --stdin prints "<id>\0" then the changes.
    const changes = new Map<string, FileChange[]>()
    if (base.length) {
      const diff = await gitOk(['diff-tree', '--stdin', '-r', '-z', '-M', '--name-status', '--root'], {
        gitDir: dir,
        input: base.map(v => v.id).join('\n') + '\n',
      })
      let current: string | undefined
      let fields: string[] = []
      const flush = () => {
        if (current) changes.set(current, parseNameStatus(fields))
      }
      for (const field of diff.toString('utf8').split('\0')) {
        const token = field.replace(/^\n/, '')
        if (isCommitId(token)) {
          flush()
          current = token
          fields = []
        } else fields.push(token)
      }
      flush()
    }
    return { versions: base.map(v => ({ ...v, changes: changes.get(v.id) ?? [] })), more }
  }

  /** One version with its changes, or undefined if it does not exist. */
  async get(projectId: string, commit: string): Promise<Snapshot | undefined> {
    if (!isCommitId(commit) || !(await this.exists(projectId))) return undefined
    const dir = this.repo(projectId)
    if ((await git(['cat-file', '-e', `${commit}^{commit}`], { gitDir: dir })).code !== 0) return undefined
    const out = (await gitOk(['log', '--format=%x1e%H%x00%P%x00%ct%x00%B', '-n1', commit], { gitDir: dir })).toString('utf8')
    const [record] = out.split('\x1e').filter(Boolean)
    if (!record) return undefined
    const [id, parents, time, body] = record.split('\0') as [string, string, string, string]
    const parent = parents.trim().split(' ')[0] || null
    return {
      id,
      parent,
      at: new Date(Number(time) * 1000),
      ...parseMessage(body),
      changes: await this.compare(projectId, parent ?? undefined, id),
    }
  }

  /** Files of a version with their sizes. */
  async listFiles(projectId: string, commit: string): Promise<{ path: string; size: number }[]> {
    if (!isCommitId(commit)) throw new Error('Invalid version id')
    const out = (await gitOk(['ls-tree', '-r', '-l', '-z', commit], { gitDir: this.repo(projectId) })).toString('utf8')
    return out
      .split('\0')
      .filter(Boolean)
      .map(entry => {
        const tab = entry.indexOf('\t')
        const size = Number(entry.slice(0, tab).trim().split(/\s+/)[3])
        return { path: entry.slice(tab + 1), size: Number.isFinite(size) ? size : 0 }
      })
  }

  /** What changed between two versions (`from` undefined = the empty project). */
  async compare(projectId: string, from: string | undefined, to: string): Promise<FileChange[]> {
    if (!isCommitId(to) || (from && !isCommitId(from))) throw new Error('Invalid version id')
    const dir = this.repo(projectId)
    const fromRef = from ?? (await gitOk(['hash-object', '-t', 'tree', '--stdin'], { gitDir: dir, input: '' })).toString().trim()
    const out = await gitOk(['diff-tree', '-r', '-z', '-M', '--name-status', fromRef, to], { gitDir: dir })
    return parseNameStatus(out.toString('utf8').split('\0'))
  }

  /** A file's content in a snapshot, or undefined if it did not exist then. */
  async readFile(projectId: string, commit: string, filePath: string): Promise<Buffer | undefined> {
    if (!isCommitId(commit)) throw new Error('Invalid version id')
    const res = await git(['cat-file', 'blob', `${commit}:${filePath}`], { gitDir: this.repo(projectId) })
    return res.code === 0 ? res.stdout : undefined
  }

  /** Called on explicit project deletion only. Waits for a snapshot in progress. */
  deleteProject(projectId: string): Promise<void> {
    return this.withLock(projectId, () => fs.rm(this.repo(projectId), { recursive: true, force: true }))
  }
}

/**
 * Three-way merge of text: apply the change base→theirs on top of `ours`.
 * Returns undefined when the changes overlap (a conflict).
 */
export async function mergeText(ours: string, base: string, theirs: string): Promise<string | undefined> {
  if (ours === base) return theirs
  if (theirs === base || ours === theirs) return ours
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-merge-'))
  try {
    await Promise.all([
      fs.writeFile(path.join(dir, 'ours'), ours),
      fs.writeFile(path.join(dir, 'base'), base),
      fs.writeFile(path.join(dir, 'theirs'), theirs),
    ])
    const res = await git(['merge-file', '-p', 'ours', 'base', 'theirs'], { cwd: dir })
    // Exit code = number of conflicts; negative/large codes are errors.
    if (res.code !== 0) return undefined
    return res.stdout.toString('utf8')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

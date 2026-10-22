import { and, eq, inArray } from 'drizzle-orm'
import type { HistoryLabel, HistoryPage, HistoryVersion } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { historyLabels, user } from '../db/schema.ts'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import type { ProjectService } from '../projects/service.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import { mergeText, type Snapshot, type SnapshotService } from './snapshots.ts'

/** What kind of change wins when several are pending (most notable first). */
const KIND_PRIORITY = ['restore', 'import', 'convert', 'copy', 'create', 'ai', 'mcp', 'review', 'edit']

const MESSAGES: Record<string, string> = {
  initial: 'Initial version',
  create: 'Created the project',
  import: 'Imported the project',
  convert: 'Converted to a journal template',
  copy: 'Copied from another project',
  edit: 'Edited',
  ai: 'Applied changes from the AI agent',
  mcp: 'Edited by an AI agent over MCP',
  review: 'Accepted or rejected tracked changes',
  restore: 'Restored an earlier version',
  revert: 'Reverted a version',
}

type Pending = { authors: Set<string>; kinds: Set<string>; first: number; timer?: NodeJS.Timeout }

export type HistoryOptions = {
  /** Record a version after this much quiet. */
  idleMs?: number
  /** …or at the latest this long after the first unrecorded change. */
  maxMs?: number
}

/**
 * Automatic project versions. Edits are noted (cheaply, per keystroke) with
 * their author; a version is recorded once editing pauses, so history has a
 * useful granularity instead of one entry per keystroke.
 */
export class HistoryService {
  private readonly db: Db
  private readonly snapshots: SnapshotService
  private readonly store: ProjectStore
  private readonly projects: ProjectService
  private readonly idleMs: number
  private readonly maxMs: number
  private readonly pending = new Map<string, Pending>()
  /** Snapshots in progress, so shutdown can wait for them. */
  private readonly inflight = new Set<Promise<unknown>>()
  private collab?: CollabHooks

  constructor(deps: { db: Db; snapshots: SnapshotService; store: ProjectStore; projects: ProjectService }, opts: HistoryOptions = {}) {
    this.db = deps.db
    this.snapshots = deps.snapshots
    this.store = deps.store
    this.projects = deps.projects
    this.idleMs = opts.idleMs ?? 60_000
    this.maxMs = opts.maxMs ?? 10 * 60_000
  }

  /** Collaboration and history depend on each other; wire them after both exist. */
  setCollab(collab: CollabHooks): void {
    this.collab = collab
  }

  /** Someone changed the project. Cheap: called for every collaborative edit. */
  noteChange(projectId: string, userId: string, kind = 'edit'): void {
    let p = this.pending.get(projectId)
    if (!p) {
      p = { authors: new Set(), kinds: new Set(), first: Date.now() }
      this.pending.set(projectId, p)
    }
    p.authors.add(userId)
    p.kinds.add(kind)
    if (p.timer) clearTimeout(p.timer)
    const wait = Math.max(0, Math.min(this.idleMs, p.first + this.maxMs - Date.now()))
    p.timer = setTimeout(() => void this.checkpoint(projectId).catch(() => {}), wait)
  }

  /**
   * Record the current state as a version if anything changed (including
   * changes nobody noted, e.g. made before the server started). Returns the
   * latest version id.
   */
  checkpoint(projectId: string): Promise<string | undefined> {
    return this.track(this.checkpointNow(projectId))
  }

  private track<T>(promise: Promise<T>): Promise<T> {
    this.inflight.add(promise)
    void promise.finally(() => this.inflight.delete(promise)).catch(() => {})
    return promise
  }

  private async checkpointNow(projectId: string): Promise<string | undefined> {
    const p = this.pending.get(projectId)
    if (p?.timer) clearTimeout(p.timer)
    this.pending.delete(projectId)
    await this.collab?.flushProject(projectId)
    const head = await this.snapshots.head(projectId)
    const kind = head ? (KIND_PRIORITY.find(k => p?.kinds.has(k)) ?? 'edit') : 'initial'
    try {
      const { id } = await this.snapshots.snapshot(projectId, {
        kind,
        authors: [...(p?.authors ?? [])],
        message: MESSAGES[kind] ?? 'Edited',
      })
      return id
    } catch (err) {
      // Deleted meanwhile: nothing to record.
      if (err instanceof NotFoundError) return head
      throw err
    }
  }

  /** Record a version now with an explicit kind (project created, imported, restored). */
  record(projectId: string, kind: string, authors: string[], extra?: Record<string, string>): Promise<string> {
    return this.track(this.recordNow(projectId, kind, authors, extra))
  }

  private async recordNow(projectId: string, kind: string, authors: string[], extra?: Record<string, string>): Promise<string> {
    const p = this.pending.get(projectId)
    if (p?.timer) clearTimeout(p.timer)
    this.pending.delete(projectId)
    await this.collab?.flushProject(projectId)
    const all = new Set([...authors, ...(p?.authors ?? [])])
    const { id } = await this.snapshots.snapshot(projectId, { kind, authors: [...all], message: MESSAGES[kind] ?? kind, extra })
    return id
  }

  /** Record everything pending (server shutdown). */
  async flushAll(): Promise<void> {
    await Promise.all([...this.pending.keys()].map(id => this.checkpoint(id).catch(() => {})))
  }

  /** Forget pending changes without recording them, and wait for snapshots in progress (tests, teardown). */
  async dispose(): Promise<void> {
    for (const id of [...this.pending.keys()]) this.dropProject(id)
    await Promise.allSettled([...this.inflight])
  }

  dropProject(projectId: string): void {
    const p = this.pending.get(projectId)
    if (p?.timer) clearTimeout(p.timer)
    this.pending.delete(projectId)
  }

  // ---- Reading --------------------------------------------------------------

  private async decorate(projectId: string, snapshots: Snapshot[]): Promise<HistoryVersion[]> {
    const ids = [...new Set(snapshots.flatMap(s => s.authors))]
    const names = new Map(
      ids.length
        ? (await this.db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids))).map(u => [u.id, u.name])
        : [],
    )
    const versionIds = snapshots.map(s => s.id)
    const labels = versionIds.length
      ? await this.db
          .select()
          .from(historyLabels)
          .where(and(eq(historyLabels.projectId, projectId), inArray(historyLabels.versionId, versionIds)))
      : []
    return snapshots.map(s => ({
      id: s.id,
      parent: s.parent,
      at: s.at.toISOString(),
      kind: s.kind,
      message: s.message,
      authors: s.authors.map(id => ({ id, name: names.get(id) ?? 'Deleted user' })),
      changes: s.changes,
      labels: labels.filter(l => l.versionId === s.id).map(toLabel),
      restoredFrom: s.extra['Restored-From'],
      revertOf: s.extra['Reverted'],
    }))
  }

  async versions(projectId: string, opts: { before?: string; limit: number }): Promise<HistoryPage> {
    // The first page always ends with the current state.
    if (!opts.before) await this.checkpoint(projectId)
    const { versions, more } = await this.snapshots.log(projectId, opts)
    return { versions: await this.decorate(projectId, versions), more }
  }

  async version(projectId: string, versionId: string): Promise<HistoryVersion> {
    const snapshot = await this.snapshots.get(projectId, versionId)
    if (!snapshot) throw new NotFoundError('Version not found')
    return (await this.decorate(projectId, [snapshot]))[0]!
  }

  /** Changes between two versions; `from` absent = since the empty project. */
  async compare(projectId: string, from: string | undefined, to: string) {
    await this.mustExist(projectId, to)
    if (from) await this.mustExist(projectId, from)
    return this.snapshots.compare(projectId, from, to)
  }

  async files(projectId: string, versionId: string) {
    await this.mustExist(projectId, versionId)
    return this.snapshots.listFiles(projectId, versionId)
  }

  async readFile(projectId: string, versionId: string, rawPath: string): Promise<Buffer | undefined> {
    await this.mustExist(projectId, versionId)
    return this.snapshots.readFile(projectId, versionId, cleanPath(rawPath))
  }

  private async mustExist(projectId: string, versionId: string): Promise<void> {
    if (!(await this.snapshots.get(projectId, versionId))) throw new NotFoundError('Version not found')
  }

  /**
   * Record the current state now, with the person's own message (git commit
   * -m). With nothing changed since the latest version, the message becomes a
   * label on it instead, so the current state still gets its name.
   */
  async commit(projectId: string, userId: string, message: string): Promise<{ versionId: string; created: boolean }> {
    const p = this.pending.get(projectId)
    if (p?.timer) clearTimeout(p.timer)
    this.pending.delete(projectId)
    await this.collab?.flushProject(projectId)
    // Authors are who made the changes; the committer only when nobody else is known.
    const authors = p?.authors.size ? [...p.authors] : [userId]
    const { id, created } = await this.track(this.snapshots.snapshot(projectId, { kind: 'commit', authors, message }))
    if (!created) await this.addLabel(projectId, userId, message, id)
    return { versionId: id, created }
  }

  // ---- Labels ---------------------------------------------------------------

  async addLabel(projectId: string, userId: string, name: string, versionId?: string): Promise<HistoryLabel> {
    const target = versionId ?? (await this.checkpoint(projectId))
    if (!target) throw new BadRequestError('The project has no versions yet')
    await this.mustExist(projectId, target)
    const [row] = await this.db.insert(historyLabels).values({ projectId, versionId: target, name, createdBy: userId }).returning()
    return toLabel(row!)
  }

  async deleteLabel(projectId: string, labelId: number): Promise<void> {
    const rows = await this.db
      .delete(historyLabels)
      .where(and(eq(historyLabels.projectId, projectId), eq(historyLabels.id, labelId)))
      .returning({ id: historyLabels.id })
    if (!rows.length) throw new NotFoundError('Label not found')
  }

  // ---- Restore --------------------------------------------------------------

  /**
   * Bring the project (or some files) back to a version. The current state is
   * recorded first and the restore becomes a new version, so it can itself be
   * undone by restoring the version before it.
   */
  async restore(projectId: string, versionId: string, userId: string, paths?: string[]): Promise<string> {
    const collab = this.collab
    if (!collab) throw new Error('History is not wired to collaboration')
    await this.mustExist(projectId, versionId)
    await this.checkpoint(projectId)

    const versionFiles = await this.snapshots.listFiles(projectId, versionId)
    const inVersion = new Set(versionFiles.map(f => f.path))
    const targets = paths ? paths.map(p => cleanPath(p)) : [...inVersion]
    for (const p of targets) if (!inVersion.has(p)) throw new BadRequestError(`${p} does not exist in that version`)

    const { files: current } = await this.store.listTree(projectId)
    let treeChanged = false
    await collab.mutate(projectId, async () => {
      for (const p of targets) {
        const content = (await this.snapshots.readFile(projectId, versionId, p))!
        const existing = await this.store.readFile(projectId, p).catch(() => undefined)
        if (existing?.equals(content)) continue
        if (!existing) treeChanged = true
        await this.store.writeFile(projectId, p, content)
        if (isTextPath(p)) await collab.afterWrite(projectId, p, content.toString('utf8'))
      }
      if (!paths) {
        for (const f of current) {
          if (inVersion.has(f.path)) continue
          await this.store.deleteFile(projectId, f.path)
          await collab.afterDelete(projectId, f.path)
          treeChanged = true
        }
      }
    })
    if (treeChanged) await collab.treeChanged(projectId)
    await this.projects.touch(projectId)
    return this.record(projectId, 'restore', [userId], { 'Restored-From': versionId })
  }

  /**
   * Undo the changes one version made and keep everything changed since (git
   * revert): each file it changed goes back through a 3-way merge of the
   * current text, the version's and its parent's. Files changed since in ways
   * that clash are reported and nothing is written. Recorded as a new version.
   */
  async revert(projectId: string, versionId: string, userId: string): Promise<string> {
    const collab = this.collab
    if (!collab) throw new Error('History is not wired to collaboration')
    const version = await this.snapshots.get(projectId, versionId)
    if (!version) throw new NotFoundError('Version not found')
    const parent = version.parent
    if (!parent) throw new BadRequestError('The first version has nothing before it to go back to')
    await this.checkpoint(projectId)

    const now = (p: string) => this.store.readFile(projectId, p).catch(() => undefined)
    const ops: RevertOp[] = []
    const conflicts: string[] = []
    for (const c of await this.snapshots.compare(projectId, parent, versionId)) {
      const beforePath = c.from ?? c.path
      const before = c.status === 'added' ? undefined : await this.snapshots.readFile(projectId, parent, beforePath)
      const after = c.status === 'deleted' ? undefined : await this.snapshots.readFile(projectId, versionId, c.path)
      const current = after ? await now(c.path) : undefined
      const mine: RevertOp[] = []
      if (after && !current) {
        if (!before) continue // it added the file, which is gone already
        conflicts.push(c.path) // deleted since
        continue
      }
      let content: Buffer | undefined
      if (before && after && current) {
        if (current.equals(after)) content = before
        else if (isTextPath(c.path) && isTextPath(beforePath)) {
          const merged = await mergeText(current.toString('utf8'), after.toString('utf8'), before.toString('utf8'))
          if (merged === undefined) {
            conflicts.push(c.path)
            continue
          }
          content = Buffer.from(merged)
        } else {
          conflicts.push(c.path)
          continue
        }
      } else if (before) content = before
      // Added (or moved here) by this version: it goes, unless it was changed since.
      if (after && current && (!before || beforePath !== c.path)) {
        if (!before && !current.equals(after)) {
          conflicts.push(c.path)
          continue
        }
        mine.push({ kind: 'delete', path: c.path })
      }
      if (content && (beforePath !== c.path || !after)) {
        // Brought back where it was: that place must be free (or already hold it).
        const there = await now(beforePath)
        if (there && !there.equals(content)) {
          conflicts.push(beforePath)
          continue
        }
        if (!there) mine.push({ kind: 'write', path: beforePath, content })
      } else if (content && current && !content.equals(current)) mine.push({ kind: 'write', path: c.path, content })
      ops.push(...mine)
    }
    if (conflicts.length) throw new ConflictError(`Changed since in ways that clash with reverting: ${conflicts.join(', ')}`)
    if (!ops.length) throw new BadRequestError('Nothing to revert: those changes are already undone')

    let treeChanged = false
    await collab.mutate(projectId, async () => {
      for (const op of ops) {
        if (op.kind === 'delete') {
          await this.store.deleteFile(projectId, op.path)
          await collab.afterDelete(projectId, op.path)
          treeChanged = true
          continue
        }
        const existed = await now(op.path)
        if (!existed) treeChanged = true
        await this.store.writeFile(projectId, op.path, op.content)
        if (isTextPath(op.path)) await collab.afterWrite(projectId, op.path, op.content.toString('utf8'))
      }
    })
    if (treeChanged) await collab.treeChanged(projectId)
    await this.projects.touch(projectId)
    return this.record(projectId, 'revert', [userId], { Reverted: versionId })
  }
}

type RevertOp = { kind: 'write'; path: string; content: Buffer } | { kind: 'delete'; path: string }

function toLabel(row: typeof historyLabels.$inferSelect): HistoryLabel {
  return {
    id: row.id,
    name: row.name,
    versionId: row.versionId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  }
}

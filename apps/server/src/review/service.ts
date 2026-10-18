import { asc, eq, inArray } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type * as Y from 'yjs'
import {
  TEXT_KEY,
  acceptChanges,
  changesMap,
  commentsMap,
  isValidRelPos,
  lineAt,
  normalizeRelPos,
  rejectChanges,
  resolveReview,
  undoDecision,
  type DecisionUndo,
} from '@coltex/review'
import type { CommentThread, ProjectRole, ReviewState, TrackChangesState, TrackedChange } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { commentMessages, commentThreads, projects, user } from '../db/schema.ts'
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import type { NotificationService } from '../notifications/service.ts'

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const QUOTE_LIMIT = 500
const DELETED_USER = 'Deleted user'

const canModerate = (role: ProjectRole) => role === 'owner' || role === 'editor'
const hasReviewData = (doc: Y.Doc) => changesMap(doc).size > 0 || commentsMap(doc).size > 0

type Actor = { userId: string; role: ProjectRole }

/** How long an accept or reject can be taken back (the toast's Undo). */
const UNDO_TTL_MS = 15 * 60_000
const newUndoId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
type PendingUndo = { projectId: string; userId: string; decision: 'accept' | 'reject'; at: number; docs: { docId: string; undo: DecisionUndo[] }[] }

/**
 * Comments and tracked changes. Anchors and change records live in each file's
 * Yjs document (see @coltex/review); comment conversations live in Postgres.
 * Every mutation bumps the project's review counter so open editors refresh.
 */
export class ReviewService {
  private readonly db: Db
  private readonly collab: CollabHooks
  private readonly history: HistoryService
  private readonly notifications: NotificationService
  /** Recent decisions, in memory: a restart forgets them (the history still has the state before). */
  private readonly undos = new Map<string, PendingUndo>()

  constructor(deps: { db: Db; collab: CollabHooks; history: HistoryService; notifications: NotificationService }) {
    this.db = deps.db
    this.collab = deps.collab
    this.history = deps.history
    this.notifications = deps.notifications
  }

  async state(projectId: string): Promise<ReviewState> {
    const [project] = await this.db.select({ trackChanges: projects.trackChanges }).from(projects).where(eq(projects.id, projectId))
    if (!project) throw new NotFoundError('Project not found')

    const docs = await this.collab.listDocs(projectId)
    const resolved = new Map<string, { text: string; review: ReturnType<typeof resolveReview> }>()
    for (const d of docs) {
      const r = await this.collab.readDoc(
        projectId,
        d.id,
        doc => ({ text: doc.getText(TEXT_KEY).toString(), review: resolveReview(doc) }),
        hasReviewData,
      )
      if (r) resolved.set(d.id, r)
    }

    const threads = await this.db.select().from(commentThreads).where(eq(commentThreads.projectId, projectId)).orderBy(asc(commentThreads.createdAt))
    const messages = threads.length
      ? await this.db
          .select()
          .from(commentMessages)
          .where(inArray(commentMessages.threadId, threads.map(t => t.id)))
          .orderBy(asc(commentMessages.createdAt))
      : []

    const userIds = new Set<string>()
    for (const t of threads) for (const id of [t.createdBy, t.resolvedBy]) if (id) userIds.add(id)
    for (const m of messages) if (m.userId) userIds.add(m.userId)
    for (const r of resolved.values()) for (const c of r.review.changes) userIds.add(c.userId)
    const names = new Map(
      userIds.size
        ? (await this.db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, [...userIds]))).map(u => [u.id, u.name])
        : [],
    )
    const nameOf = (id: string | null) => (id && names.get(id)) || DELETED_USER

    const paths = new Map(docs.map(d => [d.id, d.path]))
    const changes: TrackedChange[] = []
    for (const [docId, r] of resolved) {
      for (const c of r.review.changes) {
        changes.push({
          id: c.id,
          docId,
          path: paths.get(docId)!,
          type: c.type,
          // An insertion that starts with a line break belongs to the line it adds.
          line: lineAt(r.text, c.type === 'insert' ? c.from + (c.text.match(/^\n*/)?.[0].length ?? 0) : c.from),
          text: c.text,
          userId: c.userId,
          name: nameOf(c.userId),
          at: new Date(c.ts).toISOString(),
        })
      }
    }

    const out: CommentThread[] = threads.map(t => {
      const r = resolved.get(t.docId)
      const anchor = r?.review.comments.find(c => c.id === t.id)
      return {
        id: t.id,
        docId: t.docId,
        path: paths.get(t.docId) ?? '',
        line: anchor && r ? lineAt(r.text, anchor.from) : null,
        quote: anchor && r ? r.text.slice(anchor.from, Math.min(anchor.to, anchor.from + QUOTE_LIMIT)) : '',
        createdBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
        resolved: t.resolvedAt ? { by: t.resolvedBy, name: nameOf(t.resolvedBy), at: t.resolvedAt.toISOString() } : null,
        messages: messages
          .filter(m => m.threadId === t.id)
          .map(m => ({
            id: m.id,
            userId: m.userId,
            name: nameOf(m.userId),
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            editedAt: m.editedAt?.toISOString() ?? null,
          })),
      }
    })

    return {
      trackChanges: project.trackChanges,
      threads: out,
      changes,
      users: Object.fromEntries(names),
    }
  }

  async setTrackChanges(projectId: string, state: TrackChangesState): Promise<TrackChangesState> {
    const value = { everyone: state.everyone, users: [...new Set(state.users)] }
    await this.db.update(projects).set({ trackChanges: value }).where(eq(projects.id, projectId))
    await this.collab.reviewChanged(projectId)
    return value
  }

  private async requireDoc(projectId: string, docId: string): Promise<void> {
    const docs = await this.collab.listDocs(projectId)
    if (!docs.some(d => d.id === docId)) throw new NotFoundError('File not found')
  }

  async createThread(
    projectId: string,
    actor: Actor,
    body: { docId: string; start: Record<string, unknown>; end: Record<string, unknown>; content: string },
  ): Promise<string> {
    await this.requireDoc(projectId, body.docId)
    const id = newId()
    // Anchor first: if the positions are invalid nothing is stored.
    const ok = await this.collab.editDoc(projectId, body.docId, actor.userId, doc => {
      const ytext = doc.getText(TEXT_KEY)
      if (!isValidRelPos(ytext, body.start) || !isValidRelPos(ytext, body.end)) return false
      commentsMap(doc).set(id, { start: normalizeRelPos(body.start), end: normalizeRelPos(body.end) })
      return true
    })
    if (!ok) throw new BadRequestError('The commented text no longer exists')
    const messageId = newId()
    try {
      await this.db.transaction(async tx => {
        await tx.insert(commentThreads).values({ id, projectId, docId: body.docId, createdBy: actor.userId })
        await tx.insert(commentMessages).values({ id: messageId, threadId: id, userId: actor.userId, content: body.content })
      })
    } catch (err) {
      await this.removeAnchor(projectId, body.docId, id, actor.userId).catch(() => {})
      throw err
    }
    await this.collab.reviewChanged(projectId)
    await this.notifications.commentMessage(projectId, actor.userId, { threadId: id, messageId }, body.content)
    return id
  }

  private async thread(projectId: string, threadId: string) {
    const [t] = await this.db.select().from(commentThreads).where(eq(commentThreads.id, threadId))
    if (!t || t.projectId !== projectId) throw new NotFoundError('Comment not found')
    return t
  }

  private async message(threadId: string, messageId: string) {
    const [m] = await this.db.select().from(commentMessages).where(eq(commentMessages.id, messageId))
    if (!m || m.threadId !== threadId) throw new NotFoundError('Message not found')
    return m
  }

  async reply(projectId: string, threadId: string, actor: Actor, content: string): Promise<void> {
    await this.thread(projectId, threadId)
    const messageId = newId()
    await this.db.insert(commentMessages).values({ id: messageId, threadId, userId: actor.userId, content })
    await this.collab.reviewChanged(projectId)
    await this.notifications.commentMessage(projectId, actor.userId, { threadId, messageId }, content, { reply: true })
    // Replying means having read the thread.
    await this.notifications.markSeen(actor.userId, { projectId, threadId })
  }

  async editMessage(projectId: string, threadId: string, messageId: string, actor: Actor, content: string): Promise<void> {
    await this.thread(projectId, threadId)
    const m = await this.message(threadId, messageId)
    if (m.userId !== actor.userId) throw new ForbiddenError('You can only edit your own messages')
    await this.db.update(commentMessages).set({ content, editedAt: new Date() }).where(eq(commentMessages.id, messageId))
    await this.collab.reviewChanged(projectId)
    await this.notifications.commentMessage(projectId, actor.userId, { threadId, messageId }, content, { previous: m.content })
  }

  async deleteMessage(projectId: string, threadId: string, messageId: string, actor: Actor): Promise<void> {
    const t = await this.thread(projectId, threadId)
    const m = await this.message(threadId, messageId)
    if (m.userId !== actor.userId && !canModerate(actor.role)) throw new ForbiddenError('You can only delete your own messages')
    await this.db.delete(commentMessages).where(eq(commentMessages.id, messageId))
    // A thread without messages has nothing left to show.
    const rest = await this.db.select({ id: commentMessages.id }).from(commentMessages).where(eq(commentMessages.threadId, threadId)).limit(1)
    if (rest.length === 0) await this.deleteThreadRow(projectId, t.docId, threadId, actor.userId)
    await this.collab.reviewChanged(projectId)
  }

  async setResolved(projectId: string, threadId: string, actor: Actor, resolved: boolean): Promise<void> {
    const t = await this.thread(projectId, threadId)
    if (t.createdBy !== actor.userId && !canModerate(actor.role)) throw new ForbiddenError('Only editors and the author can resolve comments')
    await this.db
      .update(commentThreads)
      .set(resolved ? { resolvedAt: new Date(), resolvedBy: actor.userId } : { resolvedAt: null, resolvedBy: null })
      .where(eq(commentThreads.id, threadId))
    await this.collab.reviewChanged(projectId)
  }

  async deleteThread(projectId: string, threadId: string, actor: Actor): Promise<void> {
    const t = await this.thread(projectId, threadId)
    if (t.createdBy !== actor.userId && !canModerate(actor.role)) throw new ForbiddenError('Only editors and the author can delete comments')
    await this.deleteThreadRow(projectId, t.docId, threadId, actor.userId)
    await this.collab.reviewChanged(projectId)
  }

  private async deleteThreadRow(projectId: string, docId: string, threadId: string, userId: string): Promise<void> {
    await this.db.delete(commentThreads).where(eq(commentThreads.id, threadId))
    await this.removeAnchor(projectId, docId, threadId, userId)
  }

  private removeAnchor(projectId: string, docId: string, threadId: string, userId: string): Promise<void> {
    return this.collab.editDoc(projectId, docId, userId, doc => {
      commentsMap(doc).delete(threadId)
    })
  }

  /**
   * Accept or reject tracked changes: the listed ids (in `docId`, or searched
   * across the project), everything in `docId`, or everything. Returns how
   * many changes were decided.
   */
  async decide(projectId: string, actor: Actor, decision: 'accept' | 'reject', target: { docId?: string; ids?: string[] }): Promise<{ count: number; undoId: string | null }> {
    const docs = await this.collab.listDocs(projectId)
    // Reviewers can't decide, except to withdraw (reject) their own suggestions.
    if (!canModerate(actor.role)) {
      if (decision !== 'reject' || !target.ids) throw new ForbiddenError('Only editors can accept or reject changes')
      const ids = target.ids
      for (const d of target.docId ? docs.filter(x => x.id === target.docId) : docs) {
        const foreign = await this.collab.readDoc(projectId, d.id, doc => ids.some(id => {
          const rec = changesMap(doc).get(id)
          return rec !== undefined && rec.userId !== actor.userId
        }), doc => changesMap(doc).size > 0)
        if (foreign) throw new ForbiddenError('Reviewers can only withdraw their own suggestions')
      }
    }
    if (target.docId && !docs.some(d => d.id === target.docId)) throw new NotFoundError('File not found')
    const candidates = target.docId ? docs.filter(d => d.id === target.docId) : docs
    const bulk = !target.ids
    // A bulk decision is a big change: keep the state before it as a version of its own.
    if (bulk && decision === 'reject') await this.history.checkpoint(projectId)

    let count = 0
    const undone: PendingUndo['docs'] = []
    for (const d of candidates) {
      const has = await this.collab.readDoc(projectId, d.id, doc => {
        const map = changesMap(doc)
        return target.ids ? target.ids.some(id => map.has(id)) : map.size > 0
      }, doc => changesMap(doc).size > 0)
      if (!has) continue
      const undo: DecisionUndo[] = []
      const done = await this.collab.editDoc(projectId, d.id, actor.userId, doc =>
        decision === 'accept' ? acceptChanges(doc, target.ids ?? 'all', undefined, undo) : rejectChanges(doc, target.ids ?? 'all', undefined, undo),
      )
      count += done.length
      if (undo.length) undone.push({ docId: d.id, undo })
    }
    if (count > 0) {
      if (decision === 'reject') this.history.noteChange(projectId, actor.userId, 'review')
      await this.collab.reviewChanged(projectId)
    }
    this.pruneUndos()
    if (!undone.length) return { count, undoId: null }
    const undoId = newUndoId()
    this.undos.set(undoId, { projectId, userId: actor.userId, decision, at: Date.now(), docs: undone })
    return { count, undoId }
  }

  /**
   * Take back a recent accept or reject (once, by whoever made it). Changes
   * whose text was edited since stay as they are. Returns how many came back.
   */
  async undoDecision(projectId: string, actor: Actor, undoId: string): Promise<number> {
    this.pruneUndos()
    const pending = this.undos.get(undoId)
    if (!pending || pending.projectId !== projectId || pending.userId !== actor.userId) throw new NotFoundError('This can no longer be undone')
    this.undos.delete(undoId)
    const docs = new Set((await this.collab.listDocs(projectId)).map(d => d.id))
    let count = 0
    for (const d of pending.docs) {
      if (!docs.has(d.docId)) continue
      count += await this.collab.editDoc(projectId, d.docId, actor.userId, doc => undoDecision(doc, d.undo))
    }
    if (count > 0) {
      if (pending.decision === 'reject') this.history.noteChange(projectId, actor.userId, 'review')
      await this.collab.reviewChanged(projectId)
    }
    return count
  }

  private pruneUndos(): void {
    const cutoff = Date.now() - UNDO_TTL_MS
    for (const [id, u] of this.undos) if (u.at < cutoff) this.undos.delete(id)
  }
}

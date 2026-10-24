import { and, count, desc, eq, inArray, isNotNull, isNull, lt, or, type SQL } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { mentionedIds, type Notification, type NotificationEvent, type NotificationPage } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { commentMessages, commentThreads, notifications, projectDocs, projectMembers, projects, user } from '../db/schema.ts'
import { NotFoundError } from '../errors.ts'

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const EXCERPT_LIMIT = 280
const DELETED_USER = 'Deleted user'

type Row = typeof notifications.$inferInsert

/** The start of a message, without a mention cut in half. */
function excerpt(content: string): string {
  if (content.length <= EXCERPT_LIMIT) return content
  return `${content.slice(0, EXCERPT_LIMIT).replace(/<@[\w-]*$/, '')}…`
}

/**
 * In-app notifications: written when someone is mentioned, gets a reply, or
 * is added to a project; read from the console; pushed live to the person's
 * open tabs. Only projects the person is still a member of are shown.
 */
// Someone who left a project no longer sees what happened in it; notifications about the
// account itself have no project. (Both queries left-join the person's membership.)
const visible = or(isNull(notifications.projectId), isNotNull(projectMembers.userId))

export class NotificationService {
  private readonly db: Db
  private readonly listeners = new Map<string, Set<(e: NotificationEvent) => void>>()

  constructor(db: Db) {
    this.db = db
  }

  subscribe(userId: string, listener: (e: NotificationEvent) => void): () => void {
    let set = this.listeners.get(userId)
    if (!set) this.listeners.set(userId, (set = new Set()))
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(userId)
    }
  }

  private select(userId: string, ...where: (SQL | undefined)[]) {
    return this.db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        projectId: notifications.projectId,
        projectName: projects.name,
        actorId: notifications.actorId,
        actorName: user.name,
        source: notifications.source,
        threadId: notifications.threadId,
        path: projectDocs.path,
        excerpt: notifications.excerpt,
        role: notifications.role,
      })
      .from(notifications)
      .leftJoin(projects, eq(projects.id, notifications.projectId))
      .leftJoin(projectMembers, and(eq(projectMembers.projectId, notifications.projectId), eq(projectMembers.userId, notifications.userId)))
      .leftJoin(user, eq(user.id, notifications.actorId))
      .leftJoin(commentThreads, eq(commentThreads.id, notifications.threadId))
      .leftJoin(projectDocs, eq(projectDocs.id, commentThreads.docId))
      .where(and(eq(notifications.userId, userId), visible, ...where))
  }

  private toNotification(r: Awaited<ReturnType<ReturnType<NotificationService['select']>['limit']>>[number]): Notification {
    return {
      id: r.id,
      kind: r.kind,
      read: r.readAt !== null,
      createdAt: r.createdAt.toISOString(),
      project: r.projectId && r.projectName !== null ? { id: r.projectId, name: r.projectName } : null,
      actor: { id: r.actorId, name: r.actorName ?? DELETED_USER },
      source: r.source,
      threadId: r.threadId,
      path: r.path,
      excerpt: r.excerpt,
      role: r.role,
    }
  }

  /** Names for the people mentioned in these excerpts. */
  private async names(list: Notification[]): Promise<Record<string, string>> {
    const ids = [...new Set(list.flatMap(n => mentionedIds(n.excerpt)))]
    if (ids.length === 0) return {}
    const rows = await this.db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids))
    return Object.fromEntries(rows.map(r => [r.id, r.name]))
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(notifications)
      .leftJoin(projectMembers, and(eq(projectMembers.projectId, notifications.projectId), eq(projectMembers.userId, notifications.userId)))
      .where(and(eq(notifications.userId, userId), visible, isNull(notifications.readAt)))
    return row?.n ?? 0
  }

  async list(userId: string, options: { before?: string; limit: number; unread?: boolean }): Promise<NotificationPage> {
    let older: SQL | undefined
    if (options.before) {
      // Page by (created_at, id), so notifications made in the same instant aren't skipped.
      const [anchor] = await this.db
        .select({ createdAt: notifications.createdAt })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.id, options.before)))
      if (!anchor) throw new NotFoundError('Notification not found')
      older = or(
        lt(notifications.createdAt, anchor.createdAt),
        and(eq(notifications.createdAt, anchor.createdAt), lt(notifications.id, options.before)),
      )
    }
    const rows = await this.select(userId, older, options.unread ? isNull(notifications.readAt) : undefined)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(options.limit + 1)
    const list = rows.slice(0, options.limit).map(r => this.toNotification(r))
    return { notifications: list, unread: await this.unreadCount(userId), hasMore: rows.length > options.limit, users: await this.names(list) }
  }

  /** Mark some (or all) of a person's notifications read or unread. */
  async markRead(userId: string, ids: string[] | undefined, read: boolean): Promise<number> {
    if (ids?.length === 0) return this.unreadCount(userId)
    await this.db
      .update(notifications)
      .set({ readAt: read ? new Date() : null })
      .where(and(eq(notifications.userId, userId), ids ? inArray(notifications.id, ids) : undefined))
    const unread = await this.unreadCount(userId)
    // Other open tabs update their count.
    this.emit(userId, { unread })
    return unread
  }

  /** Mark read whatever points at this chat or thread, once the person has seen it there. */
  async markSeen(userId: string, target: { projectId: string; chat: true } | { projectId: string; threadId: string }): Promise<void> {
    const where =
      'threadId' in target ? eq(notifications.threadId, target.threadId) : and(eq(notifications.source, 'chat'), eq(notifications.kind, 'mention'))
    const changed = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.projectId, target.projectId), isNull(notifications.readAt), where))
      .returning({ id: notifications.id })
    if (changed.length > 0) this.emit(userId, { unread: await this.unreadCount(userId) })
  }

  /** Their password was set from the server's command line (`cli.ts reset-password`). */
  async passwordReset(userId: string): Promise<void> {
    await this.create([{ userId, projectId: null, actorId: null, kind: 'password_reset', excerpt: '' }])
  }

  private emit(userId: string, event: NotificationEvent): void {
    for (const listener of this.listeners.get(userId) ?? []) listener(event)
  }

  private async create(rows: Omit<Row, 'id'>[]): Promise<void> {
    if (rows.length === 0) return
    const inserted = await this.db
      .insert(notifications)
      .values(rows.map(r => ({ ...r, id: newId() })))
      .returning({ id: notifications.id, userId: notifications.userId })
    for (const { id, userId } of inserted) {
      if (!this.listeners.has(userId)) continue
      const [row] = await this.select(userId, eq(notifications.id, id)).limit(1)
      if (!row) continue
      const notification = this.toNotification(row)
      this.emit(userId, { unread: await this.unreadCount(userId), notification, users: await this.names([notification]) })
    }
  }

  /** Which of these users are members of the project. */
  private async members(projectId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set()
    const rows = await this.db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), inArray(projectMembers.userId, ids)))
    return new Set(rows.map(r => r.userId))
  }

  /**
   * The members newly mentioned in a message: everyone it mentions, minus the
   * author and anyone the message's previous text already mentioned.
   */
  private async newMentions(projectId: string, actorId: string, content: string, previous?: string): Promise<string[]> {
    const before = new Set(previous === undefined ? [] : mentionedIds(previous))
    const ids = mentionedIds(content).filter(id => id !== actorId && !before.has(id))
    const members = await this.members(projectId, ids)
    return ids.filter(id => members.has(id))
  }

  /**
   * A chat message was sent, or edited (`previous` is its old text): notify
   * the people it newly mentions, and drop the notifications of anyone an edit
   * no longer mentions.
   */
  async chatMessage(projectId: string, actorId: string, messageId: string, content: string, previous?: string): Promise<void> {
    if (previous !== undefined) await this.dropMentions({ chatMessageId: messageId }, content)
    const mentioned = await this.newMentions(projectId, actorId, content, previous)
    await this.create(
      mentioned.map(userId => ({ userId, projectId, actorId, kind: 'mention', source: 'chat', chatMessageId: messageId, excerpt: excerpt(content) })),
    )
  }

  /**
   * A comment was written (the first message of a thread or a reply) or
   * edited. Mentions notify as in the chat; a reply also notifies the thread's
   * other participants, unless it already mentions them.
   */
  async commentMessage(
    projectId: string,
    actorId: string,
    target: { threadId: string; messageId: string },
    content: string,
    options: { reply?: boolean; previous?: string } = {},
  ): Promise<void> {
    if (options.previous !== undefined) await this.dropMentions({ commentMessageId: target.messageId }, content)
    const mentioned = await this.newMentions(projectId, actorId, content, options.previous)
    const base = { projectId, actorId, source: 'comment' as const, threadId: target.threadId, commentMessageId: target.messageId, excerpt: excerpt(content) }
    const rows: Omit<Row, 'id'>[] = mentioned.map(userId => ({ ...base, userId, kind: 'mention' }))
    if (options.reply) {
      const [thread] = await this.db.select({ createdBy: commentThreads.createdBy }).from(commentThreads).where(eq(commentThreads.id, target.threadId))
      const authors = await this.db
        .selectDistinct({ userId: commentMessages.userId })
        .from(commentMessages)
        .where(eq(commentMessages.threadId, target.threadId))
      const skip = new Set([actorId, ...mentioned])
      const others = [...new Set([thread?.createdBy, ...authors.map(a => a.userId)])].filter((id): id is string => !!id && !skip.has(id))
      const members = await this.members(projectId, others)
      rows.push(...others.filter(id => members.has(id)).map(userId => ({ ...base, userId, kind: 'reply' as const })))
    }
    await this.create(rows)
  }

  /** After an edit: remove the mention notifications of people the message no longer mentions. */
  private async dropMentions(target: { chatMessageId: string } | { commentMessageId: string }, content: string): Promise<void> {
    const still = mentionedIds(content)
    const column = 'chatMessageId' in target ? eq(notifications.chatMessageId, target.chatMessageId) : eq(notifications.commentMessageId, target.commentMessageId)
    const removed = await this.db
      .select({ id: notifications.id, userId: notifications.userId })
      .from(notifications)
      .where(and(column, eq(notifications.kind, 'mention')))
    const gone = removed.filter(r => !still.includes(r.userId))
    if (gone.length === 0) return
    await this.db.delete(notifications).where(inArray(notifications.id, gone.map(r => r.id)))
    for (const userId of new Set(gone.map(r => r.userId))) this.emit(userId, { unread: await this.unreadCount(userId) })
  }

  /** Someone added a user to a project, or made them its owner. */
  async membership(projectId: string, actorId: string, userId: string, change: { kind: 'added'; role: Row['role'] } | { kind: 'owner' }): Promise<void> {
    if (userId === actorId) return
    await this.create([{ userId, projectId, actorId, kind: change.kind, role: change.kind === 'added' ? change.role : 'owner' }])
  }

  /** A user left or was removed from a project: their notifications about it go too. */
  async forgetProject(projectId: string, userId: string): Promise<void> {
    await this.db.delete(notifications).where(and(eq(notifications.projectId, projectId), eq(notifications.userId, userId)))
    this.emit(userId, { unread: await this.unreadCount(userId) })
  }
}

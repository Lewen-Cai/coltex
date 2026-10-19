import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { AiConversation, AiItem } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { aiConversations } from '../db/schema.ts'
import { NotFoundError } from '../errors.ts'

/** Conversations kept per person and project; older ones go when a new one is saved. */
const KEEP = 50

export type SavedConversation = {
  id: string
  title: string
  items: AiItem[]
  messages: AgentMessage[]
  contextTokens: number | null
}

/** The first thing the person asked, as the conversation's name. */
export function conversationTitle(items: AiItem[]): string {
  const first = items.find(i => i.kind === 'user')
  const text = first?.kind === 'user' ? `${first.skill ? `/${first.skill} ` : ''}${first.text}`.replace(/\s+/g, ' ').trim() : ''
  return text.length > 80 ? `${text.slice(0, 79)}…` : text || 'New chat'
}

/**
 * Saved assistant conversations (`ai_conversations`): each person's own, per
 * project. Sessions save themselves after every turn; the panel lists,
 * reopens, renames and deletes them.
 */
export class ConversationStore {
  private readonly db: Db

  constructor(db: Db) {
    this.db = db
  }

  async save(userId: string, projectId: string, c: SavedConversation): Promise<void> {
    const now = new Date()
    await this.db
      .insert(aiConversations)
      .values({ id: c.id, userId, projectId, title: c.title, items: c.items, messages: c.messages, contextTokens: c.contextTokens, updatedAt: now })
      .onConflictDoUpdate({
        target: aiConversations.id,
        // The title is set once (from the first message, or renamed); it stays.
        set: { items: c.items, messages: c.messages, contextTokens: c.contextTokens, updatedAt: now },
      })
    const keep = this.db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId)))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(KEEP)
    await this.db
      .delete(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId), notInArray(aiConversations.id, keep)))
  }

  async list(userId: string, projectId: string, currentId?: string): Promise<AiConversation[]> {
    const rows = await this.db
      .select({ id: aiConversations.id, title: aiConversations.title, items: aiConversations.items, updatedAt: aiConversations.updatedAt })
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId)))
      .orderBy(desc(aiConversations.updatedAt))
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt.toISOString(),
      messages: (r.items as AiItem[]).filter(i => i.kind === 'user').length,
      current: r.id === currentId,
    }))
  }

  /** One conversation, or the latest when no id is given (what the panel opens with). */
  async load(userId: string, projectId: string, id?: string): Promise<SavedConversation | undefined> {
    const [row] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId), id ? eq(aiConversations.id, id) : undefined))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(1)
    if (!row) return undefined
    // A tool still "running" was cut off (a restart): it won't finish now.
    const items = (row.items as AiItem[]).map(i => (i.kind === 'tool' && i.status === 'running' ? { ...i, status: 'error' as const } : i))
    return { id: row.id, title: row.title, items, messages: row.messages as AgentMessage[], contextTokens: row.contextTokens }
  }

  async rename(userId: string, projectId: string, id: string, title: string): Promise<void> {
    const done = await this.db
      .update(aiConversations)
      // Renaming doesn't move it up the list.
      .set({ title, updatedAt: sql`${aiConversations.updatedAt}` })
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId)))
      .returning({ id: aiConversations.id })
    if (!done.length) throw new NotFoundError('Conversation not found')
  }

  async delete(userId: string, projectId: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    await this.db
      .delete(aiConversations)
      .where(and(inArray(aiConversations.id, ids), eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId)))
  }
}

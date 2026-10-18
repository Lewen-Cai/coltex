import { and, desc, eq, lt, or } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { ChatBody, ChatMessage, ChatPage, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { chatMessages, user } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { ForbiddenError, NotFoundError } from '../errors.ts'

const messageId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const IdParams = z.object({ id: ProjectId })
const MessageParams = IdParams.extend({ messageId: z.string().min(1).max(32) })
const PAGE = 50

/**
 * The project's chat, like Overleaf's: every member (viewers too) can read and
 * write; authors can edit or delete their own messages. Open editors hear
 * about changes through the collaboration server and refetch.
 */
export const chatRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db, projects, collab, notifications }) => {
  const select = () =>
    db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        userName: user.name,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
        editedAt: chatMessages.editedAt,
      })
      .from(chatMessages)
      .leftJoin(user, eq(user.id, chatMessages.userId))

  type Row = Awaited<ReturnType<ReturnType<typeof select>['where']>>[number]
  // A deleted author has no name; the web app shows it as "Deleted user".
  const toMessage = (r: Row): ChatMessage => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName ?? 'Deleted user',
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
  })

  app.get(
    '/projects/:id/chat',
    {
      schema: {
        params: IdParams,
        querystring: z.object({ before: z.string().max(32).optional(), limit: z.coerce.number().int().min(1).max(200).default(PAGE) }),
        response: { 200: ChatPage },
      },
    },
    async req => {
      const { id } = req.params
      await projects.requireAccess(id, requireUser(req).id, 'viewer')
      let older = undefined
      if (req.query.before) {
        // Page by (created_at, id), so messages sent in the same instant aren't skipped.
        const [anchor] = await db
          .select({ createdAt: chatMessages.createdAt, id: chatMessages.id })
          .from(chatMessages)
          .where(and(eq(chatMessages.projectId, id), eq(chatMessages.id, req.query.before)))
        if (!anchor) throw new NotFoundError('Message not found')
        older = or(lt(chatMessages.createdAt, anchor.createdAt), and(eq(chatMessages.createdAt, anchor.createdAt), lt(chatMessages.id, anchor.id)))
      }
      const rows = await select()
        .where(and(eq(chatMessages.projectId, id), older))
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(req.query.limit + 1)
      const hasMore = rows.length > req.query.limit
      return { messages: rows.slice(0, req.query.limit).reverse().map(toMessage), hasMore }
    },
  )

  app.post('/projects/:id/chat', { schema: { params: IdParams, body: ChatBody, response: { 201: ChatMessage } } }, async (req, reply) => {
    const me = requireUser(req)
    const { id } = req.params
    await projects.requireAccess(id, me.id, 'viewer')
    const [row] = await db.insert(chatMessages).values({ id: messageId(), projectId: id, userId: me.id, content: req.body.content }).returning()
    await collab.chatChanged(id)
    await notifications.chatMessage(id, me.id, row!.id, row!.content)
    // Writing in the chat means having read it.
    await notifications.markSeen(me.id, { projectId: id, chat: true })
    return reply.code(201).send(toMessage({ ...row!, userName: me.name }))
  })

  /** The message, if it is in this project and written by this user. */
  const ownMessage = async (projectId: string, messageId: string, userId: string) => {
    const [row] = await db
      .select({ userId: chatMessages.userId, content: chatMessages.content })
      .from(chatMessages)
      .where(and(eq(chatMessages.projectId, projectId), eq(chatMessages.id, messageId)))
    if (!row) throw new NotFoundError('Message not found')
    if (row.userId !== userId) throw new ForbiddenError('You can only change your own messages')
    return row
  }

  app.patch('/projects/:id/chat/:messageId', { schema: { params: MessageParams, body: ChatBody } }, async (req, reply) => {
    const me = requireUser(req)
    const { id, messageId } = req.params
    await projects.requireAccess(id, me.id, 'viewer')
    const before = await ownMessage(id, messageId, me.id)
    await db.update(chatMessages).set({ content: req.body.content, editedAt: new Date() }).where(eq(chatMessages.id, messageId))
    await collab.chatChanged(id)
    await notifications.chatMessage(id, me.id, messageId, req.body.content, before.content)
    return reply.code(204).send()
  })

  app.delete('/projects/:id/chat/:messageId', { schema: { params: MessageParams } }, async (req, reply) => {
    const me = requireUser(req)
    const { id, messageId } = req.params
    await projects.requireAccess(id, me.id, 'viewer')
    await ownMessage(id, messageId, me.id)
    await db.delete(chatMessages).where(eq(chatMessages.id, messageId))
    await collab.chatChanged(id)
    return reply.code(204).send()
  })
}

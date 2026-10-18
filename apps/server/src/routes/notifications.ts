import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotificationPage, NotificationReadBody, ProjectId, type NotificationEvent } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const Unread = z.object({ unread: z.number() })

/** The signed-in user's notifications. */
export const notificationRoutes: FastifyPluginAsyncZod<Deps> = async (app, { notifications, projects }) => {
  app.get(
    '/me/notifications',
    {
      schema: {
        querystring: z.object({
          before: z.string().max(32).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(30),
          unread: z.stringbool().optional(),
        }),
        response: { 200: NotificationPage },
      },
    },
    async req => notifications.list(requireUser(req).id, req.query),
  )

  app.post('/me/notifications/read', { schema: { body: NotificationReadBody, response: { 200: Unread } } }, async req => ({
    unread: await notifications.markRead(requireUser(req).id, req.body.ids, req.body.read),
  }))

  /** The person has looked at a project's chat (no `threadId`) or at a comment thread. */
  app.post(
    '/me/notifications/seen',
    { schema: { body: z.object({ projectId: ProjectId, threadId: z.string().min(1).max(64).optional() }) } },
    async (req, reply) => {
      const userId = requireUser(req).id
      const { projectId, threadId } = req.body
      await projects.requireAccess(projectId, userId, 'viewer')
      await notifications.markSeen(userId, threadId ? { projectId, threadId } : { projectId, chat: true })
      return reply.code(204).send()
    },
  )

  // Server-sent events: the unread count first, then every change to it.
  app.get('/me/notifications/events', async (req, reply) => {
    const userId = requireUser(req).id
    const unread = await notifications.unreadCount(userId)
    reply.hijack()
    const res = reply.raw
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      // Tell reverse proxies (nginx) not to buffer the stream.
      'x-accel-buffering': 'no',
    })
    const send = (e: NotificationEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`)
    send({ unread })
    const unsubscribe = notifications.subscribe(userId, send)
    const ping = setInterval(() => res.write(': ping\n\n'), 15_000)
    req.raw.on('close', () => {
      clearInterval(ping)
      unsubscribe()
    })
  })
}

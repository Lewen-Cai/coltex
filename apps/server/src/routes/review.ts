import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ChangeDecisionBody, ChangeDecisionResult, CreateThreadBody, MessageBody, ProjectId, ReviewState, TrackChangesState } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })
const ThreadParams = IdParams.extend({ thread: z.string().min(1).max(64) })
const MessageParams = ThreadParams.extend({ message: z.string().min(1).max(64) })
const Ok = z.object({ ok: z.literal(true) })

/**
 * Comments and tracked changes. Viewers may read and take part in comment
 * threads (the server writes the anchor for them); deciding on tracked changes
 * and switching tracking needs edit rights.
 */
export const reviewRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, review }) => {
  const actor = async (projectId: string, req: Parameters<typeof requireUser>[0], minRole: 'viewer' | 'reviewer' | 'editor' = 'viewer') => {
    const userId = requireUser(req).id
    const { role } = await projects.requireAccess(projectId, userId, minRole)
    return { userId, role }
  }

  app.get('/projects/:id/review', { schema: { params: IdParams, response: { 200: ReviewState } } }, async req => {
    await actor(req.params.id, req)
    return review.state(req.params.id)
  })

  app.put(
    '/projects/:id/review/track-changes',
    { schema: { params: IdParams, body: TrackChangesState, response: { 200: TrackChangesState } } },
    async req => {
      await actor(req.params.id, req, 'editor')
      return review.setTrackChanges(req.params.id, req.body)
    },
  )

  app.post(
    '/projects/:id/review/threads',
    { schema: { params: IdParams, body: CreateThreadBody, response: { 201: z.object({ id: z.string() }) } } },
    async (req, reply) => {
      const id = await review.createThread(req.params.id, await actor(req.params.id, req), req.body)
      return reply.code(201).send({ id })
    },
  )

  app.delete('/projects/:id/review/threads/:thread', { schema: { params: ThreadParams, response: { 200: Ok } } }, async req => {
    await review.deleteThread(req.params.id, req.params.thread, await actor(req.params.id, req))
    return { ok: true as const }
  })

  app.post(
    '/projects/:id/review/threads/:thread/resolve',
    { schema: { params: ThreadParams, body: z.object({ resolved: z.boolean() }), response: { 200: Ok } } },
    async req => {
      await review.setResolved(req.params.id, req.params.thread, await actor(req.params.id, req), req.body.resolved)
      return { ok: true as const }
    },
  )

  app.post(
    '/projects/:id/review/threads/:thread/messages',
    { schema: { params: ThreadParams, body: MessageBody, response: { 200: Ok } } },
    async req => {
      await review.reply(req.params.id, req.params.thread, await actor(req.params.id, req), req.body.content)
      return { ok: true as const }
    },
  )

  app.patch(
    '/projects/:id/review/threads/:thread/messages/:message',
    { schema: { params: MessageParams, body: MessageBody, response: { 200: Ok } } },
    async req => {
      const { id, thread, message } = req.params
      await review.editMessage(id, thread, message, await actor(id, req), req.body.content)
      return { ok: true as const }
    },
  )

  app.delete('/projects/:id/review/threads/:thread/messages/:message', { schema: { params: MessageParams, response: { 200: Ok } } }, async req => {
    const { id, thread, message } = req.params
    await review.deleteMessage(id, thread, message, await actor(id, req))
    return { ok: true as const }
  })

  for (const decision of ['accept', 'reject'] as const) {
    app.post(
      `/projects/:id/review/changes/${decision}`,
      { schema: { params: IdParams, body: ChangeDecisionBody, response: { 200: ChangeDecisionResult } } },
      // Reviewers too, for withdrawing their own suggestions (checked by the service).
      async req => review.decide(req.params.id, await actor(req.params.id, req, 'reviewer'), decision, req.body),
    )
  }

  app.post(
    '/projects/:id/review/changes/undo',
    { schema: { params: IdParams, body: z.object({ undoId: z.string().min(1).max(64) }), response: { 200: z.object({ count: z.number() }) } } },
    async req => ({ count: await review.undoDecision(req.params.id, await actor(req.params.id, req, 'reviewer'), req.body.undoId) }),
  )
}

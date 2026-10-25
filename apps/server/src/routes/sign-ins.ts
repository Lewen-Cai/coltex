import { and, desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AccountSession, SignInBlocks, SignInEventPage, SignInEventQuery, UnblockBody } from '@coltex/shared'
import { requireAdmin, requireUser } from '../auth/fastify.ts'
import { session, user } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { NotFoundError } from '../errors.ts'

const UserParams = z.object({ id: z.string().min(1).max(64) })
const SessionParams = UserParams.extend({ sessionId: z.string().min(1).max(64) })

/**
 * The sign-in record: everyone reads their own (Settings → Account). Only the system
 * administrator sees everyone's, the devices people are signed in on (and signs them out), and
 * unlocks accounts and addresses (user's decision 2026-10-24).
 */
export const signInRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db, signIns, places }) => {
  app.get('/me/sign-ins', { schema: { querystring: z.object({ before: z.iso.datetime().optional() }), response: { 200: SignInEventPage } } }, async req =>
    signIns.events({ userId: requireUser(req).id, before: req.query.before }),
  )

  app.get('/admin/sign-ins', { schema: { querystring: SignInEventQuery, response: { 200: SignInEventPage } } }, async req => {
    requireAdmin(req)
    return signIns.events({ userId: req.query.user, failed: req.query.failed, before: req.query.before })
  })

  app.get('/admin/sign-ins/blocks', { schema: { response: { 200: SignInBlocks } } }, async req => {
    requireAdmin(req)
    return signIns.blocks()
  })

  app.post('/admin/sign-ins/unblock', { schema: { body: UnblockBody } }, async (req, reply) => {
    requireAdmin(req)
    await signIns.unblock(req.body.ip)
    return reply.code(204).send()
  })

  app.post('/admin/users/:id/unlock', { schema: { params: UserParams } }, async (req, reply) => {
    requireAdmin(req)
    if (!(await signIns.unlock(req.params.id))) {
      const [exists] = await db.select({ id: user.id }).from(user).where(eq(user.id, req.params.id))
      if (!exists) throw new NotFoundError('User not found')
    }
    return reply.code(204).send()
  })

  app.get('/admin/users/:id/sessions', { schema: { params: UserParams, response: { 200: z.array(AccountSession) } } }, async req => {
    requireAdmin(req)
    const rows = await db.select().from(session).where(eq(session.userId, req.params.id)).orderBy(desc(session.createdAt))
    const now = Date.now()
    return rows
      .filter(s => s.expiresAt.getTime() > now)
      .map(s => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        ip: s.ipAddress,
        place: places.place(s.ipAddress),
        device: s.userAgent,
        current: s.id === req.sessionId,
      }))
  })

  // Signing someone out: their session rows go, so the next request with that cookie has none.
  app.delete('/admin/users/:id/sessions/:sessionId', { schema: { params: SessionParams } }, async (req, reply) => {
    requireAdmin(req)
    await db.delete(session).where(and(eq(session.userId, req.params.id), eq(session.id, req.params.sessionId)))
    return reply.code(204).send()
  })

  app.delete('/admin/users/:id/sessions', { schema: { params: UserParams } }, async (req, reply) => {
    requireAdmin(req)
    await db.delete(session).where(eq(session.userId, req.params.id))
    return reply.code(204).send()
  })
}

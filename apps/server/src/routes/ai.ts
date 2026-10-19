import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  AiAdminState,
  AiGroup,
  AiGroupBody,
  AiApplyBody,
  AiApplyResult,
  AiLoginState,
  AiMessageBody,
  AiModelInfo,
  AiModelRef,
  AiSessionState,
  AiCompactBody,
  AiConversation,
  AiRenameBody,
  AiSaveProposedSkill,
  AiSkill,
  AiSettings,
  AiSettingsPatch,
  AiPreference,
  AiStatus,
  AiUsageReport,
  AiUserRow,
  CompileResult,
  ProjectId,
} from '@coltex/shared'
import type { FastifyRequest } from 'fastify'
import { requireAdmin, requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { ForbiddenError } from '../errors.ts'
import { streamAiEvents } from './sse.ts'

const IdParams = z.object({ id: ProjectId })
const Ok = z.object({ ok: z.literal(true) })

export const aiRoutes: FastifyPluginAsyncZod<Deps> = async (app, { ai, aiSessions, projects }) => {
  /**
   * The caller is a member and AI is set up. Every member can ask questions;
   * editors also get the drafting tools, and only they can apply.
   */
  async function sessionFor(req: FastifyRequest<{ Params: { id: string } }>, create = true) {
    const user = requireUser(req)
    const { project, role } = await projects.requireAccess(req.params.id, user.id, 'viewer')
    const status = await ai.statusFor(user)
    if (!status.available) throw new ForbiddenError(status.reason ?? 'The AI agent is unavailable')
    const canEdit = role === 'owner' || role === 'editor'
    return { user, project, canEdit, session: (await aiSessions.get(user, project, create, canEdit))! }
  }

  async function editingSessionFor(req: FastifyRequest<{ Params: { id: string } }>) {
    const s = await sessionFor(req)
    if (!s.canEdit) throw new ForbiddenError('Only editors can apply changes')
    return s
  }

  app.get('/ai/status', { schema: { response: { 200: AiStatus } } }, async req => ai.statusFor(requireUser(req)))

  // The model and thinking level picked in the assistant panel, kept for next time.
  app.put('/ai/preference', { schema: { body: AiPreference, response: { 200: AiStatus } } }, async req => {
    const user = requireUser(req)
    const status = await ai.statusFor(user)
    if (!status.available) throw new ForbiddenError(status.reason ?? 'The AI agent is unavailable')
    return ai.setPreference(user, req.body)
  })

  // ---- Sessions ---------------------------------------------------------------

  app.get('/projects/:id/ai/session', { schema: { params: IdParams, response: { 200: AiSessionState } } }, async req => {
    const { session } = await sessionFor(req)
    return session.state()
  })

  // Server-sent events: a snapshot first, then live updates.
  app.get('/projects/:id/ai/session/events', { schema: { params: IdParams } }, async (req, reply) => {
    const { session } = await sessionFor(req)
    streamAiEvents(req, reply, send => session.subscribe(send))
  })

  app.post(
    '/projects/:id/ai/session/messages',
    { schema: { params: IdParams, body: AiMessageBody, response: { 202: Ok } } },
    async (req, reply) => {
      const { session, project, user } = await sessionFor(req)
      await session.send(req.body, project, user)
      return reply.code(202).send({ ok: true })
    },
  )

  app.post('/projects/:id/ai/session/abort', { schema: { params: IdParams, response: { 200: Ok } } }, async req => {
    const { session } = await sessionFor(req)
    session.abort()
    return { ok: true as const }
  })

  app.post('/projects/:id/ai/session/reset', { schema: { params: IdParams, response: { 200: AiSessionState } } }, async req => {
    const { user, project, canEdit } = await sessionFor(req, false)
    return aiSessions.reset(user, project, canEdit).state()
  })

  app.post(
    '/projects/:id/ai/session/compact',
    { schema: { params: IdParams, body: AiCompactBody, response: { 202: Ok } } },
    async (req, reply) => {
      const { session, user } = await sessionFor(req)
      await session.compact(user, req.body.preference)
      return reply.code(202).send({ ok: true })
    },
  )

  // Save a skill the agent proposed in this conversation (personal, or the project's for editors).
  app.post(
    '/projects/:id/ai/session/skills/:item',
    { schema: { params: z.object({ id: ProjectId, item: z.string().min(1).max(64) }), body: AiSaveProposedSkill, response: { 201: AiSkill } } },
    async (req, reply) => {
      const { session, user } = await sessionFor(req)
      return reply.code(201).send(await session.saveProposedSkill(req.params.item, req.body, user))
    },
  )

  // ---- Saved conversations (each person's own) ----

  const ConversationParams = z.object({ id: z.string(), conversation: z.string().min(1).max(64) })

  app.get('/projects/:id/ai/conversations', { schema: { params: IdParams, response: { 200: z.array(AiConversation) } } }, async req => {
    const { user, project } = await sessionFor(req, false)
    return aiSessions.conversations.list(user.id, project.id, aiSessions.currentId(user, project))
  })

  app.post(
    '/projects/:id/ai/conversations/:conversation/open',
    { schema: { params: ConversationParams, response: { 200: AiSessionState } } },
    async req => {
      const { user, project, canEdit } = await sessionFor(req, false)
      return (await aiSessions.open(user, project, canEdit, req.params.conversation)).state()
    },
  )

  app.put('/projects/:id/ai/conversations/:conversation', { schema: { params: ConversationParams, body: AiRenameBody } }, async (req, reply) => {
    const { user, project } = await sessionFor(req, false)
    await aiSessions.conversations.rename(user.id, project.id, req.params.conversation, req.body.title)
    return reply.code(204).send()
  })

  app.delete('/projects/:id/ai/conversations/:conversation', { schema: { params: ConversationParams } }, async (req, reply) => {
    const { user, project, canEdit } = await sessionFor(req, false)
    await aiSessions.remove(user, project, canEdit, [req.params.conversation])
    return reply.code(204).send()
  })

  app.post('/projects/:id/ai/session/discard', { schema: { params: IdParams, response: { 200: Ok } } }, async req => {
    const { session } = await sessionFor(req)
    session.discard()
    return { ok: true as const }
  })

  app.post(
    '/projects/:id/ai/session/apply',
    { schema: { params: IdParams, body: AiApplyBody, response: { 200: AiApplyResult } } },
    async req => {
      const { session, project, user } = await editingSessionFor(req)
      return session.apply(req.body, project, user)
    },
  )

  app.post(
    '/projects/:id/ai/session/undo',
    { schema: { params: IdParams, response: { 200: z.object({ message: z.string(), compile: CompileResult }) } } },
    async req => {
      const { session, project } = await editingSessionFor(req)
      return session.undo(project)
    },
  )

  // ---- Admin: providers, credentials, model, usage ----------------------------------

  app.get('/admin/ai', { schema: { response: { 200: AiAdminState } } }, async req => {
    requireAdmin(req)
    return ai.adminState()
  })

  app.put('/admin/ai/settings', { schema: { body: AiSettingsPatch, response: { 200: AiSettings } } }, async req => {
    requireAdmin(req)
    return ai.updateSettings(req.body)
  })

  app.get('/admin/ai/models', { schema: { response: { 200: z.array(AiModelInfo) } } }, async req => {
    requireAdmin(req)
    return ai.availableModels()
  })

  app.post(
    '/admin/ai/providers/:provider/login',
    {
      schema: {
        params: z.object({ provider: z.string().min(1) }),
        body: z.object({ type: z.enum(['api_key', 'oauth']) }),
        response: { 200: AiLoginState },
      },
    },
    async req => {
      requireAdmin(req)
      return ai.startLogin(req.params.provider, req.body.type)
    },
  )

  app.delete(
    '/admin/ai/providers/:provider/credential',
    { schema: { params: z.object({ provider: z.string().min(1) }) } },
    async (req, reply) => {
      requireAdmin(req)
      await ai.logout(req.params.provider)
      return reply.code(204).send()
    },
  )

  const LoginParams = z.object({ login: z.string().uuid() })

  app.get('/admin/ai/logins/:login', { schema: { params: LoginParams, response: { 200: AiLoginState } } }, async req => {
    requireAdmin(req)
    return ai.loginState(req.params.login)
  })

  app.post(
    '/admin/ai/logins/:login/answer',
    {
      schema: {
        params: LoginParams,
        body: z.object({ promptId: z.string(), value: z.string().max(20_000) }),
        response: { 200: AiLoginState },
      },
    },
    async req => {
      requireAdmin(req)
      return ai.answerLogin(req.params.login, req.body.promptId, req.body.value)
    },
  )

  app.post('/admin/ai/logins/:login/cancel', { schema: { params: LoginParams, response: { 200: AiLoginState } } }, async req => {
    requireAdmin(req)
    return ai.cancelLogin(req.params.login)
  })

  app.post(
    '/admin/ai/test',
    { schema: { body: AiModelRef, response: { 200: z.object({ ok: z.boolean(), message: z.string(), ms: z.number() }) } } },
    async req => {
      requireAdmin(req)
      return ai.testModel(req.body)
    },
  )

  const Days = z.coerce.number().int().min(1).max(366).default(30)

  app.get(
    '/admin/ai/usage',
    { schema: { querystring: z.object({ days: Days, userId: z.string().min(1).optional() }), response: { 200: AiUsageReport } } },
    async req => {
      requireAdmin(req)
      return ai.usageReport(req.query.days, req.query.userId)
    },
  )

  app.get('/admin/ai/users', { schema: { querystring: z.object({ days: Days }), response: { 200: z.array(AiUserRow) } } }, async req => {
    requireAdmin(req)
    return ai.userRows(req.query.days)
  })

  // AI groups: what their members may use. People in none can't use the assistant (admins always can).
  app.get('/admin/ai/groups', { schema: { response: { 200: z.array(AiGroup) } } }, async req => {
    requireAdmin(req)
    return ai.listGroups()
  })

  app.post('/admin/ai/groups', { schema: { body: AiGroupBody, response: { 201: AiGroup } } }, async (req, reply) => {
    requireAdmin(req)
    return reply.code(201).send(await ai.createGroup(req.body))
  })

  const GroupParams = z.object({ groupId: z.string().min(1) })

  app.put('/admin/ai/groups/:groupId', { schema: { params: GroupParams, body: AiGroupBody, response: { 200: AiGroup } } }, async req => {
    requireAdmin(req)
    return ai.updateGroup(req.params.groupId, req.body)
  })

  app.delete('/admin/ai/groups/:groupId', { schema: { params: GroupParams } }, async (req, reply) => {
    requireAdmin(req)
    await ai.deleteGroup(req.params.groupId)
    return reply.code(204).send()
  })

  // A person's group; null: none.
  app.put(
    '/admin/ai/users/:userId/group',
    { schema: { params: z.object({ userId: z.string().min(1) }), body: z.object({ groupId: z.string().min(1).nullable() }), response: { 200: Ok } } },
    async req => {
      requireAdmin(req)
      await ai.setUserGroup(req.params.userId, req.body.groupId)
      return { ok: true as const }
    },
  )
}

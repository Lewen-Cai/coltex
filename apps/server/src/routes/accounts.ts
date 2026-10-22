import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AcceptInviteBody, CreateInviteBody, Invite, InviteInfo, ManagedUser, SetPasswordBody, SetRoleBody, SetTeamBody, SetupBody, SuspendBody, UserMatch } from '@coltex/shared'
import { requireManager, requireUser, sendWebResponse } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'

export const accountRoutes: FastifyPluginAsyncZod<Deps> = async (app, { accounts }) => {
  // ---- First-run setup (public while no users exist) ----

  // `language`: what install.sh was run in, so the setup page starts in it.
  app.get('/setup', { schema: { response: { 200: z.object({ needsSetup: z.boolean(), language: z.enum(['en', 'zh']).nullable() }) } } }, async () => ({
    needsSetup: await accounts.needsSetup(),
    language: config.installLanguage,
  }))

  app.post('/setup', { schema: { body: SetupBody } }, async (req, reply) => {
    await accounts.setup(req.body)
    return sendWebResponse(reply, await accounts.signIn(req.body.email, req.body.password))
  })

  // Links people pass on are built from the public address, not the one the creator happens to use.
  // Sharing is with people who have an account here; owners find them by name or email.
  app.get(
    '/users/search',
    { schema: { querystring: z.object({ q: z.string().trim().min(1).max(100) }), response: { 200: z.array(UserMatch) } } },
    async req => {
      requireUser(req)
      return accounts.searchUsers(req.query.q)
    },
  )

  // ---- Invites (public: look up and redeem a token) ----

  const TokenParams = z.object({ token: z.string().min(20).max(100) })

  app.get('/invites/:token', { schema: { params: TokenParams, response: { 200: InviteInfo } } }, req =>
    accounts.inviteInfo(req.params.token),
  )

  app.post('/invites/:token/accept', { schema: { params: TokenParams, body: AcceptInviteBody } }, async (req, reply) => {
    await accounts.acceptInvite(req.params.token, req.body)
    return sendWebResponse(reply, await accounts.signIn(req.body.email, req.body.password))
  })

  // ---- Invitations and users: the system administrator everyone, admins their own team ----

  app.get('/admin/invites', { schema: { response: { 200: z.array(Invite) } } }, req => accounts.listInvites(requireManager(req)))

  app.post(
    '/admin/invites',
    { schema: { body: CreateInviteBody, response: { 201: z.object({ invite: Invite, token: z.string() }) } } },
    async (req, reply) => {
      return reply.code(201).send(await accounts.createInvite(requireManager(req), req.body))
    },
  )

  app.delete('/admin/invites/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req, reply) => {
    await accounts.revokeInvite(req.params.id, requireManager(req))
    return reply.code(204).send()
  })

  const UserParams = z.object({ id: z.string().min(1) })

  app.get('/admin/users', { schema: { response: { 200: z.array(ManagedUser) } } }, req => accounts.listUsers(requireManager(req)))

  app.post('/admin/users/:id/password', { schema: { params: UserParams, body: SetPasswordBody } }, async (req, reply) => {
    await accounts.setPassword(requireManager(req), req.params.id, req.body.password)
    return reply.code(204).send()
  })

  app.put('/admin/users/:id/suspended', { schema: { params: UserParams, body: SuspendBody } }, async (req, reply) => {
    await accounts.suspend(requireManager(req), req.params.id, req.body.suspended)
    return reply.code(204).send()
  })

  app.delete('/admin/users/:id', { schema: { params: UserParams } }, async (req, reply) => {
    await accounts.deleteUser(requireManager(req), req.params.id)
    return reply.code(204).send()
  })

  app.put('/admin/users/:id/role', { schema: { params: UserParams, body: SetRoleBody } }, async (req, reply) => {
    await accounts.setRole(requireManager(req), req.params.id, req.body.role)
    return reply.code(204).send()
  })

  app.put('/admin/users/:id/team', { schema: { params: UserParams, body: SetTeamBody } }, async (req, reply) => {
    await accounts.setTeam(requireManager(req), req.params.id, req.body.managerId)
    return reply.code(204).send()
  })
}

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Group, GroupInviteBody, GroupName, ProjectGroupShare, ProjectId, ProjectRole } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const GroupParams = z.object({ groupId: z.string().min(1).max(32) })
const GroupMemberParams = GroupParams.extend({ userId: z.string().min(1) })

/** Settings → Groups, and projects shared with groups (the share dialog). */
export const groupRoutes: FastifyPluginAsyncZod<Deps> = async (app, { groups, projects }) => {
  app.get('/me/groups', { schema: { response: { 200: z.array(Group) } } }, req => groups.listForUser(requireUser(req).id))

  app.post('/groups', { schema: { body: z.object({ name: GroupName }), response: { 201: Group } } }, async (req, reply) =>
    reply.code(201).send(await groups.create(requireUser(req).id, req.body.name)),
  )

  app.patch('/groups/:groupId', { schema: { params: GroupParams, body: z.object({ name: GroupName }) } }, async (req, reply) => {
    await groups.rename(req.params.groupId, requireUser(req).id, req.body.name)
    return reply.code(204).send()
  })

  app.delete('/groups/:groupId', { schema: { params: GroupParams } }, async (req, reply) => {
    await groups.delete(req.params.groupId, requireUser(req).id)
    return reply.code(204).send()
  })

  app.post('/groups/:groupId/invites', { schema: { params: GroupParams, body: GroupInviteBody } }, async (req, reply) => {
    await groups.invite(req.params.groupId, requireUser(req).id, req.body.userId)
    return reply.code(204).send()
  })

  app.post('/groups/:groupId/accept', { schema: { params: GroupParams } }, async (req, reply) => {
    await groups.accept(req.params.groupId, requireUser(req).id)
    return reply.code(204).send()
  })

  // Decline or leave (yourself), remove someone or take back an invitation (owners).
  app.delete('/groups/:groupId/members/:userId', { schema: { params: GroupMemberParams } }, async (req, reply) => {
    await groups.remove(req.params.groupId, requireUser(req).id, req.params.userId)
    return reply.code(204).send()
  })

  app.patch(
    '/groups/:groupId/members/:userId',
    { schema: { params: GroupMemberParams, body: z.object({ role: z.enum(['owner', 'member']) }) } },
    async (req, reply) => {
      await groups.setRole(req.params.groupId, requireUser(req).id, req.params.userId, req.body.role)
      return reply.code(204).send()
    },
  )

  // ---- Projects shared with groups ----

  const ProjectParams = z.object({ id: ProjectId })
  const ShareParams = ProjectParams.extend({ groupId: z.string().min(1).max(32) })

  app.get('/projects/:id/groups', { schema: { params: ProjectParams, response: { 200: z.array(ProjectGroupShare) } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return groups.listProjectShares(req.params.id)
  })

  // Owners share with groups they are in; the role is changed the same way.
  app.put(
    '/projects/:id/groups/:groupId',
    { schema: { params: ShareParams, body: z.object({ role: ProjectRole.exclude(['owner']) }) } },
    async (req, reply) => {
      const me = requireUser(req)
      await projects.requireAccess(req.params.id, me.id, 'owner')
      await groups.shareProject(req.params.id, req.params.groupId, req.body.role, me.id)
      return reply.code(204).send()
    },
  )

  app.delete('/projects/:id/groups/:groupId', { schema: { params: ShareParams } }, async (req, reply) => {
    const me = requireUser(req)
    await projects.requireAccess(req.params.id, me.id, 'owner')
    await groups.unshareProject(req.params.id, req.params.groupId, me.id)
    return reply.code(204).send()
  })
}

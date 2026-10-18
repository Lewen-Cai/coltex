import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  AddMemberBody,
  CopyProjectBody,
  CreateProjectBody,
  ProjectId,
  ProjectMember,
  ProjectMeta,
  ProjectRole,
  ProjectSummary,
  ProjectTree,
  UpdateProjectBody,
} from '@coltex/shared'
import { requireUser, sendWebResponse } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })

export const projectRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, store, collab, aiSessions, history, notifications, templates }) => {
  app.get('/projects', { schema: { response: { 200: z.array(ProjectSummary) } } }, req =>
    projects.listForUser(requireUser(req).id),
  )

  app.post('/projects', { schema: { body: CreateProjectBody, response: { 201: ProjectMeta } } }, async (req, reply) => {
    const user = requireUser(req)
    const content = await templates.contents(req.body.template)
    let project = await projects.create(user.id, req.body.name, req.body.engine ?? content.engine, content)
    if (content.spellCheckLanguage !== undefined) {
      project = await projects.update(project.id, { spellCheckLanguage: content.spellCheckLanguage as ProjectMeta['spellCheckLanguage'] })
    }
    await history.record(project.id, 'create', [user.id])
    return reply.code(201).send(project)
  })

  app.get(
    '/projects/:id',
    {
      schema: {
        params: IdParams,
        response: {
          200: ProjectTree.extend({
            project: ProjectMeta,
            role: ProjectRole,
            /** Collaborative document ids by path, so open editors can follow renames. */
            docs: z.array(z.object({ id: z.string(), path: z.string() })),
          }),
        },
      },
    },
    async req => {
      const { project, role } = await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      return { project, role, ...(await store.listTree(project.id)), docs: await collab.listDocs(project.id) }
    },
  )

  // Like Overleaf's "Make a copy": anyone who can read a project may copy it.
  // The copy has the files and settings only; members, history and comments stay behind.
  app.post(
    '/projects/:id/copy',
    { schema: { params: IdParams, body: CopyProjectBody, response: { 201: ProjectMeta } } },
    async (req, reply) => {
      const user = requireUser(req)
      const { project } = await projects.requireAccess(req.params.id, user.id, 'viewer')
      await collab.flushProject(project.id)
      const tree = await store.listTree(project.id)
      const files = new Map<string, Buffer>()
      for (const f of tree.files) files.set(f.path, await store.readFile(project.id, f.path))
      const copy = await projects.create(user.id, req.body.name, project.engine, {
        files,
        folders: tree.folders,
        rootFile: project.rootFile,
      })
      const result = await projects.update(copy.id, { spellCheckLanguage: project.spellCheckLanguage })
      await history.record(copy.id, 'copy', [user.id])
      return reply.code(201).send(result)
    },
  )

  app.patch('/projects/:id', { schema: { params: IdParams, body: UpdateProjectBody, response: { 200: ProjectMeta } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
    const project = await projects.update(req.params.id, req.body)
    // Open editors refetch the project, so everyone gets the new main file, engine or spell-check language.
    await collab.treeChanged(project.id)
    return project
  })

  app.delete('/projects/:id', { schema: { params: IdParams } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'owner')
    collab.closeProject(req.params.id)
    aiSessions.dropProject(req.params.id)
    history.dropProject(req.params.id)
    await collab.mutate(req.params.id, () => projects.delete(req.params.id))
    return reply.code(204).send()
  })

  // ---- Members ----

  app.get('/projects/:id/members', { schema: { params: IdParams, response: { 200: z.array(ProjectMember) } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return projects.listMembers(req.params.id)
  })

  app.post(
    '/projects/:id/members',
    { schema: { params: IdParams, body: AddMemberBody, response: { 201: ProjectMember } } },
    async (req, reply) => {
      const me = requireUser(req)
      await projects.requireAccess(req.params.id, me.id, 'owner')
      const member = await projects.addMember(req.params.id, req.body.email, req.body.role)
      await notifications.membership(req.params.id, me.id, member.userId, { kind: 'added', role: member.role })
      return reply.code(201).send(member)
    },
  )

  const MemberParams = IdParams.extend({ userId: z.string().min(1) })

  app.patch(
    '/projects/:id/members/:userId',
    { schema: { params: MemberParams, body: z.object({ role: ProjectRole.exclude(['owner']) }) } },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'owner')
      await projects.setMemberRole(req.params.id, req.params.userId, req.body.role)
      // Open connections carry the old role (e.g. write access): make them reconnect.
      collab.closeUser(req.params.id, req.params.userId)
      return reply.code(204).send()
    },
  )

  app.delete('/projects/:id/members/:userId', { schema: { params: MemberParams } }, async (req, reply) => {
    const me = requireUser(req)
    // Owners can remove anyone; members can remove themselves (leave the project).
    await projects.requireAccess(req.params.id, me.id, req.params.userId === me.id ? 'viewer' : 'owner')
    await projects.removeMember(req.params.id, req.params.userId)
    collab.closeUser(req.params.id, req.params.userId)
    await notifications.forgetProject(req.params.id, req.params.userId)
    return reply.code(204).send()
  })

  app.post(
    '/projects/:id/transfer',
    { schema: { params: IdParams, body: z.object({ userId: z.string().min(1) }) } },
    async (req, reply) => {
      const me = requireUser(req)
      await projects.requireAccess(req.params.id, me.id, 'owner')
      await projects.transferOwnership(req.params.id, me.id, req.body.userId)
      collab.closeUser(req.params.id, req.body.userId)
      await notifications.membership(req.params.id, me.id, req.body.userId, { kind: 'owner' })
      return reply.code(204).send()
    },
  )
}

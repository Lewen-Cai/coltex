import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ProjectId, ProjectTemplateState, TemplateBody, TemplateInfo } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })

export const templateRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, templates }) => {
  app.get('/templates', { schema: { response: { 200: z.array(TemplateInfo) } } }, req => templates.list(requireUser(req)))

  app.delete('/templates/:id', { schema: { params: z.object({ id: z.string().min(1).max(64) }) } }, async (req, reply) => {
    await templates.remove(req.params.id, requireUser(req))
    return reply.code(204).send()
  })

  // A project's own entry. Publishing makes its files available to everyone
  // on the server as a starting point, so only the owner decides.
  app.get('/projects/:id/template', { schema: { params: IdParams, response: { 200: ProjectTemplateState } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return templates.forProject(req.params.id)
  })

  app.put('/projects/:id/template', { schema: { params: IdParams, body: TemplateBody, response: { 200: ProjectTemplateState } } }, async req => {
    const user = requireUser(req)
    await projects.requireAccess(req.params.id, user.id, 'owner')
    return templates.publish(req.params.id, user.id, req.body)
  })

  app.delete('/projects/:id/template', { schema: { params: IdParams } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'owner')
    await templates.unpublishProject(req.params.id)
    return reply.code(204).send()
  })
}

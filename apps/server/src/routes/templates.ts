import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ImportedTemplate, ProjectId, ProjectTemplateState, TemplateBody, TemplateInfo } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError, ForbiddenError } from '../errors.ts'
import { projectFromImport, readImport } from './archive.ts'

const IdParams = z.object({ id: ProjectId })

export const templateRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, templates, history }) => {
  app.get('/templates', { schema: { response: { 200: z.array(TemplateInfo) } } }, req => templates.list(requireUser(req)))

  app.delete('/templates/:id', { schema: { params: z.object({ id: z.string().min(1).max(64) }) } }, async (req, reply) => {
    await templates.remove(req.params.id, requireUser(req))
    return reply.code(204).send()
  })

  // A journal's template zip (say, Springer Nature's) as a shared template in
  // one step: a project of the caller's holds the files, so they can change
  // them later like any template they published.
  app.post(
    '/templates/import',
    {
      bodyLimit: config.maxImportBytes,
      schema: { querystring: TemplateBody, response: { 201: ImportedTemplate } },
    },
    async (req, reply) => {
      // Administrators only (user's decision 2026-10-25): what everyone starts from is theirs to curate.
      const user = requireUser(req)
      if (user.role !== 'admin' && user.role !== 'manager') throw new ForbiddenError('Only admins can import templates')
      const archive = await readImport(req.body)
      if (!archive.rootFile) throw new BadRequestError('The archive contains no .tex file')
      const project = await projectFromImport({ projects, history }, user.id, req.query.name, archive)
      await templates.publish(project.id, user.id, req.query)
      const template = (await templates.list(user)).find(x => x.projectId === project.id)!
      return reply.code(201).send({ template, project, warnings: archive.warnings })
    },
  )

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

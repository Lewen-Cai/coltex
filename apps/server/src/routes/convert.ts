import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ConvertAnalysis, ConvertBody, ConvertReport, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })

/**
 * Journal template conversion. Anyone who can read a project can convert it:
 * the result is a new project of their own, and the original is untouched.
 */
export const convertRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, convert }) => {
  app.get('/projects/:id/convert', { schema: { params: IdParams, response: { 200: ConvertAnalysis } } }, async req => {
    const { project } = await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return convert.analyze(project)
  })

  app.post('/projects/:id/convert', { schema: { params: IdParams, body: ConvertBody, response: { 201: ConvertReport } } }, async (req, reply) => {
    const user = requireUser(req)
    const { project } = await projects.requireAccess(req.params.id, user.id, 'viewer')
    return reply.code(201).send(await convert.convert(project, user.id, req.body))
  })
}

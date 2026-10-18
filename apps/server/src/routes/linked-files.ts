import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { LinkedFile, LinkedFileBody, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })

export const linkedFileRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, linkedFiles }) => {
  app.get('/projects/:id/linked-files', { schema: { params: IdParams, response: { 200: z.array(LinkedFile) } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return linkedFiles.list(req.params.id)
  })

  // Adding and refreshing write files, so they need editors.
  app.post('/projects/:id/linked-files', { schema: { params: IdParams, body: LinkedFileBody, response: { 201: LinkedFile } } }, async (req, reply) => {
    const userId = requireUser(req).id
    await projects.requireAccess(req.params.id, userId, 'editor')
    return reply.code(201).send(await linkedFiles.link(req.params.id, userId, req.body.path, req.body.source))
  })

  app.post(
    '/projects/:id/linked-files/refresh',
    { schema: { params: IdParams, body: z.object({ path: z.string().min(1) }), response: { 200: LinkedFile } } },
    async req => {
      const userId = requireUser(req).id
      await projects.requireAccess(req.params.id, userId, 'editor')
      return linkedFiles.refresh(req.params.id, userId, req.body.path)
    },
  )
}

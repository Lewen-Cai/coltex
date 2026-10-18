import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  DoiBody,
  DoiResult,
  ProjectId,
  ReferenceImportResult,
  ReferenceLink,
  ZoteroCollection,
  ZoteroConnectBody,
  ZoteroImportBody,
  ZoteroLibrary,
  ZoteroStatus,
} from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

const IdParams = z.object({ id: ProjectId })
const PathBody = z.object({ path: z.string().min(1).max(500) })

/** Zotero (per person) and the project's references (.bib files from Zotero, entries by DOI). */
export const referenceRoutes: FastifyPluginAsyncZod<Deps> = async (app, { references, projects }) => {
  app.get('/me/zotero', { schema: { response: { 200: ZoteroStatus } } }, async req => references.zoteroStatus(requireUser(req).id))

  app.put('/me/zotero', { schema: { body: ZoteroConnectBody, response: { 200: ZoteroStatus } } }, async req =>
    references.connectZotero(requireUser(req).id, req.body.apiKey),
  )

  app.delete('/me/zotero', async (req, reply) => {
    await references.disconnectZotero(requireUser(req).id)
    return reply.code(204).send()
  })

  app.get('/me/zotero/libraries', { schema: { response: { 200: z.array(ZoteroLibrary) } } }, async req =>
    references.libraries(requireUser(req).id),
  )

  app.get(
    '/me/zotero/collections',
    { schema: { querystring: z.object({ library: z.string().regex(/^(user|group):\d+$/) }), response: { 200: z.array(ZoteroCollection) } } },
    async req => references.collections(requireUser(req).id, req.query.library),
  )

  app.get('/projects/:id/references', { schema: { params: IdParams, response: { 200: z.array(ReferenceLink) } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return references.links(req.params.id)
  })

  app.post(
    '/projects/:id/references/zotero',
    { schema: { params: IdParams, body: ZoteroImportBody, response: { 200: ReferenceImportResult } } },
    async req => {
      const userId = requireUser(req).id
      await projects.requireAccess(req.params.id, userId, 'editor')
      return references.importZotero(req.params.id, userId, req.body)
    },
  )

  app.post(
    '/projects/:id/references/refresh',
    { schema: { params: IdParams, body: PathBody, response: { 200: ReferenceImportResult } } },
    async req => {
      const userId = requireUser(req).id
      await projects.requireAccess(req.params.id, userId, 'editor')
      return references.refresh(req.params.id, userId, req.body.path)
    },
  )

  app.post('/projects/:id/references/unlink', { schema: { params: IdParams, body: PathBody } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
    await references.unlink(req.params.id, req.body.path)
    return reply.code(204).send()
  })

  app.post('/projects/:id/references/doi', { schema: { params: IdParams, body: DoiBody, response: { 200: DoiResult } } }, async req => {
    const userId = requireUser(req).id
    await projects.requireAccess(req.params.id, userId, 'editor')
    return references.addDoi(req.params.id, userId, req.body.id, req.body.path)
  })
}

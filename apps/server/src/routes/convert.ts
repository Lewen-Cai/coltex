import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ConvertAnalysis, ConvertBody, ConvertReport, ConvertUpload, ProjectId, WordExportReady, WordExportRequest } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { config } from '../config.ts'
import { attachment, readImport } from './archive.ts'

const IdParams = z.object({ id: ProjectId })

/**
 * Journal template conversion. Anyone who can read a project can convert it:
 * the result is a new project of their own, and the original is untouched.
 */
export const convertRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, convert, word }) => {
  app.get('/projects/:id/convert', { schema: { params: IdParams, response: { 200: ConvertAnalysis } } }, async req => {
    const { project } = await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return convert.analyze(project)
  })

  app.post('/projects/:id/convert', { schema: { params: IdParams, body: ConvertBody, response: { 201: ConvertReport } } }, async (req, reply) => {
    const user = requireUser(req)
    const { project } = await projects.requireAccess(req.params.id, user.id, 'viewer')
    return reply.code(201).send(await convert.convert(project, user, req.body))
  })

  // A template zip to convert into (a journal's download): held for the conversion that follows.
  app.post(
    '/projects/:id/convert/template',
    { bodyLimit: config.maxImportBytes, schema: { params: IdParams, querystring: z.object({ name: z.string().min(1).max(200) }), response: { 201: ConvertUpload } } },
    async (req, reply) => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'viewer')
      return reply.code(201).send(convert.hold(user.id, req.query.name, await readImport(req.body)))
    },
  )

  // Word export (pandoc). Anyone who can read the project may, like downloading the PDF.
  app.post('/projects/:id/export/word', { schema: { params: IdParams, body: WordExportRequest, response: { 200: WordExportReady } } }, async req => {
    const user = requireUser(req)
    const { project } = await projects.requireAccess(req.params.id, user.id, 'viewer')
    return word.export(project, user.id, req.body)
  })

  app.get(
    '/projects/:id/export/word/:exportId',
    { schema: { params: z.object({ id: ProjectId, exportId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/) }) } },
    async (req, reply) => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'viewer')
      const { data, name } = await word.take(req.params.id, user.id, req.params.exportId)
      return reply
        .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .header('content-disposition', attachment(`${name}.docx`))
        .send(data)
    },
  )
}

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CommitBody, HistoryFile, HistoryFileChange, HistoryLabel, HistoryPage, HistoryVersion, ProjectId, RestoreBody, VersionId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { NotFoundError } from '../errors.ts'
import { buildProjectZip } from '../projects/zip.ts'
import { attachment } from './archive.ts'
import { isTextPath } from '../storage/paths.ts'

const IdParams = z.object({ id: ProjectId })
const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}
const VersionParams = IdParams.extend({ version: VersionId })

export const historyRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, history }) => {
  // Viewers can browse history; restoring and labelling need edit rights.

  app.get(
    '/projects/:id/history',
    {
      schema: {
        params: IdParams,
        querystring: z.object({ before: VersionId.optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }),
        response: { 200: HistoryPage },
      },
    },
    async req => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      return history.versions(req.params.id, req.query)
    },
  )

  app.get('/projects/:id/history/:version', { schema: { params: VersionParams, response: { 200: HistoryVersion } } }, async req => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    return history.version(req.params.id, req.params.version)
  })

  app.get(
    '/projects/:id/history/:version/compare',
    {
      schema: {
        params: VersionParams,
        // Without `from`: the changes made in this version (against its parent).
        querystring: z.object({ from: VersionId.optional() }),
        response: { 200: z.object({ changes: z.array(HistoryFileChange) }) },
      },
    },
    async req => {
      const { id, version } = req.params
      await projects.requireAccess(id, requireUser(req).id, 'viewer')
      const from = req.query.from ?? (await history.version(id, version)).parent ?? undefined
      return { changes: await history.compare(id, from, version) }
    },
  )

  app.get(
    '/projects/:id/history/:version/files',
    {
      schema: {
        params: VersionParams,
        response: { 200: z.object({ files: z.array(z.object({ path: z.string(), size: z.number() })) }) },
      },
    },
    async req => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      return { files: await history.files(req.params.id, req.params.version) }
    },
  )

  // A file at a version, as JSON (text inline) for the diff view.
  app.get(
    '/projects/:id/history/:version/file',
    { schema: { params: VersionParams, querystring: z.object({ path: z.string().min(1) }), response: { 200: HistoryFile } } },
    async req => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      const content = await history.readFile(req.params.id, req.params.version, req.query.path)
      const binary = !isTextPath(req.query.path)
      return {
        path: req.query.path,
        exists: !!content,
        binary,
        size: content?.length ?? 0,
        text: content && !binary ? content.toString('utf8') : undefined,
      }
    },
  )

  // Raw file at a version: a download, or with `inline` an image preview.
  app.get(
    '/projects/:id/history/:version/raw',
    {
      schema: {
        params: VersionParams,
        querystring: z.object({ path: z.string().min(1), inline: z.stringbool().default(false) }),
      },
    },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      const content = await history.readFile(req.params.id, req.params.version, req.query.path)
      if (!content) throw new NotFoundError(`${req.query.path} does not exist in that version`)
      const name = req.query.path.slice(req.query.path.lastIndexOf('/') + 1)
      const image = IMAGE_TYPES[name.slice(name.lastIndexOf('.') + 1).toLowerCase()]
      reply
        .header('x-content-type-options', 'nosniff')
        // Project files are user content: never let one (e.g. an SVG) run script on our origin.
        .header('content-security-policy', "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'")
      if (req.query.inline && image) return reply.type(image).send(content)
      return reply.type('application/octet-stream').header('content-disposition', attachment(name)).send(content)
    },
  )

  app.get('/projects/:id/history/:version/download.zip', { schema: { params: VersionParams } }, async (req, reply) => {
    const { id, version } = req.params
    const { project } = await projects.requireAccess(id, requireUser(req).id, 'viewer')
    await history.version(id, version) // 404 for unknown versions
    const files = await Promise.all(
      (await history.files(id, version)).map(async f => ({ path: f.path, data: (await history.readFile(id, version, f.path))! })),
    )
    // Named by version id: the server can't know the viewer's time zone.
    return reply
      .type('application/zip')
      .header('content-disposition', attachment(`${project.name} (version ${version.slice(0, 7)}).zip`))
      .send(buildProjectZip(files, []))
  })

  app.post(
    '/projects/:id/history/:version/restore',
    { schema: { params: VersionParams, body: RestoreBody.default({}), response: { 200: z.object({ versionId: VersionId }) } } },
    async req => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'editor')
      return { versionId: await history.restore(req.params.id, req.params.version, user.id, req.body.paths) }
    },
  )

  app.post(
    '/projects/:id/history/:version/revert',
    { schema: { params: VersionParams, response: { 200: z.object({ versionId: VersionId }) } } },
    async req => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'editor')
      return { versionId: await history.revert(req.params.id, req.params.version, user.id) }
    },
  )

  app.post(
    '/projects/:id/history/commit',
    { schema: { params: IdParams, body: CommitBody, response: { 200: z.object({ versionId: VersionId, created: z.boolean() }) } } },
    async req => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'editor')
      return history.commit(req.params.id, user.id, req.body.message)
    },
  )

  app.post(
    '/projects/:id/history/labels',
    {
      schema: {
        params: IdParams,
        // Without versionId: label the current state ("Save a version").
        body: z.object({ name: z.string().trim().min(1).max(200), versionId: VersionId.optional() }),
        response: { 201: HistoryLabel },
      },
    },
    async (req, reply) => {
      const user = requireUser(req)
      await projects.requireAccess(req.params.id, user.id, 'editor')
      return reply.code(201).send(await history.addLabel(req.params.id, user.id, req.body.name, req.body.versionId))
    },
  )

  app.delete(
    '/projects/:id/history/labels/:label',
    { schema: { params: IdParams.extend({ label: z.coerce.number().int() }) } },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
      await history.deleteLabel(req.params.id, req.params.label)
      return reply.code(204).send()
    },
  )
}

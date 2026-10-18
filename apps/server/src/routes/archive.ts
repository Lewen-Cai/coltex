import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ProjectId, ProjectMeta } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError } from '../errors.ts'
import { buildProjectZip, detectMainFile, readProjectZip } from '../projects/zip.ts'

/** `Content-Disposition` that keeps non-ASCII project names (RFC 6266 / 5987). */
export function attachment(filename: string): string {
  const ascii = /[A-Za-z0-9]/.test(filename.replace(/\.zip$/, ''))
    ? filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
    : 'project.zip'
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export const archiveRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, store, collab, history }) => {
  // Import a zip (e.g. Overleaf "Download Source") as a new project owned by the caller.
  app.post(
    '/projects/import',
    {
      bodyLimit: config.maxImportBytes,
      schema: {
        querystring: z.object({ name: z.string().min(1).max(200) }),
        response: { 201: z.object({ project: ProjectMeta, warnings: z.array(z.string()) }) },
      },
    },
    async (req, reply) => {
      const user = requireUser(req)
      if (!Buffer.isBuffer(req.body)) throw new BadRequestError('Expected the zip file as an application/zip body')
      const archive = await readProjectZip(req.body)
      if (archive.files.size === 0) throw new BadRequestError('The archive contains no files')
      const warnings = [...archive.warnings]
      const rootFile = detectMainFile(archive.files)
      if (!rootFile) warnings.push('No .tex file found; set the main document before compiling')
      // The engine is picked at each build from what the document loads.
      const project = await projects.create(user.id, req.query.name, 'auto', {
        files: archive.files,
        folders: archive.folders,
        rootFile: rootFile ?? 'main.tex',
      })
      await history.record(project.id, 'import', [user.id])
      return reply.code(201).send({ project, warnings })
    },
  )

  app.get('/projects/:id/download.zip', { schema: { params: z.object({ id: ProjectId }) } }, async (req, reply) => {
    const { project } = await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    await collab.flushProject(project.id)
    const tree = await store.listTree(project.id)
    const files = await Promise.all(
      tree.files.map(async f => ({ path: f.path, data: await store.readFile(project.id, f.path) })),
    )
    return reply
      .type('application/zip')
      .header('content-disposition', attachment(`${project.name}.zip`))
      .header('cache-control', 'no-store')
      .send(buildProjectZip(files, tree.folders))
  })
}

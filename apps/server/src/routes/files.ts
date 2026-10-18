import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ProjectId, ProjectSources, ReplaceBody, ReplaceResult, SourcesQuery } from '@coltex/shared'
import { TEXT_KEY } from '../collab/server.ts'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError } from '../errors.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'

const IdParams = z.object({ id: ProjectId })
/** Files the word count reads; anything larger is not a hand-written source. */
const SOURCE_FILE = /\.(tex|ltx)$/i
/** What the project search looks through. */
const SEARCHABLE_FILE = /\.(tex|ltx|bib|sty|cls|bst|bbx|cbx|dtx|ins|txt|md|cfg|def)$/i
const MAX_SOURCE_BYTES = 5 * 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

function contentType(p: string): string {
  if (isTextPath(p)) return 'text/plain; charset=utf-8'
  return IMAGE_TYPES[p.slice(p.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'
}
const PathParams = IdParams.extend({ '*': z.string().min(1) })

export const fileRoutes: FastifyPluginAsyncZod<Deps> = async (app, { projects, store, collab, history, references, linkedFiles }) => {
  app.get('/projects/:id/files/*', { schema: { params: PathParams } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
    const p = cleanPath(req.params['*'])
    const content = await store.readFile(req.params.id, p)
    return (
      reply
        .type(contentType(p))
        .header('cache-control', 'no-store')
        // Project files are user content: never let one (e.g. an SVG) run script on our origin.
        .header('content-security-policy', "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'")
        .header('x-content-type-options', 'nosniff')
        .send(content)
    )
  })

  // Body is the raw file content (text/plain or application/octet-stream).
  // `?create=true` refuses to overwrite an existing file (409).
  app.put(
    '/projects/:id/files/*',
    { schema: { params: PathParams, querystring: z.object({ create: z.stringbool().default(false) }) } },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
      const body = req.body
      if (typeof body !== 'string' && !Buffer.isBuffer(body)) {
        throw new BadRequestError('Expected text/plain or application/octet-stream body')
      }
      const { id } = req.params
      const path = cleanPath(req.params['*'])
      await collab.mutate(id, async () => {
        await store.writeFile(id, path, body, { createOnly: req.query.create })
        // Someone may have this file open: carry the new content into the live document.
        await collab.afterWrite(id, path, body.toString())
      })
      await projects.touch(id)
      await collab.treeChanged(id)
      history.noteChange(id, requireUser(req).id)
      return reply.code(204).send()
    },
  )

  // The LaTeX sources as collaborators see them right now, for the word count
  // (which parses them in the browser and follows \input/\include itself).
  app.get('/projects/:id/sources', { schema: { params: IdParams, querystring: SourcesQuery, response: { 200: ProjectSources } } }, async req => {
    const { id } = req.params
    await projects.requireAccess(id, requireUser(req).id, 'viewer')
    await collab.flushProject(id)
    const { files } = await store.listTree(id)
    const pattern = req.query.include === 'text' ? SEARCHABLE_FILE : SOURCE_FILE
    const wanted = files.filter(f => !f.binary && pattern.test(f.path) && f.size <= MAX_SOURCE_BYTES)
    return {
      files: await Promise.all(wanted.map(async f => ({ path: f.path, content: (await store.readFile(id, f.path)).toString('utf8') }))),
    }
  })

  // Project-wide replace. The edits go into each file's live document (so open
  // editors follow), and a file is left alone if its text changed since the
  // search: nothing is replaced on a guess.
  app.post(
    '/projects/:id/replace',
    { schema: { params: IdParams, body: ReplaceBody, response: { 200: ReplaceResult } } },
    async req => {
      const { id } = req.params
      const user = requireUser(req)
      await projects.requireAccess(id, user.id, 'editor')
      const { files } = await store.listTree(id)
      const existing = new Set(files.filter(f => !f.binary).map(f => f.path))
      // A bulk change: keep the state before it as a version of its own.
      await history.checkpoint(id)
      let replaced = 0
      const skipped: string[] = []
      for (const file of req.body.files) {
        const path = cleanPath(file.path)
        if (!existing.has(path) || !isTextPath(path)) {
          skipped.push(path)
          continue
        }
        const docId = await collab.resolveDoc(id, path)
        const edits = [...file.edits].sort((a, b) => b.from - a.from)
        const done = await collab.editDoc(id, docId, user.id, doc => {
          const ytext = doc.getText(TEXT_KEY)
          const text = ytext.toString()
          for (let i = 0; i < edits.length; i++) {
            const e = edits[i]!
            const overlaps = i > 0 && e.to > edits[i - 1]!.from
            if (e.to < e.from || e.to > text.length || overlaps || text.slice(e.from, e.to) !== e.expected) return 0
          }
          // From the end, so earlier offsets stay valid.
          for (const e of edits) {
            if (e.to > e.from) ytext.delete(e.from, e.to - e.from)
            if (e.insert) ytext.insert(e.from, e.insert)
          }
          return edits.length
        })
        if (done) replaced += done
        else skipped.push(path)
      }
      if (replaced) {
        history.noteChange(id, user.id)
        await projects.touch(id)
      }
      return { replaced, skipped }
    },
  )

  // Stable document id for a text file, used to join its collaborative session.
  app.get(
    '/projects/:id/docs/resolve',
    {
      schema: {
        params: IdParams,
        querystring: z.object({ path: z.string().min(1) }),
        response: { 200: z.object({ docId: z.string() }) },
      },
    },
    async req => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'viewer')
      const path = cleanPath(req.query.path)
      if (!isTextPath(path)) throw new BadRequestError(`${path} is not a text file`)
      await store.readFile(req.params.id, path) // 404 if it does not exist
      return { docId: await collab.resolveDoc(req.params.id, path) }
    },
  )

  app.delete('/projects/:id/files/*', { schema: { params: PathParams } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
    const { id } = req.params
    const path = cleanPath(req.params['*'])
    await collab.mutate(id, async () => {
      await store.deleteFile(id, path)
      await linkedFiles.forget(id, path)
      await collab.afterDelete(id, path)
    })
    await projects.touch(id)
    history.noteChange(id, requireUser(req).id)
    return reply.code(204).send()
  })

  app.post(
    '/projects/:id/folders',
    { schema: { params: IdParams, body: z.object({ path: z.string().min(1) }) } },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
      await store.createFolder(req.params.id, cleanPath(req.body.path))
      await projects.touch(req.params.id)
      await collab.treeChanged(req.params.id)
      return reply.code(201).send()
    },
  )

  app.delete('/projects/:id/folders/*', { schema: { params: PathParams } }, async (req, reply) => {
    await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
    const { id } = req.params
    const path = cleanPath(req.params['*'])
    await collab.mutate(id, async () => {
      await store.deleteFolder(id, path)
      await linkedFiles.forget(id, path)
      await collab.afterDelete(id, path)
    })
    await projects.touch(id)
    history.noteChange(id, requireUser(req).id)
    return reply.code(204).send()
  })

  // Move or rename a file or folder. Never overwrites an existing entry.
  app.post(
    '/projects/:id/move',
    { schema: { params: IdParams, body: z.object({ from: z.string().min(1), to: z.string().min(1) }) } },
    async (req, reply) => {
      await projects.requireAccess(req.params.id, requireUser(req).id, 'editor')
      const from = cleanPath(req.body.from)
      const to = cleanPath(req.body.to)
      await collab.mutate(req.params.id, async () => {
        await store.move(req.params.id, from, to)
        await projects.followMove(req.params.id, from, to)
        await references.followMove(req.params.id, from, to)
        await linkedFiles.followMove(req.params.id, from, to)
        await collab.afterMove(req.params.id, from, to)
      })
      history.noteChange(req.params.id, requireUser(req).id)
      return reply.code(204).send()
    },
  )
}

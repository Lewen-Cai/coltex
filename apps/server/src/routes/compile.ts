import path from 'node:path'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CodePosition, CompileRequest, CompileResult, OUTPUT, PdfPosition, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'
import { engineFor } from '../projects/engine.ts'
import { cleanPath } from '../storage/paths.ts'

const BuildParams = z.object({ id: ProjectId, buildId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/) })

const OUTPUT_TYPES: Record<string, string> = {
  [OUTPUT.pdf]: 'application/pdf',
  [OUTPUT.log]: 'text/plain; charset=utf-8',
  [OUTPUT.blg]: 'text/plain; charset=utf-8',
  [OUTPUT.synctex]: 'application/gzip',
}

/**
 * One build per project at a time. Requests with the same options that arrive
 * while one is running share the next build, which starts when the current
 * one ends and so includes every edit made until then. This keeps auto-compile
 * from several collaborators down to one build at a time per project.
 */
export class CompileCoalescer {
  private readonly tail = new Map<string, Promise<unknown>>()
  private readonly waiting = new Map<string, { key: string; result: Promise<CompileResult> }>()

  run(projectId: string, key: string, start: () => Promise<CompileResult>): Promise<CompileResult> {
    const queued = this.waiting.get(projectId)
    if (queued?.key === key) return queued.result
    const before = this.tail.get(projectId) ?? Promise.resolve()
    const result: Promise<CompileResult> = before
      .catch(() => {})
      .then(() => {
        // Started: later requests wait for a fresh build instead of joining this one.
        if (this.waiting.get(projectId)?.result === result) this.waiting.delete(projectId)
        return start()
      })
    this.waiting.set(projectId, { key, result })
    this.tail.set(projectId, result)
    const settled = () => {
      if (this.tail.get(projectId) === result) this.tail.delete(projectId)
    }
    result.then(settled, settled)
    return result
  }
}

/**
 * Build a project as the editor's Recompile does, through the shared
 * coalescer. The caller has checked access; it is checked again when the
 * build starts, since the settings are read then.
 */
export function buildProject(
  { projects, store, queue, collab, builds }: Pick<Deps, 'projects' | 'store' | 'queue' | 'collab' | 'builds'>,
  projectId: string,
  userId: string,
  { clean, draft, stopOnFirstError }: CompileRequest = { clean: false, draft: false, stopOnFirstError: false },
): Promise<CompileResult> {
  return builds.run(projectId, JSON.stringify([clean, draft, stopOnFirstError]), async () => {
    // Read the settings when the build starts: the main file or engine may have changed while it waited.
    const { project } = await projects.requireAccess(projectId, userId, 'viewer')
    // Compile what people see in their editors, not what was last autosaved.
    await collab.flushProject(project.id)
    const engine = await engineFor(store, project)
    return queue.compile({ projectId: project.id, rootFile: project.rootFile, engine, clean, draft, stopOnFirstError })
  })
}

export const compileRoutes: FastifyPluginAsyncZod<Deps> = async (app, deps) => {
  const { projects, queue } = deps

  // Viewers may compile too: compiling only reads sources.
  app.post(
    '/projects/:id/compile',
    {
      schema: {
        params: z.object({ id: ProjectId }),
        body: CompileRequest.default({ clean: false, draft: false, stopOnFirstError: false }),
        response: { 200: CompileResult },
      },
    },
    async req => {
      const userId = requireUser(req).id
      await projects.requireAccess(req.params.id, userId, 'viewer')
      return buildProject(deps, req.params.id, userId, req.body)
    },
  )

  // SyncTeX: source position → PDF boxes.
  app.get(
    '/projects/:id/builds/:buildId/synctex/pdf',
    {
      schema: {
        params: BuildParams,
        querystring: z.object({
          file: z.string().min(1),
          line: z.coerce.number().int().min(1),
          column: z.coerce.number().int().min(0).default(0),
        }),
        response: { 200: z.object({ positions: z.array(PdfPosition) }) },
      },
    },
    async req => {
      const { id, buildId } = req.params
      await projects.requireAccess(id, requireUser(req).id, 'viewer')
      const file = cleanPath(req.query.file)
      const result = await queue.synctex({ kind: 'code', projectId: id, buildId, file, line: req.query.line, column: req.query.column })
      return { positions: result.pdf ?? [] }
    },
  )

  // SyncTeX: PDF point → source position.
  app.get(
    '/projects/:id/builds/:buildId/synctex/code',
    {
      schema: {
        params: BuildParams,
        querystring: z.object({
          page: z.coerce.number().int().min(1),
          h: z.coerce.number(),
          v: z.coerce.number(),
        }),
        response: { 200: z.object({ position: CodePosition.nullable() }) },
      },
    },
    async req => {
      const { id, buildId } = req.params
      await projects.requireAccess(id, requireUser(req).id, 'viewer')
      const result = await queue.synctex({ kind: 'pdf', projectId: id, buildId, ...req.query })
      return { position: result.code ?? null }
    },
  )

  app.get(
    '/projects/:id/builds/:buildId/:name',
    {
      schema: {
        params: z.object({
          id: ProjectId,
          buildId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/),
          name: z.enum(Object.values(OUTPUT) as [string, ...string[]]),
        }),
      },
    },
    async (req, reply) => {
      const { id, buildId, name } = req.params
      await projects.requireAccess(id, requireUser(req).id, 'viewer')
      return reply
        .type(OUTPUT_TYPES[name] ?? 'application/octet-stream')
        .header('cache-control', 'private, max-age=31536000, immutable')
        .sendFile(path.join(id, buildId, name), config.outputsDir)
    },
  )
}

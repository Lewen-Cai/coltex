import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { McpSettings, McpSettingsBody, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'
import { NotFoundError } from '../errors.ts'
import { McpService, type JsonRpcResponse } from '../mcp/service.ts'

const IdParams = z.object({ id: ProjectId })

/**
 * The project's MCP server for AI agents (`/api/projects/<id>/mcp`, signed in
 * with a Git token as a Bearer token), and the person's mode for it.
 */
export const mcpRoutes: FastifyPluginAsyncZod<Deps> = async (app, deps) => {
  const mcp = new McpService({ ...deps, outputsDir: config.outputsDir, version: config.version })

  app.get('/projects/:id/mcp/settings', { schema: { params: IdParams, response: { 200: McpSettings } } }, async req =>
    mcp.settings(req.params.id, requireUser(req).id),
  )

  app.put('/projects/:id/mcp/settings', { schema: { params: IdParams, body: McpSettingsBody, response: { 200: McpSettings } } }, async req =>
    mcp.setMode(req.params.id, requireUser(req).id, req.body.mode),
  )

  // No server-initiated stream and no sessions: every request is a POST answered with JSON.
  app.route({
    method: ['GET', 'DELETE'],
    url: '/projects/:id/mcp',
    handler: async (_req, reply) => reply.code(405).header('Allow', 'POST').send({ error: 'Method not allowed' }),
  })

  app.post('/projects/:id/mcp', { bodyLimit: 8 * 1024 * 1024 }, async (req, reply) => {
    const { id } = req.params as { id: string }
    // Browsers send Origin; a page elsewhere must not drive an agent's token (DNS rebinding).
    const origin = req.headers.origin
    if (origin && origin !== `${req.protocol}://${req.host}`) return reply.code(403).send({ error: 'Cross-origin requests are not allowed' })
    const userId = await deps.gitBridge.authenticate(req.headers.authorization)
    if (!userId) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer realm="ColTex"')
        .send({ error: 'Send a Git token from ColTex (Settings → Sync services) as a Bearer token' })
    }
    if (!ProjectId.safeParse(id).success) return reply.code(404).send({ error: 'Project not found' })
    try {
      await deps.projects.requireAccess(id, userId, 'viewer')
    } catch (err) {
      if (err instanceof NotFoundError) return reply.code(404).send({ error: 'Project not found' })
      throw err
    }

    const body = req.body
    const batch = Array.isArray(body)
    const answers: JsonRpcResponse[] = []
    for (const message of batch ? body : [body]) {
      const answer = await mcp.handle(id, userId, message)
      if (answer) answers.push(answer)
    }
    // Only notifications or responses: accepted, nothing to say.
    if (!answers.length) return reply.code(202).send()
    return reply.type('application/json').send(batch ? answers : answers[0])
  })
}

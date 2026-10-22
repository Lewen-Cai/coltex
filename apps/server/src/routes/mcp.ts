import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'
import { McpService, type JsonRpcResponse } from '../mcp/service.ts'

/**
 * ColTex's MCP server for AI agents (`/api/mcp`, one address for all of a
 * person's projects), signed in with a personal token (made for MCP) as a Bearer token.
 */
export const mcpRoutes: FastifyPluginAsyncZod<Deps> = async (app, deps) => {
  const mcp = new McpService({ ...deps, outputsDir: config.outputsDir, version: config.version })

  // No server-initiated stream and no sessions: every request is a POST answered with JSON.
  app.route({
    method: ['GET', 'DELETE'],
    url: '/mcp',
    handler: async (_req, reply) => reply.code(405).header('Allow', 'POST').send({ error: 'Method not allowed' }),
  })

  app.post('/mcp', { bodyLimit: 8 * 1024 * 1024 }, async (req, reply) => {
    // Browsers send Origin; a page elsewhere must not drive an agent's token (DNS rebinding).
    const origin = req.headers.origin
    if (origin && origin !== `${req.protocol}://${req.host}`) return reply.code(403).send({ error: 'Cross-origin requests are not allowed' })
    const grant = await deps.gitBridge.authenticate(req.headers.authorization, 'mcp')
    if (!grant) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer realm="ColTex"')
        .send({ error: 'Send an MCP token from ColTex (Settings → AI agent) as a Bearer token' })
    }

    const body = req.body
    const batch = Array.isArray(body)
    const answers: JsonRpcResponse[] = []
    for (const message of batch ? body : [body]) {
      const answer = await mcp.handle(grant, message)
      if (answer) answers.push(answer)
    }
    // Only notifications or responses: accepted, nothing to say.
    if (!answers.length) return reply.code(202).send()
    return reply.type('application/json').send(batch ? answers : answers[0])
  })
}

import fs from 'node:fs'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import Fastify, { type FastifyError } from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifySwagger from '@fastify/swagger'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { registerAuth, requireUser } from './auth/fastify.ts'
import { config } from './config.ts'
import type { Deps } from './deps.ts'
import { HttpError } from './errors.ts'
import { securityHeaders } from './security-headers.ts'
import { accountRoutes } from './routes/accounts.ts'
import { adminRoutes } from './routes/admin.ts'
import { signInRoutes } from './routes/sign-ins.ts'
import { networkRoutes } from './routes/network.ts'
import { backupRoutes } from './routes/backup.ts'
import { aiRoutes } from './routes/ai.ts'
import { skillRoutes } from './routes/skills.ts'
import { archiveRoutes } from './routes/archive.ts'
import { chatRoutes } from './routes/chat.ts'
import { compileRoutes } from './routes/compile.ts'
import { fileRoutes } from './routes/files.ts'
import { historyRoutes } from './routes/history.ts'
import { meRoutes } from './routes/me.ts'
import { referenceRoutes } from './routes/references.ts'
import { mcpRoutes } from './routes/mcp.ts'
import { gitRoutes } from './routes/git.ts'
import { templateRoutes } from './routes/templates.ts'
import { linkedFileRoutes } from './routes/linked-files.ts'
import { notificationRoutes } from './routes/notifications.ts'
import { projectListRoutes } from './routes/project-list.ts'
import { reviewRoutes } from './routes/review.ts'
import { convertRoutes } from './routes/convert.ts'
import { projectRoutes } from './routes/projects.ts'

export async function buildApp(
  deps: Deps,
  opts: { logger?: boolean; handleUpgrade?: (req: IncomingMessage, socket: Duplex, head: Buffer) => boolean } = {},
) {
  const app = Fastify({ logger: opts.logger ?? true, bodyLimit: config.maxUploadBytes, trustProxy: config.fastifyTrustProxy }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addContentTypeParser(
    ['application/octet-stream', 'application/zip', 'application/x-zip-compressed'],
    { parseAs: 'buffer', bodyLimit: Math.max(config.maxUploadBytes, config.maxImportBytes) },
    (_req, body, done) => done(null, body),
  )

  securityHeaders(app)

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message })
    if (hasZodFastifySchemaValidationErrors(err)) {
      const first = err.validation[0]
      return reply.code(400).send({ error: first?.message ?? err.message, issues: err.validation })
    }
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message })
    app.log.error(err)
    return reply.code(500).send({ error: 'Internal server error' })
  })

  await app.register(fastifySwagger, {
    openapi: { info: { title: 'ColTex API', version: '0.0.0' } },
    transform: jsonSchemaTransform,
  })

  // Serves build outputs (sendFile) and, in production, the built web app.
  const hasWeb = !!config.webDist && fs.existsSync(config.webDist)
  await app.register(fastifyStatic, {
    root: hasWeb ? config.webDist! : config.outputsDir,
    serve: hasWeb,
    wildcard: false,
  })

  await registerAuth(app, deps.auth, deps.signIns)

  await app.register(
    async api => {
      api.get('/health', () => ({ ok: true }))
      // The API's description is for people who use it, not for whoever finds the server.
      api.get('/openapi.json', req => {
        requireUser(req)
        return app.swagger()
      })
      await api.register(accountRoutes, deps)
      await api.register(meRoutes, deps)
      await api.register(notificationRoutes, deps)
      await api.register(projectListRoutes, deps)
      await api.register(archiveRoutes, deps)
      await api.register(projectRoutes, deps)
      await api.register(templateRoutes, deps)
      await api.register(linkedFileRoutes, deps)
      await api.register(fileRoutes, deps)
      await api.register(compileRoutes, deps)
      await api.register(aiRoutes, deps)
      await api.register(skillRoutes, deps)
      await api.register(historyRoutes, deps)
      await api.register(reviewRoutes, deps)
      await api.register(chatRoutes, deps)
      await api.register(convertRoutes, deps)
      await api.register(adminRoutes, deps)
      await api.register(signInRoutes, deps)
      await api.register(networkRoutes, deps)
      await api.register(backupRoutes, deps)
      await api.register(referenceRoutes, deps)
      await api.register(gitRoutes, deps)
      await api.register(mcpRoutes, deps)
    },
    { prefix: '/api' },
  )

  if (hasWeb) {
    // Single-page app: unknown non-API GET routes fall back to index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html')
      return reply.code(404).send({ error: 'Not found' })
    })
  }

  // WebSocket upgrades (real-time collaboration) bypass Fastify's routing.
  const { handleUpgrade } = opts
  if (handleUpgrade) {
    app.server.on('upgrade', (req, socket, head) => {
      if (!handleUpgrade(req, socket, head)) socket.destroy()
    })
  }

  return app
}

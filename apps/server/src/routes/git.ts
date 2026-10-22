import type { Readable } from 'node:stream'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CreatedGitToken, CreateGitTokenBody, GitToken, ProjectId } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { NotFoundError } from '../errors.ts'

const GIT_BODY_TYPES = ['application/x-git-upload-pack-request', 'application/x-git-receive-pack-request']

/**
 * The Git bridge: personal access tokens (signed-in routes), and the
 * repositories themselves at /api/git/<projectId>.git, spoken to by git
 * with HTTP Basic authentication (any user name, a token as the password).
 */
export const gitRoutes: FastifyPluginAsyncZod<Deps> = async (app, { gitBridge, projects }) => {
  app.get('/me/git-tokens', { schema: { response: { 200: z.array(GitToken) } } }, async req => gitBridge.listTokens(requireUser(req).id))

  app.post('/me/git-tokens', { schema: { body: CreateGitTokenBody, response: { 201: CreatedGitToken } } }, async (req, reply) =>
    reply.code(201).send(await gitBridge.createToken(requireUser(req).id, req.body.name)),
  )

  app.delete('/me/git-tokens/:tokenId', { schema: { params: z.object({ tokenId: z.string().min(1) }) } }, async (req, reply) => {
    await gitBridge.revokeToken(requireUser(req).id, req.params.tokenId)
    return reply.code(204).send()
  })

  // git's request bodies go to git untouched (they may be gzip-compressed).
  app.addContentTypeParser(GIT_BODY_TYPES, (_req, payload, done) => done(null, payload))

  app.route({
    method: ['GET', 'POST'],
    url: '/git/:repo/*',
    bodyLimit: 1024 * 1024 * 1024,
    handler: async (req, reply) => {
      const { repo, '*': rest } = req.params as { repo: string; '*': string }
      const projectId = repo.replace(/\.git$/, '')
      const query = req.raw.url?.split('?')[1] ?? ''
      const service = rest.replace(/^\/+/, '')
      const smart =
        (req.method === 'GET' && service === 'info/refs' && /(^|&)service=git-(upload|receive)-pack(&|$)/.test(query)) ||
        (req.method === 'POST' && (service === 'git-upload-pack' || service === 'git-receive-pack'))
      if (!ProjectId.safeParse(projectId).success || !smart) {
        return reply.code(404).type('text/plain').send('Not found (ColTex speaks git’s smart HTTP protocol only)\n')
      }
      const writing = service === 'git-receive-pack' || /(^|&)service=git-receive-pack(&|$)/.test(query)

      const userId = await gitBridge.authenticate(req.headers.authorization)
      if (!userId) {
        return reply
          .code(401)
          .header('WWW-Authenticate', 'Basic realm="ColTex", charset="UTF-8"')
          .type('text/plain')
          .send('Use a Git token from ColTex (Settings → Git) as the password.\n')
      }
      let role: string
      try {
        role = (await projects.requireAccess(projectId, userId, 'viewer')).role
      } catch (err) {
        if (err instanceof NotFoundError) return reply.code(404).type('text/plain').send('Repository not found\n')
        throw err
      }
      // Reviewers suggest changes in the editor; a push would bypass that.
      if (writing && role !== 'owner' && role !== 'editor') {
        return reply.code(403).type('text/plain').send('You can read this project but not push to it.\n')
      }

      reply.hijack()
      try {
        await gitBridge.serve(
          projectId,
          userId,
          {
            method: req.method as 'GET' | 'POST',
            service,
            query,
            headers: req.headers,
            body: req.method === 'POST' ? (req.body as Readable) : undefined,
            remoteAddress: req.ip,
          },
          reply.raw,
        )
      } catch (err) {
        req.log.error(err, 'git bridge request failed')
        if (!reply.raw.headersSent) reply.raw.writeHead(500, { 'Content-Type': 'text/plain' })
        reply.raw.end('ColTex could not complete the git request\n')
      }
    },
  })
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { ForbiddenError, UnauthorizedError } from '../errors.ts'
import type { Auth, SessionUser } from './auth.ts'

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
  }
}


/**
 * The client address for better-auth's rate limits. Fastify resolves it (from
 * the socket, or X-Forwarded-For when TRUST_PROXY allows); the header is always
 * overwritten, so clients cannot choose their own bucket.
 */
export const CLIENT_IP_HEADER = 'x-coltex-client-ip'

/** Convert a Fastify request into a Fetch API Request for better-auth's handler. */
function toWebRequest(req: FastifyRequest): Request {
  const url = new URL(req.url, `${req.protocol}://${req.host}`)
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined
  const headers = fromNodeHeaders(req.headers)
  headers.set(CLIENT_IP_HEADER, req.ip)
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
  })
}

/** Copy a Fetch API Response (status, headers incl. multiple Set-Cookie, body) onto a Fastify reply. */
export async function sendWebResponse(reply: FastifyReply, res: Response): Promise<FastifyReply> {
  reply.status(res.status)
  res.headers.forEach((value, key) => {
    if (key !== 'set-cookie') reply.header(key, value)
  })
  const cookies = res.headers.getSetCookie()
  if (cookies.length) reply.header('set-cookie', cookies)
  return reply.send(res.body ? await res.text() : null)
}

export async function registerAuth(app: FastifyInstance, auth: Auth): Promise<void> {
  app.decorateRequest('user', null)

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (req, reply) => sendWebResponse(reply, await auth.handler(toWebRequest(req))),
  })

  app.addHook('onRequest', async req => {
    if (!req.url.startsWith('/api/') || req.url.startsWith('/api/auth/')) return
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    req.user = session?.user ?? null
  })
}

export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.user) throw new UnauthorizedError()
  return req.user
}

/** The system administrator, and admins (who invite and manage their own team). */
export function requireManager(req: FastifyRequest): SessionUser {
  const user = requireUser(req)
  if (user.role !== 'admin' && user.role !== 'manager') throw new ForbiddenError('Only admins can invite and manage people')
  return user
}

/** The system administrator. */
export function requireAdmin(req: FastifyRequest): SessionUser {
  const user = requireUser(req)
  if (user.role !== 'admin') throw new ForbiddenError('System administrator access required')
  return user
}

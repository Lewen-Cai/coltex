import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { ForbiddenError, UnauthorizedError } from '../errors.ts'
import { signingIn, type Auth, type SessionUser } from './auth.ts'
import type { SignInGuard } from './sign-in-guard.ts'

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
    /** The signed-in session's id (to mark it in the list of someone's devices). */
    sessionId: string | null
  }
}

/** The proof of work for a sign-in after a few failures (an ALTCHA payload), sent by the sign-in form. */
export const CHALLENGE_HEADER = 'x-coltex-challenge'
const CODE_PATHS: Record<string, 'totp' | 'recovery_code'> = {
  '/api/auth/two-factor/verify-totp': 'totp',
  '/api/auth/two-factor/verify-backup-code': 'recovery_code',
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

export async function registerAuth(app: FastifyInstance, auth: Auth, guard?: SignInGuard): Promise<void> {
  app.decorateRequest('user', null)
  app.decorateRequest('sessionId', null)

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (req, reply) => {
      const path = req.url.split('?')[0]!
      const handle = () =>
        path === '/api/auth/sign-in/email' ? signingIn.run(true, () => auth.handler(toWebRequest(req))) : auth.handler(toWebRequest(req))
      if (!guard || req.method !== 'POST') return sendWebResponse(reply, await handle())
      const attempt = { ip: req.ip, userAgent: req.headers['user-agent'] ?? null }
      // Sign-in protection and the sign-in record (auth/sign-in-guard.ts): asked before
      // better-auth checks a password or a code, told what came of it afterwards.
      if (path === '/api/auth/sign-in/email') {
        const body = (req.body ?? {}) as { email?: unknown }
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
        if (!email) return sendWebResponse(reply, await handle())
        const challenge = req.headers[CHALLENGE_HEADER]
        const refusal = await guard.check({ ...attempt, email }, typeof challenge === 'string' ? challenge : undefined)
        if (refusal) return reply.code(refusal.status).send(refusal.body)
        const res = await handle()
        await guard.afterPassword({ ...attempt, email }, res.clone())
        return sendWebResponse(reply, res)
      }
      const method = CODE_PATHS[path]
      const pending = method ? await guard.pending(req.headers.cookie) : null
      if (method && pending) {
        const refusal = await guard.checkCode({ ...attempt, email: pending.email }, pending)
        if (refusal) return reply.code(refusal.status).send(refusal.body)
        const res = await auth.handler(toWebRequest(req))
        await guard.afterCode({ ...attempt, email: pending.email }, pending, method, res.clone(), req.headers.cookie)
        return sendWebResponse(reply, res)
      }
      return sendWebResponse(reply, await auth.handler(toWebRequest(req)))
    },
  })

  app.addHook('onRequest', async req => {
    if (!req.url.startsWith('/api/') || req.url.startsWith('/api/auth/')) return
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    req.user = session?.user ?? null
    req.sessionId = session?.session.id ?? null
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

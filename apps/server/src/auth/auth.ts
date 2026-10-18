import { hash, verify } from '@node-rs/argon2'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'
import { and, count, eq, ne } from 'drizzle-orm'
import { passwordProblem } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import * as schema from '../db/schema.ts'

/**
 * Account roles for better-auth's admin plugin. Only the system administrator
 * (`admin`, one per instance) has its endpoints. Admins (`manager`) manage
 * their own team through ColTex's routes (`AccountService`), so here they are
 * plain users.
 */
const ac = createAccessControl(defaultStatements)
const ROLES = { admin: ac.newRole(adminAc.statements), user: ac.newRole(userAc.statements), manager: ac.newRole(userAc.statements) }

/** better-auth endpoints that can hand out a role. */
const ROLE_PATHS = new Set(['/admin/set-role', '/admin/create-user', '/admin/update-user'])

/** Keeps project files in sync when an admin deletes a user (the DB cascades, files do not). */
export type UserDeletionHooks = {
  ownedProjectIds(userId: string): Promise<string[]>
  deleteProjectFiles(projectIds: string[]): Promise<void>
}

export type AuthOptions = {
  db: Db
  secret: string
  baseURL: string
  trustedOrigins: string[]
  /** Addresses that change at runtime (the public address set in the app, the tailnet's). */
  extraOrigins?: () => Promise<string[]>
  userDeletion: UserDeletionHooks
}

export function createAuth({ db, secret, baseURL, trustedOrigins, extraOrigins, userDeletion }: AuthOptions) {
  // Projects owned by a user being deleted, captured before the cascade removes their rows.
  const pendingDeletion = new Map<string, string[]>()
  return betterAuth({
    appName: 'ColTex',
    baseURL,
    basePath: '/api/auth',
    secret,
    // Same-origin requests are always fine (the address the server was reached at, as
    // the Fastify bridge builds the request URL), so LAN, Tailscale or any other
    // address works without listing it; a page elsewhere still can't sign anyone in.
    trustedOrigins: async request => [...trustedOrigins, ...((await extraOrigins?.()) ?? []), request ? new URL(request.url).origin : null],
    // Set by the Fastify bridge from the resolved client address (see auth/fastify.ts).
    advanced: { ipAddress: { ipAddressHeaders: ['x-coltex-client-ip'] } },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: {
      enabled: true,
      // Accounts are created only through invites or the first-run setup.
      disableSignUp: true,
      minPasswordLength: 8,
      password: {
        // Every new password passes here (setup, invitations, changes, admin resets).
        hash: password => {
          const problem = passwordProblem(password)
          if (problem) throw new APIError('BAD_REQUEST', { message: problem })
          return hash(password)
        },
        verify: ({ hash: stored, password }) => verify(stored, password),
      },
    },
    hooks: {
      // There is one system administrator (the database's unique index is the backstop):
      // the role is given only by the first-run setup, while nobody has it.
      before: createAuthMiddleware(async ctx => {
        if (!ROLE_PATHS.has(ctx.path)) return
        const body = (ctx.body ?? {}) as { role?: unknown; userId?: unknown; data?: { role?: unknown } }
        const roles = [body.role, body.data?.role].flat()
        if (!roles.includes('admin')) return
        const others = typeof body.userId === 'string' ? ne(schema.user.id, body.userId) : undefined
        const [row] = await db.select({ n: count() }).from(schema.user).where(and(eq(schema.user.role, 'admin'), others))
        if (row!.n > 0) throw new APIError('FORBIDDEN', { message: 'There is only one system administrator' })
      }),
    },
    databaseHooks: {
      user: {
        delete: {
          before: async u => {
            pendingDeletion.set(u.id, await userDeletion.ownedProjectIds(u.id))
          },
          after: async u => {
            const ids = pendingDeletion.get(u.id) ?? []
            pendingDeletion.delete(u.id)
            await userDeletion.deleteProjectFiles(ids)
          },
        },
      },
    },
    plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'], ac, roles: ROLES })],
    telemetry: { enabled: false },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type SessionUser = Auth['$Infer']['Session']['user']

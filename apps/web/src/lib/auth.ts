import { createAuthClient } from 'better-auth/react'
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'

// The same roles as the server (apps/server/src/auth/auth.ts): only the system administrator (`admin`) has the admin endpoints.
const ac = createAccessControl(defaultStatements)
const roles = { admin: ac.newRole(adminAc.statements), user: ac.newRole(userAc.statements), manager: ac.newRole(userAc.statements) }

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [adminClient({ ac, roles }), twoFactorClient()],
})

export type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>['data']>['user']

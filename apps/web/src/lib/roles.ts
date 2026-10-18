import { tk } from './i18n.ts'

/**
 * Account roles as people read them (translate at render with t()). The
 * stored ids differ: an admin (`manager`) leads a team of the members they
 * invite; the one system administrator is `admin`.
 */
export const ROLE_NAME: Record<string, string> = {
  user: tk('Member'),
  manager: tk('Admin'),
  admin: tk('System admin'),
}

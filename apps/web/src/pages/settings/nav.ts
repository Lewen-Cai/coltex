import { t, tk } from '@/lib/i18n'

export type SettingsItem = { title: string; href: string; route: string }

export const PERSONAL: SettingsItem[] = [
  { title: tk('Account'), href: '#/settings', route: '/settings' },
  { title: tk('Appearance'), href: '#/settings/appearance', route: '/settings/appearance' },
  { title: tk('Dictionary'), href: '#/settings/dictionary', route: '/settings/dictionary' },
  { title: tk('Zotero'), href: '#/settings/zotero', route: '/settings/zotero' },
  { title: tk('AI skills'), href: '#/settings/skills', route: '/settings/skills' },
]

/** Only people who have the AI agent see its skills page. */
export const AI_ROUTES = new Set(['/settings/skills'])

/** The personal pages someone sees (the AI ones only with AI access). */
export function personalItems(aiAvailable: boolean | undefined): SettingsItem[] {
  return aiAvailable ? PERSONAL : PERSONAL.filter(i => !AI_ROUTES.has(i.route))
}

/** Instance administration; only the system administrator sees (and can open) all of these. */
export const ADMIN: SettingsItem[] = [
  { title: tk('Overview'), href: '#/admin', route: '/admin' },
  { title: tk('Manage users'), href: '#/admin/users', route: '/admin/users' },
  { title: tk('Invitations'), href: '#/admin/invites', route: '/admin/invites' },
  { title: tk('AI services'), href: '#/admin/ai', route: '/admin/ai' },
  { title: tk('AI usage & access'), href: '#/admin/ai/usage', route: '/admin/ai/usage' },
  { title: tk('Storage & backups'), href: '#/admin/backups', route: '/admin/backups' },
  { title: tk('Network'), href: '#/admin/network', route: '/admin/network' },
]

/** The pages admins (team leaders) share with the system administrator: their team and their invitations. */
const TEAM_ROUTES = new Set(['/admin/users', '/admin/invites'])

/** The administration pages someone can open: all for the system administrator, the team's for admins. */
export function adminItems(user: { role?: string | null }): SettingsItem[] {
  if (user.role === 'admin') return ADMIN
  if (user.role === 'manager') return ADMIN.filter(i => TEAM_ROUTES.has(i.route))
  return []
}

/** Administration routes count only for those who may open them; everyone else gets the dashboard there. */
export function isSettingsRoute(route: string, user: { role?: string | null }): boolean {
  return route.startsWith('/settings') || adminItems(user).some(i => i.route === route)
}

/** Unknown settings routes show the account page, so its item is the active one then. */
export function settingsItemActive(item: SettingsItem, route: string): boolean {
  const known = [...PERSONAL, ...ADMIN].some(i => i.route === route)
  return known ? item.route === route : item.route === '/settings'
}

/** The page's title, for the breadcrumb. */
export function settingsTitle(route: string): string {
  return t([...PERSONAL, ...ADMIN].find(i => i.route === route)?.title ?? 'Account')
}

import { t, tk } from '@/lib/i18n'

/** Sections of the help documentation; each is docs/<locale>/<id>.md. */
export const HELP_SECTIONS: { id: string; title: string; admin?: boolean }[] = [
  { id: 'getting-started', title: tk('Getting started') },
  { id: 'editor', title: tk('Using the editor') },
  { id: 'compiling', title: tk('Compiling and the PDF') },
  { id: 'files', title: tk('Files') },
  { id: 'collaboration', title: tk('Collaboration') },
  { id: 'history', title: tk('History') },
  { id: 'references', title: tk('References') },
  { id: 'ai', title: tk('AI agent') },
  { id: 'templates', title: tk('Templates') },
  { id: 'projects', title: tk('Projects') },
  { id: 'settings', title: tk('Settings') },
  { id: 'admin', title: tk('Administration'), admin: true },
  { id: 'deployment', title: tk('Deployment and network'), admin: true },
]

export const isHelpRoute = (route: string) => route === '/help' || route.startsWith('/help/')

export function helpSections(user: { role?: string | null }) {
  return HELP_SECTIONS.filter(s => !s.admin || user.role === 'admin' || user.role === 'manager')
}

/** The section a route shows; unknown ones show the first. */
export function helpSection(route: string, user: { role?: string | null }) {
  const id = route.slice('/help/'.length)
  const sections = helpSections(user)
  return sections.find(s => s.id === id) ?? sections[0]!
}

export const helpTitle = (route: string, user: { role?: string | null }) => t(helpSection(route, user).title)

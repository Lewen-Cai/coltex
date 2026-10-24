import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import type { ThemeChoice } from '@coltex/shared'
import { api } from './api.ts'

export type { ThemeChoice }

/**
 * Theme: three colours, each light and dark (user's decision 2026-10-23;
 * light blue by default). The `dark` class on <html> switches every token in
 * index.css to its dark value, and `data-theme` (all but light and dark)
 * gives the green and violet themes their own colours on top.
 *
 * The theme is the account's (user's decision 2026-10-24), kept on the server
 * (`/api/me/preferences`); pages nobody is signed in to (sign-in, setup,
 * invitations) always use the default. This browser remembers the signed-in
 * person's theme so `public/theme.js` can apply it before the first paint (keep
 * its storage key and lists in sync with this file); signing out forgets it.
 */

/** Each theme: whether it is a dark one. */
export const THEME_IS_DARK: Record<ThemeChoice, boolean> = {
  light: false,
  dark: true,
  forest: false,
  moss: true,
  lavender: false,
  plum: true,
}

const DEFAULT_THEME: ThemeChoice = 'light'
/** `<user id>:<theme>`; a bare theme is what this browser chose before themes followed accounts. */
const STORAGE_KEY = 'coltex:theme'
const listeners = new Set<() => void>()

const isTheme = (v: string | undefined): v is ThemeChoice => !!v && Object.hasOwn(THEME_IS_DARK, v)

function cached(): { user: string | null; theme: ThemeChoice } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const at = saved.lastIndexOf(':')
    const theme = saved.slice(at + 1)
    return isTheme(theme) ? { user: at < 0 ? null : saved.slice(0, at), theme } : null
  } catch {
    // Storage can be blocked.
    return null
  }
}

function remember(user: string | null, theme: ThemeChoice | null) {
  try {
    if (user && theme) localStorage.setItem(STORAGE_KEY, `${user}:${theme}`)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Not remembered: the next load paints the default first.
  }
}

/** The signed-in person, whose account setTheme saves to. */
let owner: string | null = null
let choice: ThemeChoice = cached()?.theme ?? DEFAULT_THEME
let state = snapshot()

function snapshot() {
  return { theme: choice, resolvedTheme: THEME_IS_DARK[choice] ? ('dark' as const) : ('light' as const) }
}

function show(next: ThemeChoice) {
  choice = next
  state = snapshot()
  const root = document.documentElement
  // No transitions while every colour flips at once.
  root.classList.add('coltex-theme-switching')
  root.classList.toggle('dark', state.resolvedTheme === 'dark')
  if (choice === 'light' || choice === 'dark') delete root.dataset.theme
  else root.dataset.theme = choice
  root.style.colorScheme = state.resolvedTheme
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('coltex-theme-switching')))
  for (const l of listeners) l()
}
show(choice)

/** Switch the signed-in person's theme, and keep it with their account. */
export function setTheme(next: ThemeChoice): void {
  show(next)
  if (!owner) return
  remember(owner, next)
  api.setPreferences({ theme: next }).catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)))
}

/** Signing out: the next page (the sign-in page) starts from the default. */
export function forgetTheme(): void {
  owner = null
  remember(null, null)
}

/**
 * Follow who is signed in (`undefined` while that isn't known yet): their
 * account's theme, or the default when nobody is.
 */
export function useAccountTheme(userId: string | null | undefined): void {
  useEffect(() => {
    if (userId === undefined) return
    owner = userId
    if (!userId) {
      show(DEFAULT_THEME)
      return
    }
    const local = cached()
    if (local?.user === userId) show(local.theme)
    let gone = false
    api.preferences().then(
      ({ theme }) => {
        if (gone) return
        if (theme) {
          remember(userId, theme)
          show(theme)
        } else if (local && local.user === null) {
          // Never chosen with the account: keep what this browser had chosen before.
          setTheme(local.theme)
        } else {
          remember(userId, null)
          show(DEFAULT_THEME)
        }
      },
      () => {},
    )
    return () => {
      gone = true
    }
  }, [userId])
}

export function useTheme() {
  const s = useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
  return { ...s, setTheme }
}

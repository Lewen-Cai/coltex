import { useSyncExternalStore } from 'react'

/**
 * Theme: three colours, each light and dark (user's decision 2026-10-23;
 * light blue by default). The `dark` class on <html> switches every token in
 * index.css to its dark value, and `data-theme` (all but light and dark)
 * gives the green and warm themes their own colours on top. `index.html`
 * applies the saved choice before the first paint (keep its storage key and
 * lists in sync with this file).
 */
export type ThemeChoice = 'light' | 'dark' | 'forest' | 'moss' | 'sepia' | 'espresso'

/** Each theme: whether it is a dark one. */
export const THEME_IS_DARK: Record<ThemeChoice, boolean> = {
  light: false,
  dark: true,
  forest: false,
  moss: true,
  sepia: false,
  espresso: true,
}

const STORAGE_KEY = 'coltex:theme'
const listeners = new Set<() => void>()

function load(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && Object.hasOwn(THEME_IS_DARK, saved)) return saved as ThemeChoice
  } catch {
    // Storage can be blocked; use the default.
  }
  return 'light'
}

let choice: ThemeChoice = load()
let state = snapshot()

function snapshot() {
  return { theme: choice, resolvedTheme: THEME_IS_DARK[choice] ? ('dark' as const) : ('light' as const) }
}

function apply() {
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
apply()

export function setTheme(next: ThemeChoice): void {
  choice = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not persisted; still switch for this page.
  }
  apply()
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

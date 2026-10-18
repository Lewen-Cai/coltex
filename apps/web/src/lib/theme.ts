import { useSyncExternalStore } from 'react'

/**
 * Light/dark theme: the `dark` class on <html> switches every token in
 * index.css. `index.html` applies the saved choice before the first paint
 * (keep its storage key and logic in sync with this file).
 */
export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'coltex:theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function load(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Storage can be blocked; follow the system.
  }
  return 'system'
}

let choice: ThemeChoice = load()
let state = snapshot()

function snapshot() {
  const resolved: 'light' | 'dark' = choice === 'system' ? (media.matches ? 'dark' : 'light') : choice
  return { theme: choice, resolvedTheme: resolved }
}

function apply() {
  state = snapshot()
  const root = document.documentElement
  // No transitions while every colour flips at once.
  root.classList.add('coltex-theme-switching')
  root.classList.toggle('dark', state.resolvedTheme === 'dark')
  root.style.colorScheme = state.resolvedTheme
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('coltex-theme-switching')))
  for (const l of listeners) l()
}
apply()
media.addEventListener('change', () => choice === 'system' && apply())

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

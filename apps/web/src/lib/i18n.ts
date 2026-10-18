import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react'
import zh from '../locales/zh/index.ts'

/**
 * Interface language. Messages are keyed by their English text (gettext
 * style): English needs no dictionary, and a missing translation falls back
 * to readable English. `scripts/i18n-check.ts` checks that every literal key
 * has a Chinese entry with the same placeholders.
 *
 * Rules:
 * - Pass string literals: `t('New project')`, `t('Deleted {name}', { name })`.
 * - Never call `t` at module top level (the locale can change later). Mark
 *   constant labels with `tk('…')` and translate them at render: `t(item.title)`.
 * - Counts: `plural(n, '{n} file', '{n} files')`.
 * - Rich text: `tr('Signed in as {name}', { name: <b>…</b> })`.
 */
export type Locale = 'en' | 'zh'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '简体中文' },
]

const STORAGE_KEY = 'coltex:locale'
const DICTIONARIES: Record<Locale, Record<string, string> | null> = { en: null, zh }

function detect(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // Storage can be blocked; fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

let current: Locale = detect()
const listeners = new Set<() => void>()

function applyToDocument() {
  document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en'
}
applyToDocument()

export function getLocale(): Locale {
  return current
}

/** BCP 47 tag for `Intl` formatters. */
export function intlLocale(): string {
  return current === 'zh' ? 'zh-CN' : 'en-US'
}

export function setLocale(locale: Locale): void {
  if (locale === current) return
  current = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisted; still switch for this page.
  }
  applyToDocument()
  for (const l of listeners) l()
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

type Vars = Record<string, string | number>

function lookup(key: string): string {
  return DICTIONARIES[current]?.[key] ?? key
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

/** Translate a message. */
export function t(key: string, vars?: Vars): string {
  return fill(lookup(key), vars)
}

/** Mark a constant for translation without translating it yet. */
export function tk<T extends string>(key: T): T {
  return key
}

/** Pick the English singular or plural form; `{n}` is the count. */
export function plural(n: number, one: string, other: string, vars?: Vars): string {
  const key = n === 1 ? one : other
  // Chinese has no plural forms: both keys may be translated, the plural one is the fallback.
  const text = current === 'en' ? key : (DICTIONARIES[current]?.[key] ?? DICTIONARIES[current]?.[other] ?? key)
  return fill(text, { n, ...vars })
}

/** Like `t`, but placeholders may be React nodes. */
export function tr(key: string, vars: Record<string, ReactNode>): ReactNode {
  const parts = lookup(key).split(/\{(\w+)\}/)
  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) => (i % 2 === 1 ? createElement(Fragment, { key: i }, part in vars ? vars[part] : `{${part}}`) : part)),
  )
}

const patterns = new Map<Locale, { re: RegExp; names: string[]; text: string; literal: number }[]>()

/** Keys with placeholders, as regexes, so `Project {id} not found` matches the filled-in message. */
function patternsFor(locale: Locale) {
  let list = patterns.get(locale)
  if (!list) {
    const escape = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    list = Object.entries(DICTIONARIES[locale] ?? {})
      .filter(([key]) => /\{\w+\}/.test(key))
      .map(([key, text]) => ({
        re: new RegExp(`^${key.split(/\{\w+\}/).map(escape).join('(.+?)')}$`, 's'),
        names: [...key.matchAll(/\{(\w+)\}/g)].map(m => m[1]!),
        text,
        literal: key.replace(/\{\w+\}/g, '').length,
      }))
      // Most specific first: `Added {name}` must not swallow `Added {pkg}: {class} provided it implicitly.`
      .sort((a, b) => b.literal - a.literal)
    patterns.set(locale, list)
  }
  return list
}

/**
 * Translate a message that came from the server (an API error), when it is a
 * known one. Messages with values in them match keys with placeholders.
 */
export function translateServerMessage(message: string): string {
  const dict = DICTIONARIES[current]
  if (!dict) return message
  if (dict[message]) return dict[message]
  for (const p of patternsFor(current)) {
    const m = p.re.exec(message)
    if (m) return fill(p.text, Object.fromEntries(p.names.map((n, i) => [n, m[i + 1]!])))
  }
  return message
}

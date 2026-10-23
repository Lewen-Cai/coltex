import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react'
import { resolveLocale, type Locale } from './locales.ts'

/**
 * Interface language. Messages are keyed by their English text (gettext
 * style): English needs no dictionary, and a missing translation falls back
 * to readable English. Each other language is a folder in `src/locales/`
 * (one file per area, the same files and keys in every language), loaded
 * when it is first used. `scripts/i18n-check.ts` checks that every literal
 * key has an entry in every language with the same placeholders.
 *
 * Rules:
 * - Pass string literals: `t('New project')`, `t('Deleted {name}', { name })`.
 * - Never call `t` at module top level (the locale can change later). Mark
 *   constant labels with `tk('…')` and translate them at render: `t(item.title)`.
 * - Counts: `plural(n, '{n} file', '{n} files')`.
 * - Rich text: `tr('Signed in as {name}', { name: <b>…</b> })`.
 */

export { LOCALE_LABELS, LOCALES, isLocale, resolveLocale, type Locale } from './locales.ts'

const STORAGE_KEY = 'coltex:locale'
type Messages = Record<string, string>
const DICTIONARIES: Partial<Record<Locale, Messages>> = {}
let loadMessages: (locale: Locale) => Promise<Messages> = () => Promise.resolve({})

function saved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; fall back to the browser language.
    return null
  }
}

let current: Locale = resolveLocale(saved() ?? navigator.language)
const listeners = new Set<() => void>()

function applyToDocument() {
  document.documentElement.lang = current
}
applyToDocument()

/** Whether this browser has a language of its own choosing (else it follows the browser's). */
export function hasSavedLocale(): boolean {
  return saved() !== null
}

export function getLocale(): Locale {
  return current
}

/** BCP 47 tag for `Intl` formatters. */
export function intlLocale(): string {
  return current === 'en' ? 'en-US' : current
}

/** Add a language's messages (the loader does; tests call it directly). */
export function addMessages(locale: Locale, messages: Messages): void {
  DICTIONARIES[locale] = messages
  patterns.delete(locale)
}

/** How dictionaries are loaded (`main.tsx` passes the bundler's lazy imports), then load the current one. */
export async function initLocales(loader: (locale: Locale) => Promise<Messages>): Promise<void> {
  loadMessages = loader
  await ensureMessages(current).catch(() => {})
}

async function ensureMessages(locale: Locale): Promise<void> {
  if (locale !== 'en' && !DICTIONARIES[locale]) addMessages(locale, await loadMessages(locale))
}

/** Switch the interface language (once its dictionary is loaded) and remember it in this browser. */
export async function setLocale(locale: Locale): Promise<void> {
  if (locale === current) return
  await ensureMessages(locale)
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

/**
 * A translated label used inside a sentence ("Left this week", "Bob: editor"):
 * lower case, except in German, whose nouns keep their capital.
 */
export function inSentence(text: string): string {
  return current === 'de' ? text : text.toLocaleLowerCase(intlLocale())
}

/** Mark a constant for translation without translating it yet. */
export function tk<T extends string>(key: T): T {
  return key
}

/** Pick the English singular or plural form; `{n}` is the count. */
export function plural(n: number, one: string, other: string, vars?: Vars): string {
  const key = n === 1 ? one : other
  // Languages without plural forms translate both keys alike; the plural one is the fallback.
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

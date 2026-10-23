// The interface languages (no DOM or React here: the i18n check script reads it too).

/** The interface languages, named in their own language (the same set as browser-translate's). */
export const LOCALE_LABELS = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  ru: 'Русский',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
} as const

export type Locale = keyof typeof LOCALE_LABELS

export const LOCALES = (Object.keys(LOCALE_LABELS) as Locale[]).map(id => ({ id, label: LOCALE_LABELS[id] }))

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALE_LABELS, value)
}

/**
 * A language setting or a browser language as one of ours: `zh` (what
 * ColTex saved before it had more languages, and `COLTEX_LANG`) is
 * Simplified Chinese; Chinese for Taiwan, Hong Kong or in traditional
 * script is Traditional; any Portuguese is Brazilian; anything else unknown
 * is English.
 */
export function resolveLocale(value: string): Locale {
  if (isLocale(value)) return value
  const lang = value.toLowerCase()
  if (lang.startsWith('zh')) return /tw|hk|mo|hant/.test(lang) ? 'zh-TW' : 'zh-CN'
  const base = lang.split('-')[0]
  if (base === 'pt') return 'pt-BR'
  return isLocale(base) ? base : 'en'
}

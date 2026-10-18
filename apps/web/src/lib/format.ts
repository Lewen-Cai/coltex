import { intlLocale, t } from './i18n.ts'

// Formatters follow the interface language, which can change at any time.
const rtfCache = new Map<string, Intl.RelativeTimeFormat>()
function rtf(): Intl.RelativeTimeFormat {
  const locale = intlLocale()
  let f = rtfCache.get(locale)
  if (!f) rtfCache.set(locale, (f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })))
  return f
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "5 minutes ago", "yesterday", "last week". */
export function timeAgo(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now()
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      const value = Math.round(diff / ms)
      return value === 0 ? t('just now') : rtf().format(value, unit)
    }
  }
  return t('just now')
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(intlLocale(), { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  // CJK names: the first character reads best.
  if (/[㐀-鿿]/.test(name)) return name.trim().slice(0, 1)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?'
}


import { SPELL_CHECK_LANGUAGES, type SpellCheckLanguage } from '@coltex/shared'
import { intlLocale } from '@/lib/i18n'

const displayNames = new Map<string, Intl.DisplayNames | null>()

function namesFor(locale: string): Intl.DisplayNames | null {
  if (!displayNames.has(locale)) {
    try {
      displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'language' }))
    } catch {
      displayNames.set(locale, null)
    }
  }
  return displayNames.get(locale)!
}

/**
 * A spell-check language's name in the interface language ("美国英语",
 * "English (American)" → "American English"). Codes the browser doesn't know
 * fall back to Overleaf's English name.
 */
export function spellLanguageName(code: string): string {
  const entry = SPELL_CHECK_LANGUAGES.find(l => l.code === code)
  try {
    const name = namesFor(intlLocale())?.of(code.replace(/_/g, '-'))
    if (name && name.toLowerCase() !== code.replace(/_/g, '-').toLowerCase()) return name
  } catch {
    // Not a valid BCP 47 tag for this browser.
  }
  return entry?.name ?? code
}

/** The dictionary file name (without .aff/.dic) for a language, if it has one. */
export function dicFor(code: SpellCheckLanguage | string | undefined): string | undefined {
  return code ? SPELL_CHECK_LANGUAGES.find(l => l.code === code)?.dic : undefined
}

/** Languages sorted by their displayed name. */
export function spellLanguageOptions(): { code: string; name: string }[] {
  return SPELL_CHECK_LANGUAGES.map(l => ({ code: l.code, name: spellLanguageName(l.code) })).sort((a, b) =>
    a.name.localeCompare(b.name, intlLocale()),
  )
}

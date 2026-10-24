import { Check, Flower2, Grape, Leaf, Moon, Sun, Trees } from 'lucide-react'
import { useTheme, type ThemeChoice } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LOCALES, setLocale, t, tk, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** The colours of each theme's miniature: page, panels, text lines and accent (its tokens in index.css). */
type Palette = { bg: string; panel: string; line: string; primary: string }

const PALETTES: Record<ThemeChoice, Palette> = {
  light: { bg: 'oklch(0.985 0.003 247)', panel: 'oklch(1 0 0)', line: 'oklch(0 0 0 / 10%)', primary: 'oklch(0.585 0.215 257)' },
  dark: { bg: 'oklch(0.235 0.014 262)', panel: 'oklch(0.27 0.016 262)', line: 'oklch(1 0 0 / 15%)', primary: 'oklch(0.66 0.19 255)' },
  forest: { bg: 'oklch(0.982 0.004 160)', panel: 'oklch(1 0 0)', line: 'oklch(0 0 0 / 10%)', primary: 'oklch(0.549 0.145 151)' },
  moss: { bg: 'oklch(0.235 0.013 165)', panel: 'oklch(0.27 0.015 165)', line: 'oklch(1 0 0 / 15%)', primary: 'oklch(0.63 0.15 150)' },
  lavender: { bg: 'oklch(0.984 0.005 300)', panel: 'oklch(1 0 0)', line: 'oklch(0 0 0 / 10%)', primary: 'oklch(0.56 0.2 293)' },
  plum: { bg: 'oklch(0.235 0.018 300)', panel: 'oklch(0.27 0.02 300)', line: 'oklch(1 0 0 / 15%)', primary: 'oklch(0.68 0.17 295)' },
}

// Light themes on the first row, their dark counterparts under them.
const THEMES = [
  { id: 'light', label: tk('Light'), icon: Sun },
  { id: 'forest', label: tk('Forest'), icon: Trees },
  { id: 'lavender', label: tk('Lavender'), icon: Flower2 },
  { id: 'dark', label: tk('Dark'), icon: Moon },
  { id: 'moss', label: tk('Moss'), icon: Leaf },
  { id: 'plum', label: tk('Plum'), icon: Grape },
] as const

/** A miniature of the console in the given theme, so the choice is visual. */
function Preview({ palette }: { palette: Palette }) {
  const line = { background: palette.line }
  return (
    <div className="flex h-full min-h-20 w-full gap-1.5 overflow-hidden rounded-md p-1.5" style={{ background: palette.bg }}>
      <div className="w-1/4 rounded-sm p-1" style={{ background: palette.panel }}>
        <div className="mb-1 h-1.5 w-3/4 rounded-full" style={{ background: palette.primary }} />
        <div className="mb-1 h-1 w-full rounded-full" style={line} />
        <div className="h-1 w-2/3 rounded-full" style={line} />
      </div>
      <div className="flex-1 rounded-sm p-1.5" style={{ background: palette.panel }}>
        <div className="mb-1.5 h-1.5 w-1/2 rounded-full" style={line} />
        <div className="mb-1 h-1 w-full rounded-full" style={line} />
        <div className="mb-1 h-1 w-5/6 rounded-full" style={line} />
        <div className="h-1 w-2/3 rounded-full" style={line} />
      </div>
    </div>
  )
}

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const locale = useLocale()

  return (
    <>
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('Theme')}</CardTitle>
          </CardHeader>
          {/* Two rows of three that stretch to the language card's height beside it. */}
          <CardContent className="grid flex-1 auto-rows-fr grid-cols-3 gap-3">
            {THEMES.map(x => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTheme(x.id)}
                aria-pressed={theme === x.id}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:border-primary/50',
                  theme === x.id && 'border-primary ring-2 ring-primary/25',
                )}
              >
                <div className="flex flex-1">
                  <Preview palette={PALETTES[x.id]} />
                </div>
                <span className="flex items-center gap-1.5 px-0.5 font-medium whitespace-nowrap">
                  <x.icon className="size-4 shrink-0 text-muted-foreground max-sm:hidden" />
                  <span className="truncate">{t(x.label)}</span>
                  {theme === x.id && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Language')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {LOCALES.map(x => (
              <button
                key={x.id}
                type="button"
                lang={x.id}
                onClick={() => void setLocale(x.id)}
                aria-pressed={locale === x.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/50',
                  locale === x.id && 'border-primary bg-accent/50 ring-2 ring-primary/25',
                )}
              >
                <span className="font-medium">{x.label}</span>
                {locale === x.id && <Check className="ml-auto size-4 text-primary" />}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

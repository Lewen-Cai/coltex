import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { PageHeader } from '@/components/shell/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LOCALES, setLocale, t, tk, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const THEMES = [
  { id: 'light', label: tk('Light'), icon: Sun },
  { id: 'dark', label: tk('Dark'), icon: Moon },
  { id: 'system', label: tk('Match system'), icon: Monitor },
] as const

/** A miniature of the console in the given theme, so the choice is visual. */
function Preview({ dark }: { dark: boolean }) {
  const bg = dark ? 'bg-[oklch(0.17_0.015_262)]' : 'bg-[oklch(0.985_0.003_247)]'
  const panel = dark ? 'bg-[oklch(0.21_0.018_262)]' : 'bg-white'
  const line = dark ? 'bg-white/15' : 'bg-black/10'
  return (
    <div className={cn('flex h-20 w-full gap-1.5 overflow-hidden rounded-md p-1.5', bg)}>
      <div className={cn('w-1/4 rounded-sm p-1', panel)}>
        <div className="mb-1 h-1.5 w-3/4 rounded-full bg-primary" />
        <div className={cn('mb-1 h-1 w-full rounded-full', line)} />
        <div className={cn('h-1 w-2/3 rounded-full', line)} />
      </div>
      <div className={cn('flex-1 rounded-sm p-1.5', panel)}>
        <div className={cn('mb-1.5 h-1.5 w-1/2 rounded-full', line)} />
        <div className={cn('mb-1 h-1 w-full rounded-full', line)} />
        <div className={cn('mb-1 h-1 w-5/6 rounded-full', line)} />
        <div className={cn('h-1 w-2/3 rounded-full', line)} />
      </div>
    </div>
  )
}

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const locale = useLocale()

  return (
    <>
      <PageHeader title={t('Appearance')} />
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('Theme')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {THEMES.map(x => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTheme(x.id)}
                aria-pressed={theme === x.id}
                className={cn(
                  'grid gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:border-primary/50',
                  theme === x.id && 'border-primary ring-2 ring-primary/25',
                )}
              >
                {x.id === 'system' ? (
                  <div className="grid grid-cols-2 gap-1">
                    <Preview dark={false} />
                    <Preview dark />
                  </div>
                ) : (
                  <Preview dark={x.id === 'dark'} />
                )}
                <span className="flex items-center gap-1.5 px-0.5 font-medium whitespace-nowrap">
                  <x.icon className="size-4 shrink-0 text-muted-foreground max-sm:hidden" />
                  {t(x.label)}
                  {theme === x.id && <Check className="ml-auto size-4 text-primary" />}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Language')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {LOCALES.map(x => (
              <button
                key={x.id}
                type="button"
                onClick={() => setLocale(x.id)}
                aria-pressed={locale === x.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/50',
                  locale === x.id && 'border-primary bg-accent/50 ring-2 ring-primary/25',
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold">{x.id === 'zh' ? '中' : 'En'}</span>
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

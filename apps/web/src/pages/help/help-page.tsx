import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SessionUser } from '@/lib/auth'
import { t, useLocale } from '@/lib/i18n'
import { DocView } from './doc-view'
import { helpSection, helpSections } from './nav'

// The documentation is content, written per language (not keyed strings).
const DOCS = import.meta.glob<string>('./docs/*/*.md', { query: '?raw', import: 'default' })

async function loadDoc(locale: string, id: string): Promise<string> {
  const load = DOCS[`./docs/${locale}/${id}.md`] ?? DOCS[`./docs/en/${id}.md`]
  return load ? load() : ''
}

/** The help documentation (`#/help/<section>`), opened from the user menu. */
export function HelpPage({ route, user }: { route: string; user: SessionUser }) {
  const locale = useLocale()
  const section = helpSection(route, user)
  const sections = helpSections(user)
  const index = sections.findIndex(s => s.id === section.id)
  const prev = sections[index - 1]
  const next = sections[index + 1]
  const [text, setText] = useState<string>()

  useEffect(() => {
    let cancelled = false
    setText(undefined)
    void loadDoc(locale, section.id).then(doc => !cancelled && setText(doc))
    return () => {
      cancelled = true
    }
  }, [locale, section.id])

  if (text === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4 pt-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <DocView
      markdown={text}
      footer={
        <nav className="mt-16 grid gap-3 border-t pt-8 sm:grid-cols-2">
          {prev ? (
            <a href={`#/help/${prev.id}`} className="group rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="size-3.5" /> {t('Previous section')}
              </span>
              <span className="mt-1 block font-medium group-hover:text-primary">{t(prev.title)}</span>
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a href={`#/help/${next.id}`} className="group rounded-lg border p-4 text-right transition-colors hover:border-primary/50 hover:bg-accent/40">
              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                {t('Next section')} <ChevronRight className="size-3.5" />
              </span>
              <span className="mt-1 block font-medium group-hover:text-primary">{t(next.title)}</span>
            </a>
          )}
        </nav>
      }
    />
  )
}

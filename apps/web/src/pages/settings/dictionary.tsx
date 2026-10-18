import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, SpellCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { intlLocale, plural, t } from '@/lib/i18n'
import { REMOVE_LEARNED_WORD_EVENT, noteLearnedWord, useLearnedWords } from '@/spelling'

/** Show the filter once the list is long enough to need one. */
const SEARCH_FROM = 12

/** The words a user added to their spelling dictionary, with a way to remove them. */
export function DictionarySettingsPage() {
  const words = useLearnedWords()
  const [query, setQuery] = useState('')
  const [removing, setRemoving] = useState<string>()

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return (words ?? []).filter(w => !q || w.toLocaleLowerCase().includes(q)).sort((a, b) => a.localeCompare(b, intlLocale()))
  }, [words, query])

  const remove = async (word: string) => {
    setRemoving(word)
    try {
      await api.unlearnWord(word)
      noteLearnedWord(word, false)
      // An editor open in this tab checks the word again.
      window.dispatchEvent(new CustomEvent(REMOVE_LEARNED_WORD_EVENT, { detail: word }))
      toast.success(t('Removed “{word}” from your dictionary', { word }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRemoving(undefined)
    }
  }

  return (
    <>
      <PageHeader
        title={t('Dictionary')}
      />
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle className="flex items-center gap-2">
              {t('Learned words')}
              {words && <Badge variant="secondary" className="tabular-nums">{words.length}</Badge>}
            </CardTitle>
          </div>
          {words && words.length >= SEARCH_FROM && (
            <InputGroup className="w-full sm:w-64">
              <InputGroupInput
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('Filter words')}
                aria-label={t('Filter words')}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          )}
        </CardHeader>
        <CardContent>
          {!words ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Spinner className="size-5" />
            </div>
          ) : words.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SpellCheck />
                </EmptyMedia>
                <EmptyTitle>{t('Your dictionary is empty')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('No words match “{query}”.', { query: query.trim() })}</p>
          ) : (
            <>
              {query.trim() && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {plural(shown.length, '{n} word matches', '{n} words match')}
                </p>
              )}
              <ul className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                <AnimatePresence initial={false}>
                  {shown.map((word, i) => (
                    <motion.li
                      key={word}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: Math.min(i, 20) * 0.015 } }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                      className="group flex items-center gap-2 rounded-md border bg-card py-1 pr-1 pl-3 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono" title={word}>
                        {word}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-destructive"
                            disabled={removing === word}
                            onClick={() => void remove(word)}
                            aria-label={t('Remove “{word}”', { word })}
                          >
                            {removing === word ? <Spinner /> : <X />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('Remove from dictionary')}</TooltipContent>
                      </Tooltip>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}

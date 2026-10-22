import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Ellipsis, Plus, Search, SpellCheck, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/confirm'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { intlLocale, plural, t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { LEARNED_WORDS_CHANGED_EVENT, type LearnedWordsChange, loadLearnedWords, noteLearnedWord, useLearnedWords } from '@/spelling'

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const OTHER = '#'

/** The heading a word is listed under: its first letter without accents, or # for anything else. */
function groupOf(word: string): string {
  const first = word.normalize('NFD')[0]!.toLocaleUpperCase()
  return /\p{L}/u.test(first) ? first : OTHER
}

/**
 * Words from a text file: one per line or separated by spaces or commas.
 * Hunspell .dic files work too (the count on the first line and the
 * affix flags after "/" are dropped).
 */
function wordsInFile(text: string): string[] {
  const lines = text.split(/\r?\n/)
  if (/^\s*\d+\s*$/.test(lines[0] ?? '')) lines.shift()
  return lines.flatMap(line => line.split(/[\s,;]+/)).map(w => w.split('/')[0]!).filter(Boolean)
}

/** Open editors in this tab check these words again (the spelling menu does this itself). */
function tellEditors(change: LearnedWordsChange) {
  window.dispatchEvent(new CustomEvent<LearnedWordsChange>(LEARNED_WORDS_CHANGED_EVENT, { detail: change }))
}

/**
 * The person's spelling dictionary (in the editor's settings): one field
 * that filters the list and adds what it holds, the words under letter
 * headings with an A–Z index above them, and import/export.
 */
export function DictionaryManager() {
  const words = useLearnedWords()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string>()
  const [fresh, setFresh] = useState<string>()
  const list = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // The word just added stays highlighted for a moment, so it can be found in the list.
  useEffect(() => {
    if (!fresh) return
    const timer = setTimeout(() => setFresh(undefined), 2000)
    return () => clearTimeout(timer)
  }, [fresh])

  const typed = text.trim()
  const invalid = /\s/.test(typed)
  const exists = !!typed && !!words?.includes(typed)

  const groups = useMemo(() => {
    const q = typed.toLocaleLowerCase()
    const byGroup = new Map<string, string[]>()
    const sorted = (words ?? []).filter(w => !q || w.toLocaleLowerCase().includes(q)).sort((a, b) => a.localeCompare(b, intlLocale()))
    for (const w of sorted) {
      const g = groupOf(w)
      byGroup.set(g, [...(byGroup.get(g) ?? []), w])
    }
    return [...byGroup].sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b, intlLocale())))
  }, [words, typed])
  const shown = groups.reduce((n, [, ws]) => n + ws.length, 0)
  // A–Z always, plus any other alphabets the words use, then #.
  const index = useMemo(() => {
    const extra = groups.map(([g]) => g).filter(g => g !== OTHER && !LETTERS.includes(g))
    return [...LETTERS, ...extra, OTHER]
  }, [groups])
  const present = new Set(groups.map(([g]) => g))

  const jump = (group: string) => {
    const box = list.current
    const section = box?.querySelector<HTMLElement>(`[data-group="${CSS.escape(group)}"]`)
    // The list is `relative`, so a section's offsetTop is measured from it (the sticky heading's would move).
    if (box && section) box.scrollTo({ top: section.offsetTop, behavior: 'smooth' })
  }

  const add = async () => {
    if (!typed || invalid || busy) return
    if (exists) {
      setFresh(typed)
      return
    }
    setBusy(true)
    try {
      await api.learnWord(typed)
      noteLearnedWord(typed, true)
      tellEditors({ added: [typed] })
      setFresh(typed)
      setText('')
      requestAnimationFrame(() => jump(groupOf(typed)))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (word: string) => {
    setRemoving(word)
    try {
      await api.unlearnWord(word)
      noteLearnedWord(word, false)
      tellEditors({ removed: [word] })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRemoving(undefined)
    }
  }

  const importFile = async (file: File) => {
    setBusy(true)
    try {
      const found = wordsInFile(await file.text())
      if (!found.length) throw new Error('No words found in this file')
      const before = new Set(words)
      const { added, skipped } = await api.importWords(found)
      await loadLearnedWords(true)
      tellEditors({ added: [...new Set(found)].filter(w => !before.has(w)) })
      toast.success(plural(added, 'Added {n} word', 'Added {n} words'), {
        description: skipped ? plural(skipped, '{n} entry was skipped: not a single word', '{n} entries were skipped: not single words') : undefined,
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const exportFile = () => {
    if (!words?.length) return
    const sorted = [...words].sort((a, b) => a.localeCompare(b, intlLocale()))
    const url = URL.createObjectURL(new Blob([sorted.join('\n') + '\n'], { type: 'text/plain' }))
    Object.assign(document.createElement('a'), { href: url, download: 'dictionary.txt' }).click()
    URL.revokeObjectURL(url)
  }

  const clear = async () => {
    if (!words?.length) return
    const ok = await confirmDialog({
      title: t('Remove all words?'),
      description: plural(words.length, '{n} word will be marked as misspelled again.', '{n} words will be marked as misspelled again.'),
      confirmLabel: t('Remove all'),
      destructive: true,
    })
    if (!ok) return
    const removed = [...words]
    try {
      await api.clearDictionary()
      await loadLearnedWords(true)
      tellEditors({ removed })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <form
        className="flex shrink-0 items-center gap-2"
        onSubmit={e => {
          e.preventDefault()
          void add()
        }}
      >
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('Find or add a word')}
            aria-label={t('Find or add a word')}
            aria-invalid={invalid || undefined}
            spellCheck={false}
            autoComplete="off"
          />
        </InputGroup>
        <Button type="submit" variant="secondary" size="sm" disabled={!typed || invalid || exists || busy}>
          {busy ? <Spinner /> : <Plus />} {t('Add')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.dic,text/plain"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void importFile(file)
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Actions')} disabled={!words}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
              <Upload /> {t('Import…')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!words?.length} onSelect={exportFile}>
              <Download /> {t('Export')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!words?.length} onSelect={() => void clear()}>
              <Trash2 /> {t('Remove all words')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </form>
      {invalid && <p className="-mt-1 shrink-0 px-1 text-xs text-destructive">{t('One word, without spaces')}</p>}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        {!!words?.length && (
          // A thumb index, as in a printed dictionary: jump to a letter.
          <nav aria-label={t('Letters')} className="flex shrink-0 overflow-x-auto border-b bg-muted/30 px-1 py-1">
            {index.map(letter => (
              <button
                key={letter}
                type="button"
                disabled={!present.has(letter)}
                onClick={() => jump(letter)}
                className="min-w-3.5 flex-1 rounded font-serif text-[13px] leading-5 font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-primary disabled:font-normal disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
              >
                {letter}
              </button>
            ))}
          </nav>
        )}
        <div ref={list} className="relative min-h-0 flex-1 overflow-y-auto">
          {!words ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Spinner className="size-5" />
            </div>
          ) : words.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SpellCheck />
                </EmptyMedia>
                <EmptyTitle>{t('Your dictionary is empty')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : shown === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {exists || invalid ? null : t('“{word}” isn’t in your dictionary.', { word: typed })}
            </p>
          ) : (
            groups.map(([group, ws]) => (
              <section key={group} data-group={group}>
                <h4
                  className="sticky top-0 z-10 border-b bg-popover/95 px-4 py-1 font-serif text-sm font-semibold text-primary backdrop-blur"
                >
                  {group}
                </h4>
                <ul className="grid sm:grid-cols-2">
                  {ws.map(w => (
                    <li
                      key={w}
                      className={cn('group flex h-9 items-center gap-2 pr-2 pl-4 transition-colors hover:bg-accent/50', fresh === w && 'bg-primary/10')}
                    >
                      <span className="min-w-0 flex-1 truncate font-serif text-[15px]" title={w}>
                        {w}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 max-sm:opacity-60"
                        disabled={removing === w}
                        onClick={() => void remove(w)}
                        aria-label={t('Remove “{word}”', { word: w })}
                        title={t('Remove from dictionary')}
                      >
                        {removing === w ? <Spinner /> : <X />}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
      {!!words?.length && (
        <p className="shrink-0 px-1 text-xs text-muted-foreground tabular-nums">
          {typed && shown !== words.length ? t('{shown} of {total}', { shown, total: words.length }) : plural(words.length, '{n} word', '{n} words')}
        </p>
      )}
    </div>
  )
}

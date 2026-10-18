import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirmDialog } from '@/components/confirm'
import { api } from '@/lib/api'
import { plural, t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { replacementFor, searchFiles, type SearchMatch, type SearchOptions } from './project-search'

/**
 * Search (and replace) across the project's text files. The files are read
 * fresh from the server (which first saves live edits), searched here, and
 * replacements are sent back as checked edits (POST /projects/:id/replace).
 */
export function SearchPanel({
  projectId,
  canReplace,
  seed,
  currentPath,
  onOpenMatch,
  onClose,
}: {
  projectId: string
  canReplace: boolean
  /** Ctrl/Cmd+F: the selected text to search for (each press has a new n). */
  seed?: { text: string; n: number }
  /** The open file, whose matches come first. */
  currentPath?: string
  onOpenMatch: (path: string, from: number, to: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState(seed?.text.split('\n')[0] ?? '')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regex, setRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [result, setResult] = useState<{ matches: SearchMatch[]; truncated: boolean }>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string>()
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)

  const options: SearchOptions = useMemo(
    () => ({ query, caseSensitive, regex, wholeWord }),
    [query, caseSensitive, regex, wholeWord],
  )

  const run = useCallback(async () => {
    const run = ++generation.current
    if (!options.query) {
      setResult(undefined)
      setError(undefined)
      return
    }
    setBusy(true)
    try {
      const { files } = await api.projectSources(projectId, 'text')
      if (run !== generation.current) return
      setResult(searchFiles(files, options))
      setError(undefined)
    } catch (e) {
      if (run !== generation.current) return
      setResult(undefined)
      setError((e as Error).message)
    } finally {
      if (run === generation.current) setBusy(false)
    }
  }, [projectId, options])

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 300)
    return () => window.clearTimeout(timer)
  }, [run])

  // Every Ctrl/Cmd+F lands in the search box, with the selection (one line of it) if there is one.
  useEffect(() => {
    const text = seed?.text.split('\n')[0]
    if (text) setQuery(text)
    input.current?.focus()
    input.current?.select()
  }, [seed])

  const groups = useMemo(() => {
    const map = new Map<string, SearchMatch[]>()
    for (const m of result?.matches ?? []) {
      const list = map.get(m.path)
      if (list) list.push(m)
      else map.set(m.path, [m])
    }
    // The open file first, as Ctrl/Cmd+F is usually about it.
    return [...map].sort(([a], [b]) => Number(b === currentPath) - Number(a === currentPath))
  }, [result, currentPath])

  const replace = async (matches: SearchMatch[]) => {
    const byFile = new Map<string, { from: number; to: number; expected: string; insert: string }[]>()
    for (const m of matches) {
      const edit = { from: m.from, to: m.to, expected: m.matched, insert: replacementFor(m, replacement, regex) }
      const list = byFile.get(m.path)
      if (list) list.push(edit)
      else byFile.set(m.path, [edit])
    }
    setBusy(true)
    try {
      const res = await api.replaceInProject(projectId, { files: [...byFile].map(([path, edits]) => ({ path, edits })) })
      if (res.skipped.length) {
        toast.warning(t('Some files changed since the search and were left alone: {files}', { files: res.skipped.join(', ') }))
      }
      if (res.replaced) toast.success(plural(res.replaced, 'Replaced 1 match', 'Replaced {n} matches'))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
      void run()
    }
  }

  const replaceAll = async () => {
    const matches = result?.matches ?? []
    if (!matches.length) return
    const ok = await confirmDialog({
      title: t('Replace all matches?'),
      description: t('{n} matches in {files} files will be replaced. The current state is saved as a version first, so you can restore it from the history.', {
        n: matches.length,
        files: groups.length,
      }),
      confirmLabel: t('Replace all'),
    })
    if (ok) await replace(matches)
  }

  const toggle = (label: string, pressed: boolean, onChange: (v: boolean) => void, text: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle size="sm" className="h-7 min-w-7 px-1.5 font-mono text-xs" pressed={pressed} onPressedChange={onChange} aria-label={label}>
          {text}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )

  const count = result?.matches.length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col">

      <div className="grid shrink-0 gap-2 border-b p-3">
        <div className="flex items-center gap-1">
          <Input
            ref={input}
            value={query}
            placeholder={t('Search in project')}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void run()
              if (e.key === 'Escape') onClose()
            }}
            className="h-8"
          />
          {toggle(t('Match case'), caseSensitive, setCaseSensitive, 'Aa')}
          {toggle(t('Whole word'), wholeWord, setWholeWord, 'ab')}
          {toggle(t('Regular expression'), regex, setRegex, '.*')}
          <Button variant="ghost" size="icon-sm" onClick={() => void run()} aria-label={t('Search again')} disabled={!query}>
            <RefreshCw className={cn(busy && 'animate-spin')} />
          </Button>
        </div>
        {canReplace && (
          <div className="flex items-center gap-1">
            <Input value={replacement} placeholder={t('Replace with')} onChange={e => setReplacement(e.target.value)} className="h-8" />
            <Button variant="outline" size="sm" className="h-8 shrink-0" disabled={!count || busy} onClick={() => void replaceAll()}>
              {t('Replace all')}
            </Button>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : !query ? null : result ? (
            count ? (
              <>
                {plural(count, '1 result', '{n} results')} · {plural(groups.length, 'in 1 file', 'in {n} files')}
                {result.truncated && ` · ${t('showing the first {n}', { n: count })}`}
              </>
            ) : (
              t('No results')
            )
          ) : (
            t('Searching…')
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {groups.map(([path, matches]) => {
          const open = !collapsed.has(path)
          return (
            <div key={path}>
              <button
                type="button"
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-sm font-medium hover:bg-accent"
                onClick={() =>
                  setCollapsed(prev => {
                    const next = new Set(prev)
                    if (next.has(path)) next.delete(path)
                    else next.add(path)
                    return next
                  })
                }
              >
                {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                <span className="min-w-0 truncate">{path}</span>
                <span className="ml-auto shrink-0 rounded bg-muted px-1.5 text-xs text-muted-foreground">{matches.length}</span>
              </button>
              {open &&
                matches.map(m => {
                  const key = `${m.path}:${m.from}`
                  return (
                    <div key={key} className={cn('group flex items-start', selected === key && 'bg-accent')}>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 gap-2 py-0.5 pr-1 pl-6 text-left text-xs hover:bg-accent"
                        onClick={() => {
                          setSelected(key)
                          onOpenMatch(m.path, m.from, m.to)
                        }}
                      >
                        <span className="w-7 shrink-0 text-right font-mono text-muted-foreground">{m.line}</span>
                        <span className="min-w-0 truncate font-mono">
                          {m.before}
                          <mark className="rounded-sm bg-amber-200 px-px text-foreground dark:bg-amber-500/40">{m.text}</mark>
                          {m.after}
                        </span>
                      </button>
                      {canReplace && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="mr-1 hidden h-5 shrink-0 px-1.5 group-hover:inline-flex"
                          disabled={busy}
                          onClick={() => void replace([m])}
                        >
                          {t('Replace')}
                        </Button>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

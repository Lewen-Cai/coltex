import { useEffect, useMemo, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { countProjectWords, type WordCountData } from '@coltex/latex-language'
import { api } from '../lib/api.ts'
import { intlLocale, t, tk } from '../lib/i18n.ts'
import { Checkbox } from './ui/checkbox.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { Spinner } from './ui/spinner.tsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.tsx'

const TOTAL_KEY = 'coltex:word-count-total'

/** The parts of a document, as Overleaf's word count splits them. */
const PARTS = [
  { key: 'text', label: tk('Main text'), words: 'textWords', chars: 'textCharacters', cjk: 'textCjk' },
  { key: 'headers', label: tk('Headings'), words: 'headWords', chars: 'headCharacters', cjk: 'headCjk' },
  { key: 'abstract', label: tk('Abstract'), words: 'abstractWords', chars: 'abstractCharacters', cjk: 'abstractCjk' },
  { key: 'captions', label: tk('Captions'), words: 'captionWords', chars: 'captionCharacters', cjk: 'captionCjk' },
  { key: 'footnotes', label: tk('Footnotes'), words: 'footnoteWords', chars: 'footnoteCharacters', cjk: 'footnoteCjk' },
  { key: 'other', label: tk('Other'), words: 'otherWords', chars: 'otherCharacters', cjk: 'otherCjk' },
] as const satisfies readonly { key: string; label: string; words: keyof WordCountData; chars: keyof WordCountData; cjk: keyof WordCountData }[]

/** Which parts count towards the total (Overleaf's default: the main text only), remembered in this browser. */
function readIncluded(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TOTAL_KEY) ?? 'null')
    if (Array.isArray(stored) && stored.every(k => typeof k === 'string')) return stored
  } catch {}
  return ['text']
}

function saveIncluded(keys: string[]) {
  try {
    localStorage.setItem(TOTAL_KEY, JSON.stringify(keys))
  } catch {}
}

/** A file that starts a document of its own (Overleaf counts it instead of the main document). */
const isMainFile = (content: string) => /^[^%\n]*\\documentclass\b/m.test(content)

/**
 * Word count of the document, computed in the browser from the LaTeX sources
 * (ported from Overleaf's client-side count): the main document and every file
 * it includes, or the open file if it is a document of its own.
 */
export function WordCountDialog({
  projectId,
  rootFile,
  openPath,
  language,
  open,
  onOpenChange,
}: {
  projectId: string
  rootFile?: string
  /** The file open in the editor. */
  openPath?: string
  /** The project's spell-check language (e.g. `en_US`); picks the word-splitting rules. */
  language?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [data, setData] = useState<{ counts: WordCountData; file: string }>()
  const [error, setError] = useState<string>()
  const [included, setIncluded] = useState(readIncluded)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setData(undefined)
    setError(undefined)
    api
      .projectSources(projectId)
      .then(({ files }) => {
        if (cancelled) return
        const sources = new Map(files.map(f => [f.path, f.content]))
        const openContent = openPath ? sources.get(openPath) : undefined
        const file = openPath && openContent !== undefined && isMainFile(openContent) ? openPath : rootFile
        if (!file || !sources.has(file)) {
          setError(`Could not count words: ${file ?? 'the main document'} was not found`)
          return
        }
        setData({ counts: countProjectWords({ files: sources, rootFile: file, locale: language || undefined }), file })
      })
      .catch(e => !cancelled && setError(`Could not count words: ${(e as Error).message}`))
    return () => {
      cancelled = true
    }
  }, [open, projectId, rootFile, openPath, language])

  const format = useMemo(() => new Intl.NumberFormat(intlLocale()), [])
  const counts = data?.counts
  const showCjk = !!counts && PARTS.some(p => counts[p.cjk] > 0)
  const total = (field: 'words' | 'chars' | 'cjk') =>
    counts ? PARTS.filter(p => included.includes(p.key)).reduce((sum, p) => sum + (counts[p[field]] as number), 0) : 0

  const toggle = (key: string, on: boolean) => {
    const next = on ? [...included.filter(k => k !== key), key] : included.filter(k => k !== key)
    setIncluded(next)
    saveIncluded(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('Word count')}</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !counts ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner /> {t('Counting…')}
          </div>
        ) : (
          <div className="grid gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead className="text-right">{t('Words')}</TableHead>
                  <TableHead className="text-right">{t('Characters')}</TableHead>
                  {showCjk && <TableHead className="text-right">{t('CJK characters')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                <TableRow className="font-semibold hover:bg-transparent">
                  <TableCell>{t('Total')}</TableCell>
                  <TableCell className="text-right text-primary">{format.format(total('words'))}</TableCell>
                  <TableCell className="text-right">{format.format(total('chars'))}</TableCell>
                  {showCjk && <TableCell className="text-right">{format.format(total('cjk'))}</TableCell>}
                </TableRow>
                {PARTS.map(p => (
                  <TableRow key={p.key}>
                    <TableCell>
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={included.includes(p.key)}
                          onCheckedChange={v => toggle(p.key, v === true)}
                          aria-label={t('Include {part} in the total', { part: t(p.label) })}
                        />
                        {t(p.label)}
                      </label>
                    </TableCell>
                    <TableCell className="text-right">{format.format(counts[p.words])}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{format.format(counts[p.chars])}</TableCell>
                    {showCjk && <TableCell className="text-right text-muted-foreground">{format.format(counts[p.cjk])}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              {[
                { label: t('Headings'), value: counts.headers },
                { label: t('Inline math'), value: counts.mathInline },
                { label: t('Display math'), value: counts.mathDisplay },
              ].map(item => (
                <div key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{format.format(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

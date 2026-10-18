import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { t, tk } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'
import { CATEGORIES, SYMBOLS, type LatexSymbol, type SymbolCategory } from '../symbols/symbols.ts'
import { Button } from './ui/button.tsx'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group.tsx'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

/** Translate at render: `t(CATEGORY_LABEL[c])`. */
const CATEGORY_LABEL: Record<SymbolCategory | 'recent', string> = {
  recent: tk('Recent'),
  greek: tk('Greek'),
  arrows: tk('Arrows'),
  operators: tk('Operators'),
  relations: tk('Relations'),
  misc: tk('Miscellaneous'),
}

const RECENT_KEY = 'coltex:recent-symbols'
const RECENT_MAX = 24

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Inserts at the cursor through the editor's symbol-palette extension (`editor:insert-symbol`). */
function insert(symbol: LatexSymbol) {
  window.dispatchEvent(new CustomEvent('editor:insert-symbol', { detail: { command: symbol.command } }))
}

/**
 * Overleaf's symbol palette: maths symbols by category, searchable by command
 * or by name ("integral", "subset"). Shown under the editor.
 */
export function SymbolPalette({ onClose }: { onClose: () => void }) {
  const [recent, setRecent] = useState(readRecent)
  const [tab, setTab] = useState<SymbolCategory | 'recent'>(() => (readRecent().length ? 'recent' : 'greek'))
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\\/, '')
    if (q) {
      return SYMBOLS.filter(s => s.command.toLowerCase().includes(q) || s.keywords?.includes(q) || s.preview === query.trim())
    }
    if (tab === 'recent') return recent.map(c => SYMBOLS.find(s => s.command === c)).filter((s): s is LatexSymbol => !!s)
    return SYMBOLS.filter(s => s.category === tab)
  }, [query, tab, recent])

  const pick = (symbol: LatexSymbol) => {
    insert(symbol)
    const next = [symbol.command, ...recent.filter(c => c !== symbol.command)].slice(0, RECENT_MAX)
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {}
  }

  const tabs = recent.length ? (['recent', ...CATEGORIES] as const) : CATEGORIES

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex h-full flex-col border-t bg-card"
      aria-label={t('Symbol palette')}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-2 py-1.5">
        <Tabs value={query ? '' : tab} onValueChange={v => (setQuery(''), setTab(v as SymbolCategory | 'recent'))}>
          <TabsList className="h-8">
            {tabs.map(c => (
              <TabsTrigger key={c} value={c} className="px-2.5 text-sm">
                {t(CATEGORY_LABEL[c])}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="ml-auto h-8 w-48">
          <InputGroupInput placeholder={t('Search symbols')} value={query} onChange={e => setQuery(e.target.value)} className="text-sm" />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('Close symbol palette')}>
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{query ? t('No symbols match “{query}”.', { query }) : t('Symbols you insert show up here.')}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
            {shown.map(s => (
              <Tooltip key={s.command} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    // Keep the editor's selection: insert where the cursor was.
                    onMouseDown={e => e.preventDefault()}
                    aria-label={s.command}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-md border border-transparent font-serif text-lg transition-colors hover:border-border hover:bg-accent focus-visible:border-ring focus-visible:outline-none',
                      s.preview.length > 2 && 'text-sm',
                    )}
                  >
                    {s.preview}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="grid gap-0.5">
                  <code className="font-mono">{s.command}</code>
                  {s.pkg && <span className="opacity-80">{t('Needs \\usepackage{{pkg}}', { pkg: s.pkg })}</span>}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}

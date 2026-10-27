import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CircleCheck, CircleX, ExternalLink, FileWarning, Info, Lightbulb, Sparkles, TriangleAlert } from 'lucide-react'
import type { CompileResult, Diagnostic } from '@coltex/shared'
import { t, tk, translateServerMessage } from '../lib/i18n.ts'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group.tsx'

const LEVEL = {
  error: { icon: CircleX, accent: 'border-l-destructive', iconColor: 'text-destructive', label: tk('Errors') },
  warning: { icon: TriangleAlert, accent: 'border-l-amber-500', iconColor: 'text-amber-500', label: tk('Warnings') },
  typesetting: { icon: Info, accent: 'border-l-sky-500', iconColor: 'text-sky-500', label: tk('Typesetting') },
} as const

type Filter = 'all' | Diagnostic['level']

type Props = {
  result: CompileResult
  rawLogUrl?: string
  onJump: (file: string, line: number) => void
  /** Hand the build's errors to the AI assistant. Absent when AI is unavailable. */
  onAskAi?: () => void
  /** Editors get "Fix with AI"; others can only have errors explained. */
  canFix?: boolean
}

export function LogPanel({ result, rawLogUrl, onJump, onAskAi, canFix = true }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const order = { error: 0, warning: 1, typesetting: 2 }
  const items = useMemo(() => [...result.diagnostics].sort((a, b) => order[a.level] - order[b.level]), [result.diagnostics])
  const counts = { error: 0, warning: 0, typesetting: 0 }
  for (const d of items) counts[d.level]++
  const shown = filter === 'all' ? items : items.filter(d => d.level === filter)
  const ok = result.status === 'success'

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <Badge variant={ok ? 'outline' : 'destructive'} className="gap-1">
          {ok ? <CircleCheck className="text-emerald-600 dark:text-emerald-400" /> : <FileWarning />}
          {ok ? t('Compiled') : result.status === 'timeout' ? t('Timed out') : t('Build failed')}
        </Badge>
        <span className="text-sm text-muted-foreground">{t('{seconds} s', { seconds: (result.durationMs / 1000).toFixed(1) })}</span>
        <ToggleGroup type="single" size="sm" value={filter} onValueChange={v => v && setFilter(v as Filter)} className="ml-2">
          <ToggleGroupItem value="all" className="h-8 px-2.5 text-sm">
            {t('All {count}', { count: items.length })}
          </ToggleGroupItem>
          {(['error', 'warning', 'typesetting'] as const).map(level => {
            const L = LEVEL[level]
            return (
              <ToggleGroupItem key={level} value={level} className="h-8 gap-1 px-2.5 text-sm" disabled={!counts[level]} title={t(L.label)} aria-label={`${t(L.label)} ${counts[level]}`}>
                <L.icon className={L.iconColor} /> {counts[level]}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <div className="ml-auto flex items-center gap-1">
          {onAskAi && (counts.error > 0 || !ok) && (
            <Button size="sm" onClick={() => onAskAi()}>
              <Sparkles /> {canFix ? t('Fix with AI') : t('Explain with AI')}
            </Button>
          )}
          {rawLogUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={rawLogUrl} target="_blank" rel="noreferrer">
                {t('Raw log')} <ExternalLink />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {result.message && <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-sm">{result.message}</pre>}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <CircleCheck className="size-8 text-emerald-500" />
            {t('No errors or warnings.')}
          </div>
        )}
        {shown.map((d, i) => {
          const L = LEVEL[d.level]
          return (
            <motion.div
              key={`${d.level}-${d.file}-${d.line}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.025 }}
              className={`rounded-lg border border-l-4 bg-card p-3 shadow-xs ${L.accent}`}
            >
              <div className="flex items-start gap-2">
                <L.icon className={`mt-0.5 size-4 shrink-0 ${L.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{d.message}</div>
                  {d.file && (
                    <button
                      disabled={!d.line}
                      onClick={() => d.line && onJump(d.file!, d.line)}
                      className="mt-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-muted-foreground transition-colors enabled:hover:bg-accent enabled:hover:text-accent-foreground"
                    >
                      {d.file}
                      {d.line ? `:${d.line}` : ''}
                    </button>
                  )}
                </div>
              </div>
              {d.content && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/70 p-2 font-mono text-sm text-muted-foreground">
                  {d.content.trim()}
                </pre>
              )}
              {d.hint && (
                <div className="mt-2 flex gap-2 rounded-md bg-accent/50 p-2 text-sm leading-relaxed text-accent-foreground">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {/* The diagnostic keeps the English hint: the AI assistant reads that one. */}
                    {translateServerMessage(d.hint)}
                    {d.hintUrl && (
                      <>
                        {' '}
                        <a href={d.hintUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                          {t('Learn more')}
                        </a>
                      </>
                    )}
                  </span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

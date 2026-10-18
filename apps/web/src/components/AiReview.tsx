import { useMemo, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { AiChanges } from '@coltex/shared'
import { applyHunks, computeHunks } from '../lib/hunks.ts'
import { HunkList } from './DiffView.tsx'
import { plural, t } from '../lib/i18n.ts'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.tsx'

export type ReviewScope = 'all' | 'turn'

type Props = {
  changes: AiChanges
  /** The whole draft, or only what the latest turn changed (when the server knows). */
  scope: ReviewScope
  onScopeChange: (scope: ReviewScope) => void
  busy: boolean
  error?: string
  onBack: () => void
  onDiscard: () => void
  onApply: (files: { path: string; content: string }[]) => Promise<void>
}

/** Review the assistant's draft hunk by hunk and apply what the author accepts. */
export function AiReview({ changes, scope: wanted, onScopeChange, busy, error, onBack, onDiscard, onApply }: Props) {
  const files = useMemo(
    () => changes.files.map(f => ({ ...f, ...computeHunks(f.base, f.proposed) })),
    [changes.files],
  )
  const turnBase = changes.turn?.base
  const scope = turnBase ? wanted : 'all'
  // "This turn": each file the latest turn touched, from its text before the turn. Read only:
  // choosing what to apply happens on the whole draft.
  const turnFiles = useMemo(
    () =>
      turnBase
        ? changes.files.filter(f => f.path in turnBase).map(f => ({ ...f, created: turnBase[f.path] === null, ...computeHunks(turnBase[f.path] ?? '', f.proposed) }))
        : [],
    [changes.files, turnBase],
  )
  // Rejected hunks per file (everything starts accepted).
  const [rejected, setRejected] = useState<Record<string, Set<number>>>({})
  const isAccepted = (path: string, id: number) => !rejected[path]?.has(id)
  const toggle = (path: string, id: number) =>
    setRejected(prev => {
      const set = new Set(prev[path])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, [path]: set }
    })

  const total = files.reduce((n, f) => n + f.hunks.length, 0)
  const acceptedCount = files.reduce((n, f) => n + f.hunks.filter(h => isAccepted(f.path, h.id)).length, 0)
  const trial = changes.trial

  const apply = () => {
    const out = files.flatMap(f => {
      const accepted = new Set(f.hunks.filter(h => isAccepted(f.path, h.id)).map(h => h.id))
      if (accepted.size === 0) return []
      return [{ path: f.path, content: accepted.size === f.hunks.length ? f.proposed : applyHunks(f.ops, accepted) }]
    })
    if (out.length) void onApply(out)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted">
          <ArrowLeft className="size-3.5" /> {t('Conversation')}
        </button>
        <span className="whitespace-nowrap font-medium">{t('Review changes')}</span>
        {trial ? (
          <span
            className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium ${
              trial.errors ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            }`}
            title={t('Test build of the project with all proposed changes')}
          >
            <span className={`size-1.5 rounded-full ${trial.errors ? 'bg-destructive' : 'bg-emerald-500'}`} />
            {trial.errors ? plural(trial.errors, 'Test build: {n} error', 'Test build: {n} errors') : t('Test build: passes')}
          </span>
        ) : (
          <span className="ml-auto text-[13px] text-muted-foreground">{t('Not test-compiled')}</span>
        )}
      </div>

      {turnBase && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <Tabs value={scope} onValueChange={v => onScopeChange(v as ReviewScope)}>
            <TabsList className="h-8">
              <TabsTrigger value="turn" className="px-3 text-sm">
                {t('Latest turn')}
              </TabsTrigger>
              <TabsTrigger value="all" className="px-3 text-sm">
                {t('Whole draft')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {scope === 'turn' && <span className="text-sm text-muted-foreground">{t('Pick what to apply under “Whole draft”.')}</span>}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
        {scope === 'turn' &&
          turnFiles.map(f => (
            <section key={f.path} className="overflow-hidden rounded border border-border">
              <header className="flex items-center gap-2 border-b border-border bg-muted px-2 py-1 text-sm">
                <span className="font-mono font-medium">{f.path}</span>
                {f.created && <span className="rounded bg-emerald-100 px-1.5 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">{t('new file')}</span>}
              </header>
              <HunkList
                hunks={f.hunks}
                header={h => <div className="bg-muted/50 px-2 py-0.5 text-[13px] text-muted-foreground">{t('Line {line}', { line: h.oldStart })}</div>}
              />
            </section>
          ))}
        {scope === 'all' && files.map(f => (
          <section key={f.path} className="overflow-hidden rounded border border-border">
            <header className="flex items-center gap-2 border-b border-border bg-muted px-2 py-1 text-sm">
              <span className="font-mono font-medium">{f.path}</span>
              {f.kind === 'created' && <span className="rounded bg-emerald-100 px-1.5 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">{t('new file')}</span>}
            </header>
            <HunkList
              hunks={f.hunks}
              dimmed={h => !isAccepted(f.path, h.id)}
              header={h => {
                const on = isAccepted(f.path, h.id)
                return (
                  <label className="flex cursor-pointer items-center gap-2 bg-muted/50 px-2 py-0.5 text-[13px] text-muted-foreground">
                    <input type="checkbox" checked={on} onChange={() => toggle(f.path, h.id)} />
                    {t('Line {line}', { line: h.oldStart })}
                    {on ? '' : ` · ${t('will be left out')}`}
                  </label>
                )
              }}
            />
          </section>
        ))}
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-t border-border p-2 text-sm">
        <span className="text-muted-foreground">
          {plural(total, '{accepted} of {n} change selected', '{accepted} of {n} changes selected', { accepted: acceptedCount })}
        </span>
        <button onClick={onDiscard} disabled={busy} className="ml-auto rounded px-2.5 py-1.5 hover:bg-muted disabled:opacity-50">
          {t('Discard all')}
        </button>
        <button
          onClick={apply}
          disabled={busy || acceptedCount === 0}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          title={t('Snapshot the project, apply, and recompile. Changes that make the build worse are rolled back.')}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {busy ? t('Applying and compiling…') : t('Apply selected')}
        </button>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import type { Hunk } from '../lib/hunks.ts'
import { t } from '../lib/i18n.ts'

/** The lines of one hunk: removed lines struck through in red, added lines in green. */
export function HunkLines({ hunk }: { hunk: Hunk }) {
  return (
    <pre className="overflow-x-auto font-mono text-sm leading-5">
      {hunk.lines.map((l, i) => (
        <div
          key={i}
          className={
            l.type === 'add'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
              : l.type === 'del'
                ? 'bg-red-50 text-red-900 line-through decoration-red-300 dark:bg-red-500/15 dark:text-red-200 dark:decoration-red-400/60'
                : 'text-muted-foreground'
          }
        >
          <span className="inline-block w-10 select-none pr-2 text-right text-muted-foreground">
            {l.type === 'add' ? l.newLine : l.oldLine}
          </span>
          <span className="select-none pr-1">{l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '}</span>
          {l.text || ' '}
        </div>
      ))}
    </pre>
  )
}

/** All hunks of a file, each with an optional header (e.g. an accept checkbox). */
export function HunkList({
  hunks,
  header,
  dimmed,
}: {
  hunks: Hunk[]
  header?: (hunk: Hunk) => ReactNode
  /** Fade a hunk out, e.g. one the author chose to leave out. */
  dimmed?: (hunk: Hunk) => boolean
}) {
  return (
    <>
      {hunks.map(h => (
        <div key={h.id} className={`border-b border-border last:border-b-0 ${dimmed?.(h) ? 'opacity-50' : ''}`}>
          {header ? header(h) : <div className="bg-muted/50 px-2 py-0.5 text-[13px] text-muted-foreground">{t('Line {line}', { line: h.oldStart })}</div>}
          <HunkLines hunk={h} />
        </div>
      ))}
    </>
  )
}

import { Children, isValidElement, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Info } from 'lucide-react'
import { t } from '@/lib/i18n'
import { keyParts } from '@/lib/platform'
import { cn } from '@/lib/utils'

/** Plain text of rendered children (for heading ids). */
function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map(child => (typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : ''))
    .join('')
}

export const headingId = (text: string) => `doc-${text.trim().toLowerCase().replace(/\s+/g, '-')}`

/** The ## headings of a page, as they render (Markdown marks stripped), for the table of contents. */
export function docHeadings(markdown: string): { id: string; text: string }[] {
  return [...markdown.matchAll(/^## (.+)$/gm)].map(m => {
    const text = m[1]!.replace(/[`*_]/g, '').trim()
    return { id: headingId(text), text }
  })
}

/** Code spans that are keys (`Mod+S`, `Ctrl+Space`, `Esc`) are drawn as keys, for this system (Mod is ⌘ on a Mac, Ctrl elsewhere). */
const KEY = /^(?:Ctrl|Alt|Shift|Cmd|Mod|Esc|Tab|Enter|F\d{1,2}|[⌘⇧⌥↩])/

function Keys({ text }: { text: string }) {
  // "Mod+Shift+F" → three keys (⌘ ⇧ F on a Mac); "⌘S" stays one.
  const parts = keyParts(text)
  return (
    <span className="inline-flex items-center gap-0.5 align-baseline whitespace-nowrap">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="rounded border border-b-2 bg-card px-1.5 py-0 font-sans text-[0.78em] leading-[1.5] font-medium text-foreground"
        >
          {part}
        </kbd>
      ))}
    </span>
  )
}

const components: Components = {
  h1: ({ node: _node, ...props }) => <h1 className="text-3xl font-semibold tracking-tight" {...props} />,
  h2: ({ node: _node, children, ...props }) => (
    <h2 id={headingId(textOf(children))} className="mt-12 scroll-mt-6 border-t pt-8 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node: _node, ...props }) => <h3 className="mt-7 text-base font-semibold" {...props} />,
  p: ({ node: _node, ...props }) => <p className="mt-4 leading-7" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 marker:text-muted-foreground" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7 marker:text-muted-foreground" {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1 [&>p]:mt-0 [&>ul]:mt-2" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  a: ({ node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) =>
    // Pages link to each other with in-app hashes; anything else opens beside the app.
    props.href?.startsWith('#') ? (
      <a {...props} className="font-medium text-primary underline-offset-4 hover:underline" />
    ) : (
      <a {...props} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline" />
    ),
  code: ({ node: _node, children, className, ...props }) => {
    const text = String(children ?? '')
    if (className || text.includes('\n')) return <code className={cn('font-mono', className)}>{children}</code>
    if (KEY.test(text) && text.length <= 24) return <Keys text={text} />
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ node: _node, ...props }) => <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/60 p-4 font-mono text-sm leading-6" {...props} />,
  blockquote: ({ node: _node, children }) => (
    <div className="mt-5 flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 [&_p]:mt-0">
      <Info className="mt-1 size-4 shrink-0 text-primary" />
      <div className="min-w-0 leading-7">{children}</div>
    </div>
  ),
  table: ({ node: _node, ...props }) => (
    <div className="mt-5 overflow-x-auto rounded-lg border [&_td+td_code]:[overflow-wrap:anywhere]">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className="bg-muted/60" {...props} />,
  th: ({ node: _node, ...props }) => <th className="px-4 py-2.5 text-left font-medium text-muted-foreground" {...props} />,
  td: ({ node: _node, ...props }) => <td className="border-t px-4 py-2.5 align-top" {...props} />,
  hr: () => <hr className="my-8 border-border" />,
}

/** A help page: the article in the middle, and on wide screens what's on the page beside it. */
export function DocView({ markdown, footer }: { markdown: string; footer?: ReactNode }) {
  const headings = useMemo(() => docHeadings(markdown), [markdown])
  const [active, setActive] = useState<string>()

  // Highlight the section being read: the last heading above the upper third of the view.
  useEffect(() => {
    const elements = headings.map(h => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e)
    const scroller = elements[0]?.closest('.overflow-y-auto')
    if (!scroller) return
    const onScroll = () => {
      const limit = scroller.getBoundingClientRect().top + scroller.clientHeight / 3
      let current = elements[0]?.id
      for (const e of elements) if (e.getBoundingClientRect().top <= limit) current = e.id
      setActive(current)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [headings])

  return (
    <div className="mx-auto flex max-w-6xl justify-center gap-14">
      <article className="w-full max-w-3xl min-w-0 pb-20 text-[15px] text-foreground/90 [&>h1+p]:mt-3 [&>h1+p]:text-base [&>h1+p]:leading-7 [&>h1+p]:text-muted-foreground [&>h1+h2]:mt-8 [&>h1+h2]:border-t-0 [&>h1+h2]:pt-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {markdown}
        </ReactMarkdown>
        {footer}
      </article>
      {headings.length > 1 && (
        <aside className="hidden w-52 shrink-0 xl:block">
          <nav className="sticky top-2 grid gap-0.5 text-sm">
            <span className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('On this page')}</span>
            <div className="grid gap-0.5 border-l">
            {headings.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={cn(
                  '-ml-px border-l-2 py-1 pl-3 text-left transition-colors',
                  active === h.id ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {h.text}
              </button>
            ))}
            </div>
          </nav>
        </aside>
      )}
    </div>
  )
}

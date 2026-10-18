import { memo, useMemo, type ComponentProps } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { renderMath, useKatex, type KatexModule } from '../lib/katex.ts'
import { cn } from '../lib/utils.ts'

const HAS_MATH = /\$|\\\(|\\\[/

/**
 * Models often write \(…\) and \[…\] instead of $…$ and $$…$$, which is all
 * remark-math knows, and $$…$$ on one line inside a paragraph, which it takes
 * for inline maths. Rewrite both so display maths is a block of its own,
 * leaving code spans and fences alone.
 */
export function normalizeMathDelimiters(text: string): string {
  return text
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a?: string, b?: string) => `\n\n$$\n${(a ?? b ?? '').trim()}\n$$\n\n`)
            .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex: string) => `$${tex.trim()}$`),
    )
    .join('')
}

function components(katex: KatexModule | undefined): Components {
  const math = (tex: string, display: boolean) =>
    katex ? (
      <span className={display ? 'my-2 block overflow-x-auto py-1' : undefined} dangerouslySetInnerHTML={{ __html: renderMath(katex, tex, display) }} />
    ) : (
      <code className="rounded bg-muted px-1 font-mono text-[0.85em]">{tex}</code>
    )
  return {
    // remark-math hands maths over as code with these classes.
    code({ className, children, node: _node, ...rest }) {
      const text = String(children ?? '')
      if (className?.includes('math-display')) return math(text, true)
      if (className?.includes('math-inline')) return math(text, false)
      const block = className?.startsWith('language-') || text.includes('\n')
      return block ? (
        <code className={cn('font-mono', className)} {...rest}>
          {children}
        </code>
      ) : (
        <code className="rounded bg-muted px-1 font-mono text-[0.85em]" {...rest}>
          {children}
        </code>
      )
    },
    pre({ children, node, ...rest }) {
      // A display-maths "code block" is already rendered by `code`; don't box it.
      const inner = node?.children[0]
      const cls = inner && 'properties' in inner ? String((inner.properties as { className?: string[] }).className ?? '') : ''
      if (cls.includes('math-display')) return <>{children}</>
      return (
        <pre
          className="overflow-x-auto rounded-md bg-slate-900 p-2.5 font-mono text-xs leading-relaxed text-slate-100 dark:bg-black/40 dark:ring-1 dark:ring-border"
          {...rest}
        >
          {children}
        </pre>
      )
    },
    a: ({ node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />
    ),
    ul: ({ node: _node, ...props }) => <ul className="list-disc space-y-1 pl-5" {...props} />,
    ol: ({ node: _node, ...props }) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
    h1: ({ node: _node, ...props }) => <h3 className="text-base font-semibold" {...props} />,
    h2: ({ node: _node, ...props }) => <h3 className="text-base font-semibold" {...props} />,
    h3: ({ node: _node, ...props }) => <h4 className="font-semibold" {...props} />,
    h4: ({ node: _node, ...props }) => <h5 className="font-semibold" {...props} />,
    blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-2 pl-3 text-muted-foreground" {...props} />,
    table: ({ node: _node, ...props }) => (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" {...props} />
      </div>
    ),
    th: ({ node: _node, ...props }) => <th className="border px-2 py-1 text-left font-semibold" {...props} />,
    td: ({ node: _node, ...props }) => <td className="border px-2 py-1 align-top" {...props} />,
    hr: () => <hr className="border-border" />,
  }
}

/**
 * Assistant replies: Markdown (GitHub flavour) with LaTeX maths typeset by
 * KaTeX. Raw HTML in the text is never rendered.
 */
export const Markdown = memo(function Markdown({ text, className }: { text: string; className?: string }) {
  const katex = useKatex(HAS_MATH.test(text))
  const source = useMemo(() => normalizeMathDelimiters(text), [text])
  const parts = useMemo(() => components(katex), [katex])
  return (
    <div className={cn('space-y-2 break-words leading-relaxed [&_li>p]:my-0', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]} components={parts}>
        {source}
      </ReactMarkdown>
    </div>
  )
})

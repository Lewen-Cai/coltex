// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/outline/components/{outline-pane,outline-root,outline-list,outline-item,
// outline-toggle-button,outline-item-toggle-button}.tsx, outline/hooks/use-nested-outline.ts,
// outline/util/get-children-lines.ts and ide-react/context/outline-context.tsx (closestSectionLineNumber)
// @ e039ad26c5bf5422eb57b89fc7e57c75055e631d. See NOTICE at the repository root.
//
// ColTex: one file; the editor state comes from CodeEditorHandle.subscribe
// instead of Overleaf's outline context and window events, the current line is
// the cursor's or the middle of the view after scrolling, and the drawing is
// ColTex's (Tailwind, lucide chevrons).

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { documentOutline, expandTextMacros, nestOutline, ProjectionStatus, textMacrosIn, type Outline } from '@coltex/latex-language'
import type { CodeEditorHandle } from '../components/CodeEditor.tsx'
import { t } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'

type FlatItem = { level: number; title: string; line: number }

const OPEN_KEY = 'coltex:outline-open'

const macroCache = new WeakMap<object, Map<string, string>>()

export function getChildrenLines(children?: Outline[]): number[] {
  return (children || []).map(child => getChildrenLines(child.children).concat(child.line)).flat()
}

const closestSectionLineNumber = (outline: { line: number }[] | undefined, lineNumber: number): number => {
  if (!outline) {
    return -1
  }
  let highestLine = -1
  for (const section of outline) {
    if (section.line > lineNumber) {
      return highestLine
    }
    highestLine = section.line
  }
  return highestLine
}

const sameOutline = (a: FlatItem[], b: FlatItem[]) =>
  a.length === b.length && a.every((x, i) => x.level === b[i]!.level && x.line === b[i]!.line && x.title === b[i]!.title)

/** The open file's sections and the line the person is at, kept up to date from the editor. */
export function useEditorOutline(editor: CodeEditorHandle | null) {
  const [flat, setFlat] = useState<{ items: FlatItem[]; partial: boolean }>({ items: [], partial: false })
  const [line, setLine] = useState(-1)

  useEffect(() => {
    if (!editor) return
    let timer: number | undefined
    let lastSelection: unknown
    const read = () => {
      timer = undefined
      const view = editor.getView()
      const result = view?.state.field(documentOutline, false)
      if (!view || !result || result.status === ProjectionStatus.Pending) return
      // ColTex: \newcommand{\method}{…} shows its text in titles, as in the visual editor.
      let macros = macroCache.get(view.state.doc)
      if (!macros) macroCache.set(view.state.doc, (macros = textMacrosIn(view.state.doc.toString())))
      const items = result.items.map(item => ({ level: item.level, title: expandTextMacros(item.title, macros), line: item.line }))
      setFlat(prev =>
        sameOutline(prev.items, items) && prev.partial === (result.status === ProjectionStatus.Partial)
          ? prev
          : { items, partial: result.status === ProjectionStatus.Partial },
      )
      // The cursor's line when the selection moved.
      if (view.state.selection !== lastSelection) {
        lastSelection = view.state.selection
        setLine(view.state.doc.lineAt(view.state.selection.main.head).number)
      }
    }
    const schedule = () => {
      if (timer === undefined) timer = window.setTimeout(read, 100)
    }
    const unsubscribe = editor.subscribe(schedule)
    // Scrolling: the line in the middle of the view (as Overleaf does).
    const view = editor.getView()
    const onScroll = () => {
      const v = editor.getView()
      if (!v) return
      const middle = v.lineBlockAtHeight(v.scrollDOM.scrollTop + v.scrollDOM.clientHeight / 2)
      setLine(v.state.doc.lineAt(middle.from).number)
    }
    view?.scrollDOM.addEventListener('scroll', onScroll, { passive: true })
    schedule()
    // The outline is computed as the file is parsed; read it again shortly after opening.
    const again = window.setTimeout(read, 600)
    return () => {
      unsubscribe()
      view?.scrollDOM.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
      window.clearTimeout(again)
    }
  }, [editor])

  const nested = useMemo(() => nestOutline(flat.items), [flat.items])
  const highlightedLine = useMemo(() => closestSectionLineNumber(flat.items, line), [flat.items, line])
  return { outline: nested, partial: flat.partial, highlightedLine }
}

export function OutlinePane({ editor, isTexFile }: { editor: CodeEditorHandle | null; isTexFile: boolean }) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== 'false'
    } catch {
      return true
    }
  })
  const toggle = () =>
    setExpanded(value => {
      try {
        localStorage.setItem(OPEN_KEY, String(!value))
      } catch {}
      return !value
    })
  const { outline, partial, highlightedLine } = useEditorOutline(isTexFile ? editor : null)
  const isOpen = isTexFile && expanded

  return (
    <div className={cn('flex min-h-0 flex-col border-t', isOpen ? 'max-h-[45%]' : 'shrink-0')}>
      <button
        type="button"
        className="flex h-9 shrink-0 items-center gap-1 px-2 text-sm font-medium whitespace-nowrap text-sidebar-foreground disabled:opacity-50"
        disabled={!isTexFile}
        onClick={toggle}
        aria-label={expanded ? t('Hide file outline') : t('Show file outline')}
      >
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {t('File outline')}
        {partial && isOpen && (
          <span className="ml-auto text-xs font-normal text-amber-600 dark:text-amber-400" title={t('The outline may be incomplete while the file is still being read.')}>
            {t('Partial')}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="min-h-0 overflow-y-auto pb-2">
          {outline.length ? (
            <OutlineList
              outline={outline}
              jumpToLine={line => editor?.goToLine(line)}
              isRoot
              highlightedLine={highlightedLine}
              containsHighlightedLine
            />
          ) : (
            <p className="px-3 py-1 text-xs text-muted-foreground">{t('No sections or subsections in this file.')}</p>
          )}
        </div>
      )}
    </div>
  )
}

const OutlineList = memo(function OutlineList({
  outline,
  jumpToLine,
  isRoot,
  highlightedLine,
  containsHighlightedLine,
}: {
  outline: Outline[]
  jumpToLine: (line: number) => void
  isRoot?: boolean
  highlightedLine?: number | null
  containsHighlightedLine?: boolean
}) {
  return (
    <ul className={cn(!isRoot && 'ml-3 border-l border-border/70 pl-1')} role={isRoot ? 'tree' : 'group'}>
      {outline.map((outlineItem, idx) => {
        const matchesHighlightedLine = containsHighlightedLine && highlightedLine === outlineItem.line
        const itemContainsHighlightedLine =
          highlightedLine !== undefined &&
          highlightedLine !== null &&
          containsHighlightedLine &&
          getChildrenLines(outlineItem.children).includes(highlightedLine)

        // highlightedLine is only provided to the item if the item matches or
        // contains the highlighted line, so the other items can be memoized.
        return (
          <OutlineItem
            key={`${outlineItem.level}-${idx}`}
            outlineItem={outlineItem}
            jumpToLine={jumpToLine}
            highlightedLine={matchesHighlightedLine || itemContainsHighlightedLine ? highlightedLine : null}
            matchesHighlightedLine={matchesHighlightedLine}
            containsHighlightedLine={itemContainsHighlightedLine}
          />
        )
      })}
    </ul>
  )
})

const OutlineItem = memo(function OutlineItem({
  outlineItem,
  jumpToLine,
  highlightedLine,
  matchesHighlightedLine,
  containsHighlightedLine,
}: {
  outlineItem: Outline
  jumpToLine: (line: number) => void
  highlightedLine?: number | null
  matchesHighlightedLine?: boolean
  containsHighlightedLine?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const titleElementRef = useRef<HTMLButtonElement>(null)
  const isHighlightedRef = useRef<boolean>(false)

  const hasHighlightedChild = !expanded && containsHighlightedLine
  const isHighlighted = matchesHighlightedLine || hasHighlightedChild

  useEffect(() => {
    const wasHighlighted = isHighlightedRef.current
    isHighlightedRef.current = !!isHighlighted
    if (!wasHighlighted && isHighlighted && titleElementRef.current) {
      titleElementRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isHighlighted])

  // don't set the aria-expanded attribute when there are no children
  const ariaExpandedValue = outlineItem.children ? expanded : undefined

  return (
    <li
      aria-expanded={ariaExpandedValue}
      role="treeitem"
      aria-current={isHighlighted}
      aria-label={outlineItem.title}
      translate="no"
    >
      <div className="flex items-center">
        {outlineItem.children ? (
          <button
            type="button"
            className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent"
            onClick={() => setExpanded(value => !value)}
            aria-label={expanded ? t('Collapse') : t('Expand')}
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          ref={titleElementRef}
          className={cn(
            'min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-sm hover:bg-sidebar-accent',
            isHighlighted && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          )}
          title={outlineItem.title}
          onClick={() => jumpToLine(outlineItem.line)}
        >
          {outlineItem.title}
        </button>
      </div>
      {expanded && outlineItem.children ? (
        <OutlineList
          outline={outlineItem.children}
          jumpToLine={jumpToLine}
          isRoot={false}
          highlightedLine={containsHighlightedLine ? highlightedLine : null}
          containsHighlightedLine={containsHighlightedLine}
        />
      ) : null}
    </li>
  )
})

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  Bold,
  BookMarked,
  ChevronDown,
  Heading,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquarePlus,
  MoreHorizontal,
  Redo2,
  Sigma,
  SquareFunction,
  Table2,
  Tag,
  Undo2,
} from 'lucide-react'
import { yUndoManagerKeymap } from 'y-codemirror.next'
import {
  addComment,
  findCurrentSectionHeadingLevel,
  indentDecrease,
  indentIncrease,
  insertCite,
  insertRef,
  insertTable,
  minimumListDepthForSelection,
  setSectionHeadingLevel,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleNumberedList,
  withinFormattingCommand,
  wrapInDisplayMath,
  wrapInHref,
  wrapInInlineMath,
} from '@coltex/latex-language'
import { useEditorSettings } from '../lib/editor-settings.ts'
import { t, tk } from '../lib/i18n.ts'
import { formatKeys, isMac } from '../lib/platform.ts'
import { bindingsFor, type ShortcutCommand } from '../lib/shortcuts.ts'
import { cn } from '../lib/utils.ts'
import { openFigureModal } from '../figure-modal/figure-modal.tsx'
import type { CodeEditorHandle } from './CodeEditor.tsx'
import { Button } from './ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'
import { Separator } from './ui/separator.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

const mod = (key: string) => (isMac ? `⌘${key}` : `Ctrl+${key}`)

/**
 * Button groups move into the "more" menu one by one, last group first, when
 * the toolbar is too narrow for them (as Overleaf's toolbar does), instead of
 * being cut off. Their widths are known: 32 px buttons, 2 px gaps, 9 px dividers.
 */
const BUTTON = 34
const DIVIDER = 11
type Group = 'heading' | 'format' | 'maths' | 'insert' | 'lists'
const GROUP_ORDER: Group[] = ['heading', 'format', 'maths', 'insert', 'lists']

/** The toolbar's width, and the width of its parts that vary (mode switch, trailing buttons). */
function useFit() {
  const ref = useRef<HTMLDivElement>(null)
  const fixedRef = useRef<HTMLDivElement>(null)
  const trailingRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: Infinity, fixed: 0, trailing: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setSize({
        width: el.clientWidth - 16,
        fixed: fixedRef.current?.offsetWidth ?? 0,
        trailing: trailingRef.current?.offsetWidth ?? 0,
      })
    const observer = new ResizeObserver(measure)
    for (const node of [el, fixedRef.current, trailingRef.current]) if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return { ref, fixedRef, trailingRef, size }
}

const undo = yUndoManagerKeymap.find(k => k.key === 'Mod-z')!.run!
const redo = yUndoManagerKeymap.find(k => k.key === 'Mod-Shift-z')!.run!

/** Overleaf's section levels; "text" removes the heading. Translate at render. */
const LEVELS = [
  { level: 'text', label: tk('Normal text') },
  { level: 'part', label: tk('Part') },
  { level: 'chapter', label: tk('Chapter') },
  { level: 'section', label: tk('Section') },
  { level: 'subsection', label: tk('Subsection') },
  { level: 'subsubsection', label: tk('Subsubsection') },
  { level: 'paragraph', label: tk('Paragraph') },
  { level: 'subparagraph', label: tk('Subparagraph') },
] as const

/**
 * The editor toolbar, as in Overleaf: headings, bold/italic, maths and the
 * symbol palette, links, references, citations, figures, tables and lists.
 * It re-renders on its own as the selection moves (not the whole page).
 */
export function EditorToolbar({
  editor,
  latex,
  editable,
  canComment,
  symbolsOpen,
  onToggleSymbols,
  visual,
  onVisualChange,
  trailing,
}: {
  editor: CodeEditorHandle | null
  /** LaTeX formatting buttons only make sense in .tex files. */
  latex: boolean
  /** Read-only members get the code/visual switch and search only. */
  editable: boolean
  canComment: boolean
  symbolsOpen: boolean
  onToggleSymbols: () => void
  visual: boolean
  onVisualChange: (visual: boolean) => void
  /** Shown at the end, e.g. Recompile while the PDF is in a window of its own. */
  trailing?: ReactNode
}) {
  // Shortcut hints follow the person's own keys (lib/shortcuts.ts).
  const { shortcuts } = useEditorSettings()
  const keys = (id: ShortcutCommand) => formatKeys(bindingsFor(id, shortcuts)[0]!)
  // Re-render whenever the editor's document or selection changes.
  const version = useSyncExternalStore(
    useCallback(cb => editor?.subscribe(cb) ?? (() => {}), [editor]),
    () => editor?.getView()?.state,
  )
  const view = editor?.getView() ?? null
  const state = version ?? view?.state

  const run = (command: (view: EditorView) => boolean | void) => () => {
    if (!view) return
    command(view)
    view.focus()
  }

  const isActive = state && latex ? withinFormattingCommand(state) : () => false
  const heading = state && latex ? findCurrentSectionHeadingLevel(state) : null
  const listDepth = state && latex ? minimumListDepthForSelection(state) : 0
  const currentLevel = LEVELS.find(l => l.level === heading?.level)
  const { ref, fixedRef, trailingRef, size } = useFit()
  const groupWidth: Record<Group, number> = {
    heading: 128 + DIVIDER,
    format: 2 * BUTTON + DIVIDER,
    maths: 46 + BUTTON + DIVIDER,
    insert: (canComment ? 6 : 5) * BUTTON + DIVIDER,
    lists: (listDepth >= 1 ? 4 : 2) * BUTTON + DIVIDER,
  }
  // Everything fits, or the groups that fit in order with room left for the "more" button.
  const room = size.width - size.fixed - size.trailing
  const shown = new Set<Group>()
  if (GROUP_ORDER.reduce((sum, g) => sum + groupWidth[g], 0) <= room) GROUP_ORDER.forEach(g => shown.add(g))
  else {
    let left = room - BUTTON - 4
    for (const g of GROUP_ORDER) {
      if (left < groupWidth[g]) break
      left -= groupWidth[g]
      shown.add(g)
    }
  }
  const showInsert = shown.has('insert')
  const showLists = shown.has('lists')
  const overflow = GROUP_ORDER.some(g => !shown.has(g))

  const headingItems = LEVELS.map(l => (
    <DropdownMenuItem key={l.level} onSelect={() => view && setSectionHeadingLevel(view, l.level)}>
      <span className={cn(l.level === 'section' && 'font-semibold', l.level === heading?.level && 'text-primary')}>{t(l.label)}</span>
    </DropdownMenuItem>
  ))
  const mathsItems = (
    <>
      <DropdownMenuItem onSelect={run(wrapInInlineMath)}>
        <span className="whitespace-nowrap">{t('Inline maths')}</span>
        <DropdownMenuShortcut>{mod('/')}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={run(wrapInDisplayMath)}>
        <span className="whitespace-nowrap">{t('Display maths')}</span>
        <DropdownMenuShortcut>{isMac ? '⇧⌘/' : 'Ctrl+Shift+/'}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  )

  return (
    <div ref={ref} className="flex h-11 shrink-0 items-center gap-0.5 overflow-hidden border-b bg-card px-2 [&_svg]:size-[18px]" role="toolbar" aria-label={t('Editor toolbar')}>
      <div ref={fixedRef} className="flex shrink-0 items-center gap-0.5">
        {latex && <ModeSwitch visual={visual} onChange={onVisualChange} />}
        {latex && editable && <Divider />}
        {editable && (
          <>
            <ToolButton label={t('Undo')} shortcut={mod('Z')} onClick={run(undo)} disabled={!view}>
              <Undo2 />
            </ToolButton>
            <ToolButton label={t('Redo')} shortcut={isMac ? '⇧⌘Z' : 'Ctrl+Y'} onClick={run(redo)} disabled={!view}>
              <Redo2 />
            </ToolButton>
          </>
        )}
      </div>
      {latex && editable && (
        <>
          {shown.has('heading') && (
            <>
              <Divider />
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-32 shrink-0 justify-between px-2 text-sm font-normal" disabled={!view}>
                        <span className="truncate">{currentLevel ? t(currentLevel.label) : heading ? heading.level : '—'}</span>
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t('Heading')}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-48" onCloseAutoFocus={e => (e.preventDefault(), view?.focus())}>
                  {headingItems}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {shown.has('format') && (
            <>
              <Divider />
              <ToolButton label={t('Bold')} shortcut={keys('bold')} onClick={run(toggleBold)} active={isActive('\\textbf')} disabled={!view}>
                <Bold />
              </ToolButton>
              <ToolButton label={t('Italic')} shortcut={keys('italic')} onClick={run(toggleItalic)} active={isActive('\\textit')} disabled={!view}>
                <Italic />
              </ToolButton>
            </>
          )}
          {shown.has('maths') && (
            <>
              <Divider />
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-0.5 px-1.5" disabled={!view} aria-label={t('Insert maths')}>
                        <SquareFunction />
                        <ChevronDown className="size-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t('Insert maths')}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="min-w-52" onCloseAutoFocus={e => (e.preventDefault(), view?.focus())}>
                  {mathsItems}
                </DropdownMenuContent>
              </DropdownMenu>
              <ToolButton label={t('Insert symbol')} onClick={onToggleSymbols} active={symbolsOpen} disabled={!view}>
                <Sigma />
              </ToolButton>
            </>
          )}
          {showInsert && (
            <>
              <Divider />
              <ToolButton label={t('Insert link')} onClick={run(wrapInHref)} disabled={!view}>
                <Link2 />
              </ToolButton>
              <ToolButton label={t('Insert cross-reference')} onClick={run(insertRef)} disabled={!view}>
                <Tag />
              </ToolButton>
              <ToolButton label={t('Insert citation')} onClick={run(insertCite)} disabled={!view}>
                <BookMarked />
              </ToolButton>
              {canComment && (
                <ToolButton
                  label={t('Add comment')}
                  onClick={() => addComment()}
                  disabled={!state || state.selection.main.empty}
                >
                  <MessageSquarePlus />
                </ToolButton>
              )}
              <FigureButton disabled={!view} />
              <TableButton disabled={!view} onInsert={(cols, rows) => view && (insertTable(view, cols, rows), view.focus())} />
            </>
          )}
          {showLists && (
            <>
              <Divider />
              <ToolButton label={t('Bulleted list')} onClick={run(toggleBulletList)} disabled={!view}>
                <List />
              </ToolButton>
              <ToolButton label={t('Numbered list')} onClick={run(toggleNumberedList)} disabled={!view}>
                <ListOrdered />
              </ToolButton>
              {listDepth >= 1 && (
                <>
                  <ToolButton label={t('Decrease indent')} onClick={run(indentDecrease)} disabled={!view || listDepth < 2}>
                    <IndentDecrease />
                  </ToolButton>
                  <ToolButton label={t('Increase indent')} onClick={run(indentIncrease)} disabled={!view}>
                    <IndentIncrease />
                  </ToolButton>
                </>
              )}
            </>
          )}
          {overflow && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="ml-1 size-8 shrink-0" disabled={!view} aria-label={t('More')}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('More')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={e => (e.preventDefault(), view?.focus())}>
                {!shown.has('heading') && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Heading /> {t('Heading')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">{headingItems}</DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {!shown.has('format') && (
                  <>
                    <DropdownMenuItem onSelect={run(toggleBold)}>
                      <Bold /> {t('Bold')}
                      <DropdownMenuShortcut>{keys('bold')}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={run(toggleItalic)}>
                      <Italic /> {t('Italic')}
                      <DropdownMenuShortcut>{keys('italic')}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </>
                )}
                {!shown.has('maths') && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <SquareFunction /> {t('Insert maths')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-52">{mathsItems}</DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onSelect={onToggleSymbols}>
                      <Sigma /> {t('Insert symbol')}
                    </DropdownMenuItem>
                  </>
                )}
                {!showInsert && (
                  <>
                    <DropdownMenuItem onSelect={run(wrapInHref)}>
                      <Link2 /> {t('Insert link')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={run(insertRef)}>
                      <Tag /> {t('Insert cross-reference')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={run(insertCite)}>
                      <BookMarked /> {t('Insert citation')}
                    </DropdownMenuItem>
                    {canComment && (
                      <DropdownMenuItem disabled={!state || state.selection.main.empty} onSelect={() => addComment()}>
                        <MessageSquarePlus /> {t('Add comment')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => openFigureModal('upload')}>
                      <Image /> {t('Upload figure')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFigureModal('project')}>
                      <Image /> {t('Figure from project files')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => view && (insertTable(view, 3, 3), view.focus())}>
                      <Table2 /> {t('Insert table')}
                    </DropdownMenuItem>
                  </>
                )}
                {!showLists && (
                  <>
                    <DropdownMenuItem onSelect={run(toggleBulletList)}>
                      <List /> {t('Bulleted list')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={run(toggleNumberedList)}>
                      <ListOrdered /> {t('Numbered list')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
      <div className="ml-auto" />
      <div ref={trailingRef} className="flex shrink-0 items-center gap-0.5">
        {trailing}
      </div>
    </div>
  )
}

/** Overleaf's editor switch: the LaTeX source, or the visual (rich text) view of it. */
function ModeSwitch({ visual, onChange }: { visual: boolean; onChange: (visual: boolean) => void }) {
  return (
    <div className="flex h-8 shrink-0 items-center rounded-md bg-muted p-0.5 text-sm" role="radiogroup" aria-label={t('Editor mode')}>
      {[false, true].map(v => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={visual === v}
          onMouseDown={e => e.preventDefault()}
          onClick={() => onChange(v)}
          className={cn(
            'h-7 rounded-[5px] px-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground',
            visual === v && 'bg-background text-foreground shadow-sm',
          )}
        >
          {v ? t('Visual') : t('Code')}
        </button>
      ))}
    </div>
  )
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1 data-vertical:self-center data-[orientation=vertical]:h-4" />
}

function ToolButton({
  label,
  shortcut,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string
  shortcut?: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn('size-8', active && 'bg-accent text-accent-foreground')}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          // Buttons must not take focus from the editor (the selection would be lost).
          onMouseDown={e => e.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-2 opacity-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

const GRID = 8

/** Pick a table size by hovering over a grid, like Overleaf's table inserter. */
/** Overleaf's figure menu: the modal opens on the chosen source. */
function FigureButton({ disabled }: { disabled: boolean }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-8" disabled={disabled} aria-label={t('Insert figure')}>
              <Image />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('Insert figure')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" onCloseAutoFocus={e => e.preventDefault()}>
        <DropdownMenuItem onSelect={() => openFigureModal('upload')}>{t('Upload from computer')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openFigureModal('project')}>{t('From project files')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TableButton({ disabled, onInsert }: { disabled: boolean; onInsert: (cols: number, rows: number) => void }) {
  const [size, setSize] = useState<{ cols: number; rows: number }>({ cols: 0, rows: 0 })
  return (
    <DropdownMenu onOpenChange={() => setSize({ cols: 0, rows: 0 })}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-8" disabled={disabled} aria-label={t('Insert table')}>
              <Table2 />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('Insert table')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="p-2" onCloseAutoFocus={e => e.preventDefault()}>
        <div className="mb-1.5 text-sm text-muted-foreground">
          {size.cols ? t('{cols} × {rows} table', { cols: size.cols, rows: size.rows }) : t('Choose a size')}
        </div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID}, 1rem)` }} onMouseLeave={() => setSize({ cols: 0, rows: 0 })}>
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const cols = (i % GRID) + 1
            const rows = Math.floor(i / GRID) + 1
            const on = cols <= size.cols && rows <= size.rows
            return (
              <DropdownMenuItem
                key={i}
                className={cn('size-4 rounded-[3px] border p-0', on ? 'border-primary bg-primary/30' : 'bg-muted/40')}
                onMouseEnter={() => setSize({ cols, rows })}
                onFocus={() => setSize({ cols, rows })}
                onSelect={() => onInsert(cols, rows)}
                aria-label={t('{cols} × {rows} table', { cols, rows })}
              />
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

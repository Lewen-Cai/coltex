import { useState, type MouseEvent, type ReactNode } from 'react'
import { selectAll } from '@codemirror/commands'
import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { Clipboard, Copy, Crosshair, FileText, MessageSquarePlus, Scissors, SquareDashedMousePointer, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { addComment, commandTargetAt, deleteSelection, type CommandTarget } from '@coltex/latex-language'
import { t } from '../lib/i18n.ts'
import type { CodeEditorHandle } from './CodeEditor.tsx'
import { isMac } from '../lib/platform.ts'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from './ui/context-menu.tsx'

const mod = (key: string) => (isMac ? `⌘${key}` : `Ctrl+${key}`)

type Props = {
  editor: CodeEditorHandle | null
  children: ReactNode
  /** Can change the text (editors, and reviewers through suggestions). */
  canType: boolean
  canComment: boolean
  /** SyncTeX from the cursor, when there is a PDF. */
  onGoToPdf?: () => void
  /** A label in another file, or a file named by \input/\include. */
  onOpenLabel: (name: string) => void
  onOpenFile: (path: string) => void
}

/**
 * The editor's right-click menu, as in Overleaf: clipboard, select all,
 * delete, the PDF location, going to a \ref's label or an \input's file, and
 * comments. A right-click on a misspelled word keeps the spelling menu (its
 * handler prevents the default, so this menu stays closed).
 */
export function EditorContextMenu({ editor, children, canType, canComment, onGoToPdf, onOpenLabel, onOpenFile }: Props) {
  const [hasSelection, setHasSelection] = useState(false)
  const [target, setTarget] = useState<CommandTarget>()
  const view = () => editor?.getView() ?? null

  const onContextMenu = (event: MouseEvent) => {
    const v = view()
    if (!v || event.defaultPrevented || !v.dom.contains(event.target as Node)) return
    // Like a text field: a right-click outside the selection moves the cursor there first.
    const pos = v.posAtCoords({ x: event.clientX, y: event.clientY }, false)
    const inside = v.state.selection.ranges.some(r => !r.empty && pos >= r.from && pos <= r.to)
    if (!inside) v.dispatch({ selection: EditorSelection.cursor(pos) })
    setHasSelection(!v.state.selection.main.empty)
    setTarget(commandTargetAt(v.state, v.state.selection.main.head))
  }

  /** Run with the editor focused, as the keyboard shortcut would. */
  const act = (fn: (v: EditorView) => unknown) => () => {
    const v = view()
    if (!v) return
    v.focus()
    fn(v)
  }

  // Through the browser's own commands, so CodeMirror's copy/cut handlers
  // (and tracked changes) see them; reading the clipboard needs permission.
  const copy = act(() => document.execCommand('copy'))
  const cut = act(() => document.execCommand('cut'))
  const paste = act(async v => {
    try {
      const text = await navigator.clipboard.readText()
      v.dispatch(v.state.replaceSelection(text), { userEvent: 'input.paste', scrollIntoView: true })
    } catch {
      toast.error(`The browser didn't allow reading the clipboard. Paste with ${mod('V')} instead.`)
    }
  })

  const goToTarget = act(v => {
    if (target?.kind === 'label') {
      if (target.local) {
        const selection = EditorSelection.range(target.local.from, target.local.to)
        v.dispatch({ selection, effects: EditorView.scrollIntoView(selection, { y: 'center' }) })
      } else {
        onOpenLabel(target.name)
      }
    } else if (target?.kind === 'file') {
      onOpenFile(target.path)
    }
  })

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild onContextMenu={onContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-56"
        onCloseAutoFocus={e => {
          e.preventDefault()
          view()?.focus()
        }}
      >
        {canType && (
          <ContextMenuItem disabled={!hasSelection} onSelect={cut}>
            <Scissors /> {t('Cut')}
            <ContextMenuShortcut>{mod('X')}</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        <ContextMenuItem disabled={!hasSelection} onSelect={copy}>
          <Copy /> {t('Copy')}
          <ContextMenuShortcut>{mod('C')}</ContextMenuShortcut>
        </ContextMenuItem>
        {canType && (
          <ContextMenuItem onSelect={paste}>
            <Clipboard /> {t('Paste')}
            <ContextMenuShortcut>{mod('V')}</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={act(selectAll)}>
          <SquareDashedMousePointer /> {t('Select all')}
          <ContextMenuShortcut>{mod('A')}</ContextMenuShortcut>
        </ContextMenuItem>
        {canType && (
          <ContextMenuItem disabled={!hasSelection} onSelect={act(deleteSelection)}>
            <Trash2 /> {t('Delete')}
          </ContextMenuItem>
        )}
        {(onGoToPdf || target) && <ContextMenuSeparator />}
        {onGoToPdf && (
          <ContextMenuItem onSelect={onGoToPdf}>
            <Crosshair /> {t('Go to PDF')}
          </ContextMenuItem>
        )}
        {target?.kind === 'label' && (
          <ContextMenuItem onSelect={goToTarget}>
            <Tag /> {t('Go to label')}
            <ContextMenuShortcut className="max-w-24 truncate">{target.name}</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {target?.kind === 'file' && (
          <ContextMenuItem onSelect={goToTarget}>
            <FileText /> {t('Open file')}
            <ContextMenuShortcut className="max-w-24 truncate">{target.path}</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {canComment && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!hasSelection} onSelect={() => addComment()}>
              <MessageSquarePlus /> {t('Add comment')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

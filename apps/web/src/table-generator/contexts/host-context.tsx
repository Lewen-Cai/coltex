// ColTex: what the table editor needs from the editor around it (Overleaf
// reads these from its CodeMirror context and global hooks): the view, and
// compile/undo/redo, which CodeMirror's keymap can't see inside the widget.

import { createContext, useContext } from 'react'
import type { EditorView } from '@codemirror/view'

export type TableHost = {
  compile: () => void
  undo: (view: EditorView) => void
  redo: (view: EditorView) => void
}

export const CodeMirrorViewContext = createContext<EditorView | null>(null)

export const useCodeMirrorViewContext = () => {
  const view = useContext(CodeMirrorViewContext)
  if (!view) {
    throw new Error('useCodeMirrorViewContext is only available inside CodeMirrorViewContext.Provider')
  }
  return view
}

export const TableHostContext = createContext<TableHost | null>(null)

export const useTableHost = () => {
  const host = useContext(TableHostContext)
  if (!host) {
    throw new Error('useTableHost is only available inside TableHostContext.Provider')
  }
  return host
}

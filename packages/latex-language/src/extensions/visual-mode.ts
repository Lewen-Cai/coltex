// ColTex: whether the editor shows Overleaf's visual (rich text) mode. Ported
// toolbar commands ask `isVisual(view)`; there is no visual editor yet, so the
// facet defaults to false. The visual editor port provides `visualMode.of(true)`.

import { Facet } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export const visualMode = Facet.define<boolean, boolean>({
  combine: values => values.some(Boolean),
})

export const isVisual = (view: EditorView): boolean => view.state.facet(visualMode)

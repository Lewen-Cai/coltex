// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/utils/select-node.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'

export const selectNode = (view: EditorView, node: SyntaxNode) => {
  view.dispatch({
    selection: EditorSelection.single(node.from + 1, node.to - 1),
    scrollIntoView: true,
  })
}

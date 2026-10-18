// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/utils/list-item.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorState } from '@codemirror/state'
import { IndentContext, indentString } from '@codemirror/language'

export const createListItem = (state: EditorState, pos: number) => {
  const cx = new IndentContext(state)
  const columns = cx.lineIndent(pos)
  const indent = indentString(state, columns)
  return `${indent}\\item `
}

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/tree-operations/formatting.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorState, SelectionRange } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import {
  commonAncestor,
  matchingAncestor,
} from './ancestors'

export type FormattingCommand = '\\textbf' | '\\textit'
export type FormattingNodeType = string | number

export const formattingCommandMap: Record<
  FormattingCommand,
  FormattingNodeType
> = {
  '\\textbf': 'TextBoldCommand',
  '\\textit': 'TextItalicCommand',
}

export const withinFormattingCommand = (state: EditorState) => {
  const tree = syntaxTree(state)

  return (command: FormattingCommand): boolean => {
    const nodeType = formattingCommandMap[command]

    const isFormattedText = (range: SelectionRange): boolean => {
      const nodeLeft = tree.resolveInner(range.from, -1)
      const formattingCommandLeft = matchingAncestor(nodeLeft, node =>
        node.type.is(nodeType)
      )
      if (!formattingCommandLeft) {
        return false
      }

      // We need to check the other end of the selection, and ensure that they
      // share a common formatting command ancestor
      const nodeRight = tree.resolveInner(range.to, 1)
      const ancestor = commonAncestor(formattingCommandLeft, nodeRight)
      if (!ancestor) {
        return false
      }

      const formattingAncestor = matchingAncestor(ancestor, node =>
        node.type.is(nodeType)
      )
      return Boolean(formattingAncestor)
    }

    return state.selection.ranges.every(isFormattedText)
  }
}

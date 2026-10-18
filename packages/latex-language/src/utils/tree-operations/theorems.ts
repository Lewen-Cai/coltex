// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/tree-operations/theorems.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorState } from '@codemirror/state'
import { SyntaxNode, Tree } from '@lezer/common'
import {
  LongArg,
  ShortArg,
  ShortTextArgument,
  TextArgument,
} from '../../lezer-latex/latex.terms.mjs'

export const parseTheoremArguments = (
  state: EditorState,
  node: SyntaxNode
): { name: string; label: string } | undefined => {
  const nameArgumentNode = node.getChild(ShortTextArgument)?.getChild(ShortArg)
  const labelArgumentNode = node.getChild(TextArgument)?.getChild(LongArg)

  if (nameArgumentNode && labelArgumentNode) {
    const name = state
      .sliceDoc(nameArgumentNode.from, nameArgumentNode.to)
      .trim()

    const label = state
      .sliceDoc(labelArgumentNode.from, labelArgumentNode.to)
      .trim()

    if (name && label) {
      return { name, label }
    }
  }
}

export const parseTheoremStyles = (state: EditorState, tree: Tree) => {
  // TODO: only scan for styles if amsthm is present?
  let currentTheoremStyle = 'plain'
  const theoremStyles = new Map<string, string>()
  const topNode = tree.topNode
  if (topNode && topNode.name === 'LaTeX') {
    const textNode = topNode.getChild('Text')
    const topLevelCommands = textNode
      ? textNode.getChildren('Command')
      : topNode.getChildren('Command')
    for (const command of topLevelCommands) {
      const node = command.getChild('KnownCommand')?.getChild('$Command')
      if (node) {
        if (node.type.is('TheoremStyleCommand')) {
          const theoremStyle = argumentNodeContent(state, node)
          if (theoremStyle) {
            currentTheoremStyle = theoremStyle
          }
        } else if (node.type.is('NewTheoremCommand')) {
          const theoremEnvironmentName = argumentNodeContent(state, node)
          if (theoremEnvironmentName) {
            theoremStyles.set(theoremEnvironmentName, currentTheoremStyle)
          }
        }
      }
    }
  }
  return theoremStyles
}

const argumentNodeContent = (
  state: EditorState,
  node: SyntaxNode
): string | null => {
  const argumentNode = node.getChild(ShortTextArgument)?.getChild(ShortArg)

  return argumentNode
    ? state.sliceDoc(argumentNode.from, argumentNode.to)
    : null
}

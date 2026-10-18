// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/tree-operations/lists.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorState } from '@codemirror/state'
import { SyntaxNode } from '@lezer/common'

export const getListType = (
  state: EditorState,
  listEnvironmentNode: SyntaxNode
) => {
  const beginEnvNameNode = listEnvironmentNode
    .getChild('BeginEnv')
    ?.getChild('EnvNameGroup')
    ?.getChild('ListEnvName')

  const endEnvNameNode = listEnvironmentNode
    .getChild('EndEnv')
    ?.getChild('EnvNameGroup')
    ?.getChild('ListEnvName')

  if (beginEnvNameNode && endEnvNameNode) {
    return state.sliceDoc(beginEnvNameNode.from, beginEnvNameNode.to).trim()
  }
}

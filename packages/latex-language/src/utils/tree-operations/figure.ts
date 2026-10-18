// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/tree-operations/figure.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { SyntaxNode, SyntaxNodeRef } from '@lezer/common'
import { CenteringCtrlSeq } from '../../lezer-latex/latex.terms.mjs'

export function centeringNodeForEnvironment(
  environmentNodeRef: SyntaxNodeRef
): SyntaxNode | null {
  let centeringNode: SyntaxNode | null = null
  const cursor = environmentNodeRef.node.cursor()
  cursor.iterate(nodeRef => {
    if (centeringNode) {
      return false
    }
    if (nodeRef.type.is(CenteringCtrlSeq)) {
      centeringNode = nodeRef.node
      return false
    }
    // don't descend into nested environments
    if (
      nodeRef.node !== environmentNodeRef.node &&
      nodeRef.type.is('$Environment')
    ) {
      return false
    }
  })
  return centeringNode
}

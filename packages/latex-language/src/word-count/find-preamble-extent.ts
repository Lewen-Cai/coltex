// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/word-count-modal/utils/find-preamble-extent.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { NodeType, SyntaxNodeRef, Tree } from '@lezer/common'
import { ancestorOfNodeWithType } from '../utils/tree-operations/ancestors'

export const findPreambleExtent = (tree: Tree) => {
  const preamble = { to: 0 }

  let seenDocumentEnvironment = false

  const preambleMatcher = NodeType.match<(nodeRef: SyntaxNodeRef) => void>({
    'Title Author Affil Affiliation'(nodeRef) {
      preamble.to = nodeRef.node.to
    },
    DocumentEnvironment(nodeRef) {
      // only count the first instance of DocumentEnvironment
      if (!seenDocumentEnvironment) {
        preamble.to =
          nodeRef.node.getChild('Content')?.from ?? nodeRef.node.from
        seenDocumentEnvironment = true
      }
    },
    Maketitle(nodeRef) {
      // count \maketitle inside DocumentEnvironment
      if (
        ancestorOfNodeWithType(nodeRef.node, '$Environment')?.type.is(
          'DocumentEnvironment'
        )
      ) {
        preamble.to = nodeRef.node.from
      }
    },
  })

  tree.iterate({
    enter(nodeRef) {
      return preambleMatcher(nodeRef.type)?.(nodeRef)
    },
  })

  return preamble
}

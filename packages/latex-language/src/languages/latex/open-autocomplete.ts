// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/open-autocomplete.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView } from '@codemirror/view'
import { startCompletion } from '@codemirror/autocomplete'
import { Transaction } from '@codemirror/state'
import { isInEmptyArgumentNodeForAutocomplete } from '../../utils/tree-query'

// start autocompletion when the cursor enters an empty pair of braces
// but skip updates caused by context menu open or remote transactions
export const openAutocomplete = () => {
  return EditorView.updateListener.of(update => {
    if (update.selectionSet || update.docChanged) {
      if (
        !update.transactions.some(
          tr =>
            // ColTex: no editor context menu, so only remote changes are skipped.
            tr.annotation(Transaction.remote)
        )
      ) {
        if (isInEmptyArgumentNodeForAutocomplete(update.state)) {
          startCompletion(update.view)
        }
      }
    }
  })
}

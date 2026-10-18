// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/completions/labels.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { extendRequiredParameter } from './apply'
import { Completions } from './types'
import { metadataState } from '../../../extensions/language'
import { CompletionContext } from '@codemirror/autocomplete'

/**
 * Labels parsed from docs in the project, for cross-referencing
 */
export function buildLabelCompletions(
  completions: Completions,
  context: CompletionContext
) {
  const metadata = context.state.field(metadataState, false)

  if (!metadata) {
    return
  }

  for (const label of metadata.labels) {
    completions.labels.push({
      type: 'label',
      label,
      extend: extendRequiredParameter,
    })
  }
}

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/completions/bibliography-styles.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { Completions } from './types'
import { extendRequiredParameter } from './apply'
import { bibliographyStyles } from './data/bibliography-styles'

const values = Object.values(bibliographyStyles).flat()

export function buildBibliographyStyleCompletions(completions: Completions) {
  // TODO: find bibliography package from context and use only relevant styles

  for (const item of values) {
    completions.bibliographyStyles.push({
      type: 'bib',
      label: item,
      extend: extendRequiredParameter,
    })
  }
}

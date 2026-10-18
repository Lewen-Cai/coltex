// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/completions/classes.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { extendRequiredParameter } from './apply'
import { classNames } from './data/class-names'
import { Completions } from './types'

export function buildClassCompletions(completions: Completions) {
  for (const item of classNames) {
    completions.classes.push({
      type: 'cls',
      label: item,
      extend: extendRequiredParameter,
    })
  }
}

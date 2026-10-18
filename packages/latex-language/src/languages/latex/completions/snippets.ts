// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/completions/snippets.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import topHundredSnippets from './data/top-hundred-snippets'
import snippets from './data/snippets'
import { applySnippet, extendOverUnpairedClosingBrace } from './apply'
import { Completions } from './types'

/**
 * Completions based on bundled snippets
 */
export function buildSnippetCompletions(completions: Completions) {
  for (const item of topHundredSnippets) {
    completions.commands.push({
      type: item.meta,
      label: item.caption,
      boost: item.score,
      apply:
        item.snippet === item.caption ? undefined : applySnippet(item.snippet),
      extend: extendOverUnpairedClosingBrace,
    })
  }

  for (const item of snippets) {
    completions.commands.push({
      type: item.type,
      label: item.label,
      apply: applySnippet(item.snippet),
      extend: extendOverUnpairedClosingBrace,
    })
  }
}

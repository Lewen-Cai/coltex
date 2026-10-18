// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/linting.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { Compartment, EditorState } from '@codemirror/state'
import { setSyntaxValidationEffect } from './language'
import { linter } from '@codemirror/lint'

export const createLinter: typeof linter = (lintSource, config) => {
  const linterConfig = new Compartment()

  return [
    linterConfig.of([]),

    // enable/disable the linter to match the syntaxValidation setting
    EditorState.transactionExtender.of(tr => {
      for (const effect of tr.effects) {
        if (effect.is(setSyntaxValidationEffect)) {
          return {
            effects: linterConfig.reconfigure(
              effect.value ? linter(lintSource, config) : []
            ),
          }
        }
      }

      return null
    }),
  ]
}

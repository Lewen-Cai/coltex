// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/latex-indent-service.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { indentService } from '@codemirror/language'

export const latexIndentService = () =>
  indentService.of(indentContext => {
    // only use this for insertNewLineAndIndent
    if (indentContext.simulatedBreak) {
      // match the indentation of the previous line (if present)
      return null
    }
  })

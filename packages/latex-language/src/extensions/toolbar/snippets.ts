// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/toolbar/snippets.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { environments } from '../../languages/latex/completions/data/environments'
import { prepareSnippetTemplate } from '../../languages/latex/snippets'

export const snippets = {
  figure: prepareSnippetTemplate(environments.get('figure') as string),
  table: prepareSnippetTemplate(environments.get('table') as string),
  cite: prepareSnippetTemplate('\\cite{${}}'),
  ref: prepareSnippetTemplate('\\ref{${}}'),
}

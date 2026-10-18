// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/linting.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { latexLinter } from './linter/latex-linter'
import { lintSourceConfig } from '../../extensions/annotations'
import { createLinter } from '../../extensions/linting'

export const linting = () => createLinter(latexLinter, lintSourceConfig)

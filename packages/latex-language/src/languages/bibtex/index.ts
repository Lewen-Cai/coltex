// Adapted from Overleaf's languages/bibtex/index.ts (AGPL-3.0). ColTex: no BibTeX linter yet.

import { LanguageSupport } from '@codemirror/language'
import { BibTeXLanguage } from './bibtex-language'

export const bibtex = () => new LanguageSupport(BibTeXLanguage)

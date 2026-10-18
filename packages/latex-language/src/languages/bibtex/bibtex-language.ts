// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/bibtex/bibtex-language.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { indentNodeProp, LRLanguage } from '@codemirror/language'
import { parser } from '../../lezer-bibtex/bibtex.mjs'
import { bibtexEntryCompletions } from './completions/snippets'

export const BibTeXLanguage = LRLanguage.define({
  name: 'bibtex',
  parser: parser.configure({
    props: [
      // Disable the autoindent from delimited nodes
      indentNodeProp.add({
        EntryBody: () => null,
        StringBody: () => null,
        PreambleBody: () => null,
        CommentBody: () => null,
        StringLiteral: () => null,
      }),
    ],
  }),
  languageData: {
    autocomplete: bibtexEntryCompletions,
  },
})

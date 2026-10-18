// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/lezer-bibtex/highlight.mjs @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { styleTags, tags as t } from '@lezer/highlight'

export const highlighting = styleTags({
  'EntryCommand/...': t.keyword,
  'StringCommand/...': t.keyword,
  'PreambleCommand/...': t.keyword,
  'CommentCommand/...': t.keyword,
  FieldName: t.name,
  CitationKey: t.name,
  'StringLiteral/...': t.string,
  NumberLiteral: t.number,
  StringName: t.variableName,
  '#': t.operator,
  Comment: t.comment,
  'CommentBody/...': t.comment,
  Junk: t.comment,
})

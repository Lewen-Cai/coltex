// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/lezer-bibtex/tokens.mjs @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import {
  stringKeyword,
  preambleKeyword,
  commentKeyword,
} from './bibtex.terms.mjs'

/**
 * @param {string} identifier
 */
export function specializeEntryType(identifier) {
  const lowercased = identifier.toLowerCase()
  switch (lowercased) {
    case 'string':
      return stringKeyword
    case 'preamble':
      return preambleKeyword
    case 'comment':
      return commentKeyword
  }
  return -1
}

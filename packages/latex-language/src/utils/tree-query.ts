// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/tree-query.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

export { getNestingLevel, nestOutline } from './tree-operations/outline'

export type {
  FlatOutline,
  FlatOutlineItem,
  Outline,
} from './tree-operations/outline'

export { previousSiblingIs } from './tree-operations/common'

export {
  cursorIsAtBeginEnvironment,
  cursorIsAtEndEnvironment,
  getEnvironmentArguments,
} from './tree-operations/environments'

export {
  ancestorNodeOfType,
  ancestorOfNodeWithType,
  getBibkeyArgumentNode,
  descendantsOfNodeWithType,
  matchingAncestor,
} from './tree-operations/ancestors'

export {
  NormalTextSpan,
  getNormalTextSpansFromLine,
} from './tree-operations/text'

export {
  ifInType,
  isInEmptyArgumentNodeForAutocomplete,
} from './tree-operations/completions'

export { tokenNames, Tokens } from './tree-operations/tokens'

export {
  commentIsOpenFold,
  commentIsCloseFold,
  findClosingFoldComment,
  getFoldRange,
} from './tree-operations/comments'

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/utils/line.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { Line } from '@codemirror/state'
import { SyntaxNodeRef } from '@lezer/common'

export const lineContainsOnlyNode = (line: Line, nodeRef: SyntaxNodeRef) =>
  line.text.trim().length === nodeRef.to - nodeRef.from

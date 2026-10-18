// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/document-commands.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { Command, enterNode } from '../../utils/tree-operations/commands'
import { makeProjectionStateField } from '../../utils/projection-state-field'

export const documentCommands = makeProjectionStateField<Command>(enterNode)

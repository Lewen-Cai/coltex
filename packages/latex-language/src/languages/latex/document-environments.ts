// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/document-environments.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import {
  Environment,
  enterNode,
} from '../../utils/tree-operations/environments'
import { makeProjectionStateField } from '../../utils/projection-state-field'

export const documentEnvironments =
  makeProjectionStateField<Environment>(enterNode)

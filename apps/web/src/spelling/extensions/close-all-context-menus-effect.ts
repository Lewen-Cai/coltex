// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/close-all-context-menus-effect.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { StateEffect } from '@codemirror/state'

// Effect used to ask any loaded menu/tooltip extension to close itself.
// Used to ensure only one context menu is open at a time.
export const closeAllContextMenusEffect = StateEffect.define<null>()

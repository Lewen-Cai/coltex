// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/tooltips-reposition.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { repositionTooltips, ViewPlugin } from '@codemirror/view'

const REPOSITION_EVENT = 'editor:repositionAllTooltips'

export const tooltipsReposition = () =>
  ViewPlugin.define(view => {
    const listener = () => repositionTooltips(view)

    window.addEventListener(REPOSITION_EVENT, listener)

    return {
      destroy() {
        window.removeEventListener(REPOSITION_EVENT, listener)
      },
    }
  })

export const repositionAllTooltips = () => {
  window.dispatchEvent(new Event(REPOSITION_EVENT))
}

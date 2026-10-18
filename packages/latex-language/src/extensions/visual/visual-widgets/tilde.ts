// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/tilde.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { WidgetType } from '@codemirror/view'

export class TildeWidget extends WidgetType {
  toDOM() {
    const element = document.createElement('span')
    element.textContent = '\xa0' // '&nbsp;' but not using innerHTML
    return element
  }

  eq() {
    return true
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}

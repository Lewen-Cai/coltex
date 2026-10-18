// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/inline-graphics.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView } from '@codemirror/view'
import { GraphicsWidget } from './graphics'

export class InlineGraphicsWidget extends GraphicsWidget {
  toDOM(view: EditorView) {
    this.destroyed = false

    const element = document.createElement('span')
    element.classList.add('ol-cm-graphics-inline')

    this.renderGraphic(element, view)

    return element
  }

  ignoreEvent(event: Event) {
    return event.type !== 'mousedown' && event.type !== 'mouseup'
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/footnote.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { WidgetType } from '@codemirror/view'

type NoteType = 'footnote' | 'endnote'

const symbols: Record<NoteType, string> = {
  footnote: '*',
  endnote: '†',
}

export class FootnoteWidget extends WidgetType {
  constructor(private type: NoteType = 'footnote') {
    super()
  }

  toDOM() {
    const element = document.createElement('span')
    element.classList.add('ol-cm-footnote')
    element.setAttribute('role', 'button')
    element.innerHTML = symbols[this.type]
    return element
  }

  eq(widget: FootnoteWidget) {
    return this.type === widget.type
  }

  updateDOM(element: HTMLElement): boolean {
    element.innerHTML = symbols[this.type]
    return true
  }

  ignoreEvent(event: Event) {
    return event.type !== 'mousedown' && event.type !== 'mouseup'
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}

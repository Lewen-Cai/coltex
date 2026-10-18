// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/math.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView, WidgetType } from '@codemirror/view'
import { renderMath } from '../utils/katex'
import { placeSelectionInsideBlock } from '../selection'

export class MathWidget extends WidgetType {
  destroyed = false
  cachedHeight: number | undefined = undefined

  constructor(
    public math: string,
    public displayMode: boolean,
    public preamble?: string
  ) {
    super()
  }

  toDOM(view: EditorView) {
    this.destroyed = false
    const element = document.createElement(this.displayMode ? 'div' : 'span')
    element.classList.add('ol-cm-math')
    element.style.height = this.estimatedHeight + 'px'
    if (this.displayMode) {
      element.addEventListener('mouseup', event => {
        event.preventDefault()
        view.dispatch(placeSelectionInsideBlock(view, event as MouseEvent))
      })
    }
    // in a timeout so the element can be rendered for metrics
    window.setTimeout(() => {
      this.renderMath(element)
        .catch(() => {
          element.classList.add('ol-cm-math-error')
        })
        .finally(() => {
          view.requestMeasure()
        })
    })
    // TODO: re-render on element resize
    return element
  }

  eq(widget: MathWidget) {
    return (
      widget.math === this.math &&
      widget.displayMode === this.displayMode &&
      widget.preamble === this.preamble
    )
  }

  updateDOM(element: HTMLElement, view: EditorView) {
    this.destroyed = false
    this.renderMath(element)
      .catch(() => {
        element.classList.add('ol-cm-math-error')
      })
      .finally(() => {
        view.requestMeasure()
      })

    return true
  }

  ignoreEvent(event: Event) {
    // always enable mouseup to release the decorations
    if (event.type === 'mouseup') {
      return false
    }

    // inline math needs mousedown to set the selection
    if (!this.displayMode && event.type === 'mousedown') {
      return false
    }

    // ignore other events
    return true
  }

  destroy() {
    this.destroyed = true
  }

  get estimatedHeight() {
    return this.cachedHeight ?? this.math.split('\n').length * 40
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }

  async renderMath(element: HTMLElement) {
    // ColTex: KaTeX instead of MathJax; the preamble's definitions become macros.
    if (this.destroyed || !element.isConnected) {
      return
    }
    await renderMath(element, this.math, this.displayMode, this.preamble)
    element.style.height = 'auto'
    this.cachedHeight = element.offsetHeight
  }
}

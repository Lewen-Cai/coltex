// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/begin-theorem.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { BeginWidget } from './begin'
import { EditorView } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'
import { typesetNodeIntoElement } from '../utils/typeset-content'
import { typesetElement } from '../utils/katex'

export class BeginTheoremWidget extends BeginWidget {
  constructor(
    public environment: string,
    public name: string,
    public argumentNode?: SyntaxNode | null
  ) {
    super(environment)
  }

  toDOM(view: EditorView) {
    const element = super.toDOM(view)
    element.classList.add('ol-cm-begin-theorem')
    return element
  }

  updateDOM(element: HTMLDivElement, view: EditorView) {
    super.updateDOM(element, view)
    element.classList.add('ol-cm-begin-theorem')
    return true
  }

  eq(widget: BeginTheoremWidget) {
    return (
      super.eq(widget) &&
      widget.name === this.name &&
      widget.argumentNode === this.argumentNode
    )
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }

  buildName(nameElement: HTMLSpanElement, view: EditorView) {
    nameElement.textContent = this.name
    if (this.argumentNode) {
      const suffixElement = document.createElement('span')
      typesetNodeIntoElement(this.argumentNode, suffixElement, view.state)
      nameElement.append(' (', suffixElement, ')')

      // ColTex: KaTeX (auto-render) instead of MathJax.
      typesetElement(nameElement)
        .then(() => {
          if (!this.destroyed) {
            view.requestMeasure()
          }
        })
        .catch(() => {
          nameElement.classList.add('ol-cm-error')
        })
    }
  }
}

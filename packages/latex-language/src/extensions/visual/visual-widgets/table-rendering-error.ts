// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/table-rendering-error.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView, WidgetType } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'

export class TableRenderingErrorWidget extends WidgetType {
  private hasTableNode: boolean
  constructor(tableNode: SyntaxNode | null | undefined) {
    super()
    this.hasTableNode = Boolean(tableNode)
  }

  // ColTex: a plain notice (no Bootstrap notification or icon); the table's source follows it.
  toDOM(view: EditorView): HTMLElement {
    const warning = document.createElement('div')
    warning.classList.add('table-generator-error')
    warning.role = 'alert'
    const messageHeader = document.createElement('strong')
    messageHeader.textContent = view.state.phrase(
      'sorry_your_table_cant_be_displayed_at_the_moment'
    )
    const messageBody = document.createElement('div')
    messageBody.textContent = view.state.phrase(
      'this_could_be_because_we_cant_support_some_elements_of_the_table'
    )
    warning.append(messageHeader, messageBody)
    const element = document.createElement('div')
    element.classList.add('table-generator', 'table-generator-error-container')
    element.appendChild(warning)
    if (this.hasTableNode) {
      element.classList.add('ol-cm-environment-table')
    }
    return element
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/tabular.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView, WidgetType } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'
import { ParsedTableData } from '../../../components/table-generator/utils'
// ColTex: the React tree (<Tabular>) lives in the web app and comes in through
// a facet, which also owns the React roots.
import { TableRenderer } from '../visual-options'

export class TabularWidget extends WidgetType {
  constructor(
    private parsedTableData: ParsedTableData,
    private tabularNode: SyntaxNode,
    private content: string,
    private tableNode: SyntaxNode | null,
    private isDirectChildOfTableEnvironment: boolean,
    private renderer: TableRenderer
  ) {
    super()
  }

  private render(element: HTMLElement, view: EditorView) {
    this.renderer.render(element, {
      view,
      tabularNode: this.tabularNode,
      parsedTableData: this.parsedTableData,
      tableNode: this.tableNode,
      directTableChild: this.isDirectChildOfTableEnvironment,
    })
  }

  toDOM(view: EditorView) {
    const element = document.createElement('div')
    element.classList.add('ol-cm-tabular')
    if (this.tableNode) {
      element.classList.add('ol-cm-environment-table')
    }
    this.render(element, view)
    return element
  }

  eq(widget: TabularWidget): boolean {
    return (
      this.tabularNode.from === widget.tabularNode.from &&
      this.tableNode?.from === widget.tableNode?.from &&
      this.tableNode?.to === widget.tableNode?.to &&
      this.content === widget.content &&
      this.isDirectChildOfTableEnvironment ===
        widget.isDirectChildOfTableEnvironment
    )
  }

  updateDOM(element: HTMLElement, view: EditorView): boolean {
    this.render(element, view)
    return true
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }

  get estimatedHeight() {
    return this.parsedTableData.table.rows.length * 50
  }

  destroy(element: HTMLElement) {
    this.renderer.destroy(element)
  }
}

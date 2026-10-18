// ColTex: CodeMirror draws a selection that spans lines from edge to edge of
// .cm-content, padding included (it only subtracts .cm-line padding). The
// visual editor's text column is the inside of that padding, so selecting a
// few lines lit up the side margins too. This clips the selection layer to
// the text column.

import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

export const selectionInTextColumn = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.schedule()
    }

    update(update: ViewUpdate) {
      if (update.geometryChanged || update.selectionSet || update.docChanged || update.viewportChanged) {
        this.schedule()
      }
    }

    layer() {
      return this.view.scrollDOM.querySelector<HTMLElement>(':scope > .cm-selectionLayer')
    }

    schedule() {
      this.view.requestMeasure({
        key: this,
        read: view => {
          const layer = this.layer()
          if (!layer) return null
          const content = view.contentDOM.getBoundingClientRect()
          const style = getComputedStyle(view.contentDOM)
          const origin = layer.getBoundingClientRect()
          return {
            left: content.left + parseFloat(style.paddingLeft) - origin.left,
            right: content.right - parseFloat(style.paddingRight) - origin.left,
            // Only as tall as the document: a huge clip region makes Chrome's painting crawl.
            top: content.top - origin.top,
            bottom: content.bottom - origin.top,
          }
        },
        write: column => {
          const layer = this.layer()
          if (!layer || !column) return
          const { left, right, top, bottom } = column
          layer.style.clipPath = `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`
        },
      })
    }

    destroy() {
      // Back in the source editor the selection covers the full width again.
      const layer = this.layer()
      if (layer) layer.style.clipPath = ''
    }
  }
)

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/editable-graphics.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView } from '@codemirror/view'
import { GraphicsWidget } from './graphics'
import { editFigureDataEffect } from '../../figure-modal'
import { materialIcon } from '../utils/material-icon'

// ColTex: no analytics; the button is a plain ColTex-styled button (no Bootstrap classes).
export const FIGURE_MODAL_OPEN_EVENT = 'figure-modal:open-modal'

export class EditableGraphicsWidget extends GraphicsWidget {
  setEditDispatcher(button: HTMLButtonElement, view: EditorView) {
    button.classList.toggle('hidden', !this.figureData)
    if (this.figureData) {
      button.onmousedown = event => {
        event.preventDefault()
        event.stopImmediatePropagation()
        view.dispatch({ effects: editFigureDataEffect.of(this.figureData) })
        window.dispatchEvent(new CustomEvent(FIGURE_MODAL_OPEN_EVENT))
        return false
      }
    } else {
      button.onmousedown = null
    }
  }

  updateDOM(element: HTMLImageElement, view: EditorView): boolean {
    this.destroyed = false
    element.classList.toggle('ol-cm-environment-centered', this.centered)
    if (
      this.filePath === element.dataset.filepath &&
      element.dataset.width === String(this.figureData?.width?.toString()) &&
      element.dataset.preview === (this.previewUrl ?? '') // ColTex
    ) {
      // Figure remained the same, so just update the event listener on the button
      const button = element.querySelector<HTMLButtonElement>(
        '.ol-cm-graphics-edit-button'
      )
      if (button) {
        this.setEditDispatcher(button, view)
      }
      return true
    }
    this.renderGraphic(element, view)
    view.requestMeasure()
    return true
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }

  createEditButton(view: EditorView) {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', view.state.phrase('edit_figure'))
    button.title = view.state.phrase('edit_figure')
    this.setEditDispatcher(button, view)
    button.classList.add('ol-cm-graphics-edit-button')

    const buttonContent = button.appendChild(document.createElement('span'))
    buttonContent.className = 'button-content'

    buttonContent.appendChild(materialIcon('edit'))

    return button
  }

  renderGraphic(element: HTMLElement, view: EditorView) {
    super.renderGraphic(element, view)
    if (this.figureData) {
      const button = this.createEditButton(view)
      element.prepend(button)
    }
  }
}

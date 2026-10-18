// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual-widgets/environment-line.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { WidgetType } from '@codemirror/view'

export class EnvironmentLineWidget extends WidgetType {
  constructor(
    public environment: string,
    public line?: 'begin' | 'end'
  ) {
    super()
  }

  toDOM() {
    const element = document.createElement('div')
    element.classList.add(`ol-cm-environment-${this.environment}`)
    element.classList.add('ol-cm-environment-edge')

    const line = document.createElement('div')
    element.append(line)

    line.classList.add('ol-cm-environment-line')
    line.classList.add(`ol-cm-environment-${this.environment}`)
    switch (this.line) {
      case 'begin':
        element.classList.add('ol-cm-environment-top')
        line.classList.add('ol-cm-environment-first-line')
        break
      case 'end':
        element.classList.add('ol-cm-environment-bottom')
        line.classList.add('ol-cm-environment-last-line')
        break
    }

    return element
  }

  eq(widget: EnvironmentLineWidget) {
    return widget.environment === this.environment && widget.line === this.line
  }

  ignoreEvent(event: Event): boolean {
    return event.type !== 'mousedown' && event.type !== 'mouseup'
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}

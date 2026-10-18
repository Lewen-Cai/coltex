// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/pasted-content.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// ColTex: the menu after a formatted paste is plain DOM (upstream renders a
// React component), and switching between formatted and plain text replaces
// the pasted range instead of calling CodeMirror's undo (ColTex's undo is the
// shared Yjs undo manager).
// See NOTICE at the repository root.

import { EditorSelection, Range, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { ancestorNodeOfType } from '../../utils/tree-operations/ancestors'

export type PastedContent = { latex: string; text: string }

const pastedContentEffect = StateEffect.define<{
  content: PastedContent
  formatted: boolean
}>()

export const insertPastedContent = (view: EditorView, { latex, text }: PastedContent) =>
  view.state.changeByRange(range => {
    // avoid pasting formatted content into a math container
    if (ancestorNodeOfType(view.state, range.anchor, '$MathContainer')) {
      return {
        range: EditorSelection.cursor(range.from + text.length),
        changes: { from: range.from, to: range.to, insert: text },
      }
    }

    return {
      range: EditorSelection.cursor(range.from + latex.length),
      changes: { from: range.from, to: range.to, insert: latex },
    }
  })

export const storePastedContent = (content: PastedContent, formatted: boolean) => ({
  effects: pastedContentEffect.of({ content, formatted }),
})

const pastedContentTheme = EditorView.baseTheme({
  '.ol-cm-pasted-content-menu-toggle': {
    background: 'none',
    borderRadius: '6px',
    border: '1px solid var(--border, rgb(125, 125, 125))',
    color: 'inherit',
    margin: '0 4px',
    padding: '0 4px',
    opacity: '0.7',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '12px',
    lineHeight: '18px',
    '&:hover': { opacity: '1' },
  },
  '.ol-cm-pasted-content-menu': {
    position: 'absolute',
    left: '0',
    top: '100%',
    zIndex: '10',
    flexDirection: 'column',
    marginTop: '4px',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid var(--border, rgba(125, 125, 125, 0.4))',
    background: 'var(--popover, #fff)',
    color: 'var(--popover-foreground, inherit)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    fontFamily: 'var(--font-sans, sans-serif)',
    fontSize: '13px',
  },
  '.ol-cm-pasted-content-menu-item': {
    color: 'inherit',
    border: 'none',
    background: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    font: 'inherit',
    '&:hover': { backgroundColor: 'var(--accent, rgba(125, 125, 125, 0.2))' },
    '&[aria-checked="true"]': { fontWeight: '600' },
  },
})

type PastedState = {
  content: PastedContent
  formatted: boolean
  /** Where the pasted text is now (the main selection's paste). */
  from: number
  to: number
}

export const pastedContent = StateField.define<PastedState | null>({
  create() {
    return null
  },
  update(value, tr) {
    if (tr.docChanged) {
      // TODO: exclude remote changes (if they don't intersect with changed ranges)?
      value = null
    }
    for (const effect of tr.effects) {
      if (effect.is(pastedContentEffect)) {
        const { content, formatted } = effect.value
        // The cursor sits at the end of the pasted text.
        const to = tr.state.selection.main.head
        const inserted = formatted ? content.latex : content.text
        value = { content, formatted, from: Math.max(0, to - inserted.length), to }
      }
    }
    return value
  },
  provide(field) {
    return [
      EditorView.decorations.compute([field], state => {
        const value = state.field(field)
        if (!value) {
          return Decoration.none
        }
        const decorations: Range<Decoration>[] = [
          Decoration.widget({
            widget: new PastedContentMenuWidget(value),
            side: 1,
          }).range(value.to),
        ]
        return Decoration.set(decorations, true)
      }),
      pastedContentTheme,
    ]
  },
})

class PastedContentMenuWidget extends WidgetType {
  constructor(private value: PastedState) {
    super()
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('span')
    wrapper.style.position = 'relative'
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'ol-cm-pasted-content-menu-toggle'
    toggle.textContent = '📋 ▾'
    toggle.title = view.state.phrase('paste_options')
    toggle.setAttribute('aria-label', view.state.phrase('paste_options'))
    toggle.setAttribute('aria-haspopup', 'menu')

    const menu = document.createElement('span')
    menu.className = 'ol-cm-pasted-content-menu'
    menu.setAttribute('role', 'menu')
    menu.style.display = 'none'
    for (const formatted of [true, false]) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'ol-cm-pasted-content-menu-item'
      item.setAttribute('role', 'menuitemradio')
      item.setAttribute('aria-checked', String(formatted === this.value.formatted))
      item.textContent = view.state.phrase(formatted ? 'paste_with_formatting' : 'paste_without_formatting')
      item.addEventListener('mousedown', event => event.preventDefault())
      item.addEventListener('click', () => this.switchTo(view, formatted))
      menu.append(item)
    }

    toggle.addEventListener('mousedown', event => event.preventDefault())
    toggle.addEventListener('click', () => {
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'
    })
    wrapper.append(toggle, menu)
    return wrapper
  }

  /** Replace the pasted text with the other version, keeping the menu. */
  switchTo(view: EditorView, formatted: boolean) {
    const { content, from, to } = this.value
    if (formatted === this.value.formatted) {
      view.focus()
      return
    }
    const insert = formatted ? content.latex : content.text
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.cursor(from + insert.length),
      effects: pastedContentEffect.of({ content, formatted }),
    })
    view.focus()
  }

  eq(widget: PastedContentMenuWidget) {
    return widget.value.content === this.value.content && widget.value.formatted === this.value.formatted
  }

  ignoreEvent() {
    return true
  }
}

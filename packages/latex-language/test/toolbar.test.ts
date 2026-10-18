import { afterEach, describe, expect, test } from 'vitest'
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import {
  findCurrentSectionHeadingLevel,
  indentDecrease,
  indentIncrease,
  insertTable,
  isVisual,
  latex,
  minimumListDepthForSelection,
  setSectionHeadingLevel,
  symbolPalette,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  visualMode,
  withinFormattingCommand,
  wrapInDisplayMath,
  wrapInHref,
  wrapInInlineMath,
} from '../src/index'

/**
 * The toolbar commands only use a view's state, dispatch and focus, so a
 * stand-in is enough here (vitest runs without a DOM). The tree is parsed
 * fully before each command, as a view would have done for visible text.
 */
function fakeView(doc: string, anchor: number, head = anchor, extensions = [latex()]) {
  let state = EditorState.create({ doc, selection: EditorSelection.single(anchor, head), extensions })
  ensureSyntaxTree(state, state.doc.length, 5000)
  const view = {
    get state() {
      return state
    },
    dispatch(...specs: TransactionSpec[]) {
      state = state.update(...specs).state
      ensureSyntaxTree(state, state.doc.length, 5000)
    },
    focus() {},
  }
  return view as unknown as EditorView & { readonly state: EditorState }
}

/** The document with `|` at the cursor, or `[…]` around the selection. */
function show(view: EditorView) {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  return from === to ? `${doc.slice(0, from)}|${doc.slice(from)}` : `${doc.slice(0, from)}[${doc.slice(from, to)}]${doc.slice(to)}`
}

/** Build a view from a document marked like `show` does. */
function viewOf(marked: string) {
  const a = marked.indexOf('[')
  if (a >= 0) {
    const b = marked.indexOf(']')
    return fakeView(marked.slice(0, a) + marked.slice(a + 1, b) + marked.slice(b + 1), a, b - 1)
  }
  const c = marked.indexOf('|')
  return fakeView(marked.slice(0, c) + marked.slice(c + 1), c)
}

describe('bold and italic', () => {
  test('wrap a selection, then unwrap it again', () => {
    const view = viewOf('Hello [world] again')
    toggleBold(view)
    expect(show(view)).toBe('Hello \\textbf{[world]} again')
    expect(withinFormattingCommand(view.state)('\\textbf')).toBe(true)
    expect(withinFormattingCommand(view.state)('\\textit')).toBe(false)
    toggleBold(view)
    expect(show(view)).toBe('Hello [world] again')
    expect(withinFormattingCommand(view.state)('\\textbf')).toBe(false)
  })

  test('an empty selection inserts an empty command with the cursor inside', () => {
    const view = viewOf('Hello |')
    toggleItalic(view)
    expect(show(view)).toBe('Hello \\textit{|}')
    expect(withinFormattingCommand(view.state)('\\textit')).toBe(true)
  })

  test('nested formatting is detected from inside', () => {
    const view = viewOf('\\textbf{some \\textit{bo|th}}')
    const within = withinFormattingCommand(view.state)
    expect(within('\\textbf')).toBe(true)
    expect(within('\\textit')).toBe(true)
  })
})

describe('links and maths', () => {
  test('\\href puts the cursor in the URL argument', () => {
    const view = viewOf('See [the docs].')
    wrapInHref(view)
    expect(show(view)).toBe('See \\href{|}{the docs}.')
  })

  test('inline and display maths wrap the selection', () => {
    const inline = viewOf('Let [x^2] be')
    wrapInInlineMath(inline)
    expect(show(inline)).toBe('Let \\([x^2]\\) be')
    const display = viewOf('Then [E=mc^2] holds')
    wrapInDisplayMath(display)
    expect(display.state.doc.toString()).toBe('Then \n\\[E=mc^2\\]\n holds')
  })
})

describe('lists', () => {
  const doc = 'Intro\nfirst item\nsecond item\nend'

  test('a bullet list wraps the selected lines, and toggling again unwraps it', () => {
    const view = fakeView(doc, doc.indexOf('first'), doc.indexOf('second') + 3)
    toggleBulletList(view)
    const wrapped = view.state.doc.toString()
    expect(wrapped).toContain('\\begin{itemize}')
    expect(wrapped).toContain('\\item first item')
    expect(wrapped).toContain('\\item second item')
    expect(wrapped).toContain('\\end{itemize}')
    expect(minimumListDepthForSelection(view.state)).toBe(1)
    toggleBulletList(view)
    expect(view.state.doc.toString()).toBe(doc)
    expect(minimumListDepthForSelection(view.state)).toBe(0)
  })

  test('indent nests an item one level deeper; outdent brings it back', () => {
    const list = '\\begin{itemize}\n\t\\item one\n\t\\item two\n\\end{itemize}'
    const view = fakeView(list, list.indexOf('two'))
    expect(indentDecrease(view)).toBe(false) // already at the top level
    expect(indentIncrease(view)).toBe(true)
    expect(minimumListDepthForSelection(view.state)).toBe(2)
    expect(view.state.doc.toString().match(/\\begin\{itemize\}/g)).toHaveLength(2)
    expect(indentDecrease(view)).toBe(true)
    expect(minimumListDepthForSelection(view.state)).toBe(1)
    expect(view.state.doc.toString().match(/\\begin\{itemize\}/g)).toHaveLength(1)
  })
})

describe('section headings', () => {
  test('turn a line into a section, change its level, and back to text', () => {
    const view = viewOf('Intro|duction\nMore text')
    expect(findCurrentSectionHeadingLevel(view.state)?.level).toBe('text')
    setSectionHeadingLevel(view, 'section')
    expect(view.state.doc.toString()).toBe('\\section{Introduction}\nMore text')
    expect(findCurrentSectionHeadingLevel(view.state)?.level).toBe('section')
    setSectionHeadingLevel(view, 'subsection')
    expect(view.state.doc.toString()).toBe('\\subsection{Introduction}\nMore text')
    setSectionHeadingLevel(view, 'text')
    expect(view.state.doc.toString()).toBe('Introduction\nMore text')
  })
})

describe('tables', () => {
  test('insertTable builds a tabular with the requested columns and rows', () => {
    const view = viewOf('Before|')
    insertTable(view, 3, 2)
    const doc = view.state.doc.toString()
    expect(doc).toContain('\\begin{tabular}{ccc}')
    const rows = doc.split('\n').filter(l => l.trim().endsWith('\\\\'))
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(row.split('&')).toHaveLength(3)
    expect(doc).toContain('\\caption{Caption}')
  })
})

describe('symbol palette and visual mode', () => {
  const g = globalThis as { window?: EventTarget }
  const hadWindow = 'window' in g
  afterEach(() => {
    if (!hadWindow) delete g.window
  })

  test('an editor:insert-symbol event replaces the selection and moves the cursor after it', () => {
    if (!hadWindow) g.window = new EventTarget()
    const view = viewOf('Angle [x] here')
    // ViewPlugin keeps its constructor as `create`; run it on the stand-in view.
    const plugin = (symbolPalette() as unknown as { create: (v: EditorView) => { destroy(): void } }).create(view)
    window.dispatchEvent(new CustomEvent('editor:insert-symbol', { detail: { command: '\\alpha' } }))
    expect(show(view)).toBe('Angle \\alpha| here')
    plugin.destroy()
    window.dispatchEvent(new CustomEvent('editor:insert-symbol', { detail: { command: '\\beta' } }))
    expect(view.state.doc.toString()).toBe('Angle \\alpha here')
  })

  test('isVisual follows the visualMode facet (off unless an extension turns it on)', () => {
    expect(isVisual(fakeView('x', 0))).toBe(false)
    expect(isVisual(fakeView('x', 0, 0, [latex(), visualMode.of(true)]))).toBe(true)
  })
})

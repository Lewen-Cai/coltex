import { describe, expect, test } from 'vitest'
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import {
  deleteFigure,
  editFigureData,
  editFigureDataEffect,
  figureTexts,
  insertFigureWith,
  labelForPath,
  latex,
  uniqueLabel,
  updateFigure,
} from '../src/index'
import { parseFigureData } from '../src/utils/tree-operations/environments'

function fakeView(doc: string, cursor = doc.length) {
  const view = {
    state: EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: [latex()] }),
    dispatch(spec: TransactionSpec) {
      view.state = view.state.update(spec).state
      ensureSyntaxTree(view.state, view.state.doc.length, 5000)
    },
  }
  ensureSyntaxTree(view.state, view.state.doc.length, 5000)
  return view
}

function figureIn(state: EditorState) {
  let node = null as ReturnType<typeof syntaxTree>['topNode'] | null
  syntaxTree(state).iterate({
    enter(n) {
      if (!node && n.type.is('FigureEnvironment')) node = n.node
    },
  })
  return parseFigureData(node!, state)!
}

const FIGURE = String.raw`Text before.
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.5\linewidth]{plots/a.png}
  \caption[Short]{A {nested} caption}
  \label{fig:a}
\end{figure}
Text after.`

describe('figure modal commands (ColTex)', () => {
  test('inserts a figure on its own lines with caption and label', () => {
    const view = fakeView('Some text.', 4)
    insertFigureWith(view as unknown as EditorView, { path: 'img/cat.jpg', width: 0.75, caption: '一只猫', label: 'fig:cat' })
    expect(view.state.doc.toString()).toBe(
      'Some text.\n\\begin{figure}\n\t\\centering\n\t\\includegraphics[width=0.75\\linewidth]{img/cat.jpg}\n\t\\caption{一只猫}\n\t\\label{fig:cat}\n\\end{figure}\n',
    )
  })

  test('a figure between paragraphs leaves the cursor on an empty line after it', () => {
    const view = fakeView('First paragraph.\nNext line.', 3)
    insertFigureWith(view as unknown as EditorView, { path: 'a.png', caption: null, label: null })
    const doc = view.state.doc.toString()
    expect(doc).toBe('First paragraph.\n\\begin{figure}\n\t\\centering\n\t\\includegraphics{a.png}\n\\end{figure}\n\nNext line.')
    const cursor = view.state.selection.main.head
    expect(view.state.doc.lineAt(cursor).text).toBe('')
    expect(doc.slice(0, cursor).endsWith('\\end{figure}\n')).toBe(true)
  })

  test('reads and changes caption text, label and width of an existing figure', () => {
    const view = fakeView(FIGURE)
    const figure = figureIn(view.state)
    view.dispatch({ effects: editFigureDataEffect.of(figure) })
    expect(view.state.field(editFigureData)).toBe(figure)
    expect(figureTexts(view.state, figure)).toEqual({ caption: 'A {nested} caption', label: 'fig:a' })

    updateFigure(view as unknown as EditorView, figure, { path: 'plots/b.pdf', width: 1, caption: '新的图注', label: 'fig:b' })
    const doc = view.state.doc.toString()
    expect(doc).toContain('\\includegraphics[width=1\\linewidth]{plots/b.pdf}')
    expect(doc).toContain('\\caption[Short]{新的图注}')
    expect(doc).toContain('\\label{fig:b}')
    expect(view.state.field(editFigureData)).toBe(null)
  })

  test('removes and adds caption and label', () => {
    const view = fakeView(FIGURE)
    updateFigure(view as unknown as EditorView, figureIn(view.state), { path: 'plots/a.png', caption: null, label: null })
    let doc = view.state.doc.toString()
    expect(doc).not.toContain('\\caption')
    expect(doc).not.toContain('\\label')
    expect(doc).toContain('\\includegraphics[width=0.5\\linewidth]{plots/a.png}')

    updateFigure(view as unknown as EditorView, figureIn(view.state), { path: 'plots/a.png', caption: 'Back', label: 'fig:back' })
    doc = view.state.doc.toString()
    expect(doc).toMatch(/\\includegraphics\[width=0.5\\linewidth\]\{plots\/a.png\}\n\s*\\caption\{Back\}\n\s*\\label\{fig:back\}/)
  })

  test('deletes the figure', () => {
    const view = fakeView(FIGURE)
    deleteFigure(view as unknown as EditorView, figureIn(view.state))
    expect(view.state.doc.toString()).toBe('Text before.\n\nText after.')
  })

  test('adds graphicx to a preamble that lacks it, once', () => {
    const doc = '\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nText.\n\\end{document}'
    const view = fakeView(doc, doc.indexOf('Text.'))
    insertFigureWith(view as unknown as EditorView, { path: 'a.png', caption: null, label: null })
    let text = view.state.doc.toString()
    expect(text.startsWith('\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\\begin{document}')).toBe(true)
    const cursor = view.state.selection.main.head
    expect(text.slice(0, cursor).endsWith('\\end{figure}\n')).toBe(true)
    insertFigureWith(view as unknown as EditorView, { path: 'b.png', caption: null, label: null })
    text = view.state.doc.toString()
    expect(text.match(/graphicx/g)).toHaveLength(1)
    // A chapter file without a preamble is left alone.
    const chapter = fakeView('Chapter text.', 0)
    insertFigureWith(chapter as unknown as EditorView, { path: 'c.png', caption: null, label: null })
    expect(chapter.state.doc.toString()).not.toContain('graphicx')
  })

  test('graphicx goes before hyperref; generated labels avoid ones in use', () => {
    const doc = '\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage[hidelinks]{hyperref}\n\\begin{document}\n\\label{fig:a}\\label{fig:a-2}\nText.\n\\end{document}'
    const view = fakeView(doc, doc.indexOf('Text.'))
    insertFigureWith(view as unknown as EditorView, { path: 'a.png', caption: null, label: null })
    expect(view.state.doc.toString()).toContain('\\usepackage{amsmath}\n\\usepackage{graphicx}\n\\usepackage[hidelinks]{hyperref}')
    expect(uniqueLabel(view.state, 'fig:a')).toBe('fig:a-3')
    expect(uniqueLabel(view.state, 'fig:b')).toBe('fig:b')
  })

  test('label keys from file names', () => {
    expect(labelForPath('plots/My Result.png')).toBe('fig:my-result')
    expect(labelForPath('图片/实验结果-1.pdf')).toBe('fig:实验结果-1')
    expect(labelForPath('.png')).toBe('fig:figure')
  })
})

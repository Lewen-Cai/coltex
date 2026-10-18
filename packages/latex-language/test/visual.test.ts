import { describe, expect, test } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorView, type DecorationSet } from '@codemirror/view'
import katex from 'katex'
import { convertPreamble, declaredMathOperators, isVisual, latex, setVisual, visual, visualMode, visualOptions } from '../src/index'
import { macrosFor } from '../src/extensions/visual/utils/katex'

const DOC = String.raw`\documentclass{article}
\newcommand{\R}{\mathbb{R}}
\DeclareMathOperator*{\argmax}{arg\,max}
\title{Hello}
\begin{document}
\maketitle
Some \textbf{bold} text and $x \in \R$.
\[ \argmax_x f(x) \]
\includegraphics{figure}
\end{document}
`

function stateFor(doc: string, on: boolean, cursor = doc.length) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [
      latex(),
      visual('main.tex', on),
      visualOptions({ previewByPath: path => (path === 'figure' ? { url: '/files/figure.png', extension: 'png' } : null) }),
    ],
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  // Rebuild decorations against the full tree (a view would do this as parsing proceeds).
  return state.update({}).state
}

/** Every widget the visual extensions put on the document, by widget class. */
function widgets(state: EditorState): string[] {
  const names: string[] = []
  for (const source of state.facet(EditorView.decorations)) {
    if (typeof source === 'function') continue
    ;(source as DecorationSet).between(0, state.doc.length, (_from, _to, deco) => {
      const widget = (deco.spec as { widget?: object }).widget
      if (widget) names.push(widget.constructor.name)
    })
  }
  return names
}

describe('visual editor (ColTex port)', () => {
  test('switching modes flips the visual-mode facet the toolbar reads', () => {
    let state = stateFor(DOC, false)
    expect(state.facet(visualMode)).toBe(false)
    state = state.update(setVisual(true)).state
    expect(state.facet(visualMode)).toBe(true)
    expect(isVisual({ state } as EditorView)).toBe(true)
    state = state.update(setVisual(false)).state
    expect(state.facet(visualMode)).toBe(false)
  })

  test('typesets maths, the title and graphics in visual mode only', () => {
    // Cursor at the very start: inside \documentclass, away from everything decorated.
    const on = widgets(stateFor(DOC, true, 0))
    expect(on).toContain('MathWidget')
    expect(on).toContain('MakeTitleWidget')
    expect(on).toContain('EditableGraphicsWidget')
    expect(widgets(stateFor(DOC, false, 0))).not.toContain('MathWidget')
  })

  test('the math preamble includes \\DeclareMathOperator lines', () => {
    expect(declaredMathOperators(DOC)).toBe('\\DeclareMathOperator*{\\argmax}{arg\\,max}')
    expect(declaredMathOperators('\\begin{document}\\DeclareMathOperator{\\x}{x}')).toBe('')
    expect(declaredMathOperators('% \\DeclareMathOperator{\\x}{x}\n')).toBe('')
  })

  test('converts \\DeclareMathOperator for KaTeX, leaving other definitions alone', () => {
    expect(convertPreamble('\\DeclareMathOperator*{\\argmax}{arg\\,max}')).toBe('\\newcommand{\\argmax}{\\operatorname*{arg\\,max}}')
    expect(convertPreamble('\\DeclareMathOperator\\Tr{Tr}')).toBe('\\newcommand{\\Tr}{\\operatorname{Tr}}')
    const own = '\\newcommand{\\Tr}{\\operatorname{Tr}}'
    expect(convertPreamble(own)).toBe(own)
    expect(convertPreamble('\\DeclareMathOperator{\\f}{{a}b}')).toBe('\\newcommand{\\f}{\\operatorname{{a}b}}')
  })

  test('KaTeX macros come from the preamble, one definition at a time', () => {
    const preamble = '\\newcommand{\\R}{\\mathbb{R}}\n\\newcommand{\\bad}{\\notarealcommand{\n\\newcommand{\\pair}[2]{(#1,\n #2)}\n\\DeclareMathOperator{\\Tr}{Tr}'
    const macros = macrosFor(katex, preamble)
    expect(Object.keys(macros).sort()).toEqual(['\\R', '\\Tr', '\\pair'])
    const html = katex.renderToString('\\Tr \\R \\pair{a}{b}', { macros, throwOnError: true })
    expect(html).toContain('Tr')
    // A fresh table each time: nothing leaks into the next formula.
    expect(macrosFor(katex, '')).toEqual({})
    // KaTeX's own \R gives way to the document's.
    const cal = macrosFor(katex, '\\newcommand{\\R}{\\mathcal{R}}')
    expect(katex.renderToString('\\R', { macros: cal })).toContain('mathcal')
  })
})

const BODY = String.raw`\documentclass{article}
\usepackage{CJKutf8}
\newcommand{\method}{安全门控}
\newcommand{\vect}[1]{\mathbf{#1}}
\begin{document}
\begin{CJK*}{UTF8}{gbsn}
\renewcommand{\abstractname}{摘要}
\title{T}
\author{A}
\date{\today}
\setlength{\parskip}{1em}
\noindent\textbf{关键词：}医疗
\begin{quote}
\small
\centering
声明 \vspace{1em} 文本
\end{quote}
\section{方法：\method}
\begin{equation}
x = 1 \label{eq:x}
\end{equation}
\end{CJK*}
\end{document}
`

/** The source text each content-free replace decoration hides. */
function hiddenTexts(state: EditorState): string[] {
  const texts: string[] = []
  for (const source of state.facet(EditorView.decorations)) {
    if (typeof source === 'function') continue
    ;(source as DecorationSet).between(0, state.doc.length, (from, to, deco) => {
      const spec = deco.spec as { widget?: object; block?: boolean }
      if (!spec.widget && to > from && 'block' in spec) texts.push(state.sliceDoc(from, to).trim())
    })
  }
  return texts
}

describe('visual editor: commands that print nothing (ColTex)', () => {
  test('layout and set-up commands in the body are hidden', () => {
    const hidden = hiddenTexts(stateFor(BODY, true, 0))
    for (const text of ['\\end{CJK*}', '\\setlength{\\parskip}{1em}', '\\noindent', '\\small', '\\centering', '\\vspace{1em}']) {
      expect(hidden).toContain(text)
    }
    // The preamble has its own widget; its definitions aren't hidden one by one.
    expect(hidden.some(t => t.includes('\\method}{'))).toBe(false)
  })

  test('the title block takes in \\date and what comes before it', () => {
    // Cursor at the end: one at the start would open the collapsed title block.
    const state = stateFor(BODY, true)
    let end = 0
    for (const source of state.facet(EditorView.decorations)) {
      if (typeof source === 'function') continue
      ;(source as DecorationSet).between(0, state.doc.length, (_from, to, deco) => {
        if ((deco.spec as { widget?: object }).widget?.constructor.name === 'PreambleWidget') end = Math.max(end, to)
      })
    }
    expect(end).toBe(BODY.indexOf('\\date{\\today}') + '\\date{\\today}'.length)
  })

  test('the cursor shows a hidden command again', () => {
    const at = BODY.indexOf('\\noindent') + 2
    expect(hiddenTexts(stateFor(BODY, true, at))).not.toContain('\\noindent')
  })

  test('plain-text macros show their text; others stay as they are', () => {
    expect(widgets(stateFor(BODY, true, 0))).toContain('TextWidget')
  })

  test('\\label is taken out of maths for KaTeX', async () => {
    const { withoutLabels } = await import('../src/extensions/visual/utils/katex')
    expect(withoutLabels('x = 1 \\label{eq:x}\\\\ y \\label {a{b}}')).toBe('x = 1 \\\\ y ')
    expect(katex.renderToString(withoutLabels('x \\label{eq:x}'), { throwOnError: true })).toContain('x')
  })
})

describe('command tooltips (ColTex port)', () => {
  test('a cursor inside \\ref, \\href or \\input opens its tooltip in visual mode only', async () => {
    const { commandTooltipState } = await import('../src/extensions/command-tooltip')
    const doc = String.raw`\begin{document}
See \ref{fig:a} and \href{https://example.com}{a link}.
\input{chapters/one}
\end{document}`
    const at = (needle: string, on = true) => commandTooltipState(stateFor(doc, on, doc.indexOf(needle) + 2))?.command
    expect(at('fig:a')).toBe('Ref')
    expect(at('a link')).toBe('HrefCommand')
    expect(at('chapters')).toBe('Input')
    expect(at('See')).toBeUndefined()
    expect(at('fig:a', false)).toBeUndefined()
  })
})

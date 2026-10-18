import { describe, expect, test } from 'vitest'
import { EditorState } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import LintWorker from '../src/languages/latex/linter/latex-linter.worker'
import { errorsToDiagnostics, type LintError } from '../src/languages/latex/linter/errors-to-diagnostics'
import { annotations, compileDiagnosticsState, setAnnotations } from '../src/extensions/annotations'
import { latex } from '../src/index'

const lint = (text: string) => new LintWorker().Parse(text).errors as LintError[]
const messages = (text: string) => lint(text).map(e => e.text)

describe('code check (Overleaf latex linter)', () => {
  test('a clean document, Chinese text included, has no errors', () => {
    const doc = String.raw`\documentclass{ctexart}
\newcommand{\be}{\begin{equation}}
\begin{document}
\section{方法}
这是正文，含有数学 $a^2 + b_1$ 和 \[ \alpha = \frac{1}{2} \]。
\begin{align}
  x &= \left( y \right) \\
  z &= 1
\end{align}
\verb|$| 和 \url{http://a_b.c/%7E}
\end{document}
`
    expect(lint(doc).filter(e => e.type !== 'info')).toEqual([])
  })

  test('unclosed and mismatched environments, stray braces and dollars', () => {
    expect(messages('\\begin{itemize}\n\\item a\n')).toContain('unclosed \\begin{itemize}')
    expect(messages('\\begin{figure}\n\\end{table}\n').join('\n')).toMatch(/\\end\{table\}/)
    expect(messages('text } more').join('\n')).toMatch(/unexpected close group \}/)
    expect(messages('a $x + y').join('\n')).toMatch(/\$/)
  })

  test('maths commands outside maths, and sections inside it', () => {
    expect(messages('a \\alpha b').join('\n')).toMatch(/must be inside math mode/)
    expect(messages('$x \\section{a}$').join('\n')).toMatch(/\\section used inside math mode/)
    // A %begin/%end novalidate region is skipped (upstream reads the comment
    // after its first %, hence the doubled sign).
    expect(lint('%%begin novalidate\n\\begin{itemize}\n%%end novalidate\n')).toEqual([])
  })

  test('diagnostics: errors being typed at the cursor are suppressed', () => {
    const errors: LintError[] = [{ startPos: 0, endPos: 5, pos: 5, type: 'error', text: 'x', suppressIfEditing: true }]
    expect(errorsToDiagnostics(errors, 5, 20)).toEqual([])
    expect(errorsToDiagnostics(errors, 10, 20)).toMatchObject([{ from: 0, to: 5, severity: 'error', message: 'x' }])
    // Errors past the end of the document (it changed meanwhile) are dropped.
    expect(errorsToDiagnostics([{ ...errors[0], endPos: 50, suppressIfEditing: false }], 10, 20)).toEqual([])
  })
})

describe('compile log annotations', () => {
  test('placed on the command when known, else the whole line; follow edits', () => {
    const doc = 'a\n\\foo{x} and \\foo\nlast'
    let state = EditorState.create({ doc, extensions: [latex(), annotations()] })
    ensureSyntaxTree(state, state.doc.length, 5000)
    state = state.update(
      setAnnotations(state, [
        { row: 1, type: 'error', text: 'Undefined control sequence.', command: '\\foo', entryIndex: 0 },
        { row: 2, type: 'warning', text: 'Overfull \\hbox', entryIndex: 1 },
        { row: 9, type: 'error', text: 'beyond the end', entryIndex: 2 },
        { row: -1, type: 'error', text: 'whole document', entryIndex: 3 },
      ]),
    ).state
    const ranges = () => {
      const out: [number, number, string][] = []
      const cursor = state.field(compileDiagnosticsState).iter()
      for (; cursor.value; cursor.next()) out.push([cursor.from, cursor.to, cursor.value.diagnostic.message])
      return out
    }
    expect(ranges()).toEqual([
      [2, 6, 'Undefined control sequence.'],
      [19, 23, 'Overfull \\hbox'],
    ])
    state = state.update({ changes: { from: 0, insert: 'new line\n' } }).state
    expect(ranges().map(r => r[0])).toEqual([11, 28])
  })
})

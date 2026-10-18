import { test } from 'node:test'
import assert from 'node:assert/strict'
import { humanize, parseLatexLog } from '../src/index.ts'

const LOG = `This is pdfTeX, Version 3.141592653-2.6-1.40.26 (TeX Live 2025) (preloaded format=pdflatex)
(/work/p1/main.tex
LaTeX2e <2024-11-01>
(/opt/texlive/texmf-dist/tex/latex/base/article.cls
Document Class: article 2024/06/29 v1.4n Standard LaTeX document class
)
/work/p1/main.tex:5: Undefined control sequence.
l.5 \\foo
         

LaTeX Warning: Reference \`fig:x' on page 1 undefined on input line 7.

[1{/opt/texlive/texmf-var/fonts/map/pdftex/updmap/pdftex.map}] (./main.aux) )
Output written on main.pdf (1 page, 12345 bytes).
`

test('parses errors with file and line relative to compile dir', () => {
  const entries = parseLatexLog(LOG, '/work/p1')
  const err = entries.find(e => e.level === 'error')
  assert.ok(err)
  assert.equal(err.message, 'Undefined control sequence.')
  assert.equal(err.file, 'main.tex')
  assert.equal(err.line, 5)
  const warn = entries.find(e => e.level === 'warning')
  assert.ok(warn)
  assert.equal(warn.line, 7)
})

test('parses a real XeLaTeX + ctex log from the compiler container', async () => {
  const { readFile } = await import('node:fs/promises')
  const log = await readFile(new URL('./fixtures/xelatex-ctex-undefined.log', import.meta.url), 'utf8')
  const entries = parseLatexLog(log, '/work/gGDHiC2wO6Ed')
  const errors = entries.filter(e => e.level === 'error')
  assert.equal(errors.length, 1)
  assert.equal(errors[0]!.file, 'main.tex')
  assert.equal(errors[0]!.line, 7)
  assert.equal(errors[0]!.message, 'Undefined control sequence.')
})

test('adds plain-language hints and package suggestions (human-readable rules)', () => {
  const log = `(/work/p1/main.tex
/work/p1/main.tex:9: Undefined control sequence.
l.9 \\includegraphics
                    {fig.png}

LaTeX Warning: Reference \`fig:x' on page 1 undefined on input line 7.

)`
  const entries = parseLatexLog(log, '/work/p1')
  const graphics = entries.find(e => e.line === 9)!
  assert.equal(graphics.message, 'Is \\usepackage{graphicx} missing?')
  assert.equal(graphics.command, '\\includegraphics')
  assert.match(graphics.hint ?? '', /missing package! The \\includegraphics command/)
  const foo = parseLatexLog(LOG, '/work/p1').find(e => e.line === 5)!
  assert.equal(foo.message, 'Undefined control sequence.')
  assert.match(foo.hint ?? '', /Check that the command is spelled correctly/)
  assert.equal(foo.hintUrl, 'https://www.overleaf.com/learn/Errors/Undefined_control_sequence')
  const ref = parseLatexLog(LOG, '/work/p1').find(e => e.level === 'warning')!
  assert.equal(ref.ruleId, 'hint_reference_undefined')
  assert.match(ref.hint ?? '', /make sure that what is written inside \\ref\{\.\.\.\}/)
})

test('cascading environment mismatches are reported once', () => {
  const entries = humanize([
    { message: "LaTeX Error: \\begin{itemize} on input line 3 ended by \\end{enumerate}.", content: '' },
    { message: "Error: `\\end{itemize}' expected but found `\\end{enumerate}'.", content: '' },
    { message: "Error: `table' expected, found `figure'.", content: '' },
    { message: "Error: `\\end{table}' expected but found `\\end{figure}'.", content: '' },
  ])
  assert.deepEqual(
    entries.map(e => e.message),
    [
      "LaTeX Error: \\begin{itemize} on input line 3 ended by \\end{enumerate}.",
      'Error: environments do not match: \\begin{itemize} ... \\end{enumerate}',
      'Error: environment does not match \\begin{table} ... \\end{figure}',
    ],
  )
})

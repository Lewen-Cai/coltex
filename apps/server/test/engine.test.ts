import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { detectEngine, engineFor } from '../src/projects/engine.ts'

const reader = (files: Record<string, string>) => async (p: string) => files[p]
const detect = (files: Record<string, string>, main = 'main.tex') => detectEngine(reader(files), main)
const doc = (body: string) => detect({ 'main.tex': body })

describe('engine detection', () => {
  test('magic comments and latexmkrc decide first', async () => {
    assert.equal(await doc('% !TEX program = lualatex\n\\documentclass{article}\n\\usepackage{fontspec}'), 'lualatex')
    assert.equal(await doc('% !TeX TS-program = xelatex\n\\documentclass{article}'), 'xelatex')
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}', latexmkrc: '$pdf_mode = 5;' }), 'xelatex')
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}', '.latexmkrc': '$pdf_mode = 4;' }), 'lualatex')
  })

  test('what the preamble loads', async () => {
    assert.equal(await doc('\\documentclass{article}\n\\begin{document}Hello\\end{document}'), 'pdflatex')
    assert.equal(await doc('\\documentclass[sigconf]{acmart}\n\\usepackage{booktabs}'), 'pdflatex')
    assert.equal(await doc('\\documentclass[UTF8]{ctexart}'), 'xelatex')
    assert.equal(await doc('\\documentclass{article}\n\\usepackage[UTF8]{ctex}'), 'xelatex')
    assert.equal(await doc('\\documentclass{article}\n\\usepackage{amsmath,fontspec}'), 'xelatex')
    assert.equal(await doc('\\documentclass{article}\n\\usepackage{xeCJK}'), 'xelatex')
    assert.equal(await doc('\\documentclass{article}\n\\usepackage{luatexja-preset}'), 'lualatex')
    assert.equal(await doc('\\documentclass{article}\n\\usepackage{fontspec}\n\\usepackage{luacode}'), 'lualatex')
    // Commented out, or only mentioned in the body, doesn't count.
    assert.equal(await doc('\\documentclass{article}\n% \\usepackage{fontspec}'), 'pdflatex')
    assert.equal(await doc('\\documentclass{article}\n\\begin{document}\\verb|\\usepackage{ctex}|\\end{document}'), 'pdflatex')
  })

  test('preambles in other files of the project', async () => {
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}\n\\input{setup/preamble}', 'setup/preamble.tex': '\\usepackage{xeCJK}' }), 'xelatex')
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}\n\\usepackage{mystyle}', 'mystyle.sty': '\\RequirePackage{fontspec}' }), 'xelatex')
    assert.equal(await detect({ 'main.tex': '\\documentclass{thesis}', 'thesis.cls': '\\LoadClass{ctexbook}' }), 'xelatex')
    // Chapters input after \begin{document} aren't read.
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}\n\\begin{document}\\input{one}\\end{document}', 'one.tex': '\\usepackage{fontspec}' }), 'pdflatex')
    // Files that include each other end.
    assert.equal(await detect({ 'main.tex': '\\documentclass{article}\n\\input{a}', 'a.tex': '\\input{b}', 'b.tex': '\\input{a}' }), 'pdflatex')
  })

  test("a project's setting wins over detection; trial files are read first", async () => {
    const store = { readFile: async (_id: string, p: string) => (p === 'main.tex' ? Buffer.from('\\documentclass{ctexart}') : Promise.reject(new Error('missing'))) }
    const project = { id: 'p', rootFile: 'main.tex' }
    assert.equal(await engineFor(store, { ...project, engine: 'lualatex' }), 'lualatex')
    assert.equal(await engineFor(store, { ...project, engine: 'auto' }), 'xelatex')
    assert.equal(await engineFor(store, { ...project, engine: 'auto' }, { 'main.tex': '\\documentclass{article}' }), 'pdflatex')
    assert.equal(await engineFor(store, { ...project, engine: 'auto', rootFile: '../escape.tex' }), 'pdflatex')
  })
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { forPandoc } from '../src/word-source.ts'

test('tables pandoc would drop or break are rewritten', () => {
  assert.equal(forPandoc(String.raw`\resizebox{\textwidth}{!}{\begin{tabular}{ll}a&b\\\end{tabular}}`), String.raw`\begin{tabular}{ll}a&b\\\end{tabular}`)
  assert.equal(forPandoc(String.raw`\scalebox{0.8}[1]{X}`), 'X')
  assert.equal(forPandoc(String.raw`\begin{adjustbox}{max width=\textwidth}X\end{adjustbox}`), 'X')
  assert.equal(forPandoc(String.raw`\begin{table*}[t]\caption{C}\end{table*}`), String.raw`\begin{table}[t]\caption{C}\end{table}`)
  assert.equal(forPandoc(String.raw`\begin{sidewaystable}\end{sidewaystable}`), String.raw`\begin{table}\end{table}`)
  assert.equal(forPandoc(String.raw`a\\\cline{2-3} b\\\cmidrule(lr){2-3} c\\\cmidrule[1pt]{1-1}\addlinespace[2pt] d`), String.raw`a\\ b\\ c\\ d`)
  assert.equal(forPandoc(String.raw`\makecell[l]{B\\C} \thead{D\\[2pt]E}`), String.raw`B\newline C D\newline E`)
  assert.equal(forPandoc(String.raw`B\tnote{a}`), String.raw`B\textsuperscript{a}`)
})

test("siunitx's columns become centred ones, other column types stay", () => {
  assert.equal(forPandoc(String.raw`\begin{tabular}[t]{lS[table-format=2.1]s}`), String.raw`\begin{tabular}{lcc}`)
  assert.equal(forPandoc(String.raw`\begin{tabular}{>{\raggedright\arraybackslash}p{2cm}*{3}{S}@{}}`), String.raw`\begin{tabular}{>{\raggedright\arraybackslash}p{2cm}*{3}{c}@{}}`)
  assert.equal(forPandoc(String.raw`\begin{tabularx}{\linewidth}{XS}`), String.raw`\begin{tabularx}{\linewidth}{Xc}`)
  assert.equal(forPandoc(String.raw`\begin{longtable}[c]{lS}`), String.raw`\begin{longtable}{lc}`)
  assert.equal(forPandoc(String.raw`\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}lS}`), String.raw`\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}lc}`)
})

test('commands whose arguments do not parse, and look-alikes, stay as they are', () => {
  for (const text of [String.raw`\resizebox{\textwidth}{!}`, String.raw`\clinex{1}`, String.raw`\tnote`, String.raw`\begin{tabulary}{\linewidth}{LS}`]) assert.equal(forPandoc(text), text)
})

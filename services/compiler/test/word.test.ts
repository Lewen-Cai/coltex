import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { forPandoc } from '../src/word-source.ts'

// Needs pandoc and TeX Live's pictures: runs in the compiler image, skipped elsewhere.
const hasPandoc = spawnSync('pandoc', ['--version']).status === 0 && spawnSync('kpsewhich', ['example-image-a.pdf']).status === 0
const FILTER = fileURLToPath(new URL('../pandoc/word.lua', import.meta.url))
const REFERENCE = fileURLToPath(new URL('../pandoc/reference.docx', import.meta.url))

/** The .docx's pictures by their first bytes, and its text. */
async function exportWord(files: Record<string, string | Buffer>, main: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'word-'))
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true })
    await fs.writeFile(path.join(dir, name), content)
  }
  await fs.writeFile(path.join(dir, 'main.tex'), forPandoc(main))
  // As the worker runs it: citeproc before the filter.
  const args = ['main.tex', '--from=latex', '--to=docx', '--citeproc', '--metadata=link-citations=true', `--lua-filter=${FILTER}`, `--reference-doc=${REFERENCE}`]
  const run = spawnSync('pandoc', [...args, '--resource-path=.', '--output=out.docx'], { cwd: dir, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  execFileSync('unzip', ['-q', 'out.docx', '-d', 'x'], { cwd: dir })
  const media = path.join(dir, 'x/word/media')
  const names = await fs.readdir(media).catch(() => [])
  const pictures = await Promise.all(names.map(async n => (await fs.readFile(path.join(media, n))).subarray(1, 4).toString('latin1')))
  const xml = await fs.readFile(path.join(dir, 'x/word/document.xml'), 'utf8')
  const styles = await fs.readFile(path.join(dir, 'x/word/styles.xml'), 'utf8')
  await fs.rm(dir, { recursive: true, force: true })
  // Paragraphs and tables as lines of text, "TABLE[a|b|...]" for a Word table.
  const text = xml
    .replace(/>\s*\n\s*</g, '><')
    .replace(/<w:tbl>/g, 'TABLE[')
    .replace(/<\/w:tbl>/g, ']')
    .replace(/<\/w:p>/g, '|')
    .replace(/<[^>]*>/g, '')
    .trim()
  return { pictures, text, xml, styles, tables: xml.split('<w:tbl>').length - 1, warnings: run.stderr }
}

const pdf = () => fs.readFile(execFileSync('kpsewhich', ['example-image-a.pdf'], { encoding: 'utf8' }).trim())

test("PDF pictures in \\graphicspath's folders become PNGs, with or without an extension", { skip: !hasPandoc }, async () => {
  const picture = await pdf()
  const r = await exportWord(
    { 'figures/plot.pdf': picture, 'figures/other.pdf': picture },
    String.raw`\documentclass{article}
\usepackage{graphicx}
\graphicspath{{figures/}}
\begin{document}
\includegraphics{plot.pdf}
\includegraphics{other}
\end{document}
`,
  )
  assert.deepEqual(r.pictures, ['PNG', 'PNG'])
})

test('a PDF that cannot be converted is named in the document, never embedded', { skip: !hasPandoc }, async () => {
  const r = await exportWord(
    { 'broken.pdf': (await pdf()).subarray(0, 400) },
    String.raw`\documentclass{article}
\usepackage{graphicx}
\begin{document}
\includegraphics{broken}
\end{document}
`,
  )
  assert.deepEqual(r.pictures, [])
  assert.match(r.text, /\[Figure broken\.pdf could not be converted\]/)
  assert.match(r.warnings, /Could not turn broken\.pdf into a picture for Word/)
})

test('tables reach Word as tables, with their captions', { skip: !hasPandoc }, async () => {
  const r = await exportWord(
    {},
    String.raw`\documentclass{article}
\usepackage{booktabs,multirow,threeparttable,graphicx,siunitx,makecell,adjustbox}
\begin{document}
\begin{table}\caption{Booktabs}\begin{tabular}{lcc}\toprule A & B & C\\\midrule 1 & 2 & 3\\\bottomrule\end{tabular}\end{table}
\begin{table}\caption{Resized}\resizebox{\textwidth}{!}{\begin{tabular}{ll}R1 & R2\\\end{tabular}}\end{table}
\begin{table}\caption{Adjusted}\begin{adjustbox}{max width=\textwidth}\begin{tabular}{ll}J1 & J2\\\end{tabular}\end{adjustbox}\end{table}
\begin{table}\caption{Units}\begin{tabular}{lS[table-format=1.1]}U & {V}\\ x & 2.5\\\end{tabular}\end{table}
\begin{table*}\caption{Wide}\begin{tabular}{ll}W1 & \makecell{W2\\W3}\\\end{tabular}\end{table*}
\begin{table}\caption{Spans}\begin{tabular}{lcc}\toprule \multirow{2}{*}{G} & \multicolumn{2}{c}{S}\\\cmidrule(lr){2-3} & P & Q\\\midrule\addlinespace x & 1 & 2\\\bottomrule\end{tabular}\end{table}
\begin{table}\caption{Notes}\begin{threeparttable}\begin{tabular}{ll}N1 & N2\tnote{a}\\\end{tabular}\begin{tablenotes}\item[a] A note.\end{tablenotes}\end{threeparttable}\end{table}
\end{document}
`,
  )
  assert.equal(r.tables, 7, r.text)
  for (const caption of ['Booktabs', 'Resized', 'Adjusted', 'Units', 'Wide', 'Spans', 'Notes']) assert.match(r.text, new RegExp(`(^|[|\\]])${caption}\\|TABLE`), caption)
  assert.match(r.text, /TABLE\[U\|V\|x\|2\.5\|\]/)
  assert.match(r.text, /TABLE\[W1\|W2W3\|\]/)
  // The empty cell under \multirow is merged with it.
  assert.match(r.text, /TABLE\[G\|S\|\|P\|Q\|x\|1\|2\|\]/)
  assert.match(r.xml, /<w:vMerge w:val="restart" \/>/)
  assert.match(r.text, /N2a\|/)
  assert.doesNotMatch(r.text, /2-3|max width/)
})

const BIB = '@article{knuth, author={Donald Knuth}, title={Literate Programming}, journal={The Computer Journal}, year={1984}}\n'

test('the reference list has a heading and stays where the bibliography was', { skip: !hasPandoc }, async () => {
  // As the export's wrapper writes it: a heading, then the place mark, with an appendix after.
  const placed = await exportWord(
    { 'refs.bib': BIB },
    String.raw`\documentclass{article}
\providecommand{\refname}{References}
\renewcommand{\refname}{Literature}
\begin{document}
Text \cite{knuth}.

\section*{\refname}

\bibliography{refs}

COLTEX-REFERENCES-HERE

\section{Appendix}
More.
\end{document}
`,
  )
  assert.match(placed.text, /Literature\|Knuth, Donald\. 1984\.[^|]*\|Appendix\|More\.\|$/)
  assert.doesNotMatch(placed.text, /COLTEX/)

  // Read as it is (no wrapper): the list gets a heading of its own.
  const plain = await exportWord(
    { 'refs.bib': BIB },
    String.raw`\documentclass{article}
\begin{document}
Text \cite{knuth}.
\bibliography{refs}
\end{document}
`,
  )
  assert.match(plain.text, /Text \(Knuth 1984\)\.\|References\|Knuth, Donald/)

  // Nothing cited: no list, so no heading either.
  const none = await exportWord({ 'refs.bib': BIB }, String.raw`\documentclass{article}
\begin{document}
Text.

\section*{References}

\bibliography{refs}

COLTEX-REFERENCES-HERE
\end{document}
`)
  assert.doesNotMatch(none.text, /References|COLTEX/)
})

test('citations link to their entries, and headings are black', { skip: !hasPandoc }, async () => {
  const r = await exportWord(
    { 'refs.bib': BIB },
    String.raw`\documentclass{article}
\begin{document}
\section{Intro}
Text \cite{knuth}.
\bibliography{refs}
\end{document}
`,
  )
  assert.match(r.xml, /<w:hyperlink w:anchor="ref-knuth">/)
  const heading = /<w:style [^>]*w:styleId="Heading1".*?<\/w:style>/s.exec(r.styles)![0]
  assert.match(heading, /<w:color w:val="000000" \/>/)
})

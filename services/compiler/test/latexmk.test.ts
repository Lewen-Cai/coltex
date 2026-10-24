import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runLatexmk } from '../src/latexmk.ts'

// Needs TeX Live: runs in the compiler image, skipped elsewhere.
const hasLatexmk = (() => {
  try {
    execFileSync('latexmk', ['-v'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const MAIN = String.raw`\documentclass{article}
\begin{document}
Hello. \input{data.bar}
\end{document}
`

async function project(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'latexmk-'))
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true })
    await fs.writeFile(path.join(dir, name), content)
  }
  return dir
}

test('outputs stay in the build directory whatever latexmkrc says', { skip: !hasLatexmk }, async () => {
  const dir = await project({
    'main.tex': MAIN,
    'data.foo': 'from the custom rule\n',
    // As written by LaTeX Workshop users, with a rule of their own that must keep working.
    latexmkrc: [
      "$out_dir = 'build'; $aux_dir = 'build';",
      "add_cus_dep('foo', 'bar', 0, 'foo2bar');",
      'sub foo2bar { system("cp \\"$_[0].foo\\" \\"$_[0].bar\\""); }',
    ].join('\n'),
    // Uploaded with the project: latexmk must not take it for an up-to-date build.
    'build/output.pdf': 'stale',
  })
  const future = new Date(Date.now() + 365 * 86_400_000)
  await fs.utimes(path.join(dir, 'build/output.pdf'), future, future)

  const run = await runLatexmk(dir, 'main.tex', 'pdflatex', 60_000)
  assert.equal(run.exitCode, 0, run.output)
  assert.doesNotMatch(run.output, /Nothing to do/)
  for (const name of ['output.pdf', 'output.log', 'output.synctex.gz']) await fs.access(path.join(dir, name))
  assert.equal(await fs.readFile(path.join(dir, 'build/output.pdf'), 'utf8'), 'stale')
  assert.match(execFileSync('pdftotext', [path.join(dir, 'output.pdf'), '-'], { encoding: 'utf8' }), /from the custom rule/)
  await fs.rm(dir, { recursive: true, force: true })
})

test('projects without a latexmkrc build as before', { skip: !hasLatexmk }, async () => {
  const dir = await project({ 'main.tex': MAIN.replace(String.raw` \input{data.bar}`, ''), 'sub/x.tex': '' })
  const run = await runLatexmk(dir, 'main.tex', 'pdflatex', 60_000)
  assert.equal(run.exitCode, 0, run.output)
  for (const name of ['output.pdf', 'output.log', 'output.synctex.gz']) await fs.access(path.join(dir, name))
  await fs.rm(dir, { recursive: true, force: true })
})

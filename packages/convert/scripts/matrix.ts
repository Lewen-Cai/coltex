// Convert every test fixture to every target and write the projects to a
// directory, to compile them all with the compiler image:
//
//   node scripts/matrix.ts /tmp/matrix
//   docker run --rm --network none -v /tmp/matrix:/m -w /m --entrypoint sh coltex-compiler -c \
//     'for d in */; do (cd $d && latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex >/dev/null 2>&1); echo "$d $?"; done'
//
// Every line should end in 0. Run it after changing an extractor or a target.
import fs from 'node:fs'
import path from 'node:path'
import { convertPaper, extractPaper, TARGETS } from '../src/index.ts'
import { png } from './png.ts'

const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/matrix.ts <output dir>')
const fixtures = new URL('../test/fixtures/', import.meta.url)
const bib = fs.readFileSync(new URL('refs.bib', fixtures), 'utf8')

for (const file of fs.readdirSync(fixtures).filter(f => f.endsWith('.tex'))) {
  const src = fs.readFileSync(new URL(file, fixtures), 'utf8')
  const paper = extractPaper(src)
  for (const t of TARGETS) {
    const conv = convertPaper(paper, t.id, { journal: t.id === 'elsevier' ? 'Pattern Recognition' : undefined }, {
      rootFile: 'main.tex',
      texFiles: { 'main.tex': src },
      bibFiles: { 'refs.bib': bib },
    })
    const dir = path.join(out, `${file.replace(/\.tex$/, '')}--${t.id}`)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'refs.bib'), bib)
    fs.writeFileSync(path.join(dir, 'fig.png'), png(40, 20))
    for (const [p, text] of Object.entries(conv.files)) fs.writeFileSync(path.join(dir, p), text)
    fs.writeFileSync(path.join(dir, 'notes.txt'), conv.notes.map(n => `${n.level}: ${n.text}`).join('\n'))
  }
}

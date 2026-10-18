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
import zlib from 'node:zlib'
import { convertPaper, extractPaper, TARGETS } from '../src/index.ts'

const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/matrix.ts <output dir>')
const fixtures = new URL('../test/fixtures/', import.meta.url)
const bib = fs.readFileSync(new URL('refs.bib', fixtures), 'utf8')

/** A tiny solid PNG for \includegraphics. */
function png(w: number, h: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xffffffff
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.concat([Buffer.from(type), data])
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(t))
    return Buffer.concat([len, t, sum])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.from([0, ...Array.from({ length: w }, () => [255, 128, 0]).flat()])))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

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

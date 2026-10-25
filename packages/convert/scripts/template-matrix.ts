// Every built-in template, as it is and converted to every target, written
// out as projects to compile with the compiler image:
//
//   node scripts/template-matrix.ts /tmp/tpl-matrix
//
// Each project folder gets an `engine` file (the engine the server would
// pick). Run it after adding a template or changing an extractor or target;
// every project must build without errors.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectEngine } from '../../../apps/server/src/projects/engine.ts'
import { convertPaper, extractPaper, TARGETS } from '../src/index.ts'

const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/template-matrix.ts <output dir> [template id…]')
const only = new Set(process.argv.slice(3))
const templatesDir = fileURLToPath(new URL('../../../apps/server/templates/', import.meta.url))

function files(dir: string, prefix = ''): Map<string, Buffer> {
  const all = new Map<string, Buffer>()
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) for (const [p, b] of files(path.join(dir, e.name), rel)) all.set(p, b)
    else if (rel !== 'template.json') all.set(rel, fs.readFileSync(path.join(dir, e.name)))
  }
  return all
}

async function write(dir: string, project: Map<string, Buffer>, rootFile: string, engine?: string) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [p, b] of project) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true })
    fs.writeFileSync(path.join(dir, p), b)
  }
  const read = async (p: string) => project.get(p)?.toString('utf8')
  fs.writeFileSync(path.join(dir, 'engine'), engine && engine !== 'auto' ? engine : await detectEngine(read, rootFile))
  fs.writeFileSync(path.join(dir, 'root'), rootFile)
}

const summary: string[] = []
for (const id of fs.readdirSync(templatesDir).sort()) {
  if (only.size && !only.has(id)) continue
  const dir = path.join(templatesDir, id)
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'template.json'), 'utf8')) as { rootFile?: string; engine?: string }
  const rootFile = meta.rootFile ?? 'main.tex'
  const project = files(dir)
  await write(path.join(out, `${id}--self`), project, rootFile, meta.engine)

  const text = (p: string) => project.get(p)?.toString('utf8')
  const main = text(rootFile)!
  let paper
  try {
    paper = extractPaper(main, p => text(p))
  } catch (err) {
    summary.push(`${id}: extract failed: ${(err as Error).message}`)
    continue
  }
  summary.push(`${id}: ${paper.sourceClass}, ${paper.authors.length} authors, ${paper.affiliations.length} affiliations, abstract ${paper.abstract.length} chars, ${paper.keywords.length} keywords, bib ${paper.bibliography.kind}`)
  const texFiles = Object.fromEntries([...project].filter(([p]) => p.endsWith('.tex')).map(([p, b]) => [p, b.toString('utf8')]))
  const bibFiles = Object.fromEntries([...project].filter(([p]) => p.endsWith('.bib')).map(([p, b]) => [p, b.toString('utf8')]))
  for (const t of TARGETS) {
    const conv = convertPaper(paper, t.id, { journal: t.fields.some(f => f.key === 'journal' && f.required) ? 'Journal of Testing' : undefined }, { rootFile, texFiles, bibFiles })
    const converted = new Map(project)
    for (const [p, s] of Object.entries(conv.files)) converted.set(p, Buffer.from(s))
    await write(path.join(out, `${id}--${t.id}`), converted, rootFile)
    fs.writeFileSync(path.join(out, `${id}--${t.id}`, 'notes.txt'), conv.notes.map(n => `${n.level}: ${n.text}`).join('\n'))
  }
}
fs.writeFileSync(path.join(out, 'extracted.txt'), summary.join('\n') + '\n')
console.log(summary.join('\n'))

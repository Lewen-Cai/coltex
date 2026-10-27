// Converting into templates the author brings: each test paper (and the
// built-in templates given as sources) converted into every built-in
// template and the test journal class in test/fixtures/templates, written out
// as projects to compile with the compiler image:
//
//   node scripts/byot-matrix.ts /tmp/byot-matrix [source…]
//
// Each project folder gets `engine` and `root` files. Every project must
// build without errors. The server reads a TeX Live class's \RequirePackage
// lines from the compiler; here COLTEX_CLASSES may name a folder with them
// (<class>.cls, made with grep in the compiler image).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectEngine } from '../../../apps/server/src/projects/engine.ts'
import { convertToTemplate, extractPaper, mask } from '../src/index.ts'
import { png } from './png.ts'

const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/byot-matrix.ts <output dir> [source…]')
const only = new Set(process.argv.slice(3))
const builtins = fileURLToPath(new URL('../../../apps/server/templates/', import.meta.url))
const fixtures = fileURLToPath(new URL('../test/fixtures/', import.meta.url))

function files(dir: string, prefix = ''): Map<string, Buffer> {
  const all = new Map<string, Buffer>()
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) for (const [p, b] of files(path.join(dir, e.name), rel)) all.set(p, b)
    else if (rel !== 'template.json') all.set(rel, fs.readFileSync(path.join(dir, e.name)))
  }
  return all
}

type Project = { name: string; files: Map<string, Buffer>; rootFile: string }

const templates: Project[] = [
  ...fs.readdirSync(builtins).sort().map(id => {
    const meta = JSON.parse(fs.readFileSync(path.join(builtins, id, 'template.json'), 'utf8')) as { rootFile?: string }
    return { name: id, files: files(path.join(builtins, id)), rootFile: meta.rootFile ?? 'main.tex' }
  }),
  { name: 'byot-journal', files: files(path.join(fixtures, 'templates/byot-journal')), rootFile: 'main.tex' },
]
const bib = fs.readFileSync(path.join(fixtures, 'refs.bib'))
const sources: Project[] = [
  ...fs.readdirSync(fixtures).filter(f => f.endsWith('.tex')).map(f => ({ name: f.replace(/\.tex$/, ''), files: new Map([['main.tex', fs.readFileSync(path.join(fixtures, f))], ['refs.bib', bib]]), rootFile: 'main.tex' })),
  ...['ieee-journal', 'acm-sigconf', 'nature', 'apa7', 'revtex', 'lncs', 'oup', 'elsevier-cas', 'mnras', 'jmlr'].map(id => ({ ...templates.find(t => t.name === id)!, name: `tpl-${id}` })),
].filter(s => !only.size || only.has(s.name))

const text = (p: Project, f: string) => p.files.get(f)?.toString('utf8')
const texLive = (f: string) => {
  const dir = process.env.COLTEX_CLASSES
  if (!dir || !f.endsWith('.cls') || !fs.existsSync(path.join(dir, f))) return undefined
  return fs.readFileSync(path.join(dir, f), 'utf8')
}
for (const s of sources) {
  const paper = extractPaper(text(s, s.rootFile)!, f => text(s, f))
  const texFiles = Object.fromEntries([...s.files].filter(([p]) => p.endsWith('.tex')).map(([p, b]) => [p, b.toString('utf8')]))
  const bibFiles = Object.fromEntries([...s.files].filter(([p]) => p.endsWith('.bib')).map(([p, b]) => [p, b.toString('utf8')]))
  for (const t of templates) {
    const conv = convertToTemplate(
      paper,
      { name: t.name, rootFile: t.rootFile, main: text(t, t.rootFile)!, paths: [...t.files.keys()], read: f => text(t, f) ?? texLive(f) },
      {},
      { rootFile: s.rootFile, texFiles, bibFiles },
    )
    const project = new Map(s.files)
    for (const [from, to] of Object.entries(conv.templateFiles)) project.set(to, t.files.get(from)!)
    for (const [p, c] of Object.entries(conv.files)) project.set(p, Buffer.from(c))
    // A placeholder for each image the paper includes but the fixture doesn't have.
    for (const [, name] of mask(conv.files[s.rootFile] ?? '').matchAll(/\\includegraphics\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g)) {
      const file = /\.\w+$/.test(name!) ? name! : `${name}.png`
      if (!project.has(file) && !/^example-image/.test(name!)) project.set(file, png(40, 20))
    }
    const dir = path.join(out, `${s.name}--${t.name}`)
    fs.mkdirSync(dir, { recursive: true })
    for (const [p, b] of project) {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true })
      fs.writeFileSync(path.join(dir, p), b)
    }
    fs.writeFileSync(path.join(dir, 'engine'), await detectEngine(async f => project.get(f)?.toString('utf8'), s.rootFile))
    fs.writeFileSync(path.join(dir, 'root'), s.rootFile)
    fs.writeFileSync(path.join(dir, 'notes.txt'), conv.notes.map(n => `${n.level}: ${n.text}`).join('\n'))
  }
}
console.log(`${sources.length} sources × ${templates.length} templates`)

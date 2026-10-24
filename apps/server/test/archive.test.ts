import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import yauzl from 'yauzl'
import yazl from 'yazl'
import { detectMainFile, readProjectZip } from '../src/projects/zip.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type Item = { path: string; data?: string; mode?: number; dir?: boolean }

function makeZip(items: Item[]): Promise<Buffer> {
  const zip = new yazl.ZipFile()
  for (const it of items) {
    if (it.dir) zip.addEmptyDirectory(it.path)
    else zip.addBuffer(Buffer.from(it.data ?? ''), it.path, it.mode ? { mode: it.mode } : {})
  }
  zip.end()
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    zip.outputStream.on('data', (c: Buffer) => chunks.push(c))
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)))
    zip.outputStream.on('error', reject)
  })
}

/** Lazy mode: with eager entries, yauzl may emit them before listeners are attached. */
async function entryNames(buffer: Buffer): Promise<string[]> {
  const zip = await yauzl.fromBufferPromise(buffer, { lazyEntries: true })
  const names: string[] = []
  await new Promise<void>((resolve, reject) => {
    zip.on('entry', (e: { fileName: string }) => {
      names.push(e.fileName)
      zip.readEntry()
    })
    zip.on('end', () => resolve())
    zip.on('error', reject)
    zip.readEntry()
  })
  return names
}

const files = (m: Map<string, Buffer>) => [...m.keys()].sort()
const text = (entries: Record<string, string>) => new Map(Object.entries(entries).map(([k, v]) => [k, Buffer.from(v)]))

describe('readProjectZip', () => {
  test('reads files and empty folders, skipping OS clutter', async () => {
    const zip = await makeZip([
      { path: 'main.tex', data: '\\documentclass{article}' },
      { path: 'sec/intro.tex', data: 'x' },
      { path: 'figures', dir: true },
      { path: '__MACOSX/._main.tex', data: 'junk' },
      { path: 'sec/.DS_Store', data: 'junk' },
      { path: '.git/HEAD', data: 'ref' },
    ])
    const a = await readProjectZip(zip)
    assert.deepEqual(files(a.files), ['main.tex', 'sec/intro.tex'])
    assert.deepEqual([...a.folders], ['figures'])
  })

  test('skips other editors’ build and tool files in a project, as Overleaf does', async () => {
    const zip = await makeZip([
      { path: 'paper/main.tex', data: '\\documentclass{article}' },
      { path: 'paper/main.aux', data: 'x' },
      { path: 'paper/main.log', data: 'x' },
      { path: 'paper/main.synctex.gz', data: 'x' },
      { path: 'paper/main.fdb_latexmk', data: 'x' },
      { path: 'paper/main.fls', data: 'x' },
      { path: 'paper/main.bbl', data: 'kept: arXiv sources need it' },
      { path: 'paper/latexmkrc', data: 'x' },
      { path: 'paper/.latexmkrc', data: 'x' },
      { path: 'paper/.vscode/settings.json', data: '{}' },
      { path: 'paper/.vscode', dir: true },
      { path: 'paper/venv/lib/x.py', data: 'x' },
      { path: 'paper/build/output.pdf', data: '%PDF' },
      { path: 'paper/build/output.aux', data: 'x' },
      { path: 'paper/fig/plot.pdf', data: '%PDF' },
    ])
    const a = await readProjectZip(zip, undefined, { skipBuildFiles: true })
    assert.deepEqual(files(a.files), ['.latexmkrc', 'build/output.pdf', 'fig/plot.pdf', 'latexmkrc', 'main.bbl', 'main.tex'])
    assert.deepEqual(a.warnings, [])
    // Not for skills: their files are kept as they are.
    assert.ok((await readProjectZip(zip)).files.has('main.log'))
  })

  test('strips a single wrapping folder', async () => {
    const zip = await makeZip([
      { path: 'paper-main/main.tex', data: 'x' },
      { path: 'paper-main/fig/a.png', data: 'y' },
    ])
    assert.deepEqual(files((await readProjectZip(zip)).files), ['fig/a.png', 'main.tex'])
  })

  test('rejects path traversal ("zip slip")', async () => {
    const zip = await makeZip([{ path: 'aa/evil.tex', data: 'x' }])
    // Same-length rewrite of the stored name in both the local and central headers.
    const evil = Buffer.from(zip.toString('latin1').replaceAll('aa/evil.tex', '../evil.tex'), 'latin1')
    await assert.rejects(readProjectZip(evil), /Invalid zip file/)
  })

  test('skips symbolic links', async () => {
    const zip = await makeZip([
      { path: 'main.tex', data: 'x' },
      { path: 'link.tex', data: '/etc/passwd', mode: 0o120777 },
    ])
    const a = await readProjectZip(zip)
    assert.deepEqual(files(a.files), ['main.tex'])
    assert.match(a.warnings[0]!, /symbolic link/)
  })

  test('enforces size and entry limits by actual bytes', async () => {
    const zip = await makeZip([{ path: 'big.tex', data: 'a'.repeat(10_000) }])
    await assert.rejects(readProjectZip(zip, { maxEntries: 10, maxFileBytes: 1_000_000, maxTotalBytes: 5_000 }), /expands to more than/)
    await assert.rejects(readProjectZip(zip, { maxEntries: 10, maxFileBytes: 5_000, maxTotalBytes: 1_000_000 }), /larger than/)
    const many = await makeZip(Array.from({ length: 5 }, (_, i) => ({ path: `f${i}.tex`, data: 'x' })))
    await assert.rejects(readProjectZip(many, { maxEntries: 3, maxFileBytes: 1e6, maxTotalBytes: 1e6 }), /more than 3 entries/)
  })

  test('rejects data that is not a zip', async () => {
    await assert.rejects(readProjectZip(Buffer.from('definitely not a zip')), /Not a valid zip file/)
  })
})

describe('detection', () => {
  test('main file prefers main.tex, then real \\documentclass at the shallowest level', () => {
    assert.equal(detectMainFile(text({ 'main.tex': '\\documentclass{article}', 'thesis.tex': '\\documentclass{book}' })), 'main.tex')
    assert.equal(
      detectMainFile(text({ 'ch/a.tex': '\\section{A}', 'paper.tex': '% \\documentclass{x}\n\\documentclass{article}', 'ch/b.tex': '\\documentclass{article}' })),
      'paper.tex',
    )
    // A commented-out \documentclass does not count.
    assert.equal(detectMainFile(text({ 'a.tex': '% \\documentclass{article}', 'b.tex': '\\documentclass{article}' })), 'b.tex')
    assert.equal(detectMainFile(text({ 'refs.bib': '' })), undefined)
  })
})

describe('import and download routes', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>
  let cookie = ''
  before(async () => {
    t = await createTestApp()
    cookie = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: '/api/setup',
        payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' },
      }),
    )
  })
  after(async () => {
    await t?.close()
  })

  test('an imported project round-trips through download', async () => {
    const zip = await makeZip([
      { path: 'Thesis/thesis.tex', data: '\\documentclass{ctexbook}\n\\begin{document}中文\\end{document}' },
      { path: 'Thesis/chapters/one.tex', data: '\\chapter{One}' },
      { path: 'Thesis/figures', dir: true },
    ])
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/projects/import?name=${encodeURIComponent('毕业论文')}`,
      headers: { cookie, 'content-type': 'application/zip' },
      payload: zip,
    })
    assert.equal(res.statusCode, 201, res.body)
    const { project, warnings } = res.json()
    assert.equal(project.rootFile, 'thesis.tex')
    assert.equal(project.engine, 'auto')
    assert.deepEqual(warnings, [])
    // Its builds use XeLaTeX, which ctexbook needs.
    await t.app.inject({ method: 'POST', url: `/api/projects/${project.id}/compile`, headers: { cookie }, payload: {} })
    assert.equal(t.compileJobs.at(-1)?.engine, 'xelatex')

    const tree = (await t.app.inject({ url: `/api/projects/${project.id}`, headers: { cookie } })).json()
    assert.deepEqual(tree.folders, ['chapters', 'figures'])

    const dl = await t.app.inject({ url: `/api/projects/${project.id}/download.zip`, headers: { cookie } })
    assert.equal(dl.statusCode, 200)
    assert.match(String(dl.headers['content-disposition']), /filename\*=UTF-8''%E6%AF%95/)
    assert.deepEqual((await entryNames(dl.rawPayload)).sort(), ['chapters/one.tex', 'figures/', 'thesis.tex'])
  })

  test('downloads require access; bad archives are a 400', async () => {
    const anon = await t.app.inject({ url: '/api/projects/AAAAAAAAAAAA/download.zip' })
    assert.equal(anon.statusCode, 401)
    const bad = await t.app.inject({
      method: 'POST',
      url: '/api/projects/import?name=x',
      headers: { cookie, 'content-type': 'application/zip' },
      payload: Buffer.from('nope'),
    })
    assert.equal(bad.statusCode, 400)
  })
})

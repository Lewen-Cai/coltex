import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import type { ConvertAnalysis, ConvertReport } from '@coltex/shared'
import { numbersSections } from '../src/convert/word.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const fixture = (name: string) => fs.readFileSync(new URL(`../../../packages/convert/test/fixtures/${name}`, import.meta.url), 'utf8')

describe('journal template conversion', () => {
  let t: TestApp
  let owner = ''
  let viewer = ''
  let projectId = ''
  const main = fixture('ieee-conference.tex')

  const call = (cookie: string, method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown, contentType?: string) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie, ...(contentType ? { 'content-type': contentType } : {}) }, payload: payload as string })

  before(async () => {
    t = await createTestApp()
    owner = cookieFrom(await call('', 'POST', '/setup', { name: 'Owner', email: 'owner@lab.test', password: 'Correct-horse-1' }))
    const invite = await call(owner, 'POST', '/admin/invites', { email: 'viewer@lab.test' })
    viewer = cookieFrom(await call('', 'POST', `/invites/${invite.json().token}/accept`, { name: 'Viewer', email: 'viewer@lab.test', password: 'Correct-horse-2' }))
    projectId = (await call(owner, 'POST', '/projects', { name: 'Edge paper' })).json().id
    await call(owner, 'PUT', `/projects/${projectId}/files/main.tex`, main, 'text/plain')
    await call(owner, 'PUT', `/projects/${projectId}/files/refs.bib`, fixture('refs.bib'), 'text/plain')
    await call(owner, 'POST', `/projects/${projectId}/members`, { email: 'viewer@lab.test', role: 'viewer' })
  })

  after(async () => {
    await t?.close()
  })

  test('analysis returns the metadata and the targets', async () => {
    const res = await call(owner, 'GET', `/projects/${projectId}/convert`)
    assert.equal(res.statusCode, 200)
    const a = res.json() as ConvertAnalysis
    assert.equal(a.sourceClass, 'IEEEtran')
    assert.deepEqual(a.metadata.authors.map(x => x.name), ['Dan Brown', 'Eve Chen'])
    assert.equal(a.bibliography, 'bibtex')
    assert.ok(a.targets.some(x => x.id === 'acm-sigconf'))
  })

  test('converting makes a new project with the reviewed metadata; the original is untouched', async () => {
    const a = (await call(owner, 'GET', `/projects/${projectId}/convert`)).json() as ConvertAnalysis
    const metadata = { ...a.metadata, title: 'Fast Edge Inference (ACM)' }
    metadata.affiliations = metadata.affiliations.map(x => ({ ...x, country: x.country === 'USA' ? 'United States' : x.country }))
    const compilesBefore = t.compiled.length
    const res = await call(owner, 'POST', `/projects/${projectId}/convert`, {
      target: 'acm-sigconf',
      name: 'Edge paper (ACM)',
      metadata,
      options: { review: true },
    })
    assert.equal(res.statusCode, 201)
    const report = res.json() as ConvertReport
    assert.notEqual(report.projectId, projectId)
    assert.deepEqual(report.changedFiles, ['main.tex', 'refs.bib'])
    assert.ok(report.build && report.baseline, 'both projects were built')
    assert.deepEqual(t.compiled.slice(compilesBefore).sort(), [projectId, report.projectId].sort())

    const converted = (await call(owner, 'GET', `/projects/${report.projectId}/files/main.tex`)).body
    assert.match(converted, /\\documentclass\[sigconf,review,anonymous\]\{acmart\}/)
    assert.ok(converted.includes('\\title{Fast Edge Inference (ACM)}'))
    assert.ok(converted.includes('\\country{United States}'))
    assert.ok(converted.includes('\\bibliographystyle{ACM-Reference-Format}'))
    // The original keeps its own source, and the copy has the other files too.
    assert.equal((await call(owner, 'GET', `/projects/${projectId}/files/main.tex`)).body, main)
    assert.match((await call(owner, 'GET', `/projects/${report.projectId}/files/refs.bib`)).body, /year = \{1984\}/)
    const history = (await call(owner, 'GET', `/projects/${report.projectId}/history`)).json()
    assert.equal(history.versions[0].kind, 'convert')
  })

  test('viewers convert into a project of their own', async () => {
    const a = (await call(viewer, 'GET', `/projects/${projectId}/convert`)).json() as ConvertAnalysis
    const res = await call(viewer, 'POST', `/projects/${projectId}/convert`, { target: 'lncs', name: 'Mine', metadata: a.metadata })
    assert.equal(res.statusCode, 201)
    const mine = (await call(viewer, 'GET', '/projects')).json() as { id: string; role: string }[]
    assert.equal(mine.find(p => p.id === res.json().projectId)?.role, 'owner')
  })

  test('a main file without \\begin{document} is reported, not crashed on', async () => {
    const other = (await call(owner, 'POST', '/projects', { name: 'Broken' })).json().id
    await call(owner, 'PUT', `/projects/${other}/files/main.tex`, '\\documentclass{article}', 'text/plain')
    const res = await call(owner, 'GET', `/projects/${other}/convert`)
    assert.equal(res.statusCode, 400)
    assert.match(res.json().error, /begin\{document\}/)
  })

  test('Word export: the front matter goes to pandoc as a plain article, and the file is downloaded once', async () => {
    const res = await call(viewer, 'POST', `/projects/${projectId}/export/word`, {})
    assert.equal(res.statusCode, 200, res.body)
    const job = t.wordJobs.at(-1)!
    assert.equal(job.entry, '.coltex-word.tex')
    const wrapper = job.overlay['.coltex-word.tex']!
    assert.match(wrapper, /^\\documentclass\{article\}/)
    assert.match(wrapper, /\\author\{Dan Brown.* \\and Eve Chen/)
    assert.match(wrapper, /\\begin\{abstract\}/)
    assert.ok(wrapper.indexOf('COLTEX-ABSTRACT-HERE') > wrapper.indexOf('\\maketitle'), 'the abstract is placed after the affiliations')
    assert.equal(job.numberSections, true)
    assert.match(wrapper, /\\bibliography\{refs\}/)
    assert.equal(job.csl, 'ieee', 'IEEEtran references come out numbered')

    const { id } = res.json() as { id: string }
    assert.equal((await call(owner, 'GET', `/projects/${projectId}/export/word/${id}`)).statusCode, 404, 'only for whoever asked')
    const file = await call(viewer, 'GET', `/projects/${projectId}/export/word/${id}`)
    assert.equal(file.statusCode, 200)
    assert.match(String(file.headers['content-disposition']), /Edge paper\.docx/)
    assert.equal((await call(viewer, 'GET', `/projects/${projectId}/export/word/${id}`)).statusCode, 404, 'once')

    const chosen = await call(viewer, 'POST', `/projects/${projectId}/export/word`, { citationStyle: 'vancouver' })
    assert.equal(chosen.statusCode, 200)
    assert.equal(t.wordJobs.at(-1)!.csl, 'vancouver')
    const missing = await call(viewer, 'POST', `/projects/${projectId}/export/word`, { reference: 'journal.docx' })
    assert.equal(missing.statusCode, 400, 'a Word template must be a file of the project')
  })

  test('Word export numbers sections only when the document does', () => {
    assert.equal(numbersSections([], '\\section{Introduction}'), true)
    assert.equal(numbersSections(['unnumsec', 'webpdf'], '\\section{Introduction}'), false, "OUP's unnumsec")
    assert.equal(numbersSections([], '\\setcounter{secnumdepth}{0}\n\\section{Introduction}'), false)
    assert.equal(numbersSections([], '\\section*{Introduction}\n\\section*{Methods}'), false)
    assert.equal(numbersSections([], '\\section*{Acknowledgements}\n\\section[Intro]{Introduction}'), true)
  })
})

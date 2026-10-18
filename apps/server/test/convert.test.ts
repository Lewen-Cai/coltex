import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import type { ConvertAnalysis, ConvertReport } from '@coltex/shared'
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
})

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('project templates', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let carol = ''
  let source = ''

  const api = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown, type?: string) =>
    t.app.inject({
      method,
      url: `/api${url}`,
      headers: { cookie, ...(type ? { 'content-type': type } : {}) },
      ...(payload === undefined ? {} : { payload: payload as string }),
    })
  const invite = async (name: string, email: string) => {
    const { token } = (await api('POST', '/admin/invites', admin, { email })).json()
    return cookieFrom(await t.app.inject({ method: 'POST', url: `/api/invites/${token}/accept`, payload: { name, email, password: `${name}-password-1` } }))
  }
  const files = async (id: string, cookie: string) => (await api('GET', `/projects/${id}`, cookie)).json().files.map((f: { path: string }) => f.path).sort()

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    bob = await invite('Bob', 'bob@lab.test')
    carol = await invite('Carol', 'carol@lab.test')
  })
  after(async () => {
    await t?.close()
  })

  test('built-in templates: files, folders and compiler', async () => {
    const list = (await api('GET', '/templates', bob)).json()
    const ids = list.map((x: { id: string }) => x.id)
    assert.deepEqual(ids.slice(0, 3), ['article', 'arxiv', 'ieee-conference'])
    assert.ok(['acm-sigconf', 'lncs', 'elsevier', 'revtex'].every(id => ids.includes(id)))
    assert.ok(list.every((x: { kind: string; canRemove: boolean }) => x.kind === 'builtin' && !x.canRemove))

    const paper = (await api('POST', '/projects', bob, { name: 'Paper', template: 'ieee-conference' })).json()
    // New projects pick their engine at each build unless one is asked for.
    assert.equal(paper.engine, 'auto')
    // template.json is the template's description, not a project file.
    assert.deepEqual(await files(paper.id, bob), ['main.tex', 'references.bib'])
    assert.equal((await api('POST', '/projects', bob, { name: 'Z', template: 'arxiv', engine: 'lualatex' })).json().engine, 'lualatex')
    const blank = (await api('POST', '/projects', bob, { name: 'Blank' })).json()
    assert.equal(blank.engine, 'auto')
    assert.match((await api('GET', `/projects/${blank.id}/files/main.tex`, bob)).body, /\\documentclass\{article\}/)
    assert.equal((await api('POST', '/projects', bob, { name: 'X', template: 'nope' })).statusCode, 404)
  })

  test('publishing a project as a shared template', async () => {
    source = (await api('POST', '/projects', bob, { name: 'School thesis', template: 'article' })).json().id
    await api('PATCH', `/projects/${source}`, bob, { engine: 'xelatex', spellCheckLanguage: 'en_GB' })
    await api('PUT', `/projects/${source}/files/logo.tex`, bob, 'logo\n', 'text/plain')
    await api('POST', `/projects/${source}/members`, bob, { email: 'carol@lab.test', role: 'editor' })

    // Only the owner publishes.
    assert.equal((await api('PUT', `/projects/${source}/template`, carol, { name: 'Lab thesis' })).statusCode, 403)
    assert.equal((await api('PUT', `/projects/${source}/template`, admin, { name: 'Lab thesis' })).statusCode, 404)
    const published = (await api('PUT', `/projects/${source}/template`, bob, { name: 'Lab thesis', description: 'Our format' })).json()
    assert.equal(published.name, 'Lab thesis')
    assert.deepEqual((await api('GET', `/projects/${source}/template`, carol)).json(), published)
    // Renaming keeps the same entry.
    const renamed = (await api('PUT', `/projects/${source}/template`, bob, { name: 'Lab thesis 2026' })).json()
    assert.equal(renamed.id, published.id)

    // Everyone sees it, even people who aren't members of the project.
    const forAdmin = (await api('GET', '/templates', admin)).json().find((x: { id: string }) => x.id === published.id)
    assert.deepEqual(
      { kind: forAdmin.kind, name: forAdmin.name, publishedBy: forAdmin.publishedBy, canRemove: forAdmin.canRemove },
      { kind: 'shared', name: 'Lab thesis 2026', publishedBy: 'Bob', canRemove: true },
    )
    assert.equal((await api('GET', '/templates', carol)).json().find((x: { id: string }) => x.id === published.id).canRemove, false)

    // A project from it has the files as they are now, its compiler and spell-check language,
    // and nothing else of the source (members).
    const made = (await api('POST', '/projects', admin, { name: 'Mine', template: published.id })).json()
    assert.equal(made.engine, 'xelatex')
    assert.equal(made.spellCheckLanguage, 'en_GB')
    assert.ok((await files(made.id, admin)).includes('logo.tex'))
    assert.equal((await api('GET', `/projects/${made.id}/members`, admin)).json().length, 1)
    // The source project is still private.
    assert.equal((await api('GET', `/projects/${source}`, admin)).statusCode, 404)
  })

  test('taking templates down', async () => {
    const id = (await api('GET', `/projects/${source}/template`, bob)).json().id
    assert.equal((await api('DELETE', `/templates/${id}`, carol)).statusCode, 403)
    assert.equal((await api('DELETE', `/templates/${id}`, admin)).statusCode, 204)
    assert.equal((await api('GET', `/projects/${source}/template`, bob)).json(), null)
    assert.equal((await api('POST', '/projects', carol, { name: 'Late', template: id })).statusCode, 404)

    // Unpublished by its owner, and gone with its project.
    await api('PUT', `/projects/${source}/template`, bob, { name: 'Again' })
    assert.equal((await api('DELETE', `/projects/${source}/template`, bob)).statusCode, 204)
    assert.equal((await api('GET', '/templates', bob)).json().filter((x: { kind: string }) => x.kind === 'shared').length, 0)
    await api('PUT', `/projects/${source}/template`, bob, { name: 'Again' })
    assert.equal((await api('DELETE', `/projects/${source}`, bob)).statusCode, 204)
    assert.equal((await api('GET', '/templates', bob)).json().filter((x: { kind: string }) => x.kind === 'shared').length, 0)
  })
})

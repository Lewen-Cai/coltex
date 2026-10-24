import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { CompileResult } from '@coltex/shared'
import { CompileCoalescer } from '../src/routes/compile.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const result = (buildId: string): CompileResult => ({ buildId, status: 'success', outputFiles: [], diagnostics: [], durationMs: 1 })

describe('compile coalescing', () => {
  test('requests made during a build share the next one', async () => {
    const builds = new CompileCoalescer()
    const started: string[] = []
    let finish!: () => void
    const first = builds.run('p', 'k', async () => {
      started.push('b1')
      await new Promise<void>(r => (finish = r))
      return result('b1')
    })
    await new Promise(r => setImmediate(r))
    assert.deepEqual(started, ['b1'])

    const start = (id: string) => async () => {
      started.push(id)
      return result(id)
    }
    const a = builds.run('p', 'k', start('b2'))
    const b = builds.run('p', 'k', start('b3'))
    // Different options never share a build; another project is independent.
    const clean = builds.run('p', 'clean', start('c1'))
    const other = builds.run('q', 'k', start('q1'))
    assert.equal((await other).buildId, 'q1')
    assert.deepEqual(started, ['b1', 'q1'])

    finish()
    assert.equal((await first).buildId, 'b1')
    assert.equal((await a).buildId, 'b2')
    assert.equal((await b).buildId, 'b2')
    assert.equal((await clean).buildId, 'c1')
    assert.deepEqual(started, ['b1', 'q1', 'b2', 'c1'])
  })

  test('a failed build does not block the next one', async () => {
    const builds = new CompileCoalescer()
    const failed = builds.run('p', 'k', async () => {
      throw new Error('boom')
    })
    await assert.rejects(failed, /boom/)
    assert.equal((await builds.run('p', 'k', async () => result('ok'))).buildId, 'ok')
  })
})

describe('compile options, sources, spelling', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let id = ''

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    id = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: admin }, payload: { name: 'P' } })).json().id
    const invite = (
      await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: { email: 'bob@lab.test' } })
    ).json()
    bob = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.token}/accept`,
        payload: { name: 'Bob', email: 'bob@lab.test', password: 'Bob-password-1' },
      }),
    )
  })
  after(async () => {
    await t?.close()
  })

  test('compile options reach the compiler', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/projects/${id}/compile`,
      headers: { cookie: admin },
      payload: { draft: true, stopOnFirstError: true },
    })
    assert.equal(res.statusCode, 200)
    const job = t.compileJobs.at(-1)!
    assert.equal(job.draft, true)
    assert.equal(job.stopOnFirstError, true)
    assert.equal(job.clean, false)
    // Options left out take their defaults.
    assert.equal((await t.app.inject({ method: 'POST', url: `/api/projects/${id}/compile`, headers: { cookie: admin }, payload: {} })).statusCode, 200)
    assert.equal(t.compileJobs.at(-1)!.draft, false)
  })

  test('sources returns the .tex files only, and only to members', async () => {
    const put = (path: string, body: string) =>
      t.app.inject({ method: 'PUT', url: `/api/projects/${id}/files/${path}`, headers: { cookie: admin, 'content-type': 'text/plain' }, payload: body })
    await put('chapters/intro.tex', 'Hello world')
    await put('refs.bib', '@article{x,}')
    const res = await t.app.inject({ method: 'GET', url: `/api/projects/${id}/sources`, headers: { cookie: admin } })
    assert.equal(res.statusCode, 200)
    const paths = (res.json().files as { path: string; content: string }[]).map(f => f.path).sort()
    assert.deepEqual(paths, ['chapters/intro.tex', 'main.tex'])
    assert.equal((await t.app.inject({ method: 'GET', url: `/api/projects/${id}/sources`, headers: { cookie: bob } })).statusCode, 404)
  })

  test('sources can include every searchable text file', async () => {
    const res = await t.app.inject({ method: 'GET', url: `/api/projects/${id}/sources?include=text`, headers: { cookie: admin } })
    const paths = (res.json().files as { path: string }[]).map(f => f.path).sort()
    assert.deepEqual(paths, ['chapters/intro.tex', 'main.tex', 'refs.bib'])
  })

  test('project-wide replace edits checked ranges and skips files that changed', async () => {
    const put = (path: string, body: string) =>
      t.app.inject({ method: 'PUT', url: `/api/projects/${id}/files/${path}`, headers: { cookie: admin, 'content-type': 'text/plain' }, payload: body })
    const read = async (path: string) => (await t.app.inject({ method: 'GET', url: `/api/projects/${id}/files/${path}`, headers: { cookie: admin } })).body
    const replace = (payload: Record<string, unknown>, cookie = admin) =>
      t.app.inject({ method: 'POST', url: `/api/projects/${id}/replace`, headers: { cookie }, payload })
    await put('a.tex', 'colour and colour again')
    await put('b.tex', 'one colour')
    const res = await replace({
      files: [
        { path: 'a.tex', edits: [{ from: 0, to: 6, expected: 'colour', insert: 'color' }, { from: 11, to: 17, expected: 'colour', insert: 'color' }] },
        // Stale: b.tex doesn't have this text there any more.
        { path: 'b.tex', edits: [{ from: 0, to: 6, expected: 'colour', insert: 'color' }] },
        { path: 'missing.tex', edits: [{ from: 0, to: 1, expected: 'x', insert: 'y' }] },
      ],
    })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), { replaced: 2, skipped: ['b.tex', 'missing.tex'] })
    await t.collab.flushProject(id)
    assert.equal(await read('a.tex'), 'color and color again')
    assert.equal(await read('b.tex'), 'one colour')
    // Overlapping edits are refused as a whole.
    const overlap = await replace({
      files: [{ path: 'b.tex', edits: [{ from: 4, to: 10, expected: 'colour', insert: 'x' }, { from: 5, to: 7, expected: 'ol', insert: 'y' }] }],
    })
    assert.deepEqual(overlap.json(), { replaced: 0, skipped: ['b.tex'] })
    assert.equal((await replace({ files: [{ path: 'b.tex', edits: [{ from: 4, to: 10, expected: 'colour', insert: 'x' }] }] }, bob)).statusCode, 404)
  })

  test('the spell-check language is a project setting for editors', async () => {
    const get = async () => (await t.app.inject({ method: 'GET', url: `/api/projects/${id}`, headers: { cookie: admin } })).json().project
    assert.equal((await get()).spellCheckLanguage, 'en_US')
    const patch = (payload: Record<string, unknown>, cookie = admin) => t.app.inject({ method: 'PATCH', url: `/api/projects/${id}`, headers: { cookie }, payload })
    assert.equal((await patch({ spellCheckLanguage: 'de' })).statusCode, 200)
    assert.equal((await get()).spellCheckLanguage, 'de')
    assert.equal((await patch({ spellCheckLanguage: '' })).statusCode, 200)
    assert.equal((await get()).spellCheckLanguage, '')
    assert.equal((await patch({ spellCheckLanguage: 'xx_YY' })).statusCode, 400)
    assert.equal((await patch({ spellCheckLanguage: 'en_GB' }, bob)).statusCode, 404)
  })

  test('the theme and avatar colour are kept with each account', async () => {
    const prefs = (method: 'GET' | 'PUT', cookie: string, payload?: object) =>
      t.app.inject({ method, url: '/api/me/preferences', headers: { cookie }, ...(payload ? { payload } : {}) })
    assert.deepEqual((await prefs('GET', admin)).json(), { theme: null, avatarHue: null })
    assert.deepEqual((await prefs('PUT', admin, { theme: 'plum' })).json(), { theme: 'plum', avatarHue: null })
    // Each setting on its own: changing one leaves the other.
    assert.deepEqual((await prefs('PUT', admin, { avatarHue: 145 })).json(), { theme: 'plum', avatarHue: 145 })
    assert.deepEqual((await prefs('PUT', admin, { theme: 'forest' })).json(), { theme: 'forest', avatarHue: 145 })
    assert.deepEqual((await prefs('GET', bob)).json(), { theme: null, avatarHue: null })
    assert.equal((await prefs('PUT', admin, { theme: 'sepia' })).statusCode, 400)
    assert.equal((await prefs('PUT', admin, { avatarHue: 360 })).statusCode, 400)
    assert.equal((await t.app.inject({ method: 'GET', url: '/api/me/preferences' })).statusCode, 401)

    // Everyone sees the colours people chose, to draw their avatars and cursors.
    const hues = async (cookie: string) => (await t.app.inject({ method: 'GET', url: '/api/users/avatar-hues', headers: { cookie } })).json()
    const adminId = (await t.app.inject({ method: 'GET', url: '/api/auth/get-session', headers: { cookie: admin } })).json().user.id
    assert.deepEqual(await hues(bob), { [adminId]: 145 })
    await prefs('PUT', admin, { avatarHue: null })
    assert.deepEqual(await hues(bob), {})
  })

  test('each user has their own dictionary', async () => {
    const dict = (method: 'GET' | 'POST' | 'DELETE', cookie: string, word?: string) =>
      t.app.inject({ method, url: '/api/me/dictionary', headers: { cookie }, ...(word === undefined ? {} : { payload: { word } }) })
    assert.deepEqual((await dict('GET', admin)).json(), { words: [] })
    assert.equal((await dict('POST', admin, 'Yjs')).statusCode, 204)
    assert.equal((await dict('POST', admin, 'Hocuspocus')).statusCode, 204)
    assert.equal((await dict('POST', admin, 'Yjs')).statusCode, 204) // already there: no error, no duplicate
    assert.equal((await dict('POST', admin, 'two words')).statusCode, 400)
    assert.deepEqual((await dict('GET', admin)).json(), { words: ['Hocuspocus', 'Yjs'] })
    assert.deepEqual((await dict('GET', bob)).json(), { words: [] })
    assert.equal((await dict('DELETE', admin, 'Yjs')).statusCode, 204)
    assert.deepEqual((await dict('GET', admin)).json(), { words: ['Hocuspocus'] })
    assert.equal((await t.app.inject({ method: 'GET', url: '/api/me/dictionary' })).statusCode, 401)

    // An imported list: new words added, known ones kept once, non-words skipped.
    const imported = await t.app.inject({
      method: 'POST',
      url: '/api/me/dictionary/import',
      headers: { cookie: admin },
      payload: { words: ['Hocuspocus', ' Zotero ', 'two words', '', 'BibLaTeX', 'BibLaTeX'] },
    })
    assert.deepEqual(imported.json(), { added: 2, skipped: 2 })
    assert.deepEqual((await dict('GET', admin)).json(), { words: ['BibLaTeX', 'Hocuspocus', 'Zotero'] })
    assert.equal((await t.app.inject({ method: 'DELETE', url: '/api/me/dictionary/all', headers: { cookie: admin } })).statusCode, 204)
    assert.deepEqual((await dict('GET', admin)).json(), { words: [] })
  })
})

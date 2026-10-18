import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { cookieFrom, createTestApp } from './helpers.ts'
import { zoteroAccounts } from '../src/db/schema.ts'
import { bibKeys, citationKey, fetchDoiBibtex, formatEntry, keyWithDoi, normalizeDoi } from '../src/references/doi.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('DOI helpers', () => {
  test('DOIs and arXiv ids as people paste them', () => {
    assert.equal(normalizeDoi('10.1145/3290605.3300233'), '10.1145/3290605.3300233')
    assert.equal(normalizeDoi(' https://doi.org/10.1038/s41586-020-2649-2 '), '10.1038/s41586-020-2649-2')
    assert.equal(normalizeDoi('doi:10.1000/xyz%20a'), '10.1000/xyz a')
    assert.equal(normalizeDoi('arXiv:2301.01234v2'), '10.48550/arXiv.2301.01234')
    assert.equal(normalizeDoi('https://arxiv.org/abs/2301.01234'), '10.48550/arXiv.2301.01234')
    assert.throws(() => normalizeDoi('hello'))
  })

  test('entries are laid out one field per line, under a new key', () => {
    assert.equal(formatEntry('@article{k, month = Sept, year={2020}}', 'k'), '@article{k,\n  month = sep,\n  year = {2020}\n}\n')
    const raw = ' @article{Smith_2020, title={A {Big} Result, Again}, volume={3}, DOI={10.1/x}, author={Smith, A. and Li, B.}, year={2020}}'
    assert.equal(
      formatEntry(raw.trim(), 'Smith_2020a'),
      '@article{Smith_2020a,\n  title = {A {Big} Result, Again},\n  volume = {3},\n  doi = {10.1/x},\n  author = {Smith, A. and Li, B.},\n  year = {2020}\n}\n',
    )
    const bib = '@article{a, doi = {10.1/X}}\n@book{b,\n  doi = "https://doi.org/10.2/y"}\n@comment{c, x}'
    assert.deepEqual([...bibKeys(bib)], ['a', 'b'])
    assert.equal(keyWithDoi(bib, '10.1/x'), 'a')
    assert.equal(keyWithDoi(bib, '10.2/Y'), 'b')
    assert.equal(keyWithDoi(bib, '10.3/z'), undefined)
    assert.equal(citationKey(raw.trim()), 'Smith_2020')
    // DataCite's keys are doi.org links.
    assert.equal(
      citationKey('@misc{https://doi.org/10.48550/arxiv.1706.03762, author = {Vaswani, Ashish and Shazeer, Noam}, year = {2017}}'),
      'Vaswani2017',
    )
    assert.equal(citationKey('@misc{https://x/y, author = {Stéfan van der Walt}, year = {2011}}'), 'Walt2011')
  })

  test('doi.org redirects are followed only to registration agencies', async () => {
    const calls: string[] = []
    const fetch = async (url: string) => {
      calls.push(url)
      if (url === 'https://doi.org/10.1/x') return new Response(null, { status: 302, headers: { location: 'https://api.crossref.org/works/10.1/x/transform' } })
      if (url.startsWith('https://api.crossref.org/')) return new Response('@article{X_2020, title={T}}')
      if (url === 'https://doi.org/10.2/evil') return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } })
      return new Response('', { status: 404 })
    }
    assert.equal(await fetchDoiBibtex('10.1/x', { fetch }), '@article{X_2020, title={T}}')
    await assert.rejects(fetchDoiBibtex('10.2/evil', { fetch }), /isn't a DOI registration agency/)
    assert.ok(!calls.some(c => c.includes('169.254')))
    await assert.rejects(fetchDoiBibtex('10.9/none', { fetch }), /not found/)
  })
})

describe('references: Zotero and DOI', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let id = ''

  const api = (method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: Record<string, unknown>, cookie = admin) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie }, ...(payload ? { payload } : {}) })
  const read = async (path: string) => {
    await t.collab.flushProject(id)
    return (await api('GET', `/projects/${id}/files/${path}`)).body
  }

  /** A Zotero with one group, two nested collections and 150 items (two pages). */
  let itemCount = 150
  const zotero = async (url: string, init: RequestInit) => {
    const u = new URL(url)
    const key = (init.headers as Record<string, string>)['Zotero-API-Key']
    if (key !== 'good-key-1234567890') return new Response('Forbidden', { status: 403 })
    const json = (body: unknown, total?: number) =>
      new Response(JSON.stringify(body), { headers: total === undefined ? {} : { 'Total-Results': String(total) } })
    if (u.pathname === '/keys/current') return json({ userID: 42, username: 'alice' })
    if (u.pathname === '/users/42/groups') return json([{ id: 7, data: { name: 'Lab' } }])
    if (u.pathname === '/users/42/collections') {
      return json(
        [
          { key: 'AAAA1111', data: { name: 'Thesis', parentCollection: false } },
          { key: 'BBBB2222', data: { name: 'Chapter 2', parentCollection: 'AAAA1111' } },
        ],
        2,
      )
    }
    const items = /^\/users\/42(\/collections\/(\w+))?\/items\/top$/.exec(u.pathname)
    if (items) {
      const start = Number(u.searchParams.get('start'))
      const limit = Number(u.searchParams.get('limit'))
      const total = items[2] ? 1 : itemCount
      const page = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => `@article{item${start + i},\n  title = {Item ${start + i}}\n}`)
      return new Response(page.join('\n\n'), { headers: { 'Total-Results': String(total) } })
    }
    return new Response('Not found', { status: 404 })
  }

  before(async () => {
    t = await createTestApp()
    t.referenceFakes.zotero = zotero
    admin = cookieFrom(await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }))
    id = (await api('POST', '/projects', { name: 'Thesis' })).json().id
    const invite = (await api('POST', '/admin/invites', { email: 'bob@lab.test' })).json()
    bob = cookieFrom(
      await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name: 'Bob', email: 'bob@lab.test', password: 'Correct-horse-2' } }),
    )
  })
  after(async () => {
    await t?.close()
  })

  test('connecting Zotero checks the key and never returns it', async () => {
    assert.deepEqual((await api('GET', '/me/zotero')).json(), { connected: false })
    assert.equal((await api('PUT', '/me/zotero', { apiKey: 'bad-key-1234567890' })).statusCode, 400)
    const res = await api('PUT', '/me/zotero', { apiKey: 'good-key-1234567890' })
    assert.deepEqual(res.json(), { connected: true, username: 'alice' })
    const [row] = await t.db.select().from(zoteroAccounts)
    assert.notEqual(row!.apiKey, 'good-key-1234567890') // sealed
    assert.ok(!JSON.stringify((await api('GET', '/me/zotero')).json()).includes('good-key'))
    assert.deepEqual((await api('GET', '/me/zotero/libraries')).json(), [
      { id: 'user:42', name: 'My Library' },
      { id: 'group:7', name: 'Lab' },
    ])
    assert.deepEqual((await api('GET', '/me/zotero/collections?library=user:42')).json(), [
      { key: 'AAAA1111', name: 'Thesis' },
      { key: 'BBBB2222', name: 'Thesis / Chapter 2' },
    ])
    // Bob hasn't connected.
    assert.equal((await api('GET', '/me/zotero/libraries', undefined, bob)).statusCode, 400)
  })

  test('import a library into a .bib file, refresh it, and follow a rename', async () => {
    const res = await api('POST', `/projects/${id}/references/zotero`, { library: 'user:42', path: 'refs.bib' })
    assert.deepEqual(res.json(), { path: 'refs.bib', items: 150 })
    const text = await read('refs.bib')
    assert.match(text, /^% Exported from Zotero \(My Library\)/)
    assert.equal((text.match(/@article\{/g) ?? []).length, 150)
    const links = (await api('GET', `/projects/${id}/references`)).json()
    assert.equal(links.length, 1)
    assert.equal(links[0].linkedBy, 'Admin')

    itemCount = 151
    assert.deepEqual((await api('POST', `/projects/${id}/references/refresh`, { path: 'refs.bib' })).json(), { path: 'refs.bib', items: 151 })
    assert.equal(((await read('refs.bib')).match(/@article\{/g) ?? []).length, 151)

    assert.equal((await api('POST', `/projects/${id}/move`, { from: 'refs.bib', to: 'bib/zotero.bib' })).statusCode, 204)
    assert.deepEqual((await api('GET', `/projects/${id}/references`)).json().map((l: { path: string }) => l.path), ['bib/zotero.bib'])

    // A collection; only .bib files; only the person's own libraries.
    const one = await api('POST', `/projects/${id}/references/zotero`, { library: 'user:42', collection: 'BBBB2222', path: 'ch2.bib', format: 'biblatex' })
    assert.deepEqual(one.json(), { path: 'ch2.bib', items: 1 })
    assert.match(await read('ch2.bib'), /My Library \/ Thesis \/ Chapter 2/)
    assert.equal((await api('POST', `/projects/${id}/references/zotero`, { library: 'user:42', path: 'refs.tex' })).statusCode, 400)
    assert.equal((await api('POST', `/projects/${id}/references/zotero`, { library: 'group:99', path: 'x.bib' })).statusCode, 400)
    // Non-members don't see the project.
    assert.equal((await api('GET', `/projects/${id}/references`, undefined, bob)).statusCode, 404)
  })

  test('refreshing needs the linker still connected', async () => {
    await t.db.delete(zoteroAccounts).where(eq(zoteroAccounts.zoteroUserId, '42'))
    const res = await api('POST', `/projects/${id}/references/refresh`, { path: 'ch2.bib' })
    assert.equal(res.statusCode, 400)
    assert.match(res.json().error, /disconnected Zotero/)
  })

  test('add by DOI: new file, appended entry, key clash, duplicate', async () => {
    t.referenceFakes.doi = async doi => {
      if (doi === '10.1000/a') return '@article{Smith_2020, title={First}, DOI={10.1000/a}, year={2020}}'
      if (doi === '10.1000/b') return '@article{Smith_2020, title={Second}, DOI={10.1000/b}, year={2020}}'
      throw new Error('unexpected')
    }
    const firstRes = await api('POST', `/projects/${id}/references/doi`, { id: 'https://doi.org/10.1000/a', path: 'new.bib' })
    const first = firstRes.json()
    assert.equal(first.key, 'Smith_2020')
    const second = (await api('POST', `/projects/${id}/references/doi`, { id: '10.1000/b', path: 'new.bib' })).json()
    assert.equal(second.key, 'Smith_2020a')
    const text = await read('new.bib')
    assert.equal(text, `${first.entry}\n${second.entry}`)
    const again = await api('POST', `/projects/${id}/references/doi`, { id: 'doi:10.1000/A', path: 'new.bib' })
    assert.equal(again.statusCode, 400)
    assert.match(again.json().error, /already in new.bib as Smith_2020/)
  })
})

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { cookieFrom, createTestApp } from './helpers.ts'
import { zoteroAccounts } from '../src/db/schema.ts'
import fs from 'node:fs'
import { bibKeys, citationKey, fetchDoiBibtex, formatEntry, keyWithDoi, normalizeDoi } from '../src/references/doi.ts'
import { exactFirst, mergeHits, parseArxiv, parseCrossref, plainText } from '../src/references/search.ts'

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/literature/${name}`, import.meta.url), 'utf8')

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('DOI helpers', () => {
  test('DOIs and arXiv ids as people paste them', () => {
    assert.equal(normalizeDoi('10.1145/3290605.3300233'), '10.1145/3290605.3300233')
    assert.equal(normalizeDoi(' https://doi.org/10.1038/s41586-020-2649-2 '), '10.1038/s41586-020-2649-2')
    assert.equal(normalizeDoi('doi:10.1000/xyz%20a'), '10.1000/xyz a')
    assert.equal(normalizeDoi('arXiv:2301.01234v2'), '10.48550/arXiv.2301.01234')
    assert.equal(normalizeDoi('https://arxiv.org/abs/2301.01234'), '10.48550/arXiv.2301.01234')
    assert.equal(normalizeDoi('arXiv:hep-th/9901001v1'), '10.48550/arXiv.hep-th/9901001')
    assert.equal(normalizeDoi('math.AG/0101001'), '10.48550/arXiv.math.AG/0101001')
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

describe('literature search parsing', () => {
  test('Crossref and arXiv answers become hits with an id to add', () => {
    const crossref = parseCrossref(fixture('crossref.json'))
    assert.equal(crossref.length, 3)
    assert.deepEqual(crossref[0], {
      source: 'crossref',
      id: '10.1007/978-3-031-84300-6_13',
      doi: '10.1007/978-3-031-84300-6_13',
      title: 'Is Attention All You Need?',
      authors: ['Patrick Mineault'],
      year: 2025,
      venue: 'From Human Attention to Computational Attention',
    })
    const arxiv = parseArxiv(fixture('arxiv.xml'))
    assert.equal(arxiv.length, 3)
    assert.equal(arxiv[0]!.id, 'arXiv:2512.19700')
    assert.equal(arxiv[0]!.title, '"All You Need" is Not All You Need for a Paper Title: On the Origins of a Scientific Meme')
    assert.ok(arxiv.every(h => h.source === 'arxiv' && h.authors.length > 0 && h.year && h.year > 2000))
    // Every id is one the DOI route takes.
    for (const hit of [...crossref, ...arxiv]) assert.doesNotThrow(() => normalizeDoi(hit.id))
  })

  test('plain text, merging without duplicates, exact titles first', () => {
    assert.equal(plainText('<jats:title>A &amp; B&#x2014;<i>C</i>\n  &#233;</jats:title>'), 'A & B—C é')
    const hit = (source: 'crossref' | 'arxiv', id: string, doi: string | null, title = id) => ({ source, id, doi, title, authors: [], year: null, venue: null })
    const merged = mergeHits([hit('crossref', '10.1/a', '10.1/a'), hit('crossref', '10.1/b', '10.1/b')], [hit('arxiv', '10.1/A', '10.1/A'), hit('arxiv', 'arXiv:2301.00001', null)])
    assert.deepEqual(merged.map(h => h.id), ['10.1/a', '10.1/b', 'arXiv:2301.00001'])
    const ranked = exactFirst([hit('crossref', 'x', null, 'Is attention all you need?'), hit('arxiv', 'y', null, 'Attention Is All You Need')], 'attention is all you need')
    assert.deepEqual(ranked.map(h => h.id), ['y', 'x'])
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

  test('searching asks Crossref and arXiv, and says which didn’t answer', async () => {
    const urls: string[] = []
    t.referenceFakes.search = async url => {
      urls.push(url)
      if (url.startsWith('https://api.crossref.org/works?')) return new Response(fixture('crossref.json'))
      if (url.startsWith('https://export.arxiv.org/api/query?')) return new Response(fixture('arxiv.xml'))
      return new Response('', { status: 404 })
    }
    const res = await api('GET', `/projects/${id}/references/search?q=${encodeURIComponent('attention is all you need')}`)
    assert.equal(res.statusCode, 200)
    const { hits, unavailable } = res.json()
    assert.equal(hits.length, 6)
    assert.deepEqual(hits.slice(0, 2).map((h: { source: string }) => h.source), ['crossref', 'arxiv'])
    assert.deepEqual(unavailable, [])
    const arxivQuery = new URL(urls.find(u => u.includes('arxiv'))!).searchParams.get('search_query')
    assert.equal(arxivQuery, 'ti:"attention is all you need" OR (all:attention AND all:is AND all:all AND all:you AND all:need)')

    // A source that fails is named, the other's hits still come, and the failure isn't cached.
    t.referenceFakes.search = async url => (url.includes('arxiv') ? new Response('busy', { status: 503 }) : new Response(fixture('crossref.json')))
    const partial = (await api('GET', `/projects/${id}/references/search?q=graph+neural+networks`)).json()
    assert.deepEqual(partial.unavailable, ['arxiv'])
    assert.equal(partial.hits.length, 3)

    assert.equal((await api('GET', `/projects/${id}/references/search?q=a`)).statusCode, 400)
    assert.equal((await api('GET', `/projects/${id}/references/search?q=graph`, undefined, bob)).statusCode, 404)
  })
})

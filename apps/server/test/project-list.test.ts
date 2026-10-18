import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('copying projects', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let bobId = ''
  let id = ''

  const api = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown, type?: string) =>
    t.app.inject({
      method,
      url: `/api${url}`,
      headers: { cookie, ...(type ? { 'content-type': type } : {}) },
      ...(payload === undefined ? {} : { payload: payload as string }),
    })

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = (await api('POST', '/admin/invites', admin, { email: 'bob@lab.test' })).json()
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/invites/${invite.token}/accept`,
      payload: { name: 'Bob', email: 'bob@lab.test', password: 'Bob-password-1' },
    })
    bob = cookieFrom(res)
    bobId = (await api('GET', '/auth/get-session', bob)).json().user.id
    id = (await api('POST', '/projects', admin, { name: 'Paper' })).json().id
    await api('PUT', `/projects/${id}/files/figures/plot.png`, admin, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]), 'application/octet-stream')
    await api('POST', `/projects/${id}/folders`, admin, { path: 'empty' })
    await api('PATCH', `/projects/${id}`, admin, { engine: 'xelatex', spellCheckLanguage: 'en_GB' })
    await api('POST', `/projects/${id}/members`, admin, { email: 'bob@lab.test', role: 'viewer' })
  })
  after(async () => {
    await t?.close()
  })

  test('a viewer copies a project: files, folders and settings, owned by them', async () => {
    const res = await api('POST', `/projects/${id}/copy`, bob, { name: 'My copy' })
    assert.equal(res.statusCode, 201)
    const copy = res.json()
    assert.notEqual(copy.id, id)
    assert.equal(copy.ownerId, bobId)
    assert.equal(copy.engine, 'xelatex')
    assert.equal(copy.spellCheckLanguage, 'en_GB')
    const tree = (await api('GET', `/projects/${copy.id}`, bob)).json()
    assert.deepEqual(tree.files.map((f: { path: string }) => f.path).sort(), ['figures/plot.png', 'main.tex'])
    assert.ok(tree.folders.includes('empty'))
    assert.deepEqual([...(await api('GET', `/projects/${copy.id}/files/figures/plot.png`, bob)).rawPayload], [0x89, 0x50, 0x4e, 0x47, 0, 1, 2])
    // Only Bob is a member of the copy, and its history starts fresh.
    const members = (await api('GET', `/projects/${copy.id}/members`, bob)).json()
    assert.deepEqual(members.map((m: { name: string }) => m.name), ['Bob'])
    assert.equal((await api('GET', `/projects/${copy.id}`, admin)).statusCode, 404)
    const history = (await api('GET', `/projects/${copy.id}/history`, bob)).json()
    assert.equal(history.versions.length, 1)
  })

  test('only members can copy', async () => {
    const other = (await api('POST', '/projects', bob, { name: 'Private' })).json().id
    assert.equal((await api('POST', `/projects/${other}/copy`, admin, { name: 'x' })).statusCode, 404)
  })
})

describe('archive, trash and tags', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  const ids: string[] = []

  const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie }, ...(payload === undefined ? {} : { payload: payload as string }) })
  type Summary = { id: string; archived: boolean; trashed: boolean; tagIds: string[] }
  const list = async (cookie: string) => (await api('GET', '/projects', cookie)).json() as Summary[]
  const find = async (cookie: string, id: string) => (await list(cookie)).find(p => p.id === id)!

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = (await api('POST', '/admin/invites', admin, { email: 'bob@lab.test' })).json()
    bob = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.token}/accept`,
        payload: { name: 'Bob', email: 'bob@lab.test', password: 'Bob-password-1' },
      }),
    )
    for (const name of ['A', 'B', 'C']) ids.push((await api('POST', '/projects', admin, { name })).json().id)
    await api('POST', `/projects/${ids[0]}/members`, admin, { email: 'bob@lab.test', role: 'editor' })
  })
  after(async () => {
    await t?.close()
  })

  test('archive and trash are per user and exclusive', async () => {
    assert.equal((await api('PATCH', '/me/projects', admin, { projectIds: [ids[0], ids[1]], archived: true })).statusCode, 204)
    assert.equal((await find(admin, ids[0]!)).archived, true)
    assert.equal((await find(admin, ids[1]!)).archived, true)
    // Bob, a member of the same project, still sees it normally.
    assert.equal((await find(bob, ids[0]!)).archived, false)
    // Trashing an archived project takes it out of the archive.
    assert.equal((await api('PATCH', '/me/projects', admin, { projectIds: [ids[0]], trashed: true })).statusCode, 204)
    const p = await find(admin, ids[0]!)
    assert.equal(p.trashed, true)
    assert.equal(p.archived, false)
    assert.equal((await api('PATCH', '/me/projects', admin, { projectIds: [ids[0]], trashed: false })).statusCode, 204)
    assert.equal((await find(admin, ids[0]!)).trashed, false)
  })

  test('state changes are all or nothing and need membership', async () => {
    // Bob is not a member of B: nothing changes, not even A.
    assert.equal((await api('PATCH', '/me/projects', bob, { projectIds: [ids[0], ids[1]], trashed: true })).statusCode, 404)
    assert.equal((await find(bob, ids[0]!)).trashed, false)
    assert.equal((await api('PATCH', '/me/projects', bob, { projectIds: [ids[0]] })).statusCode, 400)
    assert.equal((await api('PATCH', '/me/projects', bob, { projectIds: [ids[0]], archived: true, trashed: true })).statusCode, 400)
  })

  test('tags belong to their user and label projects', async () => {
    const res = await api('POST', '/me/tags', admin, { name: 'Thesis', color: '#3b82f6' })
    assert.equal(res.statusCode, 201)
    const tag = res.json()
    assert.equal((await api('POST', '/me/tags', admin, { name: 'Thesis', color: '#ef4444' })).statusCode, 409)
    assert.equal((await api('POST', '/me/tags', admin, { name: 'Bad', color: 'red' })).statusCode, 400)
    assert.equal((await api('POST', `/me/tags/${tag.id}/projects`, admin, { projectIds: [ids[0], ids[2]] })).statusCode, 204)
    assert.deepEqual((await find(admin, ids[0]!)).tagIds, [tag.id])
    assert.deepEqual((await find(admin, ids[1]!)).tagIds, [])
    // Other users neither see nor use someone else's tags.
    assert.deepEqual((await find(bob, ids[0]!)).tagIds, [])
    assert.deepEqual((await api('GET', '/me/tags', bob)).json(), [])
    assert.equal((await api('POST', `/me/tags/${tag.id}/projects`, bob, { projectIds: [ids[0]] })).statusCode, 404)
    // A user can't tag a project they aren't a member of.
    const bobTag = (await api('POST', '/me/tags', bob, { name: 'Mine', color: '#22c55e' })).json()
    assert.equal((await api('POST', `/me/tags/${bobTag.id}/projects`, bob, { projectIds: [ids[1]] })).statusCode, 404)

    assert.equal((await api('PATCH', `/me/tags/${tag.id}`, admin, { name: 'PhD thesis', color: '#a855f7' })).statusCode, 204)
    const [renamed] = (await api('GET', '/me/tags', admin)).json()
    assert.equal(renamed.name, 'PhD thesis')
    assert.equal(renamed.color, '#a855f7')
    assert.deepEqual([...renamed.projectIds].sort(), [ids[0], ids[2]].sort())

    assert.equal((await api('DELETE', `/me/tags/${tag.id}/projects`, admin, { projectIds: [ids[2]] })).statusCode, 204)
    assert.deepEqual((await find(admin, ids[2]!)).tagIds, [])
    assert.equal((await api('DELETE', `/me/tags/${tag.id}`, admin)).statusCode, 204)
    assert.deepEqual((await find(admin, ids[0]!)).tagIds, [])
    assert.equal((await find(admin, ids[0]!)).trashed, false, 'deleting a tag leaves the projects alone')
  })

  test("leaving a project drops the member's tags on it", async () => {
    const tag = (await api('POST', '/me/tags', bob, { name: 'Shared work', color: '#14b8a6' })).json()
    await api('POST', `/me/tags/${tag.id}/projects`, bob, { projectIds: [ids[0]] })
    const me = (await api('GET', '/auth/get-session', bob)).json().user.id
    assert.equal((await api('DELETE', `/projects/${ids[0]}/members/${me}`, bob)).statusCode, 204)
    const [after] = ((await api('GET', '/me/tags', bob)).json() as { name: string; projectIds: string[] }[]).filter(x => x.name === 'Shared work')
    assert.deepEqual(after!.projectIds, [])
  })
})

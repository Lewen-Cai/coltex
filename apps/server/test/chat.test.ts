import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
type Message = { id: string; userId: string | null; userName: string; content: string; editedAt: string | null }

describe('project chat', () => {
  let t: TestApp
  let admin = ''
  let viewer = ''
  let outsider = ''
  let id = ''

  const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie }, ...(payload === undefined ? {} : { payload: payload as string }) })

  const join = async (email: string, name: string) => {
    const invite = (await api('POST', '/admin/invites', admin, { email })).json()
    return cookieFrom(
      await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name, email, password: 'Long-password-1' } }),
    )
  }

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    viewer = await join('v@lab.test', 'Vera')
    outsider = await join('o@lab.test', 'Otto')
    id = (await api('POST', '/projects', admin, { name: 'P' })).json().id
    await api('POST', `/projects/${id}/members`, admin, { email: 'v@lab.test', role: 'viewer' })
  })
  after(async () => {
    await t?.close()
  })

  test('members, viewers included, read and write; others get 404', async () => {
    assert.equal((await api('POST', `/projects/${id}/chat`, admin, { content: 'Draft is up' })).statusCode, 201)
    const res = await api('POST', `/projects/${id}/chat`, viewer, { content: '  Looks good: $E=mc^2$  ' })
    assert.equal(res.statusCode, 201)
    assert.equal(res.json().content, 'Looks good: $E=mc^2$')
    assert.equal(res.json().userName, 'Vera')
    const page = (await api('GET', `/projects/${id}/chat`, viewer)).json() as { messages: Message[]; hasMore: boolean }
    assert.deepEqual(page.messages.map(m => m.content), ['Draft is up', 'Looks good: $E=mc^2$'])
    assert.equal(page.hasMore, false)
    assert.equal((await api('GET', `/projects/${id}/chat`, outsider)).statusCode, 404)
    assert.equal((await api('POST', `/projects/${id}/chat`, outsider, { content: 'hi' })).statusCode, 404)
    assert.equal((await api('POST', `/projects/${id}/chat`, admin, { content: '   ' })).statusCode, 400)
  })

  test('older messages come in pages, oldest first within a page', async () => {
    for (let i = 0; i < 7; i++) await api('POST', `/projects/${id}/chat`, admin, { content: `m${i}` })
    const first = (await api('GET', `/projects/${id}/chat?limit=4`, admin)).json() as { messages: Message[]; hasMore: boolean }
    assert.deepEqual(first.messages.map(m => m.content), ['m3', 'm4', 'm5', 'm6'])
    assert.equal(first.hasMore, true)
    const second = (await api('GET', `/projects/${id}/chat?limit=4&before=${first.messages[0]!.id}`, admin)).json() as {
      messages: Message[]
      hasMore: boolean
    }
    assert.deepEqual(second.messages.map(m => m.content), ['Looks good: $E=mc^2$', 'm0', 'm1', 'm2'])
    assert.equal(second.hasMore, true)
  })

  test('only the author edits or deletes a message', async () => {
    const msg = (await api('POST', `/projects/${id}/chat`, viewer, { content: 'tpyo' })).json() as Message
    assert.equal((await api('PATCH', `/projects/${id}/chat/${msg.id}`, admin, { content: 'hijack' })).statusCode, 403)
    assert.equal((await api('DELETE', `/projects/${id}/chat/${msg.id}`, admin)).statusCode, 403)
    assert.equal((await api('PATCH', `/projects/${id}/chat/${msg.id}`, viewer, { content: 'typo' })).statusCode, 204)
    let last = ((await api('GET', `/projects/${id}/chat`, admin)).json() as { messages: Message[] }).messages.at(-1)!
    assert.equal(last.content, 'typo')
    assert.ok(last.editedAt)
    assert.equal((await api('DELETE', `/projects/${id}/chat/${msg.id}`, viewer)).statusCode, 204)
    last = ((await api('GET', `/projects/${id}/chat`, admin)).json() as { messages: Message[] }).messages.at(-1)!
    assert.equal(last.content, 'm6')
    assert.equal((await api('DELETE', `/projects/${id}/chat/nope`, viewer)).statusCode, 404)
  })
})

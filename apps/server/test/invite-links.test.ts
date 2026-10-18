import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('invitation links stay available while pending', () => {
  let t: TestApp
  let admin = ''
  const inject = (method: string, url: string, cookie: string, payload?: object) =>
    t.app.inject({ method: method as 'GET', url: `/api${url}`, headers: { cookie }, payload })

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Ada', email: 'admin@lab.test', password: 'Correct-horse-1' } }))
  })
  after(async () => {
    await t?.close()
  })

  test('the list gives a pending invitation’s token (sealed in the database), and none once it is used', async () => {
    const created = (await inject('POST', '/admin/invites', admin, { email: 'max@lab.test' })).json()
    const [listed] = (await inject('GET', '/admin/invites', admin)).json()
    assert.equal(listed.token, created.token)
    const [row] = await t.db.execute<{ token_sealed: string }>(`select token_sealed from invites where id = '${listed.id}'`).then(r => r.rows)
    assert.ok(row!.token_sealed && !row!.token_sealed.includes(created.token), 'not stored in the clear')

    await t.app.inject({ method: 'POST', url: `/api/invites/${created.token}/accept`, payload: { name: 'Max', email: 'max@lab.test', password: 'Correct-horse-2' } })
    const [used] = (await inject('GET', '/admin/invites', admin)).json()
    assert.equal(used.token, null)
  })
})

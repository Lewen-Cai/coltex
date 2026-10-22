import fs from 'node:fs/promises'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { aiGroups, aiUserGroups, user } from '../src/db/schema.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('accounts and project permissions', () => {
  let t: TestApp
  let adminCookie = ''
  let aliceCookie = ''
  let projectId = ''

  before(async () => {
    t = await createTestApp()
  })
  after(async () => {
    await t?.close()
  })

  test('first-run setup creates an admin exactly once', async () => {
    assert.deepEqual((await t.app.inject({ url: '/api/setup' })).json(), { needsSetup: true, language: null })
    for (const weak of ['Short-1', 'no-uppercase-1', 'NO-LOWERCASE-1', 'No-digits-here']) {
      const res = await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: weak } })
      assert.equal(res.statusCode, 400, weak)
    }
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { name: 'Admin', email: 'Admin@Lab.test', password: 'Correct-horse-1' },
    })
    assert.equal(res.statusCode, 200)
    adminCookie = cookieFrom(res)
    assert.ok(adminCookie)

    const again = await t.app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { name: 'X', email: 'x@lab.test', password: 'Correct-horse-1' },
    })
    assert.equal(again.statusCode, 409)
  })

  test('public sign-up is disabled and the API requires a session', async () => {
    const signUp = await t.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: 'http://localhost:3000' },
      payload: { name: 'Evil', email: 'evil@lab.test', password: 'Correct-horse-1' },
    })
    assert.equal(signUp.statusCode, 400)
    assert.equal((await t.app.inject({ url: '/api/projects' })).statusCode, 401)
  })

  test('invites are single-use, email-bound and admin-only', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/admin/invites',
      headers: { cookie: adminCookie },
      payload: { email: 'alice@lab.test' },
    })
    assert.equal(created.statusCode, 201)
    const { token } = created.json()

    const wrongEmail = await t.app.inject({
      method: 'POST',
      url: `/api/invites/${token}/accept`,
      payload: { name: 'Bob', email: 'bob@lab.test', password: 'Correct-horse-2' },
    })
    assert.equal(wrongEmail.statusCode, 400)

    const accepted = await t.app.inject({
      method: 'POST',
      url: `/api/invites/${token}/accept`,
      payload: { name: 'Alice', email: 'alice@lab.test', password: 'Correct-horse-2' },
    })
    assert.equal(accepted.statusCode, 200)
    aliceCookie = cookieFrom(accepted)

    const reused = await t.app.inject({
      method: 'POST',
      url: `/api/invites/${token}/accept`,
      payload: { name: 'Alice', email: 'alice2@lab.test', password: 'Correct-horse-2' },
    })
    assert.equal(reused.statusCode, 410)

    const asUser = await t.app.inject({ url: '/api/admin/invites', headers: { cookie: aliceCookie } })
    assert.equal(asUser.statusCode, 403)
  })

  test('non-members cannot see a project, not even that it exists', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: adminCookie },
      payload: { name: 'Paper' },
    })
    assert.equal(created.statusCode, 201)
    projectId = created.json().id

    const res = await t.app.inject({ url: `/api/projects/${projectId}`, headers: { cookie: aliceCookie } })
    assert.equal(res.statusCode, 404)
    const file = await t.app.inject({ url: `/api/projects/${projectId}/files/main.tex`, headers: { cookie: aliceCookie } })
    assert.equal(file.statusCode, 404)
  })

  test('viewers can read and compile but not write; editors can write', async () => {
    const added = await t.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: adminCookie },
      payload: { email: 'ALICE@lab.test', role: 'viewer' },
    })
    assert.equal(added.statusCode, 201)
    const aliceId = added.json().userId

    const write = () =>
      t.app.inject({
        method: 'PUT',
        url: `/api/projects/${projectId}/files/notes.tex`,
        headers: { cookie: aliceCookie, 'content-type': 'text/plain' },
        payload: 'hi',
      })

    assert.equal((await t.app.inject({ url: `/api/projects/${projectId}/files/main.tex`, headers: { cookie: aliceCookie } })).statusCode, 200)
    assert.equal((await write()).statusCode, 403)
    const compile = await t.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/compile`,
      headers: { cookie: aliceCookie },
      payload: {},
    })
    assert.equal(compile.statusCode, 200)
    assert.deepEqual(t.compiled, [projectId])

    const del = await t.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}`, headers: { cookie: aliceCookie } })
    assert.equal(del.statusCode, 403)

    const promote = await t.app.inject({
      method: 'PATCH',
      url: `/api/projects/${projectId}/members/${aliceId}`,
      headers: { cookie: adminCookie },
      payload: { role: 'editor' },
    })
    assert.equal(promote.statusCode, 204)
    assert.equal((await write()).statusCode, 204)
  })

  test('synctex lookups need project access and validate paths', async () => {
    const url = `/api/projects/${projectId}/builds/abc-123/synctex`
    const toPdf = await t.app.inject({ url: `${url}/pdf?file=main.tex&line=3`, headers: { cookie: aliceCookie } })
    assert.equal(toPdf.statusCode, 200)
    assert.equal(toPdf.json().positions[0].page, 1)
    const toCode = await t.app.inject({ url: `${url}/code?page=1&h=10&v=20`, headers: { cookie: aliceCookie } })
    assert.deepEqual(toCode.json(), { position: { file: 'main.tex', line: 3, column: 0 } })
    const traversal = await t.app.inject({ url: `${url}/pdf?file=../x.tex&line=1`, headers: { cookie: aliceCookie } })
    assert.equal(traversal.statusCode, 400)
    const anon = await t.app.inject({ url: `${url}/code?page=1&h=1&v=1` })
    assert.equal(anon.statusCode, 401)
  })

  test('admins invite members into their own team and manage only them', async () => {
    const byAdmin = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: adminCookie }, payload: { email: 'ivy@lab.test', role: 'manager' } })
    assert.equal(byAdmin.statusCode, 201)
    const ivy = cookieFrom(
      await t.app.inject({ method: 'POST', url: `/api/invites/${byAdmin.json().token}/accept`, payload: { name: 'Ivy', email: 'ivy@lab.test', password: 'Correct-horse-7' } }),
    )
    // Ivy's AI group is what her members get.
    await t.db.insert(aiGroups).values({ id: 'lab', name: 'Lab', policy: { mode: 'all', providers: [], models: [] } })
    const ivyId = (await t.db.select({ id: user.id }).from(user).where(eq(user.email, 'ivy@lab.test')))[0]!.id
    await t.db.insert(aiUserGroups).values({ userId: ivyId, groupId: 'lab' })

    const invite = (payload: object, cookie = ivy) => t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie }, payload })
    const mine = await invite({ email: 'sam@lab.test' })
    assert.equal(mine.statusCode, 201)
    assert.equal(mine.json().invite.role, 'user')
    assert.equal((await invite({ role: 'manager' })).statusCode, 403)
    assert.equal((await invite({ role: 'admin' })).statusCode, 400, 'nobody invites a system administrator')
    assert.equal((await invite({ role: 'admin' }, adminCookie)).statusCode, 400)
    assert.equal((await invite({ aiGroupId: 'any' })).statusCode, 403, 'AI access is for the system administrator to give')
    // Members can't invite at all; admins have no system pages.
    assert.equal((await invite({}, aliceCookie)).statusCode, 403)
    assert.equal((await t.app.inject({ url: '/api/admin/stats', headers: { cookie: ivy } })).statusCode, 403)
    assert.equal((await t.app.inject({ url: '/api/admin/users', headers: { cookie: aliceCookie } })).statusCode, 403)

    const sam = cookieFrom(
      await t.app.inject({ method: 'POST', url: `/api/invites/${mine.json().token}/accept`, payload: { name: 'Sam', email: 'sam@lab.test', password: 'Correct-horse-8' } }),
    )
    const users = async (cookie: string) => (await t.app.inject({ url: '/api/admin/users', headers: { cookie } })).json() as { id: string; email: string; role: string; managerId: string | null; banned: boolean }[]
    const ivyView = await users(ivy)
    assert.deepEqual(ivyView.map(u => u.email), ['ivy@lab.test', 'sam@lab.test'])
    const samRow = ivyView.find(u => u.email === 'sam@lab.test')!
    assert.equal(samRow.managerId, ivyId)
    assert.equal((await t.db.select().from(aiUserGroups).where(eq(aiUserGroups.userId, samRow.id)))[0]?.groupId, 'lab')

    // Ivy manages Sam, not Alice (not in her team), herself, or the system administrator.
    const everyone = await users(adminCookie)
    const alice = everyone.find(u => u.email === 'alice@lab.test')!
    const adminRow = everyone.find(u => u.role === 'admin')!
    const act = (method: 'PUT' | 'POST' | 'DELETE', url: string, payload?: object, cookie = ivy) => t.app.inject({ method, url: `/api/admin/users/${url}`, headers: { cookie }, payload })
    assert.equal((await act('PUT', `${alice.id}/suspended`, { suspended: true })).statusCode, 404)
    assert.equal((await act('DELETE', alice.id)).statusCode, 404)
    assert.equal((await act('PUT', `${adminRow.id}/suspended`, { suspended: true })).statusCode, 404)
    assert.equal((await act('PUT', `${ivyId}/suspended`, { suspended: true })).statusCode, 403)
    assert.equal((await act('PUT', `${samRow.id}/role`, { role: 'manager' })).statusCode, 403, 'roles are the system administrator’s')
    assert.equal((await act('POST', `${samRow.id}/password`, { password: 'weak' })).statusCode, 400)
    assert.equal((await act('POST', `${samRow.id}/password`, { password: 'Correct-horse-9' })).statusCode, 204)
    assert.equal((await act('PUT', `${samRow.id}/suspended`, { suspended: true })).statusCode, 204)
    assert.equal((await t.app.inject({ url: '/api/projects', headers: { cookie: sam } })).statusCode, 401, 'suspending signs them out')
    assert.equal((await act('PUT', `${samRow.id}/suspended`, { suspended: false })).statusCode, 204)
    const signIn = await t.app.inject({ method: 'POST', url: '/api/auth/sign-in/email', headers: { origin: 'http://localhost:3000' }, payload: { email: 'sam@lab.test', password: 'Correct-horse-9' } })
    assert.equal(signIn.statusCode, 200)

    // The system administrator moves people between teams and changes roles, never making a second one.
    assert.equal((await act('PUT', `${alice.id}/team`, { managerId: ivyId }, adminCookie)).statusCode, 204)
    assert.ok((await users(ivy)).some(u => u.email === 'alice@lab.test'))
    assert.equal((await act('PUT', `${alice.id}/team`, { managerId: adminRow.id }, adminCookie)).statusCode, 400, 'a team is led by an admin')
    assert.equal((await act('PUT', `${alice.id}/team`, { managerId: null }, adminCookie)).statusCode, 204)
    assert.ok(!(await users(ivy)).some(u => u.email === 'alice@lab.test'))
    assert.equal((await act('PUT', `${alice.id}/role`, { role: 'admin' }, adminCookie)).statusCode, 400)
    const setRole = await t.app.inject({ method: 'POST', url: '/api/auth/admin/set-role', headers: { cookie: adminCookie, origin: 'http://localhost:3000' }, payload: { userId: alice.id, role: 'admin' } })
    assert.equal(setRole.statusCode, 403)
    assert.equal((await users(adminCookie)).filter(u => u.role === 'admin').length, 1)
    // An admin made a member again stops leading: the team shows no leader.
    assert.equal((await act('PUT', `${ivyId}/role`, { role: 'user' }, adminCookie)).statusCode, 204)
    assert.equal((await users(adminCookie)).find(u => u.email === 'sam@lab.test')!.managerId, null)
    assert.equal((await act('PUT', `${ivyId}/role`, { role: 'manager' }, adminCookie)).statusCode, 204)

    const listed = (await t.app.inject({ url: '/api/admin/invites', headers: { cookie: ivy } })).json()
    assert.deepEqual(listed.map((i: { id: string }) => i.id), [mine.json().invite.id])
    const pending = await invite({})
    const others = (await t.app.inject({ url: '/api/admin/invites', headers: { cookie: adminCookie } })).json().filter((i: { id: string; usedAt: string | null }) => i.id !== pending.json().invite.id && !i.usedAt)
    if (others[0]) assert.equal((await t.app.inject({ method: 'DELETE', url: `/api/admin/invites/${others[0].id}`, headers: { cookie: ivy } })).statusCode, 404)
    assert.equal((await t.app.inject({ method: 'DELETE', url: `/api/admin/invites/${pending.json().invite.id}`, headers: { cookie: ivy } })).statusCode, 204)

    // Removing a member deletes the account.
    assert.equal((await act('DELETE', samRow.id)).statusCode, 204)
    assert.ok(!(await users(adminCookie)).some(u => u.email === 'sam@lab.test'))
  })

  test('people to share with are found by name or email; wildcards are plain text', async () => {
    const search = (q: string, cookie = aliceCookie) => t.app.inject({ url: `/api/users/search?q=${encodeURIComponent(q)}`, headers: { cookie } })
    assert.deepEqual((await search('ALI')).json().map((u: { email: string }) => u.email), ['alice@lab.test'])
    assert.ok((await search('lab.test')).json().some((u: { email: string }) => u.email === 'admin@lab.test'))
    assert.deepEqual((await search('%')).json(), [])
    assert.equal((await t.app.inject({ url: '/api/users/search?q=ali' })).statusCode, 401)
  })

  test('changed and reset passwords follow the same rules', async () => {
    const change = (newPassword: string) =>
      t.app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: { cookie: aliceCookie, origin: 'http://localhost:3000' },
        payload: { currentPassword: 'Correct-horse-2', newPassword },
      })
    const weak = await change('alllowercase1')
    assert.equal(weak.statusCode, 400)
    assert.match(weak.body, /uppercase letter/)
    assert.equal((await change('Correct-horse-2b')).statusCode, 200)

    const users = await t.app.inject({ url: '/api/auth/admin/list-users', headers: { cookie: adminCookie } })
    const alice = users.json().users.find((u: { email: string }) => u.email === 'alice@lab.test')
    const reset = (newPassword: string) =>
      t.app.inject({
        method: 'POST',
        url: '/api/auth/admin/set-user-password',
        headers: { cookie: adminCookie, origin: 'http://localhost:3000' },
        payload: { userId: alice.id, newPassword },
      })
    assert.equal((await reset('Ab1')).statusCode, 400)
    assert.equal((await reset('Correct-horse-2')).statusCode, 200)
  })

  test('deleting a project removes its build outputs, history and compile directory', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: adminCookie }, payload: { name: 'Scratch' } })
    const id: string = created.json().id
    const output = path.join(t.outputsDir, id, 'b-1', 'output.pdf')
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, '%PDF')
    await t.history.checkpoint(id)
    const historyRepo = path.join(t.dataDir, 'history', `${id}.git`)
    const exists = (p: string) => fs.access(p).then(() => true, () => false)
    assert.ok(await exists(historyRepo))

    const del = await t.app.inject({ method: 'DELETE', url: `/api/projects/${id}`, headers: { cookie: adminCookie } })
    assert.equal(del.statusCode, 204)
    assert.ok(!(await exists(path.join(t.outputsDir, id))))
    assert.ok(!(await exists(historyRepo)))
    assert.ok(t.forgotten.includes(id))
  })

  test("deleting a user removes the files of projects they own", async () => {
    const own = await t.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: aliceCookie },
      payload: { name: 'Alice thesis' },
    })
    const hasFiles = (id: string) => t.store.listTree(id).then(() => true, () => false)
    assert.ok(await hasFiles(own.json().id))
    const output = path.join(t.outputsDir, own.json().id, 'b-1', 'output.pdf')
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, '%PDF')
    const users = await t.app.inject({ url: '/api/auth/admin/list-users', headers: { cookie: adminCookie } })
    const alice = users.json().users.find((u: { email: string }) => u.email === 'alice@lab.test')
    const removed = await t.app.inject({
      method: 'POST',
      url: '/api/auth/admin/remove-user',
      headers: { cookie: adminCookie, origin: 'http://localhost:3000' },
      payload: { userId: alice.id },
    })
    assert.equal(removed.statusCode, 200)
    assert.ok(!(await hasFiles(own.json().id)))
    assert.ok(!(await fs.access(path.dirname(path.dirname(output))).then(() => true, () => false)))
    assert.ok(t.forgotten.includes(own.json().id))
    // The admin's shared project (Alice was only a member) is untouched.
    assert.ok(await hasFiles(projectId))
  })

  test('the owner cannot be removed or demoted', async () => {
    const members = (await t.app.inject({ url: `/api/projects/${projectId}/members`, headers: { cookie: adminCookie } })).json()
    const owner = members.find((m: { role: string }) => m.role === 'owner')
    const res = await t.app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}/members/${owner.userId}`,
      headers: { cookie: adminCookie },
    })
    assert.equal(res.statusCode, 404)
  })
})

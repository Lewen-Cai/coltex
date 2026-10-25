import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { Group, ProjectGroupShare, ProjectMember } from '@coltex/shared'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('groups', () => {
  let t: TestApp
  const cookies: Record<string, string> = {}
  const ids: Record<string, string> = {}
  let projectId = ''

  const api = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, who: string, payload?: unknown) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie: cookies[who]! }, ...(payload === undefined ? {} : { payload: payload as object }) })
  const groupsOf = async (who: string) => (await api('GET', '/me/groups', who)).json() as Group[]
  const canOpen = async (who: string) => (await api('GET', `/projects/${projectId}`, who)).statusCode === 200
  const members = async () => (await api('GET', `/projects/${projectId}/members`, 'ada')).json() as ProjectMember[]

  before(async () => {
    t = await createTestApp()
    cookies.ada = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Ada', email: 'ada@lab.test', password: 'Correct-horse-1' } }),
    )
    for (const name of ['bob', 'cy', 'dee']) {
      const invite = (await api('POST', '/admin/invites', 'ada', { email: `${name}@lab.test` })).json()
      cookies[name] = cookieFrom(
        await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name, email: `${name}@lab.test`, password: 'Correct-horse-2' } }),
      )
    }
    for (const name of ['ada', 'bob', 'cy', 'dee']) ids[name] = (await api('GET', '/auth/get-session', name)).json().user.id
    projectId = (await api('POST', '/projects', 'ada', { name: 'Shared paper' })).json().id
  })

  after(async () => {
    await t?.close()
  })

  let groupId = ''

  test('anyone makes a group; people join by accepting, and only owners invite', async () => {
    const res = await api('POST', '/groups', 'bob', { name: 'Imaging lab' })
    assert.equal(res.statusCode, 201)
    groupId = (res.json() as Group).id
    assert.equal((await api('POST', `/groups/${groupId}/invites`, 'bob', { userId: ids.ada })).statusCode, 204)
    assert.equal((await api('POST', `/groups/${groupId}/invites`, 'bob', { userId: ids.cy })).statusCode, 204)
    assert.equal((await api('POST', `/groups/${groupId}/invites`, 'bob', { userId: ids.cy })).statusCode, 409, 'invited once')

    const invited = (await groupsOf('cy'))[0]!
    assert.equal(invited.status, 'invited')
    assert.equal(invited.invitedBy?.name, 'bob')
    assert.deepEqual(invited.members, [], 'who else is in it shows once they join')
    const notes = (await api('GET', '/me/notifications', 'cy')).json().notifications as { kind: string; group: { name: string } | null }[]
    assert.ok(notes.some(n => n.kind === 'group_invite' && n.group?.name === 'Imaging lab'))

    assert.equal((await api('POST', `/groups/${groupId}/invites`, 'cy', { userId: ids.dee })).statusCode, 403, 'not an owner yet')
    assert.equal((await api('GET', '/me/groups', 'dee')).json().length, 0)
    assert.equal((await api('PATCH', `/groups/${groupId}`, 'dee', { name: 'Mine' })).statusCode, 404, 'strangers learn nothing')

    await api('POST', `/groups/${groupId}/accept`, 'ada')
    await api('POST', `/groups/${groupId}/accept`, 'cy')
    const joined = (await groupsOf('cy'))[0]!
    assert.equal(joined.status, 'joined')
    assert.deepEqual(joined.members.map(m => [m.name, m.role, m.status]), [['bob', 'owner', 'joined'], ['Ada', 'member', 'joined'], ['cy', 'member', 'joined']])
    const after = (await api('GET', '/me/notifications', 'cy')).json().notifications as { kind: string }[]
    assert.ok(!after.some(n => n.kind === 'group_invite'), 'the invitation’s notification goes once answered')
  })

  test('a project shared with a group gives its members the role, and follows the group', async () => {
    assert.equal(await canOpen('cy'), false)
    assert.equal((await api('PUT', `/projects/${projectId}/groups/${groupId}`, 'cy', { role: 'editor' })).statusCode, 404, 'only the owner shares')
    assert.equal((await api('PUT', `/projects/${projectId}/groups/${groupId}`, 'ada', { role: 'viewer' })).statusCode, 204)
    assert.equal(await canOpen('cy'), true)
    assert.equal(await canOpen('bob'), true)
    const cy = (await members()).find(m => m.userId === ids.cy)!
    assert.deepEqual([cy.role, cy.viaGroup?.name], ['viewer', 'Imaging lab'])
    assert.equal(((await api('GET', `/projects/${projectId}/groups`, 'cy')).json() as ProjectGroupShare[])[0]?.members, 3)

    await api('PUT', `/projects/${projectId}/groups/${groupId}`, 'ada', { role: 'editor' })
    assert.equal((await members()).find(m => m.userId === ids.cy)?.role, 'editor', 'a new role reaches everyone')
    assert.equal((await members()).find(m => m.userId === ids.ada)?.role, 'owner', 'the owner stays the owner')

    // Someone who joins later gets it; someone who leaves loses it.
    await api('POST', `/groups/${groupId}/invites`, 'bob', { userId: ids.dee })
    assert.equal(await canOpen('dee'), false, 'not before accepting')
    await api('POST', `/groups/${groupId}/accept`, 'dee')
    assert.equal(await canOpen('dee'), true)
    assert.equal((await api('DELETE', `/groups/${groupId}/members/${ids.dee}`, 'dee')).statusCode, 204)
    assert.equal(await canOpen('dee'), false)

    // Their role comes from the group: it is changed there, and leaving the project means leaving the group.
    assert.equal((await api('PATCH', `/projects/${projectId}/members/${ids.cy}`, 'ada', { role: 'viewer' })).statusCode, 409)
    assert.equal((await api('DELETE', `/projects/${projectId}/members/${ids.cy}`, 'cy')).statusCode, 409)
  })

  test('people added on their own keep their place whatever the group does', async () => {
    await api('POST', `/projects/${projectId}/members`, 'ada', { email: 'cy@lab.test', role: 'reviewer' })
    const cy = (await members()).find(m => m.userId === ids.cy)!
    assert.deepEqual([cy.role, cy.viaGroup], ['reviewer', null], 'adding them by hand takes them out of the group’s hands')
    assert.equal((await api('DELETE', `/projects/${projectId}/groups/${groupId}`, 'ada')).statusCode, 204)
    assert.equal(await canOpen('bob'), false, 'the group’s other members lose it')
    assert.equal(await canOpen('cy'), true, 'cy was added on their own')
  })

  test('removing someone added by hand leaves them what a group gives; deleting a group takes it away', async () => {
    await api('PUT', `/projects/${projectId}/groups/${groupId}`, 'ada', { role: 'viewer' })
    assert.equal((await api('DELETE', `/projects/${projectId}/members/${ids.cy}`, 'ada')).statusCode, 204)
    const cy = (await members()).find(m => m.userId === ids.cy)!
    assert.deepEqual([cy.role, cy.viaGroup?.name], ['viewer', 'Imaging lab'])

    assert.equal((await api('DELETE', `/groups/${groupId}`, 'cy')).statusCode, 403, 'owners only')
    assert.equal((await api('DELETE', `/groups/${groupId}/members/${ids.bob}`, 'bob')).statusCode, 400, 'the last owner can’t leave')
    assert.equal((await api('DELETE', `/groups/${groupId}`, 'bob')).statusCode, 204)
    assert.equal(await canOpen('cy'), false)
    assert.equal(await canOpen('bob'), false)
    assert.equal(await canOpen('ada'), true)
    assert.deepEqual(await groupsOf('cy'), [])
  })

  test('sharing needs the owner to be in the group', async () => {
    const other = ((await api('POST', '/groups', 'dee', { name: 'Elsewhere' })).json() as Group).id
    assert.equal((await api('PUT', `/projects/${projectId}/groups/${other}`, 'ada', { role: 'viewer' })).statusCode, 404)
  })
})

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { TEXT_KEY, relPos } from '@coltex/review'
import type { NotificationEvent, NotificationPage } from '@coltex/shared'
import { NotificationService } from '../src/notifications/service.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('mentions and notifications', () => {
  let t: TestApp
  let owner = ''
  let alice = ''
  let bob = ''
  let otto = ''
  const ids: Record<string, string> = {}
  let projectId = ''
  let docId = ''

  const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: object) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie }, payload })
  const inbox = async (cookie: string, query = '') => (await api('GET', `/me/notifications${query}`, cookie)).json() as NotificationPage

  const join = async (email: string, name: string) => {
    const invite = (await api('POST', '/admin/invites', owner, { email })).json()
    return cookieFrom(
      await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name, email, password: 'Long-password-1' } }),
    )
  }

  /** Start a comment thread on the first word of main.tex. */
  const comment = async (cookie: string, content: string) => {
    const anchor = await t.collab.readDoc(projectId, docId, doc => {
      const text = doc.getText(TEXT_KEY)
      return { start: relPos(text, 0, 0), end: relPos(text, 3, -1) }
    })
    const res = await api('POST', `/projects/${projectId}/review/threads`, cookie, { docId, ...anchor!, content })
    assert.equal(res.statusCode, 201)
    return res.json().id as string
  }

  before(async () => {
    t = await createTestApp()
    owner = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Owner', email: 'owner@lab.test', password: 'Correct-horse-1' } }),
    )
    alice = await join('alice@lab.test', 'Alice')
    bob = await join('bob@lab.test', 'Bob')
    otto = await join('otto@lab.test', 'Otto')
    projectId = (await api('POST', '/projects', owner, { name: 'Paper' })).json().id
    for (const [email, role] of [
      ['alice@lab.test', 'editor'],
      ['bob@lab.test', 'viewer'],
    ] as const) {
      const member = (await api('POST', `/projects/${projectId}/members`, owner, { email, role })).json()
      ids[email] = member.userId
    }
    const members = (await api('GET', `/projects/${projectId}/members`, owner)).json() as { userId: string; email: string }[]
    for (const m of members) ids[m.email] = m.userId
    await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/main.tex`,
      headers: { cookie: owner, 'content-type': 'text/plain' },
      payload: 'The cat sat on the mat.\n',
    })
    docId = (await api('GET', `/projects/${projectId}/docs/resolve?path=main.tex`, owner)).json().docId
  })
  after(async () => {
    await t?.close()
  })

  test('being added to a project is a notification', async () => {
    const page = await inbox(alice)
    assert.equal(page.unread, 1)
    const [n] = page.notifications
    assert.equal(n!.kind, 'added')
    assert.equal(n!.role, 'editor')
    assert.deepEqual(n!.project, { id: projectId, name: 'Paper' })
    assert.equal(n!.actor.name, 'Owner')
    assert.equal((await api('POST', '/me/notifications/read', alice, {})).json().unread, 0)
    await api('POST', '/me/notifications/read', bob, {})
  })

  test('chat mentions notify members only, never the author', async () => {
    const content = `<@${ids['alice@lab.test']}> and <@${ids['owner@lab.test']}> please check, cc <@not-a-member>`
    assert.equal((await api('POST', `/projects/${projectId}/chat`, owner, { content })).statusCode, 201)
    const page = await inbox(alice)
    assert.equal(page.unread, 1)
    const n = page.notifications[0]!
    assert.equal(n.kind, 'mention')
    assert.equal(n.source, 'chat')
    assert.equal(n.excerpt, content)
    assert.equal(page.users[ids['alice@lab.test']!], 'Alice')
    assert.equal((await inbox(owner)).notifications.length, 0)
    assert.equal((await inbox(bob)).unread, 0)
    // Opening the chat marks its mentions read.
    assert.equal((await api('POST', '/me/notifications/seen', alice, { projectId })).statusCode, 204)
    assert.equal((await inbox(alice)).unread, 0)
  })

  test('editing a chat message notifies newly mentioned people and withdraws removed mentions', async () => {
    const msg = (await api('POST', `/projects/${projectId}/chat`, owner, { content: `hi <@${ids['alice@lab.test']}>` })).json()
    assert.equal((await inbox(alice)).unread, 1)
    await api('PATCH', `/projects/${projectId}/chat/${msg.id}`, owner, { content: `hi <@${ids['bob@lab.test']}>` })
    assert.equal((await inbox(alice)).unread, 0)
    assert.equal((await inbox(bob)).unread, 1)
    // Deleting the message deletes its notifications.
    await api('DELETE', `/projects/${projectId}/chat/${msg.id}`, owner)
    assert.equal((await inbox(bob)).unread, 0)
  })

  test('replies notify the thread’s participants; mentions in comments carry the file', async () => {
    const threadId = await comment(bob, `<@${ids['alice@lab.test']}> is "The" right?`)
    let page = await inbox(alice)
    assert.equal(page.notifications[0]!.kind, 'mention')
    assert.equal(page.notifications[0]!.source, 'comment')
    assert.equal(page.notifications[0]!.threadId, threadId)
    assert.equal(page.notifications[0]!.path, 'main.tex')

    // Alice replies: Bob (who started it) hears about it; replying marks Alice's own notification read.
    await api('POST', `/projects/${projectId}/review/threads/${threadId}/messages`, alice, { content: 'Yes.' })
    assert.equal((await inbox(alice)).unread, 0)
    page = await inbox(bob)
    assert.equal(page.notifications[0]!.kind, 'reply')
    assert.equal(page.notifications[0]!.actor.name, 'Alice')

    // The owner replies mentioning Bob: one mention for Bob, a reply for Alice.
    await api('POST', `/projects/${projectId}/review/threads/${threadId}/messages`, owner, { content: `<@${ids['bob@lab.test']}> agreed` })
    page = await inbox(bob)
    assert.equal(page.unread, 2)
    assert.equal(page.notifications[0]!.kind, 'mention')
    assert.equal((await inbox(alice)).notifications[0]!.kind, 'reply')

    // Deleting the thread deletes its notifications.
    await api('DELETE', `/projects/${projectId}/review/threads/${threadId}`, owner)
    assert.equal((await inbox(bob)).notifications.filter(n => n.threadId).length, 0)
  })

  test('marking read, unread and paging', async () => {
    for (let i = 0; i < 5; i++) await api('POST', `/projects/${projectId}/chat`, owner, { content: `<@${ids['alice@lab.test']}> ${i}` })
    const first = await inbox(alice, '?limit=3&unread=true')
    assert.equal(first.notifications.length, 3)
    assert.equal(first.hasMore, true)
    assert.equal(first.notifications[0]!.excerpt.endsWith(' 4'), true)
    const second = await inbox(alice, `?limit=3&unread=true&before=${first.notifications.at(-1)!.id}`)
    assert.equal(second.notifications.length, 2)
    assert.equal(second.hasMore, false)
    const one = first.notifications[0]!.id
    assert.equal((await api('POST', '/me/notifications/read', alice, { ids: [one] })).json().unread, 4)
    assert.equal((await api('POST', '/me/notifications/read', alice, { ids: [one], read: false })).json().unread, 5)
    // Someone else's notifications are out of reach.
    assert.equal((await api('POST', '/me/notifications/read', bob, { ids: [one] })).json().unread, (await inbox(bob)).unread)
    assert.equal((await inbox(alice)).unread, 5)
    assert.equal((await api('POST', '/me/notifications/read', alice, {})).json().unread, 0)
  })

  test('outsiders can’t mark a project seen, and leaving a project drops its notifications', async () => {
    assert.equal((await api('POST', '/me/notifications/seen', otto, { projectId })).statusCode, 404)
    await api('POST', `/projects/${projectId}/chat`, owner, { content: `<@${ids['bob@lab.test']}> bye` })
    assert.equal((await inbox(bob)).unread, 1)
    await api('DELETE', `/projects/${projectId}/members/${ids['bob@lab.test']}`, bob)
    const page = await inbox(bob)
    assert.equal(page.unread, 0)
    assert.equal(page.notifications.length, 0)
  })

  test('transferring ownership notifies the new owner', async () => {
    await api('POST', `/projects/${projectId}/transfer`, owner, { userId: ids['alice@lab.test'] })
    const n = (await inbox(alice)).notifications[0]!
    assert.equal(n.kind, 'owner')
    assert.equal(n.read, false)
  })

  test('the event stream sends the unread count, then each new notification', async () => {
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    const port = (t.app.server.address() as AddressInfo).port
    const controller = new AbortController()
    const res = await fetch(`http://127.0.0.1:${port}/api/me/notifications/events`, { headers: { cookie: owner }, signal: controller.signal })
    assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8')
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const next = async (): Promise<NotificationEvent> => {
      while (!buffer.includes('\n\n')) buffer += decoder.decode((await reader.read()).value, { stream: true })
      const [chunk, ...rest] = buffer.split('\n\n')
      buffer = rest.join('\n\n')
      return JSON.parse(chunk!.replace(/^data: /, '')) as NotificationEvent
    }
    const initial = await next()
    assert.equal(typeof initial.unread, 'number')
    await api('POST', `/projects/${projectId}/chat`, alice, { content: `<@${ids['owner@lab.test']}> look` })
    const pushed = await next()
    assert.equal(pushed.unread, initial.unread + 1)
    assert.equal(pushed.notification?.kind, 'mention')
    assert.equal(pushed.users?.[ids['owner@lab.test']!], 'Owner')
    controller.abort()
  })

  test('a password reset from the command line is a notification about the account', async () => {
    const before = await inbox(owner)
    await new NotificationService(t.db).passwordReset(ids['owner@lab.test']!)
    const after = await inbox(owner)
    assert.equal(after.unread, before.unread + 1)
    const n = after.notifications[0]!
    assert.equal(n.kind, 'password_reset')
    assert.equal(n.project, null)
    assert.equal(n.actor.id, null)
  })
})

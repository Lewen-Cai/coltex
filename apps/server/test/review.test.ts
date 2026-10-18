import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { TEXT_KEY, applyTrackedEdits, changesMap, commentsMap, relPos } from '@coltex/review'
import type { ReviewState } from '@coltex/shared'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => boolean | Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 25))
  }
}

describe('review: comments and tracked changes', () => {
  let t: TestApp
  let url = ''
  let owner = ''
  let viewer = ''
  let viewerId = ''
  let projectId = ''
  let docId = ''
  const providers: HocuspocusProvider[] = []

  function connect(cookie: string, name: string) {
    const doc = new Y.Doc()
    let synced = false
    const provider = new HocuspocusProvider({ url, name, document: doc, token: cookie, onSynced: () => (synced = true) })
    providers.push(provider)
    return { provider, doc, text: doc.getText(TEXT_KEY), synced: () => synced }
  }

  const api = (cookie: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, payload?: object) =>
    t.app.inject({ method, url: `/api/projects/${projectId}${path}`, headers: { cookie }, payload })
  const state = async (cookie = owner) => (await api(cookie, 'GET', '/review')).json() as ReviewState
  const readFile = async () => (await api(owner, 'GET', '/files/main.tex')).body

  before(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    url = `ws://127.0.0.1:${(t.app.server.address() as AddressInfo).port}/api/collab`
    owner = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Owner', email: 'owner@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: owner }, payload: { email: 'viewer@lab.test' } })
    const accepted = await t.app.inject({
      method: 'POST',
      url: `/api/invites/${invite.json().token}/accept`,
      payload: { name: 'Viewer', email: 'viewer@lab.test', password: 'Correct-horse-2' },
    })
    viewer = cookieFrom(accepted)
    projectId = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: owner }, payload: { name: 'P' } })).json().id
    viewerId = (await api(owner, 'POST', '/members', { email: 'viewer@lab.test', role: 'viewer' })).json().userId
    await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/main.tex`,
      headers: { cookie: owner, 'content-type': 'text/plain' },
      payload: 'The cat sat on the mat.\n',
    })
    docId = (await api(owner, 'GET', '/docs/resolve?path=main.tex')).json().docId
  })

  after(async () => {
    for (const p of providers) p.destroy()
    await t?.close()
  })

  test('tracked edits made by a client show up in the review state', async () => {
    const c = connect(owner, `${projectId}/${docId}`)
    await waitFor(c.synced, 'sync')
    assert.equal(c.text.toString(), 'The cat sat on the mat.\n')
    // What the editor does for a tracked replacement of "cat" with "dog".
    applyTrackedEdits(c.doc, [{ fromA: 4, toA: 7, insert: 'dog' }], 'owner-id', Date.now())
    await waitFor(async () => (await state()).changes.length === 2, 'changes on the server')
    const s = await state()
    assert.deepEqual(
      s.changes.map(ch => [ch.type, ch.text, ch.line, ch.path]),
      [
        ['delete', 'cat', 1, 'main.tex'],
        ['insert', 'dog', 1, 'main.tex'],
      ],
    )
    // The file holds the proposal.
    await waitFor(async () => (await readFile()) === 'The dog sat on the mat.\n', 'disk write')
  })

  test('viewers can comment and reply but not decide on changes or toggle tracking', async () => {
    const c = connect(viewer, `${projectId}/${docId}`)
    await waitFor(c.synced, 'viewer sync')
    const start = relPos(c.text, 15, 0)
    const end = relPos(c.text, 22, -1)
    const created = await api(viewer, 'POST', '/review/threads', { docId, start, end, content: 'Which mat?' })
    assert.equal(created.statusCode, 201)
    const threadId = created.json().id
    // The anchor reaches every client through the document.
    await waitFor(() => commentsMap(c.doc).has(threadId), 'anchor sync')

    assert.equal((await api(owner, 'POST', `/review/threads/${threadId}/messages`, { content: 'The red one.' })).statusCode, 200)
    const s = await state(viewer)
    const thread = s.threads.find(th => th.id === threadId)!
    assert.equal(thread.quote, 'the mat')
    assert.equal(thread.line, 1)
    assert.deepEqual(thread.messages.map(m => [m.name, m.content]), [
      ['Viewer', 'Which mat?'],
      ['Owner', 'The red one.'],
    ])

    assert.equal((await api(viewer, 'POST', '/review/changes/accept', {})).statusCode, 403)
    assert.equal((await api(viewer, 'PUT', '/review/track-changes', { everyone: true, users: [] })).statusCode, 403)
    // Only the author edits a message.
    const ownerMsg = thread.messages[1]!.id
    assert.equal((await api(viewer, 'PATCH', `/review/threads/${threadId}/messages/${ownerMsg}`, { content: 'x' })).statusCode, 403)
    // Owners may resolve anyone's thread.
    assert.equal((await api(owner, 'POST', `/review/threads/${threadId}/resolve`, { resolved: true })).statusCode, 200)
    assert.equal((await state()).threads.find(th => th.id === threadId)!.resolved?.name, 'Owner')
  })

  test('invalid anchors are rejected without creating a thread', async () => {
    const bogus = { type: { client: 999999, clock: 0 }, tname: null, item: { client: 999999, clock: 12345 }, assoc: 0 }
    const res = await api(owner, 'POST', '/review/threads', { docId, start: bogus, end: bogus, content: 'hm' })
    assert.equal(res.statusCode, 400)
    const other = await api(owner, 'POST', '/review/threads', { docId: 'nope', start: bogus, end: bogus, content: 'hm' })
    assert.equal(other.statusCode, 404)
  })

  test('rejecting restores the text; accepting keeps it', async () => {
    const s = await state()
    const del = s.changes.find(ch => ch.type === 'delete')!
    const ins = s.changes.find(ch => ch.type === 'insert')!
    const proposed = await readFile()
    const rejected = (await api(owner, 'POST', '/review/changes/reject', { docId, ids: [ins.id, del.id] })).json()
    assert.equal(rejected.count, 2)
    await waitFor(async () => (await readFile()) === 'The cat sat on the mat.\n', 'rejected text on disk')
    assert.equal((await state()).changes.length, 0)

    // A decision made by mistake can be taken back, once, by whoever made it.
    assert.equal((await api(viewer, 'POST', '/review/changes/undo', { undoId: rejected.undoId })).statusCode, 403)
    assert.equal((await api(owner, 'POST', '/review/changes/undo', { undoId: rejected.undoId })).json().count, 2)
    await waitFor(async () => (await readFile()) === proposed, 'the suggestions are back')
    assert.deepEqual((await state()).changes.map(ch => ch.type).sort(), ['delete', 'insert'])
    assert.equal((await api(owner, 'POST', '/review/changes/undo', { undoId: rejected.undoId })).statusCode, 404)
    await api(owner, 'POST', '/review/changes/reject', {})
    await waitFor(async () => (await readFile()) === 'The cat sat on the mat.\n', 'rejected again')
  })

  test('bulk accept clears every change in the project', async () => {
    const c = connect(owner, `${projectId}/${docId}`)
    await waitFor(c.synced, 'sync')
    applyTrackedEdits(c.doc, [{ fromA: 0, toA: 0, insert: 'Hey. ' }], 'owner-id', Date.now())
    await waitFor(async () => (await state()).changes.length === 1, 'change on the server')
    assert.equal((await api(owner, 'POST', '/review/changes/accept', {})).json().count, 1)
    await waitFor(() => changesMap(c.doc).size === 0, 'accept reaches clients')
    assert.equal(c.text.toString(), 'Hey. The cat sat on the mat.\n')
  })

  test('track changes can be switched for everyone or per user', async () => {
    const res = await api(owner, 'PUT', '/review/track-changes', { everyone: false, users: [viewerId, viewerId] })
    assert.deepEqual(res.json(), { everyone: false, users: [viewerId] })
    assert.deepEqual((await state()).trackChanges, { everyone: false, users: [viewerId] })
  })

  test('reviewers can only suggest: tracked edits sync, untracked ones are refused', async () => {
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: owner }, payload: { email: 'rev@lab.test' } })
    const reviewer = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'Rev', email: 'rev@lab.test', password: 'Correct-horse-3' },
      }),
    )
    const revId = (await api(owner, 'POST', '/members', { email: 'rev@lab.test', role: 'reviewer' })).json().userId
    const watcher = connect(owner, `${projectId}/${docId}`)
    await waitFor(watcher.synced, 'owner sync')

    const c = connect(reviewer, `${projectId}/${docId}`)
    let closedWith = ''
    c.provider.on('close', ({ event }: { event: { reason: string } }) => (closedWith = event.reason))
    await waitFor(c.synced, 'reviewer sync')
    const start = c.text.toString()
    applyTrackedEdits(c.doc, [{ fromA: 0, toA: 0, insert: 'Note: ' }], revId, Date.now())
    await waitFor(() => watcher.text.toString() === `Note: ${start}`, 'tracked suggestion reaches others')

    // Reviewers withdraw their own suggestions, not other people's.
    const mine = (await state()).changes.find(ch => ch.userId === revId)!
    applyTrackedEdits(watcher.doc, [{ fromA: watcher.text.length, toA: watcher.text.length, insert: 'End.' }], 'owner-id', Date.now())
    await waitFor(async () => (await state()).changes.length === 2, 'owner suggestion on the server')
    const theirs = (await state()).changes.find(ch => ch.userId === 'owner-id')!
    assert.equal((await api(reviewer, 'POST', '/review/changes/reject', { docId, ids: [theirs.id] })).statusCode, 403)
    assert.equal((await api(reviewer, 'POST', '/review/changes/reject', { docId, ids: [mine.id] })).json().count, 1)
    await waitFor(() => watcher.text.toString() === `${start}End.`, 'withdrawn suggestion leaves the text')
    applyTrackedEdits(c.doc, [{ fromA: 0, toA: 0, insert: 'Note: ' }], revId, Date.now())
    await waitFor(() => watcher.text.toString() === `Note: ${start}End.`, 'suggestion again')

    // Plain typing is refused and the connection is reset.
    c.text.insert(0, 'X')
    await waitFor(() => closedWith.startsWith('coltex/suggestion-refused'), 'connection closed for an untracked edit')
    await new Promise(r => setTimeout(r, 200))
    assert.equal(watcher.text.toString(), `Note: ${start}End.`)
    // Reviewers can't decide on changes either.
    assert.equal((await api(reviewer, 'POST', '/review/changes/accept', {})).statusCode, 403)
    // Clean up: drop the suggestion so later tests start from the plain text.
    await api(owner, 'POST', '/review/changes/reject', {})
  })

  test('deleting the file deletes its comment threads', async () => {
    assert.ok((await state()).threads.length > 0)
    assert.ok((await api(owner, 'DELETE', '/files/main.tex')).statusCode < 300)
    assert.equal((await state()).threads.length, 0)
  })
})

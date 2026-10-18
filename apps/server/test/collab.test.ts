import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => boolean | Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 25))
  }
}

describe('real-time collaboration', () => {
  let t: TestApp
  let url = ''
  let ownerCookie = ''
  let viewerCookie = ''
  let projectId = ''
  let docId = ''
  const providers: HocuspocusProvider[] = []

  /** Connect a client; `cookie` is passed as the token (Node's WebSocket cannot set headers). */
  function connect(cookie: string, name: string, doc = new Y.Doc()) {
    let authFailed = ''
    const provider = new HocuspocusProvider({
      url,
      name,
      document: doc,
      token: cookie || 'cookie',
      onAuthenticationFailed: ({ reason }) => {
        authFailed = reason
      },
    })
    providers.push(provider)
    return { provider, doc, text: doc.getText('content'), authFailed: () => authFailed }
  }

  const readFile = async (path: string) =>
    (await t.app.inject({ url: `/api/projects/${projectId}/files/${path}`, headers: { cookie: ownerCookie } })).body

  before(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    url = `ws://127.0.0.1:${(t.app.server.address() as AddressInfo).port}/api/collab`

    ownerCookie = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: '/api/setup',
        payload: { name: 'Owner', email: 'owner@lab.test', password: 'Correct-horse-1' },
      }),
    )
    const invite = await t.app.inject({
      method: 'POST',
      url: '/api/admin/invites',
      headers: { cookie: ownerCookie },
      payload: { email: 'viewer@lab.test' },
    })
    viewerCookie = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'Viewer', email: 'viewer@lab.test', password: 'Correct-horse-2' },
      }),
    )
    projectId = (
      await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: ownerCookie }, payload: { name: 'P' } })
    ).json().id
    await t.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: ownerCookie },
      payload: { email: 'viewer@lab.test', role: 'viewer' },
    })
    docId = (
      await t.app.inject({ url: `/api/projects/${projectId}/docs/resolve?path=main.tex`, headers: { cookie: ownerCookie } })
    ).json().docId
  })

  after(async () => {
    for (const p of providers) p.destroy()
    await t?.close()
  })

  test('edits sync between clients and reach the file on disk', async () => {
    const a = connect(ownerCookie, `${projectId}/${docId}`)
    const b = connect(ownerCookie, `${projectId}/${docId}`)
    await waitFor(() => a.provider.isSynced && b.provider.isSynced, 'initial sync')
    assert.match(a.text.toString(), /\\documentclass\{article\}/, 'loaded from disk')

    a.text.insert(0, '% hello from A\n')
    await waitFor(() => b.text.toString().startsWith('% hello from A'), 'B to see A')
    await waitFor(async () => (await readFile('main.tex')).startsWith('% hello from A'), 'debounced write to disk')
    a.provider.destroy()
    b.provider.destroy()
  })

  test('compiling flushes unsaved edits first', async () => {
    const a = connect(ownerCookie, `${projectId}/${docId}`)
    await waitFor(() => a.provider.isSynced, 'sync')
    a.text.insert(0, '% just typed\n')
    await waitFor(() => a.provider.unsyncedChanges === 0, 'server ack')
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/compile`,
      headers: { cookie: ownerCookie },
      payload: {},
    })
    assert.equal(res.statusCode, 200)
    assert.ok((await readFile('main.tex')).startsWith('% just typed'), 'disk had the edit at compile time')
    a.provider.destroy()
  })

  test('viewers follow along but cannot change the document', async () => {
    const owner = connect(ownerCookie, `${projectId}/${docId}`)
    const viewer = connect(viewerCookie, `${projectId}/${docId}`)
    await waitFor(() => owner.provider.isSynced && viewer.provider.isSynced, 'sync')
    owner.text.insert(0, '% owner line\n')
    await waitFor(() => viewer.text.toString().startsWith('% owner line'), 'viewer to receive edits')
    viewer.text.insert(0, '% viewer was here\n')
    await new Promise(r => setTimeout(r, 300))
    assert.ok(!owner.text.toString().includes('viewer was here'), 'server rejected the viewer update')
    owner.provider.destroy()
    viewer.provider.destroy()
  })

  test('API writes merge into open documents as edits', async () => {
    const a = connect(ownerCookie, `${projectId}/${docId}`)
    await waitFor(() => a.provider.isSynced, 'sync')
    const current = a.text.toString()
    const res = await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/main.tex`,
      headers: { cookie: ownerCookie, 'content-type': 'text/plain' },
      payload: `${current}% appended by upload\n`,
    })
    assert.equal(res.statusCode, 204)
    await waitFor(() => a.text.toString().endsWith('% appended by upload\n'), 'client to receive API write')
    a.provider.destroy()
  })

  test('reconnecting after the file changed on disk does not duplicate text', async () => {
    const doc = new Y.Doc()
    let a = connect(ownerCookie, `${projectId}/${docId}`, doc)
    await waitFor(() => a.provider.isSynced, 'sync')
    const before = a.text.toString()
    a.provider.destroy()
    // Let the server persist and unload the document.
    await waitFor(() => !t.collab.hocuspocus.documents.has(`${projectId}/${docId}`), 'document unload')

    // Change the file while nobody has it open.
    await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/main.tex`,
      headers: { cookie: ownerCookie, 'content-type': 'text/plain' },
      payload: `% changed offline\n${before}`,
    })

    // The old client comes back with its stale state…
    a = connect(ownerCookie, `${projectId}/${docId}`, doc)
    // …and a fresh one joins.
    const fresh = connect(ownerCookie, `${projectId}/${docId}`)
    await waitFor(() => a.provider.isSynced && fresh.provider.isSynced, 'resync')
    await waitFor(() => a.text.toString() === fresh.text.toString(), 'convergence')
    assert.equal(a.text.toString(), `% changed offline\n${before}`)
    assert.equal(a.text.toString().split('\\documentclass').length - 1, 1, 'no duplicated content')
    a.provider.destroy()
    fresh.provider.destroy()
  })

  test('moving an open file keeps the session and never resurrects the old path', async () => {
    const a = connect(ownerCookie, `${projectId}/${docId}`)
    await waitFor(() => a.provider.isSynced, 'sync')
    a.text.insert(0, '% before move\n')
    const moved = await t.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/move`,
      headers: { cookie: ownerCookie },
      payload: { from: 'main.tex', to: 'paper/main.tex' },
    })
    assert.equal(moved.statusCode, 204)
    a.text.insert(0, '% after move\n')
    await waitFor(async () => (await readFile('paper/main.tex')).startsWith('% after move'), 'write to new path')
    await new Promise(r => setTimeout(r, 300))
    const tree = (await t.app.inject({ url: `/api/projects/${projectId}`, headers: { cookie: ownerCookie } })).json()
    assert.ok(!tree.files.some((f: { path: string }) => f.path === 'main.tex'), 'old path was not recreated')
    assert.deepEqual(tree.docs, [{ id: docId, path: 'paper/main.tex' }])
    a.provider.destroy()
  })

  test('connections without a session are refused', async () => {
    const anon = connect('', `${projectId}/${docId}`)
    await waitFor(() => anon.authFailed() !== '', 'authentication failure')
    assert.ok(!anon.provider.isSynced)
    anon.provider.destroy()
  })
})

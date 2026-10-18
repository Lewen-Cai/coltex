import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { HocuspocusProvider } from '@hocuspocus/provider'
import yauzl from 'yauzl'
import * as Y from 'yjs'
import type { HistoryPage, HistoryVersion } from '@coltex/shared'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => boolean | Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 25))
  }
}

function zipEntries(buf: Buffer): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err)
      const out = new Map<string, string>()
      zip.on('entry', entry => {
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e)
          const chunks: Buffer[] = []
          stream.on('data', c => chunks.push(c))
          stream.on('end', () => {
            out.set(entry.fileName, Buffer.concat(chunks).toString())
            zip.readEntry()
          })
        })
      })
      zip.on('end', () => resolve(out))
      zip.readEntry()
    })
  })
}

describe('version history', () => {
  let t: TestApp
  let owner = ''
  let editor = ''
  let viewer = ''
  let projectId = ''
  const providers: HocuspocusProvider[] = []

  const api = (method: string, url: string, cookie: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url: `/api/projects/${projectId}${url}`, headers: { cookie }, payload: payload as object })
  const put = (path: string, body: string | Buffer, cookie = owner) =>
    t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/${path}`,
      headers: { cookie, 'content-type': typeof body === 'string' ? 'text/plain' : 'application/octet-stream' },
      payload: body,
    })
  const read = async (path: string) => (await api('GET', `/files/${path}`, owner)).body
  const versions = async (): Promise<HistoryVersion[]> => ((await api('GET', '/history', owner)).json() as HistoryPage).versions
  const fileAt = async (version: string, path: string) =>
    (await api('GET', `/history/${version}/file?path=${encodeURIComponent(path)}`, owner)).json()

  before(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    owner = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Olivia', email: 'owner@lab.test', password: 'Correct-horse-1' } }),
    )
    for (const [email, name] of [['editor@lab.test', 'Erin'], ['viewer@lab.test', 'Victor']] as const) {
      const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: owner }, payload: { email } })
      const cookie = cookieFrom(
        await t.app.inject({
          method: 'POST',
          url: `/api/invites/${invite.json().token}/accept`,
          payload: { name, email, password: 'Correct-horse-2' },
        }),
      )
      if (name === 'Erin') editor = cookie
      else viewer = cookie
    }
    projectId = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: owner }, payload: { name: 'Thesis' } })).json().id
    await api('POST', '/members', owner, { email: 'editor@lab.test', role: 'editor' })
    await api('POST', '/members', owner, { email: 'viewer@lab.test', role: 'viewer' })
  })

  after(async () => {
    for (const p of providers) p.destroy()
    await t?.close()
  })

  test('creating a project records its first version', async () => {
    const list = await versions()
    assert.equal(list.length, 1)
    const [first] = list
    assert.equal(first!.kind, 'create')
    assert.deepEqual(first!.authors.map(a => a.name), ['Olivia'])
    assert.deepEqual(first!.changes, [{ status: 'added', path: 'main.tex' }])
  })

  test('edits become a version after a pause, with everyone who edited as authors', async () => {
    const before = (await versions()).length
    // Owner edits through the API; the editor types through real-time collaboration.
    const main = await read('main.tex')
    await put('main.tex', main.replace('Hello, ColTex!', 'Hello from Olivia.'))
    const docId = (await api('GET', '/docs/resolve?path=main.tex', editor)).json().docId
    const url = `ws://127.0.0.1:${(t.app.server.address() as AddressInfo).port}/api/collab`
    const doc = new Y.Doc()
    const provider = new HocuspocusProvider({ url, name: `${projectId}/${docId}`, document: doc, token: editor })
    providers.push(provider)
    await waitFor(() => provider.isSynced, 'sync')
    doc.getText('content').insert(0, '% Erin was here\n')

    // Recorded on its own once editing pauses (150 ms in tests).
    await waitFor(
      async () => (await t.snapshots.log(projectId, { limit: 10 })).versions.length === before + 1,
      'automatic version',
    )
    const [latest] = await versions()
    assert.equal(latest!.kind, 'edit')
    assert.deepEqual(latest!.authors.map(a => a.name).sort(), ['Erin', 'Olivia'])
    assert.deepEqual(latest!.changes, [{ status: 'modified', path: 'main.tex' }])
    const text = (await fileAt(latest!.id, 'main.tex')).text as string
    assert.ok(text.startsWith('% Erin was here') && text.includes('Hello from Olivia.'))
    provider.destroy()
  })

  test('opening history records unsaved changes, and unchanged states add nothing', async () => {
    await put('notes.tex', 'Draft notes\n')
    const list = await versions() // checkpoints immediately
    assert.deepEqual(list[0]!.changes, [{ status: 'added', path: 'notes.tex' }])
    assert.equal((await versions()).length, list.length, 'no empty versions')
  })

  test('uploads, moves and deletes show up as file changes', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    await put('fig/plot.png', png)
    await api('POST', '/move', owner, { from: 'notes.tex', to: 'sec/notes.tex' })
    await versions()
    await api('DELETE', '/files/sec/notes.tex', owner)
    const [deleted, moved] = await versions()
    assert.deepEqual(deleted!.changes, [{ status: 'deleted', path: 'sec/notes.tex' }])
    assert.deepEqual(
      moved!.changes.sort((a, b) => a.path.localeCompare(b.path)),
      [
        { status: 'added', path: 'fig/plot.png' },
        { status: 'renamed', path: 'sec/notes.tex', from: 'notes.tex' },
      ],
    )
    const raw = await api('GET', `/history/${moved!.id}/raw?path=fig/plot.png`, viewer)
    assert.equal(raw.statusCode, 200)
    assert.deepEqual(raw.rawPayload, png)
    // Unchanged binary files are carried into later versions intact (blob reuse).
    await put('main.tex', `${await read('main.tex')}% more\n`)
    const [latest] = await versions()
    assert.deepEqual((await api('GET', `/history/${latest!.id}/raw?path=fig/plot.png`, owner)).rawPayload, png)
  })

  test('comparing two versions lists what changed between them', async () => {
    const list = await versions()
    const oldest = list.at(-1)!
    const res = await api('GET', `/history/${list[0]!.id}/compare?from=${oldest.id}`, viewer)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(
      res.json().changes.map((c: { status: string; path: string }) => `${c.status} ${c.path}`).sort(),
      ['added fig/plot.png', 'modified main.tex'],
    )
    const own = await api('GET', `/history/${list[0]!.id}/compare`, viewer)
    assert.deepEqual(own.json().changes, [{ status: 'modified', path: 'main.tex' }])
    assert.equal((await fileAt(oldest.id, 'fig/plot.png')).exists, false)
  })

  test('restoring one file brings back its old content as a new version', async () => {
    const list = await versions()
    const created = list.at(-1)!
    await put('main.tex', 'broken\n')
    const res = await api('POST', `/history/${created.id}/restore`, editor, { paths: ['main.tex'] })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(await read('main.tex'), (await fileAt(created.id, 'main.tex')).text)
    const [restore, beforeRestore] = await versions()
    assert.equal(restore!.kind, 'restore')
    assert.equal(restore!.restoredFrom, created.id)
    assert.deepEqual(restore!.authors.map(a => a.name), ['Erin'])
    assert.equal((await fileAt(beforeRestore!.id, 'main.tex')).text, 'broken\n', 'the state before the restore was kept')
  })

  test('restoring the whole project removes newer files and brings back deleted ones', async () => {
    const list = await versions()
    const withNotes = list.find(v => v.changes.some(c => c.status === 'added' && c.path === 'notes.tex'))!
    await put('extra.tex', 'added later\n')
    const res = await api('POST', `/history/${withNotes.id}/restore`, owner, {})
    assert.equal(res.statusCode, 200, res.body)
    const tree = (await api('GET', '', owner)).json()
    assert.deepEqual(
      tree.files.map((f: { path: string }) => f.path),
      ['main.tex', 'notes.tex'],
    )
  })

  test('labels name versions; viewers can browse but not change history', async () => {
    const saved = await api('POST', '/history/labels', editor, { name: 'Sent to supervisor' })
    assert.equal(saved.statusCode, 201, saved.body)
    const [latest] = await versions()
    assert.deepEqual(latest!.labels.map(l => l.name), ['Sent to supervisor'])

    assert.equal((await api('POST', '/history/labels', viewer, { name: 'nope' })).statusCode, 403)
    assert.equal((await api('POST', `/history/${latest!.id}/restore`, viewer, {})).statusCode, 403)
    assert.equal((await api('GET', '/history', viewer)).statusCode, 200)

    assert.equal((await api('DELETE', `/history/labels/${saved.json().id}`, owner)).statusCode, 204)
    assert.deepEqual((await versions())[0]!.labels, [])
  })

  test('a version can be saved by hand with a message; with nothing new the message labels the latest', async () => {
    await put('paper.tex', 'one\ntwo\nthree\nfour\nfive\n')
    const res = await api('POST', '/history/commit', editor, { message: 'First full draft' })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().created, true)
    const [latest] = await versions()
    assert.equal(latest!.kind, 'commit')
    assert.equal(latest!.message, 'First full draft')
    assert.deepEqual(latest!.authors.map(a => a.name), ['Olivia'], 'authors are who edited, not who saved')

    const again = await api('POST', '/history/commit', editor, { message: 'Same state' })
    assert.equal(again.json().created, false)
    const [same] = await versions()
    assert.equal(same!.id, latest!.id)
    assert.deepEqual(same!.labels.map(l => l.name), ['Same state'])
    assert.equal((await api('POST', '/history/commit', viewer, { message: 'nope' })).statusCode, 403)
  })

  test('reverting a version undoes only its changes and keeps later edits', async () => {
    // Version A: "one" → "ONE" and an added file; version B, later: "five" → "FIVE".
    await put('paper.tex', 'ONE\ntwo\nthree\nfour\nfive\n')
    await put('appendix.tex', 'appendix\n')
    const [a] = await versions()
    await put('paper.tex', 'ONE\ntwo\nthree\nfour\nFIVE\n')
    await versions()

    const res = await api('POST', `/history/${a!.id}/revert`, editor)
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(await read('paper.tex'), 'one\ntwo\nthree\nfour\nFIVE\n')
    const tree = (await api('GET', '', owner)).json()
    assert.ok(!tree.files.some((f: { path: string }) => f.path === 'appendix.tex'), 'the file it added is gone')
    const [revert] = await versions()
    assert.equal(revert!.kind, 'revert')
    assert.equal(revert!.revertOf, a!.id)
    assert.deepEqual(revert!.authors.map(x => x.name), ['Erin'])

    // Reverting it again: its changes are already undone.
    assert.equal((await api('POST', `/history/${a!.id}/revert`, editor)).statusCode, 400)
  })

  test('a revert that clashes with later edits changes nothing', async () => {
    await put('paper.tex', 'one\ntwo\nTHREE\nfour\nFIVE\n')
    const [v] = await versions()
    await put('paper.tex', 'one\ntwo\nthree, rewritten\nfour\nFIVE\n')
    const res = await api('POST', `/history/${v!.id}/revert`, editor)
    assert.equal(res.statusCode, 409, res.body)
    assert.match(res.json().error, /paper\.tex/)
    assert.equal(await read('paper.tex'), 'one\ntwo\nthree, rewritten\nfour\nFIVE\n')
    const first = (await versions()).at(-1)!
    assert.equal((await api('POST', `/history/${first.id}/revert`, viewer)).statusCode, 403)
  })

  test('any version downloads as a zip', async () => {
    const created = (await versions()).at(-1)!
    const res = await api('GET', `/history/${created.id}/download.zip`, viewer)
    assert.equal(res.statusCode, 200)
    assert.match(String(res.headers['content-disposition']), /Thesis/)
    const entries = await zipEntries(res.rawPayload)
    assert.deepEqual([...entries.keys()], ['main.tex'])
  })

  test('history pages backwards', async () => {
    const all = await versions()
    const first = (await api('GET', '/history?limit=2', owner)).json() as HistoryPage
    assert.equal(first.versions.length, 2)
    assert.equal(first.more, true)
    const next = (await api('GET', `/history?limit=50&before=${first.versions[1]!.id}`, owner)).json() as HistoryPage
    assert.deepEqual(
      [...first.versions, ...next.versions].map(v => v.id),
      all.map(v => v.id),
    )
    assert.equal(next.more, false)
  })

  test('unknown versions are 404 and other projects are hidden', async () => {
    assert.equal((await api('GET', `/history/${'a'.repeat(40)}`, owner)).statusCode, 404)
    const other = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: editor }, payload: { name: 'Other' } })).json().id
    const res = await t.app.inject({ url: `/api/projects/${other}/history`, headers: { cookie: viewer } })
    assert.equal(res.statusCode, 404)
  })
})

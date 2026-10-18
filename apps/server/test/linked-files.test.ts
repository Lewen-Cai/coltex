import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fetchPublicUrl, isPublicAddress } from '../src/projects/url-fetch.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('linked files', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let id = ''
  let other = ''

  const api = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown, type?: string) =>
    t.app.inject({
      method,
      url: `/api${url}`,
      headers: { cookie, ...(type ? { 'content-type': type } : {}) },
      ...(payload === undefined ? {} : { payload: payload as string }),
    })
  const read = async (p: string, project = id) => {
    await t.collab.flushProject(project)
    const res = await api('GET', `/projects/${project}/files/${p}`, admin)
    return res.statusCode === 200 ? res.rawPayload : undefined
  }

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const { token } = (await api('POST', '/admin/invites', admin, { email: 'bob@lab.test' })).json()
    bob = cookieFrom(await t.app.inject({ method: 'POST', url: `/api/invites/${token}/accept`, payload: { name: 'Bob', email: 'bob@lab.test', password: 'Bob-password-1' } }))
    id = (await api('POST', '/projects', admin, { name: 'Paper' })).json().id
    other = (await api('POST', '/projects', admin, { name: 'Figures' })).json().id
    await api('PUT', `/projects/${other}/files/plots/a.png`, admin, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]), 'application/octet-stream')
    await api('POST', `/projects/${id}/members`, admin, { email: 'bob@lab.test', role: 'editor' })
  })
  after(async () => {
    await t?.close()
  })

  test('from a URL: added, listed, refreshed, follows moves, forgotten on delete', async () => {
    let body = 'one'
    t.linkedFakes.url = async url => ({ data: Buffer.from(`${url}:${body}`), url })
    const created = await api('POST', `/projects/${id}/linked-files`, bob, { path: 'data/table.csv', source: { kind: 'url', url: 'https://example.org/t.csv' } })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().linkedBy, 'Bob')
    assert.equal((await read('data/table.csv'))!.toString(), 'https://example.org/t.csv:one')

    body = 'two'
    const refreshed = await api('POST', `/projects/${id}/linked-files/refresh`, admin, { path: 'data/table.csv' })
    assert.equal(refreshed.statusCode, 200)
    assert.equal((await read('data/table.csv'))!.toString(), 'https://example.org/t.csv:two')

    assert.equal((await api('POST', `/projects/${id}/move`, admin, { from: 'data', to: 'inputs' })).statusCode, 204)
    assert.deepEqual((await api('GET', `/projects/${id}/linked-files`, bob)).json().map((l: { path: string }) => l.path), ['inputs/table.csv'])
    assert.equal((await api('DELETE', `/projects/${id}/files/inputs/table.csv`, admin)).statusCode, 204)
    assert.deepEqual((await api('GET', `/projects/${id}/linked-files`, bob)).json(), [])
    assert.equal((await api('POST', `/projects/${id}/linked-files/refresh`, admin, { path: 'inputs/table.csv' })).statusCode, 404)
  })

  test('from another project: needs access to it, and refreshes from its current file', async () => {
    const source = { kind: 'project_file', projectId: other, path: 'plots/a.png' }
    // Bob isn't a member of the other project: it doesn't exist for him.
    assert.equal((await api('POST', `/projects/${id}/linked-files`, bob, { path: 'a.png', source })).statusCode, 404)
    const linked = (await api('POST', `/projects/${id}/linked-files`, admin, { path: 'a.png', source })).json()
    assert.deepEqual([linked.kind, linked.sourceProjectName, linked.sourcePath], ['project_file', 'Figures', 'plots/a.png'])
    assert.deepEqual([...(await read('a.png'))!], [0x89, 0x50, 0x4e, 0x47, 1])
    await api('PUT', `/projects/${other}/files/plots/a.png`, admin, Buffer.from([0x89, 0x50, 0x4e, 0x47, 2]), 'application/octet-stream')
    // Refreshing as Bob needs his own access to the source.
    assert.equal((await api('POST', `/projects/${id}/linked-files/refresh`, bob, { path: 'a.png' })).statusCode, 404)
    assert.equal((await api('POST', `/projects/${id}/linked-files/refresh`, admin, { path: 'a.png' })).statusCode, 200)
    assert.deepEqual([...(await read('a.png'))!], [0x89, 0x50, 0x4e, 0x47, 2])
    // Not from the project itself.
    assert.equal(
      (await api('POST', `/projects/${id}/linked-files`, admin, { path: 'b.tex', source: { kind: 'project_file', projectId: id, path: 'main.tex' } })).statusCode,
      400,
    )
  })

  test("another project's PDF: built, then copied", async () => {
    // The fake compiler writes a PDF where the worker would.
    t.compiler.result = job => {
      const dir = path.join(t.outputsDir, job.projectId, job.buildId)
      mkdirSync(dir, { recursive: true })
      writeFileSync(path.join(dir, 'output.pdf'), `%PDF ${job.projectId}`)
      return { buildId: job.buildId, status: 'success', outputFiles: ['output.pdf'], diagnostics: [], durationMs: 1 }
    }
    const res = await api('POST', `/projects/${id}/linked-files`, admin, { path: 'figures/other.pdf', source: { kind: 'project_output', projectId: other } })
    assert.equal(res.statusCode, 201, res.body)
    assert.equal((await read('figures/other.pdf'))!.toString(), `%PDF ${other}`)
    assert.ok(t.compiled.includes(other))

    t.compiler.result = job => ({ buildId: job.buildId, status: 'failure', outputFiles: ['output.log'], diagnostics: [], durationMs: 1 })
    const failed = await api('POST', `/projects/${id}/linked-files/refresh`, admin, { path: 'figures/other.pdf' })
    assert.equal(failed.statusCode, 400)
    assert.match(failed.json().error, /did not produce a PDF/)
  })

  test('viewers cannot add or refresh', async () => {
    const bobId = (await api('GET', '/auth/get-session', bob)).json().user.id
    assert.equal((await api('PATCH', `/projects/${id}/members/${bobId}`, admin, { role: 'viewer' })).statusCode, 204)
    const res = await api('POST', `/projects/${id}/linked-files`, bob, { path: 'x.csv', source: { kind: 'url', url: 'https://example.org/x' } })
    assert.equal(res.statusCode, 403)
    assert.equal((await api('POST', `/projects/${id}/linked-files/refresh`, bob, { path: 'a.png' })).statusCode, 403)
  })
})

describe('fetching linked URLs', () => {
  test('only public addresses count as public', () => {
    for (const a of ['127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
      assert.equal(isPublicAddress(a), false, a)
    }
    for (const a of ['93.184.216.34', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) assert.equal(isPublicAddress(a), true, a)
    assert.equal(isPublicAddress('not-an-ip'), false)
  })

  test('local servers, other schemes and credentials are refused', async () => {
    const server = http.createServer((_req, res) => res.end('secret'))
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as { port: number }
    try {
      await assert.rejects(fetchPublicUrl(`http://127.0.0.1:${port}/`), /private or local/)
      // A name that resolves to a local address is caught at the connection.
      await assert.rejects(fetchPublicUrl(`http://localhost:${port}/`), /private or local/)
      await assert.rejects(fetchPublicUrl(`http://[::1]:${port}/`), /private or local/)
      await assert.rejects(fetchPublicUrl('file:///etc/passwd'), /Only http and https/)
      await assert.rejects(fetchPublicUrl('https://user:pw@example.org/'), /user name or password/)
      await assert.rejects(fetchPublicUrl('nonsense'), /not a valid URL/)
    } finally {
      server.close()
    }
  })
})

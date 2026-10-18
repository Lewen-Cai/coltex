import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('file tree operations', () => {
  let t: TestApp
  let cookie = ''
  let id = ''

  const call = (method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: unknown, contentType?: string) =>
    t.app.inject({
      method,
      url: `/api/projects/${id}${url}`,
      headers: { cookie, ...(contentType ? { 'content-type': contentType } : {}) },
      payload: payload as string,
    })
  const tree = async () => (await call('GET', '')).json() as { files: { path: string }[]; folders: string[]; project: { rootFile: string } }

  before(async () => {
    t = await createTestApp()
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' },
    })
    cookie = cookieFrom(res)
    id = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie }, payload: { name: 'P' } })).json().id
  })
  after(async () => {
    await t?.close()
  })

  test('folders, including empty ones, are listed', async () => {
    assert.equal((await call('POST', '/folders', { path: 'chapters' })).statusCode, 201)
    assert.equal((await call('POST', '/folders', { path: 'figures/plots' })).statusCode, 201)
    assert.equal((await call('POST', '/folders', { path: 'chapters' })).statusCode, 409)
    const { folders } = await tree()
    assert.deepEqual(folders, ['chapters', 'figures', 'figures/plots'])
  })

  test('create-only writes refuse to overwrite', async () => {
    assert.equal((await call('PUT', '/files/chapters/intro.tex?create=true', 'a', 'text/plain')).statusCode, 204)
    assert.equal((await call('PUT', '/files/chapters/intro.tex?create=true', 'b', 'text/plain')).statusCode, 409)
    assert.equal((await call('GET', '/files/chapters/intro.tex')).body, 'a')
    // A file cannot be created where a folder is, nor inside a file.
    assert.equal((await call('PUT', '/files/chapters', 'x', 'text/plain')).statusCode, 409)
    assert.equal((await call('PUT', '/files/main.tex/x.tex', 'x', 'text/plain')).statusCode, 409)
  })

  test('moves never overwrite and cannot nest a folder in itself', async () => {
    assert.equal((await call('POST', '/move', { from: 'chapters/intro.tex', to: 'main.tex' })).statusCode, 409)
    assert.equal((await call('POST', '/move', { from: 'figures', to: 'figures/plots/x' })).statusCode, 400)
    assert.equal((await call('POST', '/move', { from: 'missing.tex', to: 'x.tex' })).statusCode, 404)
    assert.equal((await call('POST', '/move', { from: 'chapters/intro.tex', to: 'figures/intro.tex' })).statusCode, 204)
    const { files } = await tree()
    assert.ok(files.some(f => f.path === 'figures/intro.tex'))
    assert.ok(!files.some(f => f.path === 'chapters/intro.tex'))
  })

  test('the main document follows renames of itself and of its folder', async () => {
    assert.equal((await call('POST', '/move', { from: 'main.tex', to: 'chapters/thesis.tex' })).statusCode, 204)
    assert.equal((await tree()).project.rootFile, 'chapters/thesis.tex')
    assert.equal((await call('POST', '/move', { from: 'chapters', to: 'src' })).statusCode, 204)
    assert.equal((await tree()).project.rootFile, 'src/thesis.tex')
  })

  test('case-only renames work', async () => {
    assert.equal((await call('POST', '/move', { from: 'src/thesis.tex', to: 'src/Thesis.tex' })).statusCode, 204)
    const { files, project } = await tree()
    assert.ok(files.some(f => f.path === 'src/Thesis.tex'))
    assert.equal(project.rootFile, 'src/Thesis.tex')
  })

  test('deleting a folder is recursive; file and folder endpoints are not interchangeable', async () => {
    assert.equal((await call('DELETE', '/files/figures')).statusCode, 400)
    assert.equal((await call('DELETE', '/folders/src/Thesis.tex')).statusCode, 400)
    assert.equal((await call('DELETE', '/folders/figures')).statusCode, 204)
    const { files, folders } = await tree()
    assert.ok(!folders.includes('figures'))
    assert.ok(!files.some(f => f.path.startsWith('figures/')))
  })

  test('paths cannot escape the project', async () => {
    assert.equal((await call('POST', '/folders', { path: '../escape' })).statusCode, 400)
    assert.equal((await call('POST', '/move', { from: 'src', to: '../../escape' })).statusCode, 400)
  })
})

describe('file responses', () => {
  let t: TestApp
  before(async () => {
    t = await createTestApp()
  })
  after(async () => {
    await t?.close()
  })

  test('user files are served sandboxed with their image type', async () => {
    const setup = await t.app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' },
    })
    const cookie = cookieFrom(setup)
    const id = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie }, payload: { name: 'P' } })).json().id
    await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${id}/files/fig.svg`,
      headers: { cookie, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    })
    const res = await t.app.inject({ url: `/api/projects/${id}/files/fig.svg`, headers: { cookie } })
    assert.equal(res.headers['content-type'], 'image/svg+xml')
    assert.match(String(res.headers['content-security-policy']), /^sandbox;/)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
  })
})

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

/** Run the git client (no system or global config, no prompts). */
function gitCli(args: string[], cwd: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-c', 'user.name=Tester', '-c', 'user.email=t@lab.test', '-c', 'init.defaultBranch=main', ...args], {
      cwd,
      env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', HOME: cwd },
    })
    let out = ''
    child.stdout.on('data', c => (out += c))
    child.stderr.on('data', c => (out += c))
    child.on('error', reject)
    child.on('close', code => resolve({ code: code ?? 1, out }))
  })
}

describe('Git bridge', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let id = ''
  let base = ''
  let tmp = ''
  let token = ''
  let bobToken = ''

  const api = (method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: unknown, cookie = admin, contentType?: string) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie, ...(contentType ? { 'content-type': contentType } : {}) }, ...(payload === undefined ? {} : { payload: payload as string }) })
  const read = async (p: string) => {
    await t.collab.flushProject(id)
    const res = await api('GET', `/projects/${id}/files/${p}`)
    return res.statusCode === 200 ? res.body : undefined
  }
  const remote = (tok: string) => `${base.replace('://', `://git:${tok}@`)}/api/git/${id}.git`

  before(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    const address = t.app.server.address() as { port: number }
    base = `http://127.0.0.1:${address.port}`
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-git-test-'))
    admin = cookieFrom(await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }))
    id = (await api('POST', '/projects', { name: 'Thesis' })).json().id
    const invite = (await api('POST', '/admin/invites', { email: 'bob@lab.test' })).json()
    bob = cookieFrom(await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name: 'Bob', email: 'bob@lab.test', password: 'Correct-horse-2' } }))
    assert.equal((await api('POST', `/projects/${id}/members`, { email: 'bob@lab.test', role: 'reviewer' })).statusCode, 201)
  })
  after(async () => {
    await t?.close()
    await fs.rm(tmp, { recursive: true, force: true })
  })

  test('tokens are shown once, listed without the secret, and revocable', async () => {
    const created = await api('POST', '/me/git-tokens', { name: 'laptop' })
    assert.equal(created.statusCode, 201)
    token = created.json().token
    assert.match(token, /^coltex_/)
    const list = (await api('GET', '/me/git-tokens')).json()
    assert.equal(list.length, 1)
    assert.ok(!JSON.stringify(list).includes(token))
    const spare = (await api('POST', '/me/git-tokens', { name: 'spare' })).json()
    assert.equal((await api('DELETE', `/me/git-tokens/${spare.id}`)).statusCode, 204)
    assert.equal((await api('DELETE', `/me/git-tokens/${spare.id}`)).statusCode, 404)
    bobToken = (await api('POST', '/me/git-tokens', { name: 'bob' }, bob)).json().token
  })

  test('clone, push edits and new files, pull changes made in ColTex', async () => {
    const work = path.join(tmp, 'work')
    const clone = await gitCli(['clone', remote(token), work], tmp)
    assert.equal(clone.code, 0, clone.out)
    const main = await fs.readFile(path.join(work, 'main.tex'), 'utf8')
    assert.equal(main, await read('main.tex'))

    await fs.writeFile(path.join(work, 'main.tex'), main.replace('\\begin{document}', '\\begin{document}\nPushed from git.'))
    await fs.mkdir(path.join(work, 'chapters'))
    await fs.writeFile(path.join(work, 'chapters', 'intro.tex'), 'Intro\n')
    await fs.writeFile(path.join(work, 'figure.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]))
    await gitCli(['add', '-A'], work)
    await gitCli(['commit', '-m', 'Edit locally'], work)
    const push = await gitCli(['push', 'origin', 'main'], work)
    assert.equal(push.code, 0, push.out)
    assert.match((await read('main.tex'))!, /Pushed from git\./)
    assert.equal(await read('chapters/intro.tex'), 'Intro\n')
    const png = await api('GET', `/projects/${id}/files/figure.png`)
    assert.deepEqual([...png.rawPayload], [0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3])

    // An edit in ColTex comes back with a pull.
    assert.equal((await api('PUT', `/projects/${id}/files/chapters/intro.tex`, 'Intro, edited in ColTex\n', admin, 'text/plain')).statusCode, 204)
    const pull = await gitCli(['pull', '--ff-only', 'origin', 'main'], work)
    assert.equal(pull.code, 0, pull.out)
    assert.equal(await fs.readFile(path.join(work, 'chapters', 'intro.tex'), 'utf8'), 'Intro, edited in ColTex\n')

    // Deletions are pushed too.
    await gitCli(['rm', '-q', 'figure.png'], work)
    await gitCli(['commit', '-m', 'Remove figure'], work)
    assert.equal((await gitCli(['push', 'origin', 'main'], work)).code, 0)
    assert.equal((await api('GET', `/projects/${id}/files/figure.png`)).statusCode, 404)
  })

  test('a push behind ColTex is refused until pulled', async () => {
    const work = path.join(tmp, 'work')
    await api('PUT', `/projects/${id}/files/chapters/intro.tex`, 'Changed again in ColTex\n', admin, 'text/plain')
    await fs.writeFile(path.join(work, 'notes.tex'), 'Local notes\n')
    await gitCli(['add', '-A'], work)
    await gitCli(['commit', '-m', 'Notes'], work)
    const stale = await gitCli(['push', 'origin', 'main'], work)
    assert.notEqual(stale.code, 0)
    assert.match(stale.out, /rejected|fetch first|non-fast-forward/)
    assert.equal(await read('notes.tex'), undefined)
    assert.equal((await gitCli(['pull', '--no-rebase', 'origin', 'main'], work)).code, 0)
    assert.equal((await gitCli(['push', 'origin', 'main'], work)).code, 0)
    assert.equal(await read('notes.tex'), 'Local notes\n')
    assert.equal(await read('chapters/intro.tex'), 'Changed again in ColTex\n')
  })

  test('only main can be pushed; bad tokens, reviewers and non-members are turned away', async () => {
    const work = path.join(tmp, 'work')
    await gitCli(['checkout', '-q', '-b', 'side'], work)
    const side = await gitCli(['push', 'origin', 'side'], work)
    assert.notEqual(side.code, 0)
    assert.match(side.out, /only pushes to main/)
    await gitCli(['checkout', '-q', 'main'], work)

    const bad = await gitCli(['ls-remote', remote('coltex_wrong')], tmp)
    assert.notEqual(bad.code, 0)
    assert.match(bad.out, /401|Authentication failed|could not read/)

    // Bob is a reviewer: he can clone but not push.
    const bobWork = path.join(tmp, 'bob')
    assert.equal((await gitCli(['clone', remote(bobToken), bobWork], tmp)).code, 0)
    await fs.writeFile(path.join(bobWork, 'bob.tex'), 'x')
    await gitCli(['add', '-A'], bobWork)
    await gitCli(['commit', '-m', 'Bob'], bobWork)
    const denied = await gitCli(['push', 'origin', 'main'], bobWork)
    assert.notEqual(denied.code, 0)
    assert.match(denied.out, /403/)
    assert.equal(await read('bob.tex'), undefined)

    // A project Bob isn't in doesn't exist for him.
    const other = (await api('POST', '/projects', { name: 'Private' })).json().id
    const hidden = await gitCli(['ls-remote', `${base.replace('://', `://git:${bobToken}@`)}/api/git/${other}.git`], tmp)
    assert.notEqual(hidden.code, 0)
    assert.match(hidden.out, /not found|404/i)
  })

  test('deleting the project removes its repository', async () => {
    const repo = path.join(t.dataDir, 'git-bridge', `${id}.git`)
    await fs.access(repo)
    assert.equal((await api('DELETE', `/projects/${id}`)).statusCode, 204)
    await assert.rejects(fs.access(repo))
  })
})

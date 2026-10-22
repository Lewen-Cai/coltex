import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { textEdits } from '../src/mcp/service.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('MCP server', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let carol = ''
  let id = ''
  const tokens: Record<string, string> = {}
  let nextId = 1

  const api = (method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: unknown, cookie = admin) =>
    t.app.inject({ method, url: `/api${url}`, headers: { cookie }, ...(payload === undefined ? {} : { payload: payload as string }) })
  const post = (body: unknown, token = tokens.admin!, headers: Record<string, string> = {}) =>
    t.app.inject({ method: 'POST', url: '/api/mcp', headers: { authorization: `Bearer ${token}`, ...headers }, payload: body as string })
  const rpc = async (method: string, params: Record<string, unknown> = {}, token?: string) => {
    const res = await post({ jsonrpc: '2.0', id: nextId++, method, params }, token)
    assert.equal(res.statusCode, 200, res.body)
    return res.json()
  }
  /** A tool about the test project (unless args name another). */
  const call = async (name: string, args: Record<string, unknown> = {}, token?: string) => {
    const { result, error } = await rpc('tools/call', { name, arguments: name === 'list_projects' ? args : { project: id, ...args } }, token)
    assert.equal(error, undefined)
    return { text: result.content[0].text as string, isError: !!result.isError }
  }
  const tools = async (token?: string) => ((await rpc('tools/list', {}, token)).result.tools as { name: string }[]).map(x => x.name)
  const read = async (p: string) => {
    await t.collab.flushProject(id)
    return (await api('GET', `/projects/${id}/files/${p}`)).body
  }
  const review = async () => (await api('GET', `/projects/${id}/review`)).json()
  const setPermission = (permission: string, cookie = admin) => api('PUT', '/ai/permission', { permission }, cookie)

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }))
    id = (await api('POST', '/projects', { name: 'Thesis' })).json().id
    const join = async (name: string, email: string, role: string) => {
      const invite = (await api('POST', '/admin/invites', { email })).json()
      const cookie = cookieFrom(
        await t.app.inject({ method: 'POST', url: `/api/invites/${invite.token}/accept`, payload: { name, email, password: 'Correct-horse-2' } }),
      )
      assert.equal((await api('POST', `/projects/${id}/members`, { email, role })).statusCode, 201)
      return cookie
    }
    bob = await join('Bob', 'bob@lab.test', 'reviewer')
    carol = await join('Carol', 'carol@lab.test', 'viewer')
    for (const [who, cookie] of [['admin', admin], ['bob', bob], ['carol', carol]] as const) {
      tokens[who] = (await api('POST', '/me/git-tokens', { name: 'agent' }, cookie)).json().token
    }
    const put = await t.app.inject({
      method: 'PUT',
      url: `/api/projects/${id}/files/main.tex`,
      headers: { cookie: admin, 'content-type': 'text/plain' },
      payload: 'Hello world.\n\\begin{document}\nThe first draft.\n\\end{document}\n',
    })
    assert.equal(put.statusCode, 204)
  })
  after(() => t?.close())

  test('needs a token, POST only, no foreign origin, and only the person’s projects', async () => {
    assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, 'coltex_wrong')).statusCode, 401)
    assert.equal((await t.app.inject({ method: 'POST', url: '/api/mcp', payload: {} })).statusCode, 401)
    const other = (await api('POST', '/projects', { name: 'Other' }, bob)).json().id
    const foreign = await call('list_files', { project: other }, tokens.carol)
    assert.ok(foreign.isError)
    assert.match(foreign.text, /There is no project/)
    assert.match((await call('list_files', { project: 'Other' }, tokens.carol)).text, /There is no project “Other”/)
    assert.match((await call('list_projects', {}, tokens.carol)).text, new RegExp(`^${id} “Thesis” \\(viewer; main document main\\.tex; .*\\): read and comment$`))
    assert.ok((await call('list_files', {}, tokens.bob)).text.includes('main.tex'))
    // By name, ignoring case.
    assert.match((await call('list_files', { project: 'thesis' })).text, /main\.tex/)
    assert.equal((await t.app.inject({ method: 'GET', url: '/api/mcp', headers: { authorization: `Bearer ${tokens.admin}` } })).statusCode, 405)
    assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, tokens.admin, { origin: 'https://evil.example' })).statusCode, 403)
  })

  test('initialize, notifications, batches and unknown methods', async () => {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } })
    assert.equal(init.result.protocolVersion, '2025-06-18')
    assert.equal(init.result.serverInfo.name, 'coltex')
    assert.match(init.result.instructions, /list_projects/)
    assert.match(init.result.instructions, /suggestions/)
    assert.equal((await rpc('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion, '2025-11-25')
    assert.equal((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).statusCode, 202)
    const batch = await post([
      { jsonrpc: '2.0', id: 'a', method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 'b', method: 'nope' },
    ])
    assert.deepEqual(batch.json(), [
      { jsonrpc: '2.0', id: 'a', result: {} },
      { jsonrpc: '2.0', id: 'b', error: { code: -32601, message: 'Method not found: nope' } },
    ])
  })

  test('reads, searches and compiles', async () => {
    const listed = await call('list_files')
    assert.match(listed.text, /main\.tex \(\d+ bytes, main document\)/)
    assert.match((await call('read_file', { path: 'main.tex' })).text, /^main\.tex\n1\| Hello world\./)
    assert.match((await call('search', { query: 'first draft' })).text, /main\.tex:3: The first draft\./)
    const bad = await call('read_file', { path: 'missing.tex' })
    assert.ok(bad.isError)
    assert.match((await call('compile')).text, /^Status: success/)
    assert.equal(t.compileJobs.at(-1)?.projectId, id)
    assert.ok(!(await call('read_log')).isError)
  })

  test('manual: edits become the person’s suggestions; deleting needs full access', async () => {
    assert.deepEqual((await api('GET', '/ai/permission')).json(), { permission: 'manual' })
    const names = await tools()
    assert.ok(names.includes('edit_file') && names.includes('write_file'))
    assert.ok(!names.includes('delete_file') && !names.includes('move_file'))

    const edit = await call('edit_file', { path: 'main.tex', old_text: 'The first draft.', new_text: 'The second draft.' })
    assert.match(edit.text, /Edited main\.tex at line 3 as a suggestion/)
    const { changes } = await review()
    assert.deepEqual(changes.map((c: { type: string; text: string; name: string }) => [c.type, c.text, c.name]).sort(), [
      ['delete', 'first', 'Admin'],
      ['insert', 'second', 'Admin'],
    ])
    assert.match((await call('list_suggestions')).text, /insert by Admin: “second”/)

    // A new file can't be a suggestion: it is created.
    assert.equal((await call('write_file', { path: 'notes.tex', content: 'Notes\n' })).text, 'Created notes.tex.')
    assert.equal(await read('notes.tex'), 'Notes\n')
    const refused = await call('delete_file', { path: 'notes.tex' })
    assert.ok(refused.isError)
    assert.match(refused.text, /needs full access/)

    const ambiguous = await call('edit_file', { path: 'main.tex', old_text: 'document', new_text: 'x' })
    assert.ok(ambiguous.isError)
    assert.match(ambiguous.text, /occurs 2 times/)
  })

  test('auto writes directly (unless the project tracks the person); full access deletes and moves', async () => {
    assert.deepEqual((await setPermission('auto')).json(), { permission: 'auto' })
    const before = (await review()).changes.length
    assert.match((await call('edit_file', { path: 'main.tex', old_text: 'Hello world.', new_text: 'Hello, world.' })).text, /^Edited main\.tex at line 1\.$/)
    assert.match(await read('main.tex'), /^Hello, world\./)
    assert.equal((await review()).changes.length, before)
    await call('write_file', { path: 'notes.tex', content: 'Notes, rewritten\n' })
    assert.equal(await read('notes.tex'), 'Notes, rewritten\n')

    // Track changes on for everyone: the agent's edits are tracked too.
    await api('PUT', `/projects/${id}/review/track-changes`, { everyone: true, users: [] })
    assert.match((await call('edit_file', { path: 'notes.tex', old_text: 'rewritten', new_text: 'tracked' })).text, /as a suggestion/)
    assert.equal((await review()).changes.length, before + 2)
    await api('PUT', `/projects/${id}/review/track-changes`, { everyone: false, users: [] })

    await setPermission('full')
    assert.match((await call('list_projects')).text, /\(owner; .*\): edits are applied; may delete and move files/)
    assert.ok((await tools()).includes('delete_file'))
    assert.equal((await call('move_file', { from: 'notes.tex', to: 'chapters/notes.tex' })).text, 'Moved notes.tex to chapters/notes.tex.')
    assert.equal((await call('delete_file', { path: 'chapters' })).text, 'Deleted chapters/.')
    assert.equal((await api('GET', `/projects/${id}/files/chapters/notes.tex`)).statusCode, 404)

    await t.history.flushAll()
    const { versions } = (await api('GET', `/projects/${id}/history`)).json()
    assert.ok(versions.some((v: { kind: string }) => v.kind === 'mcp'))
  })

  test('reviewers only suggest, viewers only read and comment', async () => {
    // Full access chosen, but a reviewer here: suggestions only.
    await setPermission('full', bob)
    assert.match((await call('list_projects', {}, tokens.bob)).text, /\(reviewer; .*\): edits become suggestions/)
    assert.match((await call('delete_file', { path: 'main.tex' }, tokens.bob)).text, /only lets an agent suggest changes/)
    assert.match((await call('edit_file', { path: 'main.tex', old_text: 'Hello, world.', new_text: 'Hello there.' }, tokens.bob)).text, /as a suggestion/)
    assert.match((await review()).changes.map((c: { name: string }) => c.name).join(), /Bob/)
    const create = await call('write_file', { path: 'bob.tex', content: 'x' }, tokens.bob)
    assert.ok(create.isError)

    assert.ok((await tools(tokens.carol)).includes('add_comment'))
    const edit = await call('edit_file', { path: 'main.tex', old_text: 'x', new_text: 'y' }, tokens.carol)
    assert.match(edit.text, /only lets an agent read and comment/)

    const added = await call('add_comment', { path: 'main.tex', quote: '\\end{document}', comment: 'Add a conclusion?' }, tokens.carol)
    const threadId = /Added comment (\w+) at main\.tex:\d+/.exec(added.text)?.[1]
    assert.ok(threadId, added.text)
    assert.match((await call('list_comments')).text, new RegExp(`\\[${threadId}\\] main\\.tex:\\d+ on “\\\\end\\{document\\}”\\n  Carol: Add a conclusion\\?`))
    await call('reply_to_comment', { id: threadId, reply: 'Done.' })
    await call('resolve_comment', { id: threadId })
    assert.equal((await call('list_comments')).text, 'No comments.')
    assert.match((await call('list_comments', { include_resolved: true })).text, /\(resolved\)[\s\S]*Admin: Done\./)
  })

  test('a read-only token offers only reading tools; a limited one sees only its projects; a Git-only one is refused', async () => {
    const make = async (body: Record<string, unknown>) => (await api('POST', '/me/git-tokens', { name: 'limited', ...body })).json().token as string
    const readOnly = await make({ uses: ['mcp'], readOnly: true })
    const names = await tools(readOnly)
    assert.ok(names.includes('read_file') && names.includes('compile'))
    assert.ok(!names.includes('edit_file') && !names.includes('add_comment') && !names.includes('delete_file'))
    assert.match((await rpc('initialize', {}, readOnly)).result.instructions, /can only read/)
    assert.match((await call('list_projects', {}, readOnly)).text, /read only \(this token\)/)
    const refused = await call('edit_file', { path: 'main.tex', old_text: 'Hello', new_text: 'Hi' }, readOnly)
    assert.ok(refused.isError)
    assert.match(refused.text, /can only read/)

    const other = (await api('POST', '/projects', { name: 'Side project' })).json().id
    const limited = await make({ uses: ['mcp'], projectIds: [other] })
    assert.match((await call('list_projects', {}, limited)).text, /^\S+ “Side project”/)
    assert.doesNotMatch((await call('list_projects', {}, limited)).text, /Thesis/)
    assert.match((await call('list_files', { project: id }, limited)).text, /There is no project/)

    const gitOnly = await make({ uses: ['git'] })
    assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, gitOnly)).statusCode, 401)
  })

  test('list_versions shows the history', async () => {
    assert.match((await call('list_versions', { limit: 5 })).text, /Edited by an AI agent over MCP by Admin/)
  })
})

describe('textEdits', () => {
  const apply = (text: string, edits: ReturnType<typeof textEdits>) => {
    let out = text
    for (const e of [...edits].reverse()) out = out.slice(0, e.fromA) + e.insert + out.slice(e.toA)
    return out
  }
  test('changes whole words, and the edits rebuild the target', () => {
    assert.deepEqual(textEdits('The first draft.', 'The second draft.'), [{ fromA: 4, toA: 9, insert: 'second' }])
    assert.deepEqual(textEdits('a b', 'a b c', 10), [{ fromA: 13, toA: 13, insert: ' c' }])
    const cases: [string, string][] = [
      ['', 'new file\n'],
      ['old\n', ''],
      ['Über naïve café, 图 1 和 😀 emoji.\n', 'Uber naive café — 图 2 与 😀😀 emoji!\n'],
      ['\\section{Intro}\nSome text here.\n', '\\section{Introduction}\n\nSome more text here, now.\n'],
    ]
    for (const [a, b] of cases) assert.equal(apply(a, textEdits(a, b)), b)
    const many = Array.from({ length: 70_000 }, (_, i) => `w${i}`).join(' ')
    assert.equal(apply(many, textEdits(many, 'short')), 'short')
  })
})

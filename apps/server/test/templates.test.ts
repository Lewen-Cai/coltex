import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('project templates', () => {
  let t: TestApp
  let admin = ''
  let bob = ''
  let carol = ''
  let dave = ''
  let source = ''

  const api = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, cookie: string, payload?: unknown, type?: string) =>
    t.app.inject({
      method,
      url: `/api${url}`,
      headers: { cookie, ...(type ? { 'content-type': type } : {}) },
      ...(payload === undefined ? {} : { payload: payload as string }),
    })
  const invite = async (name: string, email: string, role?: string) => {
    const { token } = (await api('POST', '/admin/invites', admin, { email, ...(role ? { role } : {}) })).json()
    return cookieFrom(await t.app.inject({ method: 'POST', url: `/api/invites/${token}/accept`, payload: { name, email, password: `${name}-password-1` } }))
  }
  const files = async (id: string, cookie: string) => (await api('GET', `/projects/${id}`, cookie)).json().files.map((f: { path: string }) => f.path).sort()

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    // Bob is an admin (sharing templates is for administrators); Carol and Dave are members.
    bob = await invite('Bob', 'bob@lab.test', 'manager')
    carol = await invite('Carol', 'carol@lab.test')
    dave = await invite('Dave', 'dave@lab.test')
  })
  after(async () => {
    await t?.close()
  })

  test('built-in templates: files, folders and compiler', async () => {
    const list = (await api('GET', '/templates', bob)).json()
    const ids = list.map((x: { id: string }) => x.id)
    assert.deepEqual(ids.slice(0, 3), ['article', 'arxiv', 'elsevier'])
    assert.ok(['acm-sigconf', 'lncs', 'elsevier', 'revtex', 'jmlr', 'amsart', 'apa7', 'mnras', 'acs-journal', 'nature'].every(id => ids.includes(id)))
    assert.ok(list.every((x: { kind: string; canRemove: boolean; projectId: string | null }) => x.kind === 'builtin' && !x.canRemove && x.projectId === null))
    // Every built-in template names its field; the medical ones come together.
    const medicine = list.filter((x: { field: string }) => x.field === 'medicine').map((x: { id: string }) => x.id)
    assert.deepEqual(medicine, [
      'clinical-study', 'trial-protocol', 'observational-study', 'diagnostic-accuracy', 'systematic-review', 'case-report', 'research-letter', 'elsevier-cas', 'oup',
    ])
    assert.ok(list.every((x: { field: string | null }) => x.field))
    // The picker lists them field by field.
    const fields = list.map((x: { field: string }) => x.field)
    assert.deepEqual([...new Set(fields)], ['general', 'cs', 'engineering', 'physics', 'astronomy', 'chemistry', 'biology', 'medicine', 'math', 'economics', 'social', 'earth'])
    assert.ok(fields.every((f: string, i: number) => i === 0 || fields.indexOf(f) === i || fields[i - 1] === f), 'each field in one run')

    const paper = (await api('POST', '/projects', bob, { name: 'Paper', template: 'ieee-conference' })).json()
    // New projects pick their engine at each build unless one is asked for.
    assert.equal(paper.engine, 'auto')
    // template.json is the template's description, not a project file.
    assert.deepEqual(await files(paper.id, bob), ['main.tex', 'references.bib'])
    assert.equal((await api('POST', '/projects', bob, { name: 'Z', template: 'arxiv', engine: 'lualatex' })).json().engine, 'lualatex')
    const blank = (await api('POST', '/projects', bob, { name: 'Blank' })).json()
    assert.equal(blank.engine, 'auto')
    assert.match((await api('GET', `/projects/${blank.id}/files/main.tex`, bob)).body, /\\documentclass\{article\}/)
    assert.equal((await api('POST', '/projects', bob, { name: 'X', template: 'nope' })).statusCode, 404)
  })

  const id = async (cookie: string) => (await api('GET', '/auth/get-session', cookie)).json().user.id as string
  const listed = async (cookie: string, templateId: string) =>
    (await api('GET', '/templates', cookie)).json().find((x: { id: string }) => x.id === templateId) as
      | { sharing: string; groups: string[]; bySystemAdmin: boolean; publishedBy: string; canRemove: boolean; field: string }
      | undefined

  test('admins share a template with their groups and with people; members see what is shared with them', async () => {
    source = (await api('POST', '/projects', bob, { name: 'School thesis', template: 'article' })).json().id
    await api('PATCH', `/projects/${source}`, bob, { engine: 'xelatex', spellCheckLanguage: 'en_GB' })
    await api('PUT', `/projects/${source}/files/logo.tex`, bob, 'logo\n', 'text/plain')
    await api('POST', `/projects/${source}/members`, bob, { email: 'carol@lab.test', role: 'editor' })
    const group = (await api('POST', '/groups', bob, { name: 'Thesis lab' })).json().id
    await api('POST', `/groups/${group}/invites`, bob, { userId: await id(carol) })
    await api('POST', `/groups/${group}/accept`, carol)

    const body = (audience: object) => ({ name: 'Lab thesis', description: 'Our format', field: 'math', audience })
    // Only the owner publishes, only administrators share, and only the system administrator with everyone.
    assert.equal((await api('PUT', `/projects/${source}/template`, carol, body({ groupIds: [group] }))).statusCode, 403)
    assert.equal((await api('PUT', `/projects/${source}/template`, admin, body({ groupIds: [group] }))).statusCode, 404)
    // No one to share it with: a template for himself alone, which anyone may have.
    assert.equal((await api('PUT', `/projects/${source}/template`, bob, body({}))).statusCode, 200)
    assert.equal((await api('GET', '/templates', bob)).json().find((x: { projectId: string | null }) => x.projectId === source).sharing, 'private')
    assert.ok(!(await api('GET', '/templates', carol)).json().some((x: { name: string }) => x.name === 'Lab thesis'), 'which no one else sees')
    assert.ok((await api('GET', '/projects', bob)).json().some((p: { id: string }) => p.id === source), 'a published project stays in the list')
    assert.equal((await api('PUT', `/projects/${source}/template`, bob, body({ everyone: true }))).statusCode, 403)
    const elsewhere = (await api('POST', '/groups', dave, { name: 'Not Bob’s' })).json().id
    assert.equal((await api('PUT', `/projects/${source}/template`, bob, body({ groupIds: [elsewhere] }))).statusCode, 404, 'groups he is in')

    const published = (await api('PUT', `/projects/${source}/template`, bob, body({ groupIds: [group] }))).json()
    assert.deepEqual([published.name, published.field, published.audience.groups.map((g: { name: string }) => g.name)], ['Lab thesis', 'math', ['Thesis lab']])
    assert.deepEqual((await api('GET', `/projects/${source}/template`, carol)).json(), published)
    // Renaming keeps the same entry.
    const renamed = (await api('PUT', `/projects/${source}/template`, bob, { ...body({ groupIds: [group] }), name: 'Lab thesis 2026' })).json()
    assert.equal(renamed.id, published.id)

    const forCarol = await listed(carol, published.id)
    assert.deepEqual([forCarol?.sharing, forCarol?.groups, forCarol?.field, forCarol?.canRemove], ['groups', ['Thesis lab'], 'math', false])
    assert.equal(await listed(dave, published.id), undefined, 'not in the group')
    assert.equal((await api('POST', '/projects', dave, { name: 'Sneaky', template: published.id })).statusCode, 404)
    assert.equal((await listed(admin, published.id))?.canRemove, true, 'the system administrator sees and removes all')

    // People picked one by one.
    await api('PUT', `/projects/${source}/template`, bob, { ...body({ groupIds: [group], userIds: [await id(dave)] }), name: 'Lab thesis 2026' })
    assert.deepEqual([(await listed(dave, published.id))?.sharing, (await listed(dave, published.id))?.groups], ['people', []])

    // A project from it has the files as they are now, its compiler and spell-check language,
    // and nothing else of the source (members).
    const made = (await api('POST', '/projects', carol, { name: 'Mine', template: published.id })).json()
    assert.equal(made.engine, 'xelatex')
    assert.equal(made.spellCheckLanguage, 'en_GB')
    assert.ok((await files(made.id, carol)).includes('logo.tex'))
    assert.equal((await api('GET', `/projects/${made.id}/members`, carol)).json().length, 1)
    // The source project is still private.
    assert.equal((await api('GET', `/projects/${source}`, dave)).statusCode, 404)
  })

  test('the system administrator shares with everyone; members can’t publish', async () => {
    const own = (await api('POST', '/projects', admin, { name: 'House style', template: 'article' })).json().id
    const tpl = (await api('PUT', `/projects/${own}/template`, admin, { name: 'House style', audience: { everyone: true } })).json()
    for (const who of [bob, carol, dave]) {
      const seen = await listed(who, tpl.id)
      assert.deepEqual([seen?.sharing, seen?.bySystemAdmin, seen?.field], ['server', true, 'general'])
    }
    const mine = (await api('POST', '/projects', dave, { name: 'Dave’s', template: 'article' })).json().id
    assert.equal((await api('PUT', `/projects/${mine}/template`, dave, { name: 'Dave’s', audience: { userIds: [await id(carol)] } })).statusCode, 403)
    await api('DELETE', `/projects/${own}/template`, admin)
  })

  test('taking templates down', async () => {
    const id = (await api('GET', `/projects/${source}/template`, bob)).json().id
    assert.equal((await api('DELETE', `/templates/${id}`, carol)).statusCode, 403)
    assert.equal((await api('DELETE', `/templates/${id}`, admin)).statusCode, 204)
    assert.equal((await api('GET', `/projects/${source}/template`, bob)).json(), null)
    assert.equal((await api('POST', '/projects', carol, { name: 'Late', template: id })).statusCode, 404)

    // Unpublished by its owner, and gone with its project.
    const again = { name: 'Again', audience: { userIds: [(await api('GET', '/auth/get-session', carol)).json().user.id] } }
    await api('PUT', `/projects/${source}/template`, bob, again)
    assert.equal((await api('DELETE', `/projects/${source}/template`, bob)).statusCode, 204)
    assert.equal((await api('GET', '/templates', bob)).json().filter((x: { kind: string }) => x.kind === 'shared').length, 0)
    await api('PUT', `/projects/${source}/template`, bob, again)
    assert.equal((await api('DELETE', `/projects/${source}`, bob)).statusCode, 204)
    assert.equal((await api('GET', '/templates', bob)).json().filter((x: { kind: string }) => x.kind === 'shared').length, 0)
  })
})

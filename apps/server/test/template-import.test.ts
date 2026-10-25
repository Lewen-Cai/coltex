import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import yazl from 'yazl'

// A small upload limit, so the test for a zip that is too big stays small.
// Set before the app (and its config) is loaded.
process.env.MAX_IMPORT_MB = '1'
const { cookieFrom, createTestApp } = await import('./helpers.ts')

function makeZip(items: { path: string; data: string | Buffer }[]): Promise<Buffer> {
  const zip = new yazl.ZipFile()
  for (const it of items) zip.addBuffer(Buffer.from(it.data), it.path, { compress: false })
  zip.end()
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    zip.outputStream.on('data', (c: Buffer) => chunks.push(c))
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)))
    zip.outputStream.on('error', reject)
  })
}

describe('importing a template from a zip', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>
  let admin = ''
  let bob = ''
  let dan = ''

  const upload = (cookie: string, zip: Buffer, query: string) =>
    t.app.inject({ method: 'POST', url: `/api/templates/import?${query}`, headers: { cookie, 'content-type': 'application/zip' }, payload: zip })
  const projectCount = async (cookie: string) => (await t.app.inject({ url: '/api/projects', headers: { cookie } })).json().length

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    // Bob is an admin (he leads a team); Dan is a member.
    const join = async (name: string, role: 'manager' | 'user') => {
      const email = `${name.toLowerCase()}@lab.test`
      const { token } = (await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: { email, role } })).json()
      return cookieFrom(
        await t.app.inject({ method: 'POST', url: `/api/invites/${token}/accept`, payload: { name, email, password: `${name}-password-1` } }),
      )
    }
    bob = await join('Bob', 'manager')
    dan = await join('Dan', 'user')
  })
  after(async () => {
    await t?.close()
  })

  test('a journal zip in a folder becomes a shared template; junk and build files are left out', async () => {
    // Laid out like the journals' downloads: one top folder, the class, a sample
    // document, bibliography styles, and what the author's editor left behind.
    const zip = await makeZip([
      { path: 'sn-article-template/sn-article.tex', data: '\\documentclass[pdflatex,sn-mathphys-num]{sn-jnl}\n\\begin{document}\nHi\n\\end{document}\n' },
      { path: 'sn-article-template/sn-jnl.cls', data: '% class\n' },
      { path: 'sn-article-template/bst/sn-mathphys-num.bst', data: '% bst\n' },
      { path: 'sn-article-template/sn-bibliography.bib', data: '@article{a, title={A}}\n' },
      { path: 'sn-article-template/sn-article.aux', data: 'aux' },
      { path: 'sn-article-template/sn-article.log', data: 'log' },
      { path: 'sn-article-template/.DS_Store', data: 'x' },
      { path: '__MACOSX/sn-article-template/._sn-article.tex', data: 'x' },
    ])
    const danId = (await t.app.inject({ url: '/api/auth/get-session', headers: { cookie: dan } })).json().user.id
    const audience = encodeURIComponent(JSON.stringify({ userIds: [danId] }))
    const res = await upload(bob, zip, `name=${encodeURIComponent('Springer Nature')}&description=${encodeURIComponent('sn-jnl, from the journal')}&field=medicine&audience=${audience}`)
    assert.equal(res.statusCode, 201, res.body)
    const { template, project, warnings } = res.json()
    assert.deepEqual(warnings, [])
    assert.equal(project.name, 'Springer Nature')
    assert.equal(project.rootFile, 'sn-article.tex')
    assert.deepEqual(
      { kind: template.kind, name: template.name, description: template.description, publishedBy: template.publishedBy },
      { kind: 'shared', name: 'Springer Nature', description: 'sn-jnl, from the journal', publishedBy: 'Bob' },
    )
    assert.equal(template.projectId, project.id)
    assert.equal(template.canRemove, true)
    assert.deepEqual([template.sharing, template.field], ['people', 'medicine'])

    const files = (await t.app.inject({ url: `/api/projects/${project.id}`, headers: { cookie: bob } }))
      .json()
      .files.map((f: { path: string }) => f.path)
      .sort()
    assert.deepEqual(files, ['bst/sn-mathphys-num.bst', 'sn-article.tex', 'sn-bibliography.bib', 'sn-jnl.cls'])

    // Dan, whom it is for, sees it; the system administrator sees everything; only its owner is pointed at the project.
    assert.ok((await t.app.inject({ url: '/api/templates', headers: { cookie: dan } })).json().some((x: { id: string }) => x.id === template.id))
    const forAdmin = (await t.app.inject({ url: '/api/templates', headers: { cookie: admin } })).json().find((x: { id: string }) => x.id === template.id)
    assert.equal(forAdmin.projectId, null)
    assert.equal(forAdmin.canRemove, true)
    const made = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: admin }, payload: { name: 'Mine', template: template.id } })).json()
    assert.equal(made.rootFile, 'sn-article.tex')
    // And it is published from its project, so the owner manages it there.
    assert.equal((await t.app.inject({ url: `/api/projects/${project.id}/template`, headers: { cookie: bob } })).json().id, template.id)
  })

  test('only administrators may import', async () => {
    const zip = await makeZip([{ path: 'main.tex', data: '\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}\n' }])
    const before = await projectCount(dan)
    const everyone = `audience=${encodeURIComponent('{"everyone":true}')}`
    assert.equal((await upload(dan, zip, `name=Mine&${everyone}`)).statusCode, 403)
    assert.equal(await projectCount(dan), before, 'nothing is made for a member')
    const bobBefore = await projectCount(bob)
    assert.equal((await upload(bob, zip, `name=Everyone&${everyone}`)).statusCode, 403, 'admins share with their groups and people')
    assert.equal((await upload(bob, zip, 'name=Nobody')).statusCode, 400, 'someone to share it with')
    assert.equal(await projectCount(bob), bobBefore, 'nothing is made when who it is for is wrong')
    assert.equal((await upload(admin, zip, `name=From%20the%20system%20admin&${everyone}`)).statusCode, 201)
  })

  test('a zip without a .tex file is refused, and leaves no project behind', async () => {
    const before = await projectCount(admin)
    const res = await upload(admin, await makeZip([{ path: 'refs.bib', data: '' }, { path: 'figure.png', data: 'png' }]), `name=Nothing&audience=${encodeURIComponent('{"everyone":true}')}`)
    assert.equal(res.statusCode, 400)
    assert.match(res.json().error ?? res.json().message, /no \.tex file/)
    assert.equal(await projectCount(admin), before)
  })

  test('uploads over the import limit, bad zips and missing names are refused', async () => {
    const big = await makeZip([{ path: 'main.tex', data: '\\documentclass{article}' }, { path: 'noise.bin', data: randomBytes(1.5 * 1024 * 1024) }])
    assert.equal((await upload(bob, big, 'name=Big')).statusCode, 413)
    assert.equal((await upload(bob, Buffer.from('not a zip'), 'name=Bad')).statusCode, 400)
    const ok = await makeZip([{ path: 'main.tex', data: '\\documentclass{article}' }])
    assert.equal((await upload(bob, ok, 'name=')).statusCode, 400)
    assert.equal((await t.app.inject({ method: 'POST', url: '/api/templates/import?name=x', headers: { 'content-type': 'application/zip' }, payload: ok })).statusCode, 401)
  })
})

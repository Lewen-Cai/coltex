import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall, type FauxProviderHandle } from '@earendil-works/pi-ai'
import type { AiSessionState, AiSkill } from '@coltex/shared'
import { BUILTIN_SKILLS_DIR, loadBuiltinSkills, parseFrontMatter, parseSkillMarkdown, readSkillZip, skillName } from '../src/ai/skills.ts'
import { skillsSection } from '../src/ai/prompt.ts'
import { skillFile } from '../src/ai/tools.ts'
import { buildProjectZip } from '../src/projects/zip.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 20))
  }
}

async function zip(files: Record<string, string | Buffer>): Promise<Buffer> {
  const stream = buildProjectZip(
    Object.entries(files).map(([path, data]) => ({ path, data: Buffer.isBuffer(data) ? data : Buffer.from(data) })),
    [],
  )
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk)
  return Buffer.concat(chunks)
}

const POLISH = `---
name: polish-abstract
description: Tighten an abstract to the journal's word limit. Use when the author asks to shorten or polish an abstract.
license: MIT
metadata:
  author: someone
---

# Polish the abstract

1. Count the words.
2. Cut filler; keep every number and claim.
`

describe('SKILL.md parsing', () => {
  test('front matter: plain, quoted and block values; other keys ignored', () => {
    assert.deepEqual(parseFrontMatter(POLISH).data, {
      name: 'polish-abstract',
      description: "Tighten an abstract to the journal's word limit. Use when the author asks to shorten or polish an abstract.",
      license: 'MIT',
    })
    const folded = parseFrontMatter('---\nname: "a-b"\ndescription: >\n  First line\n  second line.\n\n  New paragraph.\n---\nBody')
    assert.deepEqual(folded.data, { name: 'a-b', description: 'First line second line.\n\nNew paragraph.' })
    assert.equal(folded.body, 'Body')
    const literal = parseFrontMatter("---\nname: 'it''s'\ndescription: |\n  one\n  two\n---\n")
    assert.deepEqual(literal.data, { name: "it's", description: 'one\ntwo' })
    assert.deepEqual(parseFrontMatter('No front matter').data, {})
  })

  test('names are made valid, and a missing description falls back to the first line', () => {
    assert.equal(skillName('My Great Skill!'), 'my-great-skill')
    assert.equal(skillName('compact'), 'compact-skill', 'built-in command names are taken')
    const warnings: string[] = []
    const s = parseSkillMarkdown('# Check references\n\nLook at every \\cite.', 'refs', warnings)
    assert.deepEqual([s.name, s.description, s.body], ['refs', 'Check references', '# Check references\n\nLook at every \\cite.'])
    assert.equal(warnings.length, 1)
  })

  test('a zip holds one or more skill folders; text files come along, binaries are skipped', async () => {
    const { skills, warnings } = await readSkillZip(
      await zip({
        'skills/polish-abstract/SKILL.md': POLISH,
        'skills/polish-abstract/references/limits.md': 'IEEE: 250 words',
        'skills/polish-abstract/scripts/count.py': 'print(len(open(0).read().split()))',
        'skills/polish-abstract/logo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]),
        'skills/refs/SKILL.md': '---\ndescription: Check citations\n---\nCheck every \\cite.',
      }),
      'upload',
    )
    const polish = skills.find(s => s.name === 'polish-abstract')!
    assert.deepEqual(Object.keys(polish.files).sort(), ['references/limits.md', 'scripts/count.py'])
    assert.equal(skills.find(s => s.name === 'refs')?.description, 'Check citations', 'named after its folder')
    assert.ok(warnings.some(w => w.includes('logo.png')))
    await assert.rejects(readSkillZip(await zip({ 'README.md': 'hi' }), 'x'), /No SKILL.md/)
  })
})

describe('skill files', () => {
  test('paths are relative to the skill, so ../other-skill/… reads a sibling skill’s file', () => {
    const skills: { name: string; files: Record<string, string> }[] = [
      { name: 'writing', files: { 'static/core/stance.md': 'Stance', 'references/a b.md': 'Spaced' } },
      { name: 'shared', files: { 'core/discipline.md': 'Discipline' } },
    ]
    assert.equal(skillFile(skills, 'writing', 'static/core/stance.md'), 'Stance')
    assert.equal(skillFile(skills, 'writing', './static/core/../core/stance.md'), 'Stance')
    assert.equal(skillFile(skills, 'writing', '<references/a b.md>'), 'Spaced')
    assert.equal(skillFile(skills, 'writing', '../shared/core/discipline.md'), 'Discipline')
    // Written relative to a file in a subfolder.
    assert.equal(skillFile(skills, 'writing', '../../../shared/core/discipline.md'), 'Discipline')
    assert.equal(skillFile(skills, 'writing', 'static/core/../shared/core/discipline.md'), 'Discipline')
    assert.equal(skillFile(skills, 'shared', '../core/discipline.md'), 'Discipline')
    assert.throws(() => skillFile(skills, 'writing', '../missing/core/discipline.md'), /has no file/)
    assert.throws(() => skillFile(skills, 'writing', '../../etc/passwd'), /has no file/)
    assert.throws(() => skillFile(skills, 'writing', 'nope.md'), /has no file/)
  })

  test('only skill-creator is built in, without its licence file', () => {
    const skills = loadBuiltinSkills(BUILTIN_SKILLS_DIR)
    assert.deepEqual(
      skills.map(s => [s.name, Object.keys(s.files)]),
      [['skill-creator', ['references/examples.md']]],
    )
  })

  test('the prompt tells the agent to check the library first, and says whose each skill is', () => {
    const section = skillsSection([...loadBuiltinSkills(BUILTIN_SKILLS_DIR), { name: 'shorten', description: 'Shorten it.', scope: 'personal' }])
    assert.match(section, /Check this library before you start a task/)
    assert.match(section, /- skill-creator \(built in\): /)
    assert.match(section, /- shorten \(personal\): Shorten it\./)
    assert.match(skillsSection([]), /none at the moment/)
  })
})

describe('AI skills', () => {
  let t: TestApp
  let faux: FauxProviderHandle
  let admin = ''
  let editor = ''
  let viewer = ''
  let noAi = ''
  let projectId = ''

  const api = (method: string, url: string, cookie: string, payload?: unknown, headers: Record<string, string> = {}) =>
    t.app.inject({ method: method as 'GET', url: `/api${url}`, headers: { cookie, ...headers }, payload: payload as object })
  const state = async (cookie = admin): Promise<AiSessionState> => (await api('GET', `/projects/${projectId}/ai/session`, cookie)).json()
  const idle = (cookie = admin) => waitFor(async () => !(await state(cookie)).running, 'the agent to finish')

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const group = (await api('POST', '/admin/ai/groups', admin, { name: 'Everyone', policy: { mode: 'all', providers: [], models: [] } })).json().id
    for (const [email, role, aiGroupId] of [
      ['editor@lab.test', 'editor', group],
      ['viewer@lab.test', 'viewer', group],
      ['noai@lab.test', 'noai', undefined],
    ] as const) {
      const invite = await api('POST', '/admin/invites', admin, { email, aiGroupId })
      const cookie = cookieFrom(
        await t.app.inject({ method: 'POST', url: `/api/invites/${invite.json().token}/accept`, payload: { name: role, email, password: 'Correct-horse-2' } }),
      )
      if (role === 'editor') editor = cookie
      else if (role === 'viewer') viewer = cookie
      else noAi = cookie
    }
    projectId = (await api('POST', '/projects', admin, { name: 'Paper' })).json().id
    await api('POST', `/projects/${projectId}/members`, admin, { email: 'editor@lab.test', role: 'editor' })
    await api('POST', `/projects/${projectId}/members`, admin, { email: 'viewer@lab.test', role: 'viewer' })
    await api('POST', `/projects/${projectId}/members`, admin, { email: 'noai@lab.test', role: 'editor' })
    faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1', reasoning: false }] })
    t.ai.models.setProvider(faux.provider)
  })

  after(async () => {
    await t?.close()
  })

  test('personal skills: create, edit, rename, delete; names unique and valid; only with AI access', async () => {
    const body = { name: 'translate-en', description: 'Translate Chinese text to academic English.', body: 'Translate faithfully.' }
    const created = await api('POST', '/me/ai/skills', editor, body)
    assert.equal(created.statusCode, 201, created.body)
    assert.equal((created.json() as AiSkill).scope, 'personal')
    assert.equal((await api('POST', '/me/ai/skills', editor, body)).statusCode, 409)
    assert.equal((await api('POST', '/me/ai/skills', editor, { ...body, name: 'Bad Name' })).statusCode, 400)
    assert.equal((await api('POST', '/me/ai/skills', editor, { ...body, name: 'new' })).statusCode, 400, 'a built-in command')
    // Someone else's skills are their own.
    assert.deepEqual((await api('GET', '/me/ai/skills', viewer)).json(), [])
    assert.equal((await api('POST', '/me/ai/skills', viewer, body)).statusCode, 201, 'the same name is fine for another person')

    const renamed = await api('PUT', '/me/ai/skills/translate-en', editor, { ...body, name: 'to-english', body: 'Translate; keep LaTeX.' })
    assert.equal(renamed.json().name, 'to-english')
    assert.deepEqual((await api('GET', '/me/ai/skills', editor)).json().map((s: AiSkill) => [s.name, s.body]), [['to-english', 'Translate; keep LaTeX.']])

    // No AI, no skills.
    assert.equal((await api('GET', '/me/ai/skills', noAi)).statusCode, 403)
    assert.equal((await api('GET', `/projects/${projectId}/ai/skill-menu`, noAi)).statusCode, 403)

    assert.equal((await api('DELETE', '/me/ai/skills/to-english', editor)).statusCode, 200)
    assert.deepEqual((await api('GET', '/me/ai/skills', editor)).json(), [])
    assert.equal((await api('DELETE', '/me/ai/skills/to-english', editor)).statusCode, 404)
    await api('DELETE', '/me/ai/skills/translate-en', viewer)
  })

  test('project skills: members read them, editors change them, outsiders never see them', async () => {
    const body = { name: 'journal-style', description: "The journal's house style.", body: 'Use British spelling.' }
    assert.equal((await api('POST', `/projects/${projectId}/ai/skills`, viewer, body)).statusCode, 403)
    const created = await api('POST', `/projects/${projectId}/ai/skills`, editor, body)
    assert.equal(created.statusCode, 201, created.body)
    assert.deepEqual([created.json().scope, created.json().author], ['project', 'editor'])
    assert.equal((await api('GET', `/projects/${projectId}/ai/skills`, viewer)).json().length, 1)
    assert.equal((await api('PUT', `/projects/${projectId}/ai/skills/journal-style`, viewer, body)).statusCode, 403)

    const other = (await api('POST', '/projects', viewer, { name: 'Viewer’s own' })).json().id
    assert.equal((await api('GET', `/projects/${other}/ai/skills`, editor)).statusCode, 404, 'not a member')

    // The menu: the person's skills and the project's; theirs wins on a name clash.
    await api('POST', '/me/ai/skills', viewer, { ...body, description: 'My own house style.' })
    await api('POST', '/me/ai/skills', viewer, { name: 'shorten', description: 'Shorten text.', body: 'Cut.' })
    assert.deepEqual((await api('GET', `/projects/${projectId}/ai/skill-menu`, viewer)).json(), [
      { name: 'journal-style', description: 'My own house style.', scope: 'personal' },
      { name: 'shorten', description: 'Shorten text.', scope: 'personal' },
    ])
    assert.deepEqual((await api('GET', `/projects/${projectId}/ai/skill-menu`, editor)).json(), [
      { name: 'journal-style', description: "The journal's house style.", scope: 'project' },
    ])
    await api('DELETE', '/me/ai/skills/journal-style', viewer)
    await api('DELETE', '/me/ai/skills/shorten', viewer)
  })

  test('import a SKILL.md or a zip, refuse clashes unless replacing, and download again', async () => {
    const md = await api('POST', '/me/ai/skills/import?filename=SKILL.md', admin, { markdown: POLISH })
    assert.equal(md.statusCode, 201, md.body)
    assert.deepEqual(md.json().skills.map((s: AiSkill) => s.name), ['polish-abstract'])

    const archive = await zip({
      'polish-abstract/SKILL.md': POLISH.replace('Count the words.', 'Count the words twice.'),
      'polish-abstract/references/limits.md': 'IEEE: 250 words',
    })
    const upload = (replace: string) =>
      api('POST', `/me/ai/skills/import?filename=polish.zip&replace=${replace}`, admin, archive, { 'content-type': 'application/zip' })
    const clash = await upload('0')
    assert.equal(clash.statusCode, 409)
    assert.match(clash.json().error, /polish-abstract/)
    const replaced = await upload('1')
    assert.equal(replaced.statusCode, 201, replaced.body)
    const skill = replaced.json().skills[0] as AiSkill
    assert.match(skill.body, /twice/)
    assert.deepEqual(skill.files, [{ path: 'references/limits.md', size: 15 }])
    assert.equal((await api('GET', '/me/ai/skills', admin)).json().length, 1)

    const download = await api('GET', '/me/ai/skills/polish-abstract/download', admin)
    assert.equal(download.headers['content-type'], 'application/zip')
    const back = await readSkillZip(download.rawPayload, 'x')
    assert.deepEqual([back.skills[0]!.name, Object.keys(back.skills[0]!.files)], ['polish-abstract', ['references/limits.md']])

    // A folder, or files picked one by one: base64 with their relative paths.
    const b64 = (text: string | Buffer) => Buffer.from(text).toString('base64')
    const folder = await api('POST', '/me/ai/skills/import?filename=thesis-style', admin, {
      files: [
        { path: 'thesis-style/SKILL.md', data: b64('---\ndescription: House style for the thesis.\n---\nUse British spelling.') },
        { path: 'thesis-style/examples/good.tex', data: b64('\\section{Introduction}') },
        { path: 'thesis-style/logo.png', data: b64(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1])) },
        { path: 'thesis-style/.DS_Store', data: b64('junk') },
      ],
    })
    assert.equal(folder.statusCode, 201, folder.body)
    assert.equal(folder.json().skills[0].name, 'thesis-style')
    assert.deepEqual(folder.json().skills[0].files, [{ path: 'examples/good.tex', size: 22 }])
    assert.deepEqual(folder.json().warnings, ['thesis-style: skipped logo.png (not a text file)'])
    const single = await api('POST', '/me/ai/skills/import?filename=notes.md', admin, { files: [{ path: 'cite-check.md', data: b64('Check every \\cite.') }] })
    assert.equal(single.statusCode, 201, single.body)
    assert.equal(single.json().skills[0].name, 'cite-check')
    const none = await api('POST', '/me/ai/skills/import', admin, { files: [{ path: 'a.md', data: b64('a') }, { path: 'b.md', data: b64('b') }] })
    assert.equal(none.statusCode, 400)
    assert.equal((await api('POST', '/me/ai/skills/import', admin, { files: [{ path: '../SKILL.md', data: b64('x') }] })).statusCode, 400)
    await api('DELETE', '/me/ai/skills/thesis-style', admin)
    await api('DELETE', '/me/ai/skills/cite-check', admin)

    assert.equal((await api('POST', `/projects/${projectId}/ai/skills/import`, viewer, { markdown: POLISH })).statusCode, 403)
    assert.equal((await api('POST', '/me/ai/skills/import', admin, { markdown: '' })).statusCode, 400)
  })

  test('the agent sees the skills, loads one when it fits, and /name sends its instructions', async () => {
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    let firstContext = ''
    faux.setResponses([
      context => {
        firstContext = JSON.stringify(context)
        return fauxAssistantMessage(fauxToolCall('read_skill', { name: 'polish-abstract' }), { stopReason: 'toolUse' })
      },
      fauxAssistantMessage(fauxToolCall('read_skill', { name: 'polish-abstract', path: 'references/limits.md' }), { stopReason: 'toolUse' }),
      context => {
        assert.match(JSON.stringify(context.messages), /Count the words twice/)
        assert.match(JSON.stringify(context.messages), /IEEE: 250 words/)
        return fauxAssistantMessage(fauxText('Shortened.'))
      },
    ])
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'Please shorten my abstract' })).statusCode, 202)
    await idle()
    assert.match(firstContext, /polish-abstract \(personal\): Tighten an abstract/)
    assert.match(firstContext, /You are the assistant built into ColTex/, 'the system prompt is still there')
    const tools = (await state()).items.flatMap(i => (i.kind === 'tool' ? [[i.label, i.status]] : []))
    assert.deepEqual(tools, [
      ['Use skill “polish-abstract”', 'ok'],
      ['Read references/limits.md of skill “polish-abstract”', 'ok'],
    ])

    // /polish-abstract on its own: the instructions go with the message, the panel shows the skill.
    let lastUser = ''
    faux.setResponses([
      context => {
        lastUser = JSON.stringify(context.messages.filter(m => m.role === 'user').at(-1))
        return fauxAssistantMessage(fauxText('Done.'))
      },
    ])
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: '', skill: 'polish-abstract' })).statusCode, 202)
    await idle()
    assert.match(lastUser, /<skill name=\\"polish-abstract\\">/)
    assert.match(lastUser, /references\/limits.md/)
    const user = (await state()).items.findLast(i => i.kind === 'user')
    assert.deepEqual(user?.kind === 'user' && [user.text, user.skill], ['', 'polish-abstract'])
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: '' })).statusCode, 400, 'an empty message')
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'x', skill: 'nope' })).statusCode, 400)

    // A new skill reaches the prompt at the next message; an unchanged list isn't repeated.
    await api('POST', '/me/ai/skills', admin, { name: 'shorten', description: 'Shorten any paragraph.', body: 'Cut.' })
    let sections = 0
    let sawNew = false
    faux.setResponses([
      context => {
        const sent = JSON.stringify(context)
        sawNew = sent.includes('shorten (personal): Shorten any paragraph.')
        sections = sent.split('ColTex gives you a skill library').length - 1
        return fauxAssistantMessage(fauxText('Ok.'))
      },
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'Thanks' })
    await idle()
    assert.ok(sawNew, 'the new skill is listed')
    assert.equal(sections, 2, 'the list was sent once at the start and once more after it changed')
    await api('DELETE', '/me/ai/skills/shorten', admin)
  })

  test('a skill the agent proposes is saved only when the person saves it', async () => {
    await api('POST', `/projects/${projectId}/ai/session/reset`, viewer)
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('propose_skill', { name: 'Not Valid', description: 'x', body: 'y' }), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxToolCall('propose_skill', { name: 'check-refs', description: 'Check that every \\ref has a \\label.', body: 'List missing labels.' }), {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage(fauxText('Here is a draft skill.')),
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, viewer, { text: 'Make that a skill' })
    await idle(viewer)
    const s = await state(viewer)
    const tools = s.items.flatMap(i => (i.kind === 'tool' ? [i.status] : []))
    assert.deepEqual(tools, ['error', 'ok'], 'an invalid name goes back to the model')
    const draft = s.items.find(i => i.kind === 'skill')!
    assert.equal(draft.kind === 'skill' && draft.saved, null)
    assert.deepEqual((await api('GET', '/me/ai/skills', viewer)).json(), [], 'nothing saved yet')

    const save = (scope: string, cookie = viewer) =>
      api('POST', `/projects/${projectId}/ai/session/skills/${draft.id}`, cookie, { scope, name: 'check-refs', description: 'Check refs.', body: 'List missing labels.' })
    assert.equal((await save('project')).statusCode, 403, 'viewers cannot add project skills')
    const saved = await save('personal')
    assert.equal(saved.statusCode, 201, saved.body)
    assert.equal(saved.json().description, 'Check refs.', 'saved as edited')
    const after = (await state(viewer)).items.find(i => i.id === draft.id)
    assert.equal(after?.kind === 'skill' && after.saved, 'personal')
    assert.equal((await save('personal')).statusCode, 409, 'saved once')
    assert.equal((await api('GET', '/me/ai/skills', viewer)).json().length, 1)
  })
})

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { eq, isNull } from 'drizzle-orm'
import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall, type FauxProviderHandle } from '@earendil-works/pi-ai'
import type { AiSessionState, AiSkill } from '@coltex/shared'
import { aiUsage, user } from '../src/db/schema.ts'
import { BUILTIN_SKILLS_DIR, SkillStore, readSkillZip } from '../src/ai/skills.ts'
import { SkillChatStore, SkillWorkshops } from '../src/ai/workshop.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 20))
  }
}

describe('Built-in skills and the skills chat', () => {
  let t: TestApp
  let admin: string
  let noAi: string
  let projectId: string
  let faux: FauxProviderHandle
  const api = (method: string, url: string, cookie: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url: `/api${url}`, headers: { cookie }, payload: payload as object })
  const chat = async (): Promise<AiSessionState> => (await api('GET', '/me/ai/skill-chat', admin)).json()
  const chatIdle = () => waitFor(async () => !(await chat()).running, 'the skills chat to finish')
  const session = async (): Promise<AiSessionState> => (await api('GET', `/projects/${projectId}/ai/session`, admin)).json()
  const sessionIdle = () => waitFor(async () => !(await session()).running, 'the agent to finish')

  before(async () => {
    t = await createTestApp({ builtinSkills: BUILTIN_SKILLS_DIR })
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = await api('POST', '/admin/invites', admin, { email: 'noai@lab.test' })
    noAi = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'No AI', email: 'noai@lab.test', password: 'Correct-horse-2' },
      }),
    )
    projectId = (await api('POST', '/projects', admin, { name: 'Paper' })).json().id
    faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1', reasoning: false }] })
    t.ai.models.setProvider(faux.provider)
  })

  after(async () => {
    await t?.close()
  })

  test('built-in skills are listed read-only, usable in projects, and replaced by a personal one of the same name', async () => {
    const list = (await api('GET', '/me/ai/skills', admin)).json() as AiSkill[]
    assert.ok(list.every(s => s.scope === 'builtin'))
    assert.deepEqual(
      list.filter(s => s.name === 'skill-creator').map(s => [s.name, s.scope, s.files.map(f => f.path)]),
      [['skill-creator', 'builtin', ['references/examples.md']]],
      'the licence file is not a reference file',
    )
    assert.ok(!list.some(s => s.files.some(f => /LICEN[CS]E/.test(f.path))))
    const creators = (skills: { name: string; scope: string }[]) => skills.filter(s => s.name === 'skill-creator').map(s => [s.name, s.scope])
    assert.equal((await api('PUT', '/me/ai/skills/skill-creator', admin, { name: 'skill-creator', description: 'x', body: 'y' })).statusCode, 404)
    assert.equal((await api('DELETE', '/me/ai/skills/skill-creator', admin)).statusCode, 404)
    const download = await api('GET', '/me/ai/skills/skill-creator/download', admin)
    assert.equal(download.statusCode, 200)
    const back = await readSkillZip(download.rawPayload, 'x')
    assert.deepEqual(Object.keys(back.skills[0]!.files), ['references/examples.md'])
    const file = await api('GET', '/me/ai/skills/skill-creator/files/references/examples.md', admin)
    assert.equal(file.statusCode, 200)
    assert.match(file.body, /^# Examples/)
    assert.equal((await api('GET', '/me/ai/skills/skill-creator/files/LICENSE.txt', admin)).statusCode, 404)
    assert.equal((await api('GET', '/me/ai/skills/skill-creator/files/references/examples.md', noAi)).statusCode, 403)

    const menu = async () => (await api('GET', `/projects/${projectId}/ai/skill-menu`, admin)).json() as { name: string; scope: string }[]
    assert.deepEqual(creators(await menu()), [['skill-creator', 'builtin']])
    await api('POST', '/me/ai/skills', admin, { name: 'skill-creator', description: 'My own way of writing skills.', body: 'Ask less.' })
    assert.deepEqual(creators(await menu()), [['skill-creator', 'personal']])
    assert.deepEqual(creators((await api('GET', '/me/ai/skills', admin)).json()), [['skill-creator', 'personal']], 'only the personal one is listed')
    await api('DELETE', '/me/ai/skills/skill-creator', admin)
    assert.deepEqual(creators((await api('GET', '/me/ai/skills', admin)).json()), [['skill-creator', 'builtin']])
  })

  test('the skills chat follows skill-creator, drafts skills with reference files, and saves them to the person’s skills', async () => {
    assert.equal((await api('GET', '/me/ai/skill-chat', noAi)).statusCode, 403)
    assert.equal((await api('POST', '/me/ai/skill-chat/messages', noAi, { text: 'Hi' })).statusCode, 403)

    let firstContext = ''
    faux.setResponses([
      context => {
        firstContext = JSON.stringify(context)
        return fauxAssistantMessage(fauxToolCall('list_files', {}), { stopReason: 'toolUse' })
      },
      fauxAssistantMessage(
        fauxToolCall('propose_skill', { name: 'thesis-terms', description: 'Keep terms consistent.', body: 'Read it.', files: [{ path: '../escape.md', content: 'x' }] }),
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage(
        fauxToolCall('propose_skill', {
          name: 'thesis-terms',
          description: 'Keep terminology consistent across the thesis. Use when revising chapters.',
          body: 'Read references/glossary.md first.',
          files: [{ path: 'references/glossary.md', content: 'dataset, not data set' }],
        }),
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage(fauxText('Here is a draft.')),
    ])
    assert.equal((await api('POST', '/me/ai/skill-chat/messages', admin, { text: 'A skill for my thesis terminology' })).statusCode, 202)
    await chatIdle()
    assert.match(firstContext, /skills assistant in ColTex/)
    assert.match(firstContext, /# Skill Creator/, 'skill-creator is in the prompt')
    assert.match(firstContext, /skill-creator \(built in\)/)
    const state = await chat()
    assert.deepEqual(
      state.items.flatMap(i => (i.kind === 'tool' ? [i.status] : [])),
      ['error', 'error', 'ok'],
      'no project tools here, and a path outside the skill goes back to the model',
    )
    const draft = state.items.find(i => i.kind === 'skill')!
    assert.ok(draft.kind === 'skill')
    assert.deepEqual(draft.files, { 'references/glossary.md': 'dataset, not data set' })

    const save = (id: string, replace = false) =>
      api('POST', `/me/ai/skill-chat/skills/${id}`, admin, { scope: 'personal', name: 'thesis-terms', description: draft.description, body: draft.body, replace })
    assert.equal((await api('POST', `/me/ai/skill-chat/skills/${draft.id}`, admin, { ...draft, scope: 'project' })).statusCode, 403)
    const saved = await save(draft.id)
    assert.equal(saved.statusCode, 201, saved.body)
    assert.deepEqual((saved.json() as AiSkill).files, [{ path: 'references/glossary.md', size: 21 }])

    // A new version under the same name: a conflict until the person says to replace it.
    faux.setResponses([
      fauxAssistantMessage(
        fauxToolCall('propose_skill', {
          name: 'thesis-terms',
          description: 'Keep terminology consistent across the thesis.',
          body: 'Read references/glossary.md and references/spelling.md first.',
          files: [
            { path: 'references/glossary.md', content: 'dataset; benchmark' },
            { path: 'references/spelling.md', content: 'British spelling' },
          ],
        }),
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage(fauxText('Updated.')),
    ])
    await api('POST', '/me/ai/skill-chat/messages', admin, { text: 'Add British spelling' })
    await chatIdle()
    const second = (await chat()).items.findLast(i => i.kind === 'skill')!
    assert.equal((await save(second.id)).statusCode, 409)
    const replaced = await save(second.id, true)
    assert.equal(replaced.statusCode, 201, replaced.body)
    assert.deepEqual(
      (replaced.json() as AiSkill).files.map(f => f.path),
      ['references/glossary.md', 'references/spelling.md'],
    )
    assert.equal(((await api('GET', '/me/ai/skills', admin)).json() as AiSkill[]).filter(s => s.name === 'thesis-terms').length, 1)

    // Saved with the person and reopened after a restart; usage counts against no project.
    const [me] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, 'admin@lab.test'))
    const fresh = () => new SkillWorkshops({ ai: t.ai, skills: new SkillStore(t.db, BUILTIN_SKILLS_DIR), chats: new SkillChatStore(t.db) })
    const reopened = (await fresh().get(me!.id)).state()
    assert.equal(reopened.items.length, (await chat()).items.length)
    assert.ok((await t.db.select().from(aiUsage).where(isNull(aiUsage.projectId))).length > 0)

    const reset = await api('POST', '/me/ai/skill-chat/reset', admin)
    assert.deepEqual(reset.json().items, [])
    assert.deepEqual((await fresh().get(me!.id)).state().items, [], 'a new chat forgets the old one')
  })

  test('in a project, drafted skills carry their reference files, and saving over an existing one asks first', async () => {
    faux.setResponses([
      fauxAssistantMessage(
        fauxToolCall('propose_skill', {
          name: 'thesis-terms',
          description: 'Project version.',
          body: 'Read references/glossary.md.',
          files: [{ path: 'references/glossary.md', content: 'term list' }],
        }),
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage(fauxText('Drafted.')),
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'Make that a skill' })
    await sessionIdle()
    const draft = (await session()).items.find(i => i.kind === 'skill')!
    const save = (scope: string, replace = false) =>
      api('POST', `/projects/${projectId}/ai/session/skills/${draft.id}`, admin, { scope, name: 'thesis-terms', description: 'Project version.', body: 'Read it.', replace })
    assert.equal((await save('personal')).statusCode, 409, 'the person already has thesis-terms')
    const project = await save('project')
    assert.equal(project.statusCode, 201, project.body)
    assert.deepEqual((project.json() as AiSkill).files, [{ path: 'references/glossary.md', size: 9 }])
    assert.equal((await api('GET', `/projects/${projectId}/ai/skills/thesis-terms/files/references/glossary.md`, admin)).body, 'term list')
  })
})

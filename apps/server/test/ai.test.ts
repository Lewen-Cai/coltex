import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall, getCurrentTools, type FauxProviderHandle, type Message } from '@earendil-works/pi-ai'
import type { AiSessionState, AiStreamEvent, CompileJob, CompileResult } from '@coltex/shared'
import { DbCredentialStore, SecretBox } from '../src/ai/credentials.ts'
import { aiCredentials, aiUsage } from '../src/db/schema.ts'
import { usagePeriod } from '../src/ai/service.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

async function waitFor(check: () => boolean | Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await new Promise(r => setTimeout(r, 20))
  }
}

const ORIGINAL_LINE = 'Hello, ColTex!'
const FIXED_LINE = String.raw`Hello, \textbf{ColTex}!`

const ok = (job: CompileJob): CompileResult => ({
  buildId: job.buildId,
  status: 'success',
  outputFiles: ['output.pdf'],
  diagnostics: [],
  durationMs: 1,
})
const withErrors = (job: CompileJob, n: number): CompileResult => ({
  ...ok(job),
  status: 'failure',
  diagnostics: Array.from({ length: n }, (_, i) => ({
    level: 'error' as const,
    message: `Undefined control sequence ${i}`,
    file: 'main.tex',
    line: 11,
    raw: '',
    source: 'latex' as const,
  })),
})

describe('secret storage', () => {
  test('sealed secrets round-trip and fail with the wrong key', () => {
    const box = new SecretBox('instance-secret')
    const sealed = box.seal('sk-very-secret')
    assert.ok(!sealed.includes('sk-very-secret'))
    assert.equal(box.open(sealed), 'sk-very-secret')
    assert.throws(() => new SecretBox('other-secret').open(sealed))
  })
})

describe('AI agent', () => {
  let t: TestApp
  let faux: FauxProviderHandle
  let admin = ''
  let editor = ''
  let viewer = ''
  let everyone = ''
  let projectId = ''
  let base = ''

  const api = (method: string, url: string, cookie: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url: `/api${url}`, headers: { cookie }, payload: payload as object })
  const readMain = async () => (await api('GET', `/projects/${projectId}/files/main.tex`, admin)).body
  const writeMain = (content: string) =>
    t.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/files/main.tex`,
      headers: { cookie: admin, 'content-type': 'text/plain' },
      payload: content,
    })
  const state = async (cookie = admin): Promise<AiSessionState> => (await api('GET', `/projects/${projectId}/ai/session`, cookie)).json()
  const idle = () => waitFor(async () => !(await state()).running, 'assistant to finish')

  /** A scripted fix: read the file, edit it, compile, then explain. */
  function scriptFix() {
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('read_file', { path: 'main.tex' }), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxToolCall('edit_file', { path: 'main.tex', old_text: ORIGINAL_LINE, new_text: FIXED_LINE }), {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage(fauxToolCall('compile', {}), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxText('I made ColTex bold. The build is clean now.')),
    ])
  }

  async function askForFix(wait = true) {
    scriptFix()
    const res = await api('POST', `/projects/${projectId}/ai/session/messages`, admin, {
      text: 'Fix the errors please',
      compile: { buildId: 'b-0', status: 'failure', diagnostics: withErrors({ buildId: 'b-0' } as CompileJob, 1).diagnostics },
      openFile: { path: 'main.tex', line: 11 },
    })
    assert.equal(res.statusCode, 202, res.body)
    if (wait) await idle()
  }

  before(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    // People get AI through a group; invitations can put them in one.
    everyone = (await api('POST', '/admin/ai/groups', admin, { name: 'Everyone', policy: { mode: 'all', providers: [], models: [] } })).json().id
    for (const [email, role] of [['editor@lab.test', 'editor'], ['viewer@lab.test', 'viewer']] as const) {
      const invite = await api('POST', '/admin/invites', admin, { email, aiGroupId: everyone })
      const cookie = cookieFrom(
        await t.app.inject({
          method: 'POST',
          url: `/api/invites/${invite.json().token}/accept`,
          payload: { name: role, email, password: 'Correct-horse-2' },
        }),
      )
      if (role === 'editor') editor = cookie
      else viewer = cookie
    }
    projectId = (await api('POST', '/projects', admin, { name: 'Paper' })).json().id
    await api('POST', `/projects/${projectId}/members`, admin, { email: 'editor@lab.test', role: 'editor' })
    await api('POST', `/projects/${projectId}/members`, admin, { email: 'viewer@lab.test', role: 'viewer' })
    base = await readMain()

    faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1', reasoning: false }, { id: 'faux-think', reasoning: true }] })
    t.ai.models.setProvider(faux.provider)
  })

  after(async () => {
    await t?.close()
  })

  beforeEach(async () => {
    t.compiler.result = ok
    await writeMain(base)
  })

  test('is on as soon as a provider is connected', async () => {
    const status = (await api('GET', '/ai/status', editor)).json()
    assert.equal(status.available, true, 'faux is connected in before()')
    assert.equal(status.model.id, 'faux-1', 'the first model while Auto is not set up')
    assert.equal(status.thinkingLevel, 'off', "faux-1 doesn't reason")
    assert.equal(status.auto.available, false)
    const think = status.models.find((m: { id: string }) => m.id === 'faux-think')
    assert.deepEqual(think.thinkingLevels, ['off', 'minimal', 'low', 'medium', 'high'], "pi-ai's levels for the model")
    assert.equal((await api('PUT', '/admin/ai/settings', editor, { auto: { judge: null, light: null, strong: null } })).statusCode, 403, 'only admins configure AI')
    assert.equal((await api('POST', '/admin/ai/groups', editor, { name: 'Mine', policy: { mode: 'all' } })).statusCode, 403)
  })

  test('access comes from AI groups, by provider or model; no group, no AI', async () => {
    const users = (await api('GET', '/admin/ai/users', admin)).json()
    const editorId = users.find((u: { email: string }) => u.email === 'editor@lab.test').userId
    assert.equal(users.find((u: { userId: string }) => u.userId === editorId).groupId, everyone, 'joined through the invitation')

    // Out of every group: no assistant (admins keep every model).
    await api('PUT', `/admin/ai/users/${editorId}/group`, admin, { groupId: null })
    assert.equal((await api('GET', '/ai/status', editor)).json().available, false)
    assert.equal((await api('GET', `/projects/${projectId}/ai/session`, editor)).statusCode, 403)
    assert.equal((await api('GET', '/ai/status', admin)).json().available, true, 'admins can always use every model')

    // A group with only faux-think: the first model (faux-1) isn't allowed, so it falls back.
    const only = (
      await api('POST', '/admin/ai/groups', admin, { name: 'Thinkers', policy: { mode: 'selected', providers: [], models: [{ provider: 'faux', id: 'faux-think' }] } })
    ).json()
    assert.equal((await api('PUT', `/admin/ai/users/${editorId}/group`, admin, { groupId: only.id })).statusCode, 200)
    let status = (await api('GET', '/ai/status', editor)).json()
    assert.equal(status.available, true)
    assert.deepEqual(status.models.map((m: { id: string }) => m.id), ['faux-think'])
    assert.equal(status.model.id, 'faux-think')
    assert.equal(status.thinkingLevel, 'medium')
    const pick = await api('PUT', '/ai/preference', editor, { model: { provider: 'faux', id: 'faux-1' }, thinkingLevel: 'off' })
    assert.equal(pick.statusCode, 403, 'models outside the group cannot be picked')
    const groups = (await api('GET', '/admin/ai/groups', admin)).json()
    assert.deepEqual(groups.map((g: { name: string; members: number }) => [g.name, g.members]), [['Everyone', 1], ['Thinkers', 1]])

    // Changing the group changes what its members get; deleting it leaves them without AI.
    await api('PUT', `/admin/ai/groups/${only.id}`, admin, { name: 'Thinkers', policy: { mode: 'selected', providers: ['faux'], models: [] } })
    status = (await api('GET', '/ai/status', editor)).json()
    assert.equal(status.models.length, 2)
    assert.equal((await api('DELETE', `/admin/ai/groups/${only.id}`, admin)).statusCode, 204)
    assert.equal((await api('GET', '/ai/status', editor)).json().available, false)
    await api('PUT', `/admin/ai/users/${editorId}/group`, admin, { groupId: everyone })
    assert.equal((await api('GET', `/projects/${projectId}/ai/session`, editor)).statusCode, 200)
  })

  test('people pick their model and thinking level, clamped to what the model supports', async () => {
    let res = await api('PUT', '/ai/preference', viewer, { model: { provider: 'faux', id: 'faux-think' }, thinkingLevel: 'max' })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().model.id, 'faux-think')
    assert.equal(res.json().thinkingLevel, 'high', 'max is clamped to the strongest level faux-think has')
    assert.equal((await api('GET', '/ai/status', viewer)).json().thinkingLevel, 'high', 'kept for next time')
    res = await api('PUT', '/ai/preference', viewer, { model: { provider: 'faux', id: 'faux-1' }, thinkingLevel: 'high' })
    assert.equal(res.json().thinkingLevel, 'off', "faux-1 doesn't reason")

    // A message can carry its own pick; the agent gets that model and level.
    const seen: { model?: string; reasoning?: string } = {}
    faux.setResponses([
      (_context, options, _state, model) => {
        seen.model = model.id
        seen.reasoning = options?.reasoning
        return fauxAssistantMessage(fauxText('Thinking hard.'))
      },
    ])
    await api('POST', `/projects/${projectId}/ai/session/reset`, viewer)
    const sent = await api('POST', `/projects/${projectId}/ai/session/messages`, viewer, {
      text: 'What is \\frac?',
      preference: { model: { provider: 'faux', id: 'faux-think' }, thinkingLevel: 'low' },
    })
    assert.equal(sent.statusCode, 202, sent.body)
    await waitFor(async () => !(await state(viewer)).running, 'assistant to finish')
    assert.deepEqual(seen, { model: 'faux-think', reasoning: 'low' })
    await api('POST', `/projects/${projectId}/ai/session/reset`, viewer)
  })

  test('the agent drafts a fix, trial-compiles it, and never touches the project', async () => {
    await askForFix()
    const s = await state()
    assert.equal(await readMain(), base, 'project file unchanged before applying')
    assert.equal(s.changes.files.length, 1)
    const [file] = s.changes.files
    assert.equal(file!.path, 'main.tex')
    assert.equal(file!.base, base)
    assert.ok(file!.proposed.includes(FIXED_LINE))
    assert.deepEqual(s.changes.trial && { status: s.changes.trial.status, errors: s.changes.trial.errors }, { status: 'success', errors: 0 })

    const trialJob = t.compileJobs.at(-1)!
    assert.ok(trialJob.overlay, 'trial compile used an overlay')
    assert.ok(trialJob.overlay['main.tex']!.includes(FIXED_LINE))

    const kinds = s.items.map(i => (i.kind === 'tool' ? `tool:${i.name}:${i.status}` : i.kind))
    assert.deepEqual(kinds, ['user', 'tool:read_file:ok', 'tool:edit_file:ok', 'tool:compile:ok', 'assistant', 'changes'])
    const card = s.items.at(-1)!
    assert.deepEqual(card.kind === 'changes' && card.files, [{ path: 'main.tex', kind: 'modified', added: 1, removed: 1 }], 'the turn card counts lines')
    assert.equal(s.changes.turn?.base['main.tex'], base, 'the "this turn" diff starts from the text before the turn')
    const user = s.items[0]!
    assert.ok(user.kind === 'user' && user.attachments.includes('1 compile error'))

    // The preference test before this one used faux-think.
    const rows = (await t.db.select().from(aiUsage)).filter(r => r.model === 'faux-1')
    assert.equal(rows.length, 4, 'usage recorded per model response')
  })

  test("compile doesn't queue a build that would repeat one", async () => {
    // The draft from the test before is unchanged since its trial build.
    const jobs = t.compileJobs.length
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('compile', {}), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxText('Still clean.')),
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'check again' })
    await idle()
    assert.equal(t.compileJobs.length, jobs, 'the same draft is not built twice')
    const step = (await state()).items.findLast(i => i.kind === 'tool')
    assert.ok(step?.kind === 'tool' && step.result?.includes("hasn't changed"), JSON.stringify(step))

    // No draft, and the author's build is attached: read its log instead.
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('compile', {}), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxText('Reading the log.')),
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, {
      text: 'why does it fail?',
      compile: { buildId: 'b-0', status: 'failure', diagnostics: [] },
    })
    await idle()
    assert.equal(t.compileJobs.length, jobs, "the author's files are not built again")

    // The next tests apply the scripted fix.
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    await askForFix()
  })

  test('applying writes the merged change, snapshots first, and can be undone', async () => {
    const proposed = (await state()).changes.files[0]!.proposed
    // A collaborator edits elsewhere in the file after the assistant read it.
    await writeMain(base.replace('\\title{Untitled}', '\\title{Results}'))

    const res = await api('POST', `/projects/${projectId}/ai/session/apply`, admin, { files: [{ path: 'main.tex', content: proposed }] })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().outcome, 'applied')
    const merged = await readMain()
    assert.ok(merged.includes(FIXED_LINE), 'assistant change applied')
    assert.ok(merged.includes('\\title{Results}'), 'collaborator change kept')

    const s = await state()
    assert.equal(s.changes.files.length, 0)
    assert.ok(s.lastApplied)
    const snapshot = await t.snapshots.readFile(projectId, s.lastApplied.snapshot, 'main.tex')
    assert.equal(snapshot?.toString(), base.replace('\\title{Untitled}', '\\title{Results}'), 'snapshot holds the pre-apply file')

    const undo = await api('POST', `/projects/${projectId}/ai/session/undo`, admin)
    assert.equal(undo.statusCode, 200, undo.body)
    const restored = await readMain()
    assert.ok(!restored.includes(FIXED_LINE), 'assistant change undone')
    assert.ok(restored.includes('\\title{Results}'), 'collaborator change still kept')
  })

  test('changes that make the build worse are rolled back automatically', async () => {
    await askForFix()
    const proposed = (await state()).changes.files[0]!.proposed
    // Before applying: clean build. After applying: 3 errors.
    let realBuilds = 0
    t.compiler.result = job => {
      if (job.overlay) return ok(job)
      realBuilds++
      return realBuilds === 2 ? withErrors(job, 3) : ok(job)
    }
    const res = await api('POST', `/projects/${projectId}/ai/session/apply`, admin, { files: [{ path: 'main.tex', content: proposed }] })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().outcome, 'reverted')
    assert.deepEqual([res.json().before.errors, res.json().after.errors], [0, 3])
    assert.equal(await readMain(), base, 'file restored')
  })

  test('overlapping edits by others since the draft are a conflict, and nothing is applied', async () => {
    await askForFix()
    const proposed = (await state()).changes.files[0]!.proposed
    await writeMain(base.replace(ORIGINAL_LINE, 'Hello, world!'))
    const res = await api('POST', `/projects/${projectId}/ai/session/apply`, admin, { files: [{ path: 'main.tex', content: proposed }] })
    assert.equal(res.statusCode, 409, res.body)
    assert.ok((await readMain()).includes('Hello, world!'))
    assert.ok(!(await readMain()).includes(FIXED_LINE))
  })

  test('auto applies the draft when the turn ends; full access also deletes and moves at once', async () => {
    const put = (path: string, content: string) =>
      t.app.inject({ method: 'PUT', url: `/api/projects/${projectId}/files/${path}`, headers: { cookie: admin, 'content-type': 'text/plain' }, payload: content })
    const seen: { tools: string[]; text: string }[] = []
    // The tools the model may call are declared by the transcript's system messages.
    const watch = (reply: ReturnType<typeof fauxAssistantMessage>) => (context: { messages: Message[] }) => {
      const last = context.messages.findLast(m => m.role === 'user')
      seen.push({ tools: getCurrentTools(context.messages).map(x => x.name), text: JSON.stringify(last?.content ?? '') })
      return reply
    }
    try {
      assert.deepEqual((await api('PUT', '/ai/permission', admin, { permission: 'auto' })).json(), { permission: 'auto' })
      await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
      faux.setResponses([
        watch(fauxAssistantMessage(fauxToolCall('edit_file', { path: 'main.tex', old_text: ORIGINAL_LINE, new_text: FIXED_LINE }), { stopReason: 'toolUse' })),
        fauxAssistantMessage(fauxText('Done.')),
      ])
      await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'Make ColTex bold' })
      await idle()
      let s = await state()
      assert.equal(s.changes.files.length, 0, 'nothing left in the draft')
      assert.ok((await readMain()).includes(FIXED_LINE), 'applied without review')
      assert.deepEqual(s.lastApplied?.files, ['main.tex'])
      assert.match(seen[0]!.text, /Permission: auto/)
      assert.ok(seen[0]!.tools.includes('edit_file') && !seen[0]!.tools.includes('delete_file'))

      await put('old.tex', 'Old text.\n')
      await put('figs/a.tex', 'A\n')
      await api('PUT', '/ai/permission', admin, { permission: 'full' })
      faux.setResponses([
        watch(fauxAssistantMessage(fauxToolCall('edit_file', { path: 'old.tex', old_text: 'Old text.', new_text: 'New text.' }), { stopReason: 'toolUse' })),
        fauxAssistantMessage(fauxToolCall('move_file', { from: 'old.tex', to: 'chapters/one.tex' }), { stopReason: 'toolUse' }),
        fauxAssistantMessage(fauxToolCall('delete_file', { path: 'figs' }), { stopReason: 'toolUse' }),
        fauxAssistantMessage(fauxText('Tidied up.')),
      ])
      await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'Tidy the files' })
      await idle()
      assert.match(seen[1]!.text, /Permission: full access/)
      assert.ok(seen[1]!.tools.includes('delete_file') && seen[1]!.tools.includes('move_file'))
      const file = (p: string) => api('GET', `/projects/${projectId}/files/${p}`, admin)
      assert.equal((await file('chapters/one.tex')).body, 'New text.\n', 'moved, and the draft edit followed and was applied')
      assert.equal((await file('old.tex')).statusCode, 404)
      assert.equal((await file('figs/a.tex')).statusCode, 404)
      s = await state()
      const card = s.items.findLast(i => i.kind === 'changes')
      assert.ok(card?.kind === 'changes')
      assert.deepEqual(
        card.files.map(f => [f.kind, f.path, f.to]),
        [
          ['moved', 'old.tex', 'chapters/one.tex'],
          ['deleted', 'figs/', undefined],
          ['modified', 'chapters/one.tex', undefined],
        ],
      )
    } finally {
      await api('PUT', '/ai/permission', admin, { permission: 'manual' })
      for (const p of ['chapters', 'figs', 'old.tex']) await api('DELETE', `/projects/${projectId}/${p.endsWith('.tex') ? 'files' : 'folders'}/${p}`, admin)
      await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    }
  })

  test('Stop ends an automatic apply that is still building', async () => {
    const realBuilds = () => t.compileJobs.filter(j => j.projectId === projectId && !j.overlay).length
    const hold = (n: number) => {
      const start = realBuilds()
      t.compiler.wait = job => (job.overlay || realBuilds() - start <= n ? Promise.resolve() : new Promise(() => {}))
    }
    const notices = async () => (await state()).items.flatMap(i => (i.kind === 'notice' ? [i.text] : []))
    try {
      await api('PUT', '/ai/permission', admin, { permission: 'auto' })
      // Stopped while the build before applying runs: nothing is applied, the draft stays.
      await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
      hold(0)
      await askForFix(false)
      await waitFor(async () => realBuilds() > 0 && (await state()).running, 'the build before applying')
      await api('POST', `/projects/${projectId}/ai/session/abort`, admin)
      await idle()
      assert.ok(!(await readMain()).includes(FIXED_LINE), 'not applied')
      assert.equal((await state()).changes.files.length, 1, 'the draft stays')
      assert.ok((await notices()).includes('Stopped; the draft was not applied'))

      // Stopped while the build after applying runs: the change stays, and Undo can take it back.
      await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
      hold(1)
      await askForFix(false)
      await waitFor(async () => (await readMain()).includes(FIXED_LINE), 'the draft to be written')
      await api('POST', `/projects/${projectId}/ai/session/abort`, admin)
      await idle()
      const s = await state()
      assert.equal(s.changes.files.length, 0)
      assert.deepEqual(s.lastApplied?.files, ['main.tex'])
      assert.ok((await notices()).includes('Applied changes to main.tex; stopped before the build finished.'))
    } finally {
      t.compiler.wait = () => Promise.resolve()
      await api('PUT', '/ai/permission', admin, { permission: 'manual' })
      await writeMain(base)
      await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    }
  })

  test('discarding drops the draft and tells the assistant next time', async () => {
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    await askForFix()
    assert.equal((await state()).changes.files.length, 1)
    await api('POST', `/projects/${projectId}/ai/session/discard`, admin)
    assert.equal((await state()).changes.files.length, 0)

    let sawNote = false
    faux.setResponses([
      (context) => {
        const last = context.messages.at(-1)
        const text = typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content)
        sawNote = text.includes('discarded your draft')
        return fauxAssistantMessage(fauxText('Understood.'))
      },
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'ok' })
    await idle()
    assert.ok(sawNote, 'the next prompt mentions the discard')
  })

  test('conversations are saved and can be reopened, renamed, compacted and deleted', async () => {
    const say = async (text: string, reply: Parameters<FauxProviderHandle['setResponses']>[0][number]) => {
      faux.setResponses([reply])
      assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text })).statusCode, 202)
      await idle()
    }
    const list = async () => (await api('GET', `/projects/${projectId}/ai/conversations`, admin)).json() as { id: string; title: string; messages: number; current: boolean }[]
    const before = (await list()).length
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    await say('What is the first question?', fauxAssistantMessage(fauxText('Answer one.')))
    const first = (await state()).id
    assert.ok((await state()).contextTokens === null || (await state()).contextTokens! > 0)
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    assert.equal((await list()).length, before + 1, 'an empty new chat is not saved')
    await say('And the second?', fauxAssistantMessage(fauxText('Answer two.')))

    let chats = await list()
    assert.equal(chats.length, before + 2)
    assert.deepEqual([chats[0]!.title, chats[0]!.current, chats[0]!.messages], ['And the second?', true, 1])
    assert.equal(chats[1]!.id, first)
    // Someone else's conversations are their own.
    assert.equal((await api('GET', `/projects/${projectId}/ai/conversations`, editor)).json().some((c: { id: string }) => c.id === first), false)
    assert.equal((await api('POST', `/projects/${projectId}/ai/conversations/${first}/open`, editor)).statusCode, 404)

    // Reopened, the model sees the earlier exchange.
    const opened = (await api('POST', `/projects/${projectId}/ai/conversations/${first}/open`, admin)).json() as AiSessionState
    assert.equal(opened.id, first)
    assert.ok(opened.items.some(i => i.kind === 'assistant' && i.text === 'Answer one.'))
    let remembered = false
    await say('Go on', context => {
      remembered = JSON.stringify(context.messages).includes('Answer one.')
      return fauxAssistantMessage(fauxText('Going on.'))
    })
    assert.ok(remembered, 'the reopened transcript goes to the model')

    assert.equal((await api('PUT', `/projects/${projectId}/ai/conversations/${first}`, admin, { title: 'Questions' })).statusCode, 204)
    assert.equal((await list()).find(c => c.id === first)!.title, 'Questions')

    // /compact: the summary replaces the transcript; the panel keeps its items.
    faux.setResponses([fauxAssistantMessage(fauxText('SUMMARY: two questions answered.'))])
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/compact`, admin, {})).statusCode, 202)
    await idle()
    const compacted = await state()
    assert.ok(compacted.items.some(i => i.kind === 'compacted'), JSON.stringify(compacted.items.at(-1)))
    assert.ok(compacted.items.some(i => i.kind === 'user' && i.text === 'Go on'))
    let sent = ''
    await say('Next', context => {
      sent = JSON.stringify(context)
      return fauxAssistantMessage(fauxText('Next.'))
    })
    assert.ok(sent.includes('SUMMARY: two questions answered.'), 'the summary is in the prompt')
    assert.ok(!sent.includes('Answer one.'), 'the old messages are not')

    // Deleting the open conversation starts a new one.
    assert.equal((await api('DELETE', `/projects/${projectId}/ai/conversations/${first}`, admin)).statusCode, 204)
    chats = await list()
    assert.ok(!chats.some(c => c.id === first))
    const now = await state()
    assert.notEqual(now.id, first)
    assert.equal(now.items.length, 0)
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/compact`, admin, {})).statusCode, 400, 'nothing to compact')
  })

  test('edits that do not match are reported back to the model, not applied', async () => {
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('edit_file', { path: 'main.tex', old_text: 'not in the file', new_text: 'x' }), {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage(fauxToolCall('edit_file', { path: '../etc/passwd', old_text: 'root', new_text: 'x' }), {
        stopReason: 'toolUse',
      }),
      fauxAssistantMessage(fauxText('I could not find it.')),
    ])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'edit' })
    await idle()
    const s = await state()
    const tools = s.items.filter(i => i.kind === 'tool')
    assert.deepEqual(
      tools.map(i => i.kind === 'tool' && i.status),
      ['error', 'error'],
    )
    assert.equal(s.changes.files.length, 0)
  })

  test('the event stream starts with a snapshot and streams text', async () => {
    await api('POST', `/projects/${projectId}/ai/session/reset`, admin)
    const port = (t.app.server.address() as AddressInfo).port
    const controller = new AbortController()
    const res = await fetch(`http://127.0.0.1:${port}/api/projects/${projectId}/ai/session/events`, {
      headers: { cookie: admin },
      signal: controller.signal,
    })
    assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8')
    const events: AiStreamEvent[] = []
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const pump = (async () => {
      for (;;) {
        const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }))
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        let i
        while ((i = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, i)
          buffer = buffer.slice(i + 2)
          if (chunk.startsWith('data: ')) events.push(JSON.parse(chunk.slice(6)))
        }
      }
    })()
    await waitFor(() => events.length > 0, 'snapshot')
    assert.equal(events[0]!.type, 'snapshot')

    faux.setResponses([fauxAssistantMessage(fauxText('Streaming works.'))])
    await api('POST', `/projects/${projectId}/ai/session/messages`, admin, { text: 'hi' })
    await waitFor(() => events.some(e => e.type === 'running' && !e.running), 'run to end')
    const streamed = events.flatMap(e => (e.type === 'delta' ? [e.text] : [])).join('')
    assert.equal(streamed, 'Streaming works.')
    controller.abort()
    await pump
  })

  test('API keys entered by the admin are stored encrypted and can be removed', async () => {
    const start = await api('POST', '/admin/ai/providers/deepseek/login', admin, { type: 'api_key' })
    assert.equal(start.statusCode, 200, start.body)
    let login = start.json()
    await waitFor(async () => {
      login = (await api('GET', `/admin/ai/logins/${login.id}`, admin)).json()
      return !!login.prompt
    }, 'key prompt')
    assert.equal(login.prompt.type, 'secret')
    login = (await api('POST', `/admin/ai/logins/${login.id}/answer`, admin, { promptId: login.prompt.id, value: 'sk-test-123' })).json()
    await waitFor(async () => (await api('GET', `/admin/ai/logins/${login.id}`, admin)).json().status === 'done', 'login done')

    const [row] = await t.db.select().from(aiCredentials)
    assert.equal(row!.providerId, 'deepseek')
    assert.ok(!row!.secret.includes('sk-test-123'), 'stored encrypted')
    const store = new DbCredentialStore(t.db, new SecretBox('test-secret'))
    assert.deepEqual(await store.read('deepseek'), { type: 'api_key', key: 'sk-test-123' })

    const providers = (await api('GET', '/admin/ai', admin)).json().providers
    const deepseek = providers.find((p: { id: string }) => p.id === 'deepseek')
    assert.deepEqual([deepseek.stored, deepseek.configured?.type], [true, 'api_key'])
    assert.ok(providers.some((p: { id: string; oauth: unknown }) => p.id === 'anthropic' && p.oauth), 'subscription sign-in offered')

    assert.equal((await api('DELETE', '/admin/ai/providers/deepseek/credential', admin)).statusCode, 204)
    assert.equal((await t.db.select().from(aiCredentials)).length, 0)
  })

  test('custom OpenAI-compatible endpoints become providers with models', async () => {
    const res = await api('PUT', '/admin/ai/settings', admin, {
      customProviders: [{ id: 'custom-lab', name: 'Lab GPU', baseUrl: 'http://gpu.lab:8000/v1', models: [{ id: 'qwen3-32b' }] }],
    })
    assert.equal(res.statusCode, 200, res.body)
    const lab = (await api('GET', '/admin/ai', admin)).json().providers.find((p: { id: string }) => p.id === 'custom-lab')
    assert.equal(lab.custom, true)
    assert.equal(lab.configured.type, 'api_key', 'keyless endpoints count as configured')
    const models = (await api('GET', '/admin/ai/models', admin)).json()
    assert.ok(models.some((m: { provider: string; id: string }) => m.provider === 'custom-lab' && m.id === 'qwen3-32b'))
    await api('PUT', '/admin/ai/settings', admin, { customProviders: [] })
  })

  test('usage is reported in total, per day, per model and per person', async () => {
    const report = (await api('GET', '/admin/ai/usage?days=30', admin)).json()
    assert.equal(report.byDay.length, 30)
    assert.ok(report.totals.requests > 0)
    assert.equal(report.byDay.reduce((n: number, d: { requests: number }) => n + d.requests, 0), report.totals.requests)
    assert.ok(report.byModel.some((m: { provider: string; model: string }) => m.provider === 'faux' && m.model === 'faux-1'))

    const users = (await api('GET', '/admin/ai/users?days=30', admin)).json()
    assert.equal(users.length, 3, 'everyone is listed, with or without usage')
    const me = users.find((u: { email: string }) => u.email === 'admin@lab.test')
    assert.ok(me.requests > 0)
    assert.ok(me.lastUsedAt)
    const mine = (await api('GET', `/admin/ai/usage?days=30&userId=${me.userId}`, admin)).json()
    assert.equal(mine.totals.requests, me.requests)
    assert.equal((await api('GET', '/admin/ai/usage', editor)).statusCode, 403)
  })

  test('viewers get a read-only assistant that looks things up but cannot draft or apply', async () => {
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall('edit_file', { path: 'main.tex', old_text: ORIGINAL_LINE, new_text: FIXED_LINE }), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxToolCall('texlive_doc', { name: 'booktabs', query: 'toprule' }), { stopReason: 'toolUse' }),
      fauxAssistantMessage(fauxText('Use \\toprule, \\midrule and \\bottomrule.')),
    ])
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, viewer, { text: 'How do booktabs rules work?' })).statusCode, 202)
    await waitFor(async () => !(await state(viewer)).running, 'viewer assistant to finish')
    const s = await state(viewer)
    const tools = s.items.flatMap(i => (i.kind === 'tool' ? [i] : []))
    // edit_file isn't offered to viewers, so the call fails; the manual lookup works.
    assert.deepEqual(tools.map(i => [i.name, i.status]), [['edit_file', 'error'], ['texlive_doc', 'ok']])
    assert.match(tools[1]!.label, /booktabs manual/)
    assert.equal(s.changes.files.length, 0)
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/apply`, viewer, { files: [{ path: 'main.tex', content: 'x' }] })).statusCode, 403)
    assert.equal((await api('POST', `/projects/${projectId}/ai/session/undo`, viewer)).statusCode, 403)
  })

  test('AI groups limit what each member uses per period', async () => {
    const users = (await api('GET', '/admin/ai/users?days=30', admin)).json()
    const viewerId = users.find((u: { email: string }) => u.email === 'viewer@lab.test').userId
    const policy = { mode: 'all', providers: [], models: [] }
    assert.equal((await api('GET', '/ai/allowance', viewer)).json(), null, 'no limits, nothing to show')

    // Usage so far (earlier tests), read with limits nobody reaches.
    await api('PUT', `/admin/ai/groups/${everyone}`, admin, { name: 'Everyone', policy, limits: { period: 'month', tokens: 1e9, cost: 1e5 } })
    try {
      const baseline = (await api('GET', '/ai/allowance', viewer)).json()
      const limits = { period: 'month', tokens: baseline.usedTokens + 10_000, cost: baseline.usedCost + 2 }
      const limited = await api('PUT', `/admin/ai/groups/${everyone}`, admin, { name: 'Everyone', policy, limits })
      assert.equal(limited.statusCode, 200, limited.body)
      assert.deepEqual(limited.json().limits, limits)
      const usage = (input: number, output: number, cost: number) => ({
        input,
        output,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: input + output,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: cost },
      })
      await t.ai.recordUsage({ userId: viewerId, projectId: null, provider: 'faux', model: 'faux-1', usage: usage(6000, 3000, 0.5) })
      const before = (await api('GET', '/ai/allowance', viewer)).json()
      assert.equal(before.exceeded, false)
      assert.equal(before.usedTokens, baseline.usedTokens + 9000)
      assert.ok(new Date(before.resetsAt) > new Date())

      // Crossing the cost limit stops the next message, with when it resets.
      await t.ai.recordUsage({ userId: viewerId, projectId: null, provider: 'faux', model: 'faux-1', usage: usage(10, 10, 1.6) })
      assert.equal((await api('GET', '/ai/allowance', viewer)).json().exceeded, true)
      const refused = await api('POST', `/projects/${projectId}/ai/session/messages`, viewer, { text: 'One more question' })
      assert.equal(refused.statusCode, 403)
      assert.match(refused.json().error, /reached your AI usage limit for this month\. It resets on \d{4}-\d{2}-\d{2}/)
      // Admins have no limits.
      assert.equal((await api('GET', '/ai/allowance', admin)).json(), null)
    } finally {
      await api('PUT', `/admin/ai/groups/${everyone}`, admin, { name: 'Everyone', policy })
    }
    assert.equal((await api('GET', '/ai/allowance', viewer)).json(), null)
    assert.equal((await api('PUT', `/admin/ai/groups/${everyone}`, admin, { name: 'Everyone', policy, limits: { period: 'year', tokens: 1 } })).statusCode, 400)
  })

  test('one person’s own model access and limit replace their group’s', async () => {
    const users = (await api('GET', '/admin/ai/users?days=30', admin)).json()
    const viewerId = users.find((u: { email: string }) => u.email === 'viewer@lab.test').userId
    const custom = (body: unknown) => api('PUT', `/admin/ai/users/${viewerId}/custom`, admin, body)
    try {
      const used = { input: 5, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 10, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }
      await t.ai.recordUsage({ userId: viewerId, projectId: null, provider: 'faux', model: 'faux-1', usage: used })
      // Only faux-think, and a tiny limit already reached, while the group allows everything without limits.
      const set = await custom({ policy: { mode: 'selected', providers: [], models: [{ provider: 'faux', id: 'faux-think' }] }, limits: { period: 'day', tokens: 1, cost: null } })
      assert.equal(set.statusCode, 200, set.body)
      assert.deepEqual((await api('GET', '/ai/status', viewer)).json().models.map((m: { id: string }) => m.id), ['faux-think'])
      const allowance = (await api('GET', '/ai/allowance', viewer)).json()
      assert.deepEqual([allowance.period, allowance.tokens, allowance.exceeded], ['day', 1, true])
      const row = (await api('GET', '/admin/ai/users?days=30', admin)).json().find((u: { userId: string }) => u.userId === viewerId)
      assert.equal(row.custom.limits.tokens, 1)
      assert.equal(row.custom.policy.mode, 'selected')

      // Only the limit: the group's models again. No limit at all overrides a group's limit too.
      await custom({ policy: null, limits: { period: 'month', tokens: null, cost: null } })
      assert.equal((await api('GET', '/ai/status', viewer)).json().models.length, 2)
      assert.equal((await api('GET', '/ai/allowance', viewer)).json(), null)

      // Custom access works without a group.
      await api('PUT', `/admin/ai/users/${viewerId}/group`, admin, { groupId: null })
      assert.equal((await api('GET', '/ai/status', viewer)).json().available, false)
      await custom({ policy: { mode: 'all', providers: [], models: [] }, limits: null })
      assert.equal((await api('GET', '/ai/status', viewer)).json().available, true)
      assert.equal((await custom({ policy: null, limits: null })).statusCode, 200)
      assert.equal((await api('GET', '/ai/status', viewer)).json().available, false)
      assert.equal((await api('PUT', '/admin/ai/users/nobody/custom', admin, { policy: null, limits: null })).statusCode, 404)
      assert.equal((await api('PUT', `/admin/ai/users/${viewerId}/custom`, viewer, { policy: null, limits: null })).statusCode, 403)
    } finally {
      await custom({ policy: null, limits: null })
      await api('PUT', `/admin/ai/users/${viewerId}/group`, admin, { groupId: everyone })
    }
  })

  test('usage periods are calendar days, weeks from Monday and months', () => {
    const at = new Date(2026, 9, 22, 15, 30) // Thursday 22 October 2026
    const day = usagePeriod('day', at)
    assert.deepEqual([day.start, day.end], [new Date(2026, 9, 22), new Date(2026, 9, 23)])
    const week = usagePeriod('week', at)
    assert.deepEqual([week.start, week.end], [new Date(2026, 9, 19), new Date(2026, 9, 26)])
    const sunday = usagePeriod('week', new Date(2026, 9, 25, 23))
    assert.deepEqual(sunday.start, new Date(2026, 9, 19))
    const month = usagePeriod('month', at)
    assert.deepEqual([month.start, month.end], [new Date(2026, 9, 1), new Date(2026, 10, 1)])
    assert.deepEqual(usagePeriod('month', new Date(2026, 11, 31)).end, new Date(2027, 0, 1))
  })

  test('auto routing asks the judge, and short follow-ups keep the tier', async () => {
    const ref = (id: string) => ({ provider: 'faux', id })
    assert.equal((await api('PUT', '/admin/ai/settings', admin, { auto: { judge: ref('faux-1'), light: ref('faux-1'), strong: ref('faux-think') } })).statusCode, 200)
    const fresh = (await api('GET', '/ai/status', admin)).json()
    assert.equal(fresh.auto.on, true, 'people who never picked a model start on Auto')
    const res = await api('PUT', '/ai/preference', editor, { model: ref('faux-1'), thinkingLevel: 'off', auto: true })
    assert.equal(res.statusCode, 200, res.body)
    assert.deepEqual(res.json().auto.on, true)

    const judged: string[] = []
    const answered: string[] = []
    const judge = (tier: string) => (context: { messages: unknown[] }) => {
      judged.push(JSON.stringify(context.messages))
      return fauxAssistantMessage(`<tier>${tier}</tier>`)
    }
    const answer = (_c: unknown, options: { reasoning?: string } | undefined, _s: unknown, model: { id: string }) => {
      answered.push(`${model.id}:${options?.reasoning ?? 'off'}`)
      return fauxAssistantMessage('Done.')
    }
    faux.setResponses([judge('light'), answer, judge('strong'), answer])
    await api('POST', `/projects/${projectId}/ai/session/reset`, editor)
    for (const text of ['How do I make text bold?', '继续']) {
      assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, editor, { text })).statusCode, 202)
      await waitFor(async () => !(await state(editor)).running, 'assistant to finish')
    }
    assert.deepEqual(answered, ['faux-1:off', 'faux-think:high'], 'light gets a quick answer, strong thinks hard')
    assert.ok(judged[1]!.includes('classified as light'), 'the judge hears the previous tier')
    const notices = (await state(editor)).items.flatMap(i => (i.kind === 'notice' ? [i.text] : []))
    assert.deepEqual(notices, ['Auto: faux-1 for a quick answer', 'Auto: faux-think for this task'])
    await api('PUT', '/ai/preference', editor, { model: ref('faux-1'), thinkingLevel: 'off', auto: false })
  })

  test('a provider that keeps failing is skipped for another model, and admins see why', async () => {
    const backup = fauxProvider({ provider: 'faux-backup', models: [{ id: 'backup-1' }] })
    t.ai.models.setProvider(backup.provider)
    const send = async (text: string) => {
      assert.equal((await api('POST', `/projects/${projectId}/ai/session/messages`, editor, { text })).statusCode, 202)
      await waitFor(async () => !(await state(editor)).running, 'assistant to finish')
    }
    await api('POST', `/projects/${projectId}/ai/session/reset`, editor)
    faux.setResponses(Array.from({ length: 3 }, () => fauxAssistantMessage('', { stopReason: 'error', errorMessage: '429 rate limited' })))
    for (let i = 0; i < 3; i++) await send(`try ${i}`)
    const health = (await api('GET', '/admin/ai', admin)).json().providers.find((p: { id: string }) => p.id === 'faux').health
    assert.equal(health.state, 'open')
    assert.equal(health.lastError, '429 rate limited')

    let answeredBy = ''
    backup.setResponses([
      (_c, _o, _s, model) => {
        answeredBy = model.id
        return fauxAssistantMessage('Backup here.')
      },
    ])
    await send('try again')
    assert.equal(answeredBy, 'backup-1')
    const last = (await state(editor)).items.filter(i => i.kind === 'notice').at(-1)
    assert.ok(last?.kind === 'notice' && last.text.includes('keeps failing; backup-1 answers'), JSON.stringify(last))
    t.ai.health.reset('faux')
  })
})

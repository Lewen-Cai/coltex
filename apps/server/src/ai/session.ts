import { Agent } from '@earendil-works/pi-agent-core'
import {
  OUTPUT,
  type AiApplyBody,
  type AiApplyResult,
  type AiCompileSummary,
  type AiItem,
  type AiMessageBody,
  type AiPreference,
  type AiSaveProposedSkill,
  type AiSessionState,
  type AiSkill,
  type CompileResult,
  type ProjectMeta,
} from '@coltex/shared'
import type { SessionUser } from '../auth/auth.ts'
import type { CollabHooks } from '../collab/server.ts'
import type { CompileQueue } from '../compile-queue.ts'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import { mergeText } from '../history/snapshots.ts'
import { engineFor } from '../projects/engine.ts'
import type { ProjectService } from '../projects/service.ts'
import type { ProjectStore } from '../storage/types.ts'
import { Changeset } from './changeset.ts'
import { AgentChat, shortId } from './chat.ts'
import { COMPACT_SYSTEM_PROMPT, compactedTranscript, estimateTokens, renderTranscript } from './compact.ts'
import { conversationTitle, type ConversationStore, type SavedConversation } from './conversations.ts'
import { systemPrompt, userMessage } from './prompt.ts'
import { modelInfo, type AiService } from './service.ts'
import { saveDraftedSkill, type SkillStore } from './skills.ts'
import { createTools, errorCount, type ToolContext } from './tools.ts'
import type { Tier } from './routing.ts'

/** Per-message limits, so a confused model cannot loop forever. */
const MAX_TOOL_CALLS = 60
const MAX_COMPILES = 12
const IDLE_TTL_MS = 6 * 60 * 60_000

export type AiDeps = {
  ai: AiService
  store: ProjectStore
  queue: Pick<CompileQueue, 'compile' | 'texLookup'> & Partial<Pick<CompileQueue, 'hasManuals'>>
  collab: CollabHooks
  history: HistoryService
  projects: ProjectService
  outputsDir: string
  conversations: ConversationStore
  skills: SkillStore
}

type AppliedFile = { path: string; kind: 'modified' | 'created'; original: string; applied: string }

function summary(result: CompileResult): AiCompileSummary {
  return { buildId: result.buildId, status: result.status, errors: errorCount(result.diagnostics) }
}

/** Did applying make the build worse? Only judged when both builds actually ran. */
function isRegression(before: CompileResult, after: CompileResult): boolean {
  const ran = (r: CompileResult) => r.status === 'success' || r.status === 'failure'
  if (!ran(before) || !ran(after)) return after.status !== 'success' && before.status === 'success'
  const pdf = (r: CompileResult) => r.outputFiles.includes(OUTPUT.pdf)
  return errorCount(after.diagnostics) > errorCount(before.diagnostics) || (pdf(before) && !pdf(after))
}

/** One conversation between a user and the assistant about one project. */
export class AiSession extends AgentChat {
  readonly projectId: string
  private readonly deps: AiDeps
  private title?: string
  /** Stops a compaction in progress. */
  private compacting?: AbortController
  private readonly changeset: Changeset
  private readonly toolContext: ToolContext
  private notes: string[] = []
  private authorBuild?: string
  private lastApplied?: { snapshot: string; at: string; files: AppliedFile[] }

  /** Editors draft changes; other members get a read-only assistant that answers questions. */
  readonly canEdit: boolean

  constructor(deps: AiDeps, userId: string, project: ProjectMeta, canEdit = true, saved?: SavedConversation) {
    super(deps.ai, userId, project.id, saved)
    this.deps = deps
    this.title = saved?.title
    this.canEdit = canEdit
    this.projectId = project.id
    this.changeset = new Changeset(project.id, deps.store)
    this.toolContext = {
      project,
      store: deps.store,
      changeset: this.changeset,
      queue: deps.queue,
      outputsDir: deps.outputsDir,
      canEdit,
      authorBuild: () => this.authorBuild,
      skills: () => this.skills,
      onProposeSkill: skill => this.upsert({ kind: 'skill', id: shortId(), ...skill, saved: null }),
      proposedReply: "Shown to the author, who can edit it and save it to their skills or the project's.",
      onTrial: result => {
        const errors = errorCount(result.diagnostics)
        this.changeset.trial = {
          buildId: result.buildId,
          status: result.status,
          errors,
          warnings: result.diagnostics.length - errors,
        }
      },
    }
  }

  protected override afterTool(name: string): void {
    if (['edit_file', 'create_file', 'revert_file', 'compile'].includes(name)) this.emitChanges()
  }

  private emitChanges(): void {
    this.emit({ type: 'changes', changes: this.changeset.toJSON() })
  }

  state(): AiSessionState {
    const model = this.agent?.state.model
    return {
      id: this.id,
      running: this.running,
      items: this.items,
      changes: this.changeset.toJSON(),
      lastApplied: this.lastApplied
        ? { snapshot: this.lastApplied.snapshot, at: this.lastApplied.at, files: this.lastApplied.files.map(f => f.path) }
        : null,
      model: model ? modelInfo(model) : null,
      contextTokens: this.context,
    }
  }

  /** Save the conversation (once the person has said something), so it can be reopened. */
  private async persist(): Promise<void> {
    if (this.forgotten || !this.items.some(i => i.kind === 'user')) return
    this.title ??= conversationTitle(this.items)
    await this.deps.conversations
      .save(this.userId, this.projectId, { id: this.id, title: this.title, items: this.items, messages: this.transcript(), contextTokens: this.context })
      .catch(() => {})
  }

  // ---- Conversation -----------------------------------------------------------

  /** The tier auto routing chose for the previous message, so short follow-ups keep it. */
  private lastTier?: Tier

  /**
   * The agent, switched to the model and thinking level for this message
   * (the person's pick, auto routing's choice, or a fallback while a provider
   * keeps failing). Returns notices to show after the message.
   */
  private async ensureAgent(user: SessionUser, body: AiMessageBody): Promise<{ agent: Agent; notices: string[] }> {
    const { ai } = this.deps
    const errors = body.compile?.diagnostics.filter(d => d.level === 'error').length ?? 0
    const context = [errors ? `${errors} compile errors` : '', body.selection ? `a selection of ${body.selection.toLine - body.selection.fromLine + 1} lines` : '']
      .filter(Boolean)
      .join(', ')
    const text = body.skill ? `/${body.skill} ${body.text}`.trim() : body.text
    const plan = await ai.planMessage(user, body.preference, { text, context }, this.lastTier, (model, usage) => this.recordUsage(model, usage))
    if (!plan) throw new ForbiddenError('No AI model is available to you')
    this.lastTier = plan.tier
    const { model, thinkingLevel, notices } = plan
    if (this.agent) {
      this.agent.state.model = model
      this.agent.state.thinkingLevel = thinkingLevel
      this.syncSkills(this.agent)
      return { agent: this.agent, notices }
    }
    this.toolContext.manuals = (await this.deps.queue.hasManuals?.().catch(() => true)) ?? true
    const agent = new Agent({
      initialState: {
        systemPrompt: systemPrompt(this.toolContext.project, this.canEdit, this.toolContext.manuals),
        model,
        thinkingLevel,
        tools: createTools(this.toolContext),
        // A reopened conversation goes on where it stopped.
        messages: this.restored,
      },
      streamFn: (m, context, options) => ai.models.streamSimple(m, context, options),
      sessionId: this.id,
      toolExecution: 'sequential',
    })
    agent.subscribe(event => this.onAgentEvent(event))
    this.agent = agent
    this.restored = undefined
    this.syncSkills(agent)
    return { agent, notices }
  }

  private toolCalls = 0
  private compiles = 0

  async send(body: AiMessageBody, project: ProjectMeta, user: SessionUser): Promise<void> {
    if (this.running) throw new ConflictError('The assistant is still working on the previous message')
    this.lastActive = Date.now()
    this.toolContext.project = project
    if (body.compile) this.authorBuild = body.compile.buildId
    this.skills = await this.deps.skills.available(this.userId, this.projectId)
    const skill = body.skill ? this.skills.find(s => s.name === body.skill) : undefined
    if (body.skill && !skill) throw new BadRequestError(`There is no skill named ${body.skill}`)
    const { agent, notices } = await this.ensureAgent(user, body)
    const { text, attachments } = userMessage(body, this.notes, skill)
    this.notes = []
    this.upsert({ kind: 'user', id: shortId(), text: body.text.trim(), attachments, ...(skill ? { skill: skill.name } : {}) })
    for (const n of notices) this.notice('info', n)

    this.running = true
    this.emit({ type: 'running', running: true })
    this.toolCalls = 0
    this.compiles = 0
    agent.beforeToolCall = async ({ toolCall }) => {
      if (++this.toolCalls > MAX_TOOL_CALLS) {
        return { block: true, reason: 'Tool call limit for this message reached. Stop and summarise your progress for the author.', terminate: true }
      }
      if (toolCall.name === 'compile' && ++this.compiles > MAX_COMPILES) {
        return { block: true, reason: 'Compile limit for this message reached. Summarise what remains for the author.', terminate: true }
      }
      return undefined
    }

    // Editors may hold unsaved keystrokes in the collaboration layer: read what people see.
    await this.deps.collab.flushProject(this.projectId)
    this.changeset.beginTurn()
    void agent
      .prompt(text)
      .catch((err: unknown) => this.notice('error', err instanceof Error ? err.message : String(err)))
      .then(async () => {
        // A card after the reply listing what this turn changed in the draft.
        const files = await this.changeset.endTurn().catch(() => [])
        if (files.length) this.upsert({ kind: 'changes', id: shortId(), files })
      })
      .finally(() => {
        this.running = false
        this.lastActive = Date.now()
        this.emit({ type: 'running', running: false })
        this.emitChanges()
        this.emit({ type: 'snapshot', state: this.state() })
        void this.persist()
      })
  }

  /**
   * `/compact`: summarise the conversation with the model and start its
   * context over from the summary (in the system prompt), keeping what the
   * panel shows. Runs like a message: `running` until it is done.
   */
  async compact(user: SessionUser, preference: AiPreference | undefined): Promise<void> {
    if (this.running) throw new ConflictError('The assistant is still working on the previous message')
    const messages = this.transcript()
    if (!messages.some(m => m.role === 'user')) throw new BadRequestError('There is nothing to compact yet')
    const { ai } = this.deps
    const plan = await ai.planMessage(user, preference, { text: 'Summarise this conversation', context: '' }, this.lastTier, (model, usage) => this.recordUsage(model, usage))
    if (!plan) throw new ForbiddenError('No AI model is available to you')
    this.running = true
    this.lastActive = Date.now()
    this.emit({ type: 'running', running: true })
    const controller = new AbortController()
    this.compacting = controller
    void (async () => {
      const res = await ai.models.completeSimple(
        plan.model,
        { systemPrompt: COMPACT_SYSTEM_PROMPT, messages: [{ role: 'user', content: renderTranscript(messages), timestamp: Date.now() }] },
        { signal: controller.signal },
      )
      this.recordUsage({ provider: res.provider, id: res.model }, res.usage)
      ai.recordOutcome(res.provider, res.stopReason === 'error' ? 'error' : res.stopReason === 'aborted' ? 'aborted' : 'ok', res.errorMessage)
      if (res.stopReason === 'aborted') return
      const summary = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
      if (res.stopReason === 'error' || !summary.trim()) throw new Error(res.errorMessage ?? 'The model returned no summary')
      // Messages sent meanwhile can't happen (running), so the transcript is still the one summarised.
      const next = compactedTranscript(messages, summary)
      if (this.agent) this.agent.state.messages = next
      else this.restored = next
      const before = this.context
      this.context = estimateTokens(next)
      this.upsert({ kind: 'compacted', id: shortId(), before, after: this.context })
    })()
      .catch((err: unknown) => this.notice('error', err instanceof Error ? err.message : String(err)))
      .finally(() => {
        this.compacting = undefined
        this.running = false
        this.lastActive = Date.now()
        this.emit({ type: 'running', running: false })
        this.emit({ type: 'snapshot', state: this.state() })
        void this.persist()
      })
  }

  /** Save a skill the agent proposed (as it was, or edited), to the person's skills or the project's. */
  async saveProposedSkill(itemId: string, input: AiSaveProposedSkill, user: SessionUser): Promise<AiSkill> {
    if (input.scope === 'project' && !this.canEdit) throw new ForbiddenError('Only editors can add project skills')
    const owner = input.scope === 'personal' ? { scope: input.scope, userId: user.id } : { scope: input.scope, projectId: this.projectId, userId: user.id }
    return saveDraftedSkill(this.deps.skills, owner, this.items, itemId, input, item => {
      this.upsert(item)
      this.notes.push(`The author saved your proposed skill as ${input.scope === 'personal' ? 'one of their skills' : 'a project skill'}, named ${item.name}.`)
      void this.persist()
    })
  }

  override abort(): void {
    super.abort()
    this.compacting?.abort()
  }

  discard(): void {
    if (!this.changeset.size) return
    this.changeset.clear()
    this.notes.push('The author discarded your draft changes; none of them were applied.')
    this.notice('info', 'Draft changes discarded')
    this.emitChanges()
    void this.persist()
  }

  // ---- Apply and undo -----------------------------------------------------------

  private async compileProject(project: ProjectMeta): Promise<CompileResult> {
    const engine = await engineFor(this.deps.store, project)
    return this.deps.queue.compile({ projectId: project.id, rootFile: project.rootFile, engine, clean: false })
  }

  private async readText(path: string): Promise<string | undefined> {
    try {
      return (await this.deps.store.readFile(this.projectId, path)).toString('utf8')
    } catch (err) {
      if (err instanceof NotFoundError) return undefined
      throw err
    }
  }

  /** Write files through the collaboration layer so open editors merge the change. */
  private async writeFiles(writes: { path: string; content: string | null }[]): Promise<void> {
    const { store, collab, projects } = this.deps
    for (const w of writes) {
      if (w.content === null) {
        await store.deleteFile(this.projectId, w.path)
        await collab.afterDelete(this.projectId, w.path)
      } else {
        await store.writeFile(this.projectId, w.path, w.content)
        await collab.afterWrite(this.projectId, w.path, w.content)
      }
    }
    await projects.touch(this.projectId)
  }

  /**
   * Apply accepted changes: snapshot the project, write the files (merged with
   * edits made since the assistant read them), recompile, and roll back if the
   * build got worse.
   */
  async apply(body: AiApplyBody, project: ProjectMeta, user: SessionUser): Promise<AiApplyResult> {
    try {
      return await this.applyDraft(body, project, user)
    } finally {
      void this.persist()
    }
  }

  private async applyDraft(body: AiApplyBody, project: ProjectMeta, user: SessionUser): Promise<AiApplyResult> {
    if (this.running) throw new ConflictError('Wait for the assistant to finish first')
    const accepted = body.files.map(f => {
      const entry = this.changeset.get(f.path)
      if (!entry) throw new BadRequestError(`${f.path} is not part of the AI agent's changes`)
      return { path: f.path, content: f.content, entry }
    })
    const { collab, history } = this.deps

    await collab.flushProject(this.projectId)
    const before = await this.compileProject(project)
    // The state before the change becomes a version of its own (one-click rollback).
    const snapshot = (await history.checkpoint(this.projectId))!

    const applied: AppliedFile[] = []
    await collab.mutate(this.projectId, async () => {
      const conflicts: string[] = []
      for (const a of accepted) {
        const current = await this.readText(a.path)
        if (a.entry.kind === 'created') {
          if (current !== undefined && current !== a.content) conflicts.push(a.path)
          else applied.push({ path: a.path, kind: 'created', original: '', applied: a.content })
          continue
        }
        if (current === undefined) {
          conflicts.push(a.path)
          continue
        }
        const merged = await mergeText(current, a.entry.base, a.content)
        if (merged === undefined) conflicts.push(a.path)
        else applied.push({ path: a.path, kind: 'modified', original: current, applied: merged })
      }
      if (conflicts.length) {
        applied.length = 0
        throw new ConflictError(
          `Someone changed ${conflicts.join(', ')} in the same places since the assistant read ${conflicts.length === 1 ? 'it' : 'them'}. Nothing was applied; ask the assistant to try again.`,
        )
      }
      await this.writeFiles(applied.map(f => ({ path: f.path, content: f.applied })))
    })
    if (applied.some(f => f.kind === 'created')) await collab.treeChanged(this.projectId)
    history.noteChange(this.projectId, user.id, 'ai')

    const after = await this.compileProject(project)
    const partial = accepted.some(a => a.content !== a.entry.proposed) || accepted.length < this.changeset.size
    const files = applied.map(f => f.path)
    this.changeset.clear()
    this.emitChanges()

    if (isRegression(before, after)) {
      this.lastApplied = { snapshot, at: new Date().toISOString(), files: applied }
      const reverted = await this.revertApplied()
      const message = `The changes made the build worse (${errorCount(before.diagnostics)} → ${errorCount(after.diagnostics)} errors), so they were rolled back${reverted.conflicts.length ? `, except ${reverted.conflicts.join(', ')} which changed meanwhile` : ''}.`
      this.notes.push(`The author applied your changes but they made the real build worse, so ColTex rolled them back. ${compileNote(after)}`)
      this.notice('error', message)
      const compile = await this.compileProject(project)
      return { outcome: 'reverted', before: summary(before), after: summary(after), compile, message }
    }

    this.lastApplied = { snapshot, at: new Date().toISOString(), files: applied }
    this.notes.push(
      partial
        ? `The author applied part of your draft (${files.join(', ')}); hunks they left out were discarded. ${compileNote(after)}`
        : `The author applied all your changes (${files.join(', ')}). ${compileNote(after)}`,
    )
    const message = `Applied changes to ${files.join(', ')}. Build: ${errorCount(before.diagnostics)} → ${errorCount(after.diagnostics)} errors.`
    this.notice('success', message)
    this.emit({ type: 'snapshot', state: this.state() })
    return { outcome: 'applied', before: summary(before), after: summary(after), compile: after, message }
  }

  /** Revert the last applied changes, keeping edits others made since. */
  private async revertApplied(): Promise<{ conflicts: string[] }> {
    const last = this.lastApplied
    if (!last) throw new BadRequestError('There is nothing to undo')
    const { collab } = this.deps
    const conflicts: string[] = []
    await collab.mutate(this.projectId, async () => {
      const writes: { path: string; content: string | null }[] = []
      for (const f of last.files) {
        const current = await this.readText(f.path)
        if (current === undefined) continue
        if (f.kind === 'created') {
          if (current === f.applied) writes.push({ path: f.path, content: null })
          else conflicts.push(f.path)
          continue
        }
        const merged = await mergeText(current, f.applied, f.original)
        if (merged === undefined) conflicts.push(f.path)
        else writes.push({ path: f.path, content: merged })
      }
      await this.writeFiles(writes)
    })
    await collab.treeChanged(this.projectId)
    this.deps.history.noteChange(this.projectId, this.userId)
    this.lastApplied = undefined
    return { conflicts }
  }

  async undo(project: ProjectMeta): Promise<{ message: string; compile: CompileResult }> {
    if (this.running) throw new ConflictError('Wait for the assistant to finish first')
    const { conflicts } = await this.revertApplied()
    const message = conflicts.length
      ? `Undid the AI agent's changes, except in ${conflicts.join(', ')} where the same lines were edited since.`
      : "Undid the AI agent's changes."
    this.notes.push('The author undid the changes of yours they had applied.')
    this.notice('info', message)
    this.emit({ type: 'snapshot', state: this.state() })
    void this.persist()
    return { message, compile: await this.compileProject(project) }
  }
}

function compileNote(result: CompileResult): string {
  return `The real build now has status ${result.status} with ${errorCount(result.diagnostics)} errors.`
}

/**
 * The open session per user and project, in memory; conversations are saved
 * (`ConversationStore`), so a session comes back as the latest conversation
 * after a restart or idle pruning, and older ones can be reopened.
 */
export class AiSessionManager {
  private readonly deps: AiDeps
  private readonly sessions = new Map<string, AiSession>()

  constructor(deps: AiDeps) {
    this.deps = deps
  }

  get conversations(): ConversationStore {
    return this.deps.conversations
  }

  async get(user: SessionUser, project: ProjectMeta, create = true, canEdit = true): Promise<AiSession | undefined> {
    this.prune()
    const key = `${user.id}:${project.id}`
    let session = this.sessions.get(key)
    // The person's role changed since the conversation started: its tools no longer fit.
    if (session && session.canEdit !== canEdit) {
      session.abort()
      this.sessions.delete(key)
      session = undefined
    }
    if (!session && create) {
      const saved = await this.deps.conversations.load(user.id, project.id)
      // Another request may have opened it meanwhile.
      session = this.sessions.get(key) ?? new AiSession(this.deps, user.id, project, canEdit, saved)
      this.sessions.set(key, session)
    }
    if (session) session.lastActive = Date.now()
    return session
  }

  /** Start a new conversation (saved once something is said in it). */
  reset(user: SessionUser, project: ProjectMeta, canEdit = true): AiSession {
    return this.replace(user, project, new AiSession(this.deps, user.id, project, canEdit))
  }

  /** Reopen a saved conversation. Its draft, if it had one, is gone: drafts aren't saved. */
  async open(user: SessionUser, project: ProjectMeta, canEdit: boolean, id: string): Promise<AiSession> {
    const current = this.sessions.get(`${user.id}:${project.id}`)
    if (current?.id === id && current.canEdit === canEdit) return current
    const saved = await this.deps.conversations.load(user.id, project.id, id)
    if (!saved) throw new NotFoundError('Conversation not found')
    return this.replace(user, project, new AiSession(this.deps, user.id, project, canEdit, saved))
  }

  /** Delete saved conversations; deleting the open one starts a new one. */
  async remove(user: SessionUser, project: ProjectMeta, canEdit: boolean, ids: string[]): Promise<void> {
    const current = this.sessions.get(`${user.id}:${project.id}`)
    if (current && ids.includes(current.id)) {
      current.forget()
      this.reset(user, project, canEdit)
    }
    await this.deps.conversations.delete(user.id, project.id, ids)
  }

  /** The open session's id, if any (for marking it in the list). */
  currentId(user: SessionUser, project: ProjectMeta): string | undefined {
    return this.sessions.get(`${user.id}:${project.id}`)?.id
  }

  private replace(user: SessionUser, project: ProjectMeta, session: AiSession): AiSession {
    const key = `${user.id}:${project.id}`
    // A reply still coming is stopped; what it got to is saved with its conversation.
    this.sessions.get(key)?.abort()
    this.sessions.set(key, session)
    return session
  }

  /** Project deleted or user removed from it. */
  dropProject(projectId: string): void {
    for (const [key, s] of this.sessions) {
      if (s.projectId === projectId) {
        s.abort()
        this.sessions.delete(key)
      }
    }
  }

  private prune(): void {
    const cutoff = Date.now() - IDLE_TTL_MS
    for (const [key, s] of this.sessions) {
      if (!s.isRunning && s.lastActive < cutoff) this.sessions.delete(key)
    }
  }
}

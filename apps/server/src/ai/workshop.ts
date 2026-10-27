import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core'
import { eq } from 'drizzle-orm'
import type { AiItem, AiMessageBody, AiSaveProposedSkill, AiSessionState, AiSkill } from '@coltex/shared'
import type { SessionUser } from '../auth/auth.ts'
import type { Db } from '../db/client.ts'
import { aiSkillChats } from '../db/schema.ts'
import { ConflictError, ForbiddenError } from '../errors.ts'
import { AgentChat, shortId, type SavedChat } from './chat.ts'
import { languageNote, workshopPrompt } from './prompt.ts'
import type { Tier } from './routing.ts'
import { modelInfo, type AiService } from './service.ts'
import { saveDraftedSkill, type SkillStore } from './skills.ts'
import { skillTools } from './tools.ts'

const MAX_TOOL_CALLS = 30
const IDLE_TTL_MS = 6 * 60 * 60_000
const NO_CHANGES = { files: [], trial: null, turn: null }

/** The skills chat each person has (`ai_skill_chats`, one row each). */
export class SkillChatStore {
  private readonly db: Db

  constructor(db: Db) {
    this.db = db
  }

  async load(userId: string): Promise<SavedChat | undefined> {
    const [row] = await this.db.select().from(aiSkillChats).where(eq(aiSkillChats.userId, userId))
    return row ? { id: row.id, items: row.items as AiItem[], messages: row.messages as AgentMessage[], contextTokens: row.contextTokens } : undefined
  }

  async save(userId: string, c: SavedChat): Promise<void> {
    const values = { id: c.id, items: c.items, messages: c.messages, contextTokens: c.contextTokens, updatedAt: new Date() }
    await this.db
      .insert(aiSkillChats)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: aiSkillChats.userId, set: values })
  }

  async remove(userId: string): Promise<void> {
    await this.db.delete(aiSkillChats).where(eq(aiSkillChats.userId, userId))
  }
}

export type WorkshopDeps = { ai: AiService; skills: SkillStore; chats: SkillChatStore }

/**
 * The skills chat (Settings → AI skills): the agent helps the person write
 * and improve their own skills, following the built-in skill-creator. It
 * has no project; it reads their skills and drafts skills for them to save.
 */
export class SkillWorkshop extends AgentChat {
  private readonly deps: WorkshopDeps
  private lastTier?: Tier
  private toolCalls = 0
  /** The interface language the agent was last told about. */
  private toldLanguage?: string

  constructor(deps: WorkshopDeps, userId: string, saved?: SavedChat) {
    super(deps.ai, userId, null, saved)
    this.deps = deps
  }

  state(): AiSessionState {
    const model = this.agent?.state.model
    return {
      id: this.id,
      running: this.running,
      items: this.items,
      changes: NO_CHANGES,
      lastApplied: null,
      model: model ? modelInfo(model) : null,
      contextTokens: this.context,
    }
  }

  private async persist(): Promise<void> {
    if (this.forgotten || !this.items.some(i => i.kind === 'user')) return
    await this.deps.chats
      .save(this.userId, { id: this.id, items: this.items, messages: this.transcript(), contextTokens: this.context })
      .catch(() => {})
  }

  private async ensureAgent(user: SessionUser, body: AiMessageBody): Promise<{ agent: Agent; notices: string[] }> {
    const plan = await this.ai.planMessage(user, body.preference, { text: body.text, context: '' }, this.lastTier, (model, usage) =>
      this.recordUsage(model, usage),
    )
    if (!plan) throw new ForbiddenError('No AI model is available to you')
    this.lastTier = plan.tier
    if (this.agent) {
      this.agent.state.model = plan.model
      this.agent.state.thinkingLevel = plan.thinkingLevel
      this.syncSkills(this.agent)
      return { agent: this.agent, notices: plan.notices }
    }
    const tools = skillTools({
      skills: () => this.skills,
      onProposeSkill: skill => this.upsert({ kind: 'skill', id: shortId(), ...skill, saved: null }),
      proposedReply: 'Shown to the author, who can edit it and save it to their skills.',
    })
    const agent = new Agent({
      initialState: {
        // skill-creator is the guide here; the built-in one, never someone's own of that name.
        systemPrompt: workshopPrompt(this.deps.skills.builtins.find(s => s.name === 'skill-creator')),
        model: plan.model,
        thinkingLevel: plan.thinkingLevel,
        tools,
        messages: this.restored,
      },
      streamFn: (m, context, options) => this.ai.models.streamSimple(m, context, options),
      sessionId: this.id,
      toolExecution: 'sequential',
    })
    agent.subscribe(event => this.onAgentEvent(event))
    this.agent = agent
    this.restored = undefined
    this.syncSkills(agent)
    return { agent, notices: plan.notices }
  }

  async send(body: AiMessageBody, user: SessionUser): Promise<void> {
    if (this.running) throw new ConflictError('The assistant is still working on the previous message')
    this.lastActive = Date.now()
    this.skills = await this.deps.skills.available(this.userId)
    const { agent, notices } = await this.ensureAgent(user, body)
    this.upsert({ kind: 'user', id: shortId(), text: body.text.trim(), attachments: [] })
    for (const n of notices) this.notice('info', n)
    this.running = true
    this.emit({ type: 'running', running: true })
    this.toolCalls = 0
    agent.beforeToolCall = async () =>
      ++this.toolCalls > MAX_TOOL_CALLS
        ? { block: true, reason: 'Tool call limit for this message reached. Stop and summarise your progress for the author.', terminate: true }
        : undefined
    const note = body.language && body.language !== this.toldLanguage ? `[${languageNote(body.language)}]\n\n` : ''
    if (body.language) this.toldLanguage = body.language
    void agent
      .prompt(note + body.text.trim())
      .catch((err: unknown) => this.notice('error', err instanceof Error ? err.message : String(err)))
      .finally(() => {
        this.running = false
        this.lastActive = Date.now()
        this.emit({ type: 'running', running: false })
        this.emit({ type: 'snapshot', state: this.state() })
        void this.persist()
      })
  }

  /** Save a drafted skill to the person's skills (`replace`: as a new version of theirs). */
  async saveProposedSkill(itemId: string, input: AiSaveProposedSkill, user: SessionUser): Promise<AiSkill> {
    return saveDraftedSkill(this.deps.skills, user.id, this.items, itemId, input, item => {
      this.upsert(item)
      void this.persist()
    })
  }
}

/** Everyone's skills chat, reopened from the database after a restart or idle time. */
export class SkillWorkshops {
  private readonly deps: WorkshopDeps
  private readonly chats = new Map<string, SkillWorkshop>()

  constructor(deps: WorkshopDeps) {
    this.deps = deps
  }

  async get(userId: string): Promise<SkillWorkshop> {
    this.prune()
    let chat = this.chats.get(userId)
    if (!chat) {
      chat = new SkillWorkshop(this.deps, userId, await this.deps.chats.load(userId))
      // Another request may have opened it meanwhile; keep the first.
      chat = this.chats.get(userId) ?? chat
      this.chats.set(userId, chat)
    }
    chat.lastActive = Date.now()
    return chat
  }

  /** A new chat: the current one stops and is forgotten. */
  async reset(userId: string): Promise<SkillWorkshop> {
    this.chats.get(userId)?.forget()
    await this.deps.chats.remove(userId)
    const chat = new SkillWorkshop(this.deps, userId)
    this.chats.set(userId, chat)
    return chat
  }

  private prune(): void {
    const cutoff = Date.now() - IDLE_TTL_MS
    for (const [id, chat] of this.chats) {
      if (!chat.isRunning && chat.lastActive < cutoff) this.chats.delete(id)
    }
  }
}

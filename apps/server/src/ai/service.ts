import crypto from 'node:crypto'
import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm'
import {
  clampThinkingLevel,
  createModels,
  getSupportedThinkingLevels,
  createProvider,
  type Api,
  type AuthEvent,
  type AuthPrompt,
  type AuthType,
  type CredentialStore,
  type Model,
  type MutableModels,
  type Provider,
  type Usage,
} from '@earendil-works/pi-ai'
import { builtinProviders } from '@earendil-works/pi-ai/providers/all'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import {
  AiAccessPolicy,
  AiSettings,
  ThinkingLevel,
  type AiAdminState,
  type AiGroup,
  type AiGroupBody,
  type AiSettingsPatch,
  type AiLoginState,
  type AiModelInfo,
  type AiModelRef,
  type AiPreference,
  type AiProviderStatus,
  type AiStatus,
  type AiUsageReport,
  type AiUserRow,
  type CustomAiProvider,
} from '@coltex/shared'
import type { SessionUser } from '../auth/auth.ts'
import type { Db } from '../db/client.ts'
import { aiGroups, aiPreferences, aiUsage, aiUserGroups, appSettings, user } from '../db/schema.ts'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors.ts'
import { ProviderHealth } from './health.ts'
import { judgePrompt, parseTier, type Tier } from './routing.ts'

const SETTINGS_KEY = 'ai'
const DEVICE_ID_KEY = 'ai-device-id'
/** Logins left unanswered this long are cancelled. */
const LOGIN_TTL_MS = 15 * 60_000

export function modelInfo(model: Model<Api>): AiModelInfo {
  return {
    provider: model.provider,
    id: model.id,
    name: model.name,
    contextWindow: model.contextWindow,
    reasoning: model.reasoning,
    thinkingLevels: getSupportedThinkingLevels(model),
  }
}

/** The thinking level used until someone picks one: a middle setting, adjusted to the model. */
const DEFAULT_THINKING = 'medium'

const sameModel = (a: AiModelRef, b: { provider: string; id: string }) => a.provider === b.provider && a.id === b.id

export function policyAllows(policy: AiAccessPolicy, model: { provider: string; id: string }): boolean {
  if (policy.mode === 'all') return true
  if (policy.mode === 'none') return false
  return policy.providers.includes(model.provider) || policy.models.some(m => sameModel(m, model))
}

/** What a person may use and what they picked, resolved against what is configured now. */
export type AiChoice = { model: Model<Api>; thinkingLevel: ThinkingLevel }

/**
 * The model for one message, after auto routing and moving off failing
 * providers. `notices` are shown in the conversation (server text, translated
 * in the web app).
 */
export type MessagePlan = AiChoice & { tier?: Tier; notices: string[] }

/** The judge must be quick; on timeout the message goes to the strong model. */
const JUDGE_TIMEOUT_MS = 20_000

/** An OpenAI-compatible endpoint configured by the admin. The key is optional (local servers). */
function customProvider(config: CustomAiProvider): Provider {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  return createProvider({
    id: config.id,
    name: config.name,
    baseUrl,
    auth: {
      apiKey: {
        name: `${config.name} API key`,
        login: async interaction => {
          const key = await interaction.prompt({
            type: 'secret',
            message: `API key for ${config.name} (leave empty if the server needs none)`,
          })
          return { type: 'api_key', key: key.trim() || undefined }
        },
        // Keyless local servers count as configured; the OpenAI client still wants some key.
        resolve: async ({ credential }) => ({
          auth: { apiKey: credential?.key || 'none' },
          source: credential?.key ? 'stored credential' : 'no key',
        }),
      },
    },
    models: config.models.map(
      (m): Model<'openai-completions'> => ({
        id: m.id,
        name: m.id,
        api: 'openai-completions',
        provider: config.id,
        baseUrl,
        reasoning: m.reasoning,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: m.contextWindow,
        maxTokens: m.maxTokens,
      }),
    ),
    api: openAICompletionsApi(),
  })
}

type PendingPrompt = { id: string; prompt: AuthPrompt; resolve: (value: string) => void; reject: (err: Error) => void }

/** Bridges pi-ai's interactive login callbacks to request/response polling from the admin page. */
class LoginSession {
  readonly id = crypto.randomUUID()
  readonly providerId: string
  readonly type: AuthType
  readonly controller = new AbortController()
  readonly startedAt = Date.now()
  status: AiLoginState['status'] = 'running'
  error?: string
  events: AiLoginState['events'] = []
  pending?: PendingPrompt

  constructor(providerId: string, type: AuthType) {
    this.providerId = providerId
    this.type = type
  }

  notify(event: AuthEvent): void {
    if (event.type === 'device_code') {
      this.events.push({ type: 'device_code', userCode: event.userCode, verificationUri: event.verificationUri })
    } else if (event.type === 'info') {
      this.events.push({ type: 'info', message: event.message, links: event.links?.map(l => ({ ...l })) })
    } else {
      this.events.push({ ...event })
    }
  }

  prompt(prompt: AuthPrompt): Promise<string> {
    return new Promise((resolve, reject) => {
      const pending: PendingPrompt = { id: crypto.randomUUID(), prompt, resolve, reject }
      this.pending = pending
      // A manual-code prompt may be resolved out of band (callback server); drop it then.
      prompt.signal?.addEventListener('abort', () => {
        if (this.pending === pending) this.pending = undefined
        reject(new Error('Prompt cancelled'))
      })
    })
  }

  answer(promptId: string, value: string): void {
    const pending = this.pending
    if (!pending || pending.id !== promptId) throw new ConflictError('This question is no longer pending')
    this.pending = undefined
    pending.resolve(value)
  }

  cancel(): void {
    if (this.status !== 'running') return
    this.status = 'cancelled'
    this.controller.abort()
    this.pending?.reject(new Error('Login cancelled'))
    this.pending = undefined
  }

  state(): AiLoginState {
    const p = this.pending?.prompt
    return {
      id: this.id,
      providerId: this.providerId,
      type: this.type,
      status: this.status,
      events: this.events,
      error: this.error,
      prompt:
        p && this.pending
          ? {
              id: this.pending.id,
              type: p.type,
              message: p.message,
              placeholder: 'placeholder' in p ? p.placeholder : undefined,
              options: p.type === 'select' ? p.options.map(o => ({ ...o })) : undefined,
            }
          : null,
    }
  }
}

/**
 * Instance-wide AI configuration: providers and their (shared, admin-managed)
 * credentials, the default model, and which models each person may use.
 * People pick their own model and thinking level in the editor.
 */
export class AiService {
  private readonly db: Db
  readonly models: MutableModels
  private readonly credentials: CredentialStore
  private settings: AiSettings = AiSettings.parse({})
  private readonly logins = new Map<string, LoginSession>()
  /** Circuit breakers for the shared credentials, per provider. */
  readonly health = new ProviderHealth()

  constructor(db: Db, credentials: CredentialStore) {
    this.db = db
    this.credentials = credentials
    this.models = createModels({ credentials })
    for (const provider of builtinProviders()) this.models.setProvider(provider)
  }

  async init(): Promise<void> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, SETTINGS_KEY))
    const raw = (row?.value ?? {}) as Record<string, unknown>
    const parsed = AiSettings.safeParse(raw)
    this.settings = parsed.success ? parsed.data : AiSettings.parse({})
    this.applyCustomProviders([], this.settings.customProviders)
  }

  getSettings(): AiSettings {
    return this.settings
  }

  async updateSettings(patch: AiSettingsPatch): Promise<AiSettings> {
    const next = AiSettings.parse({ ...this.settings, ...patch })
    const ids = new Set<string>()
    for (const p of next.customProviders) {
      if (ids.has(p.id)) throw new BadRequestError(`Duplicate provider id ${p.id}`)
      if (this.models.getProvider(p.id) && !this.settings.customProviders.some(c => c.id === p.id)) {
        throw new BadRequestError(`${p.id} is already a provider`)
      }
      ids.add(p.id)
    }
    this.applyCustomProviders(this.settings.customProviders, next.customProviders)
    for (const ref of [next.auto.judge, next.auto.light, next.auto.strong]) {
      if (ref && !this.models.getModel(ref.provider, ref.id)) throw new BadRequestError(`Unknown model ${ref.provider}/${ref.id}`)
    }
    await this.db
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, value: next })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedAt: new Date() } })
    this.settings = next
    return next
  }

  private applyCustomProviders(previous: CustomAiProvider[], next: CustomAiProvider[]): void {
    for (const p of previous) if (!next.some(n => n.id === p.id)) this.models.deleteProvider(p.id)
    for (const p of next) this.models.setProvider(customProvider(p))
  }

  async adminState(): Promise<AiAdminState> {
    // Lists metadata only; nothing is decrypted here.
    const stored = new Set((await this.credentials.list()).map(c => c.providerId))
    const custom = new Set(this.settings.customProviders.map(p => p.id))
    const providers = await Promise.all(
      this.models.getProviders().map(async (p): Promise<AiProviderStatus> => {
        const check = await this.models.checkAuth(p.id).catch(() => undefined)
        return {
          id: p.id,
          name: p.name,
          custom: custom.has(p.id),
          apiKey: p.auth.apiKey?.login ? p.auth.apiKey.name : null,
          oauth: p.auth.oauth ? { name: p.auth.oauth.name, subscription: !!p.auth.oauth.isSubscription } : null,
          configured: check ? { type: check.type, source: check.source } : null,
          stored: stored.has(p.id),
          modelCount: p.getModels().length,
          health: this.health.snapshot(p.id),
        }
      }),
    )
    return { settings: this.settings, providers }
  }

  /** Models of providers that are configured, for the admin's model picker. */
  async availableModels(): Promise<AiModelInfo[]> {
    const models = await this.models.getAvailable()
    return models.map(modelInfo)
  }

  // ---- Access and choices ---------------------------------------------------

  private async groupPolicy(userId: string): Promise<AiAccessPolicy | null> {
    const [row] = await this.db
      .select({ policy: aiGroups.policy })
      .from(aiUserGroups)
      .innerJoin(aiGroups, eq(aiGroups.id, aiUserGroups.groupId))
      .where(eq(aiUserGroups.userId, userId))
    const parsed = row && AiAccessPolicy.safeParse(row.policy)
    return parsed?.success ? parsed.data : null
  }

  /** Admins may use every model; everyone else what their AI group allows, and nothing without one. */
  async policyFor(u: SessionUser): Promise<AiAccessPolicy> {
    if (u.role === 'admin') return { mode: 'all', providers: [], models: [] }
    return (await this.groupPolicy(u.id)) ?? { mode: 'none', providers: [], models: [] }
  }

  /** Models of configured providers that this person may use. */
  async allowedModels(u: SessionUser): Promise<Model<Api>[]> {
    const policy = await this.policyFor(u)
    if (policy.mode === 'none') return []
    return (await this.models.getAvailable()).filter(m => policyAllows(policy, m))
  }

  private async savedPreference(userId: string): Promise<AiPreference | undefined> {
    const [row] = await this.db.select().from(aiPreferences).where(eq(aiPreferences.userId, userId))
    const level = row && ThinkingLevel.safeParse(row.thinkingLevel)
    return row && level?.success ? { model: { provider: row.provider, id: row.model }, thinkingLevel: level.data, auto: row.auto } : undefined
  }

  /**
   * The model and thinking level for a message when not on Auto. An explicit
   * pick must be allowed; a saved one that no longer is (or none) falls back
   * to Auto's strong, then light model, then the first allowed model.
   * Thinking is clamped to what the model supports.
   */
  async resolveChoice(u: SessionUser, pick?: AiPreference, allowed?: Model<Api>[]): Promise<AiChoice | undefined> {
    const models = allowed ?? (await this.allowedModels(u))
    const find = (ref: AiModelRef | null | undefined) => (ref ? models.find(m => sameModel(ref, m)) : undefined)
    if (pick && !find(pick.model)) throw new ForbiddenError(`You can't use ${pick.model.provider}/${pick.model.id}`)
    const preference = pick ?? (await this.savedPreference(u.id))
    const model = find(preference?.model) ?? find(this.settings.auto.strong) ?? find(this.settings.auto.light) ?? models[0]
    if (!model) return undefined
    return { model, thinkingLevel: clampThinkingLevel(model, preference?.thinkingLevel ?? DEFAULT_THINKING) }
  }

  async setPreference(u: SessionUser, pick: AiPreference): Promise<AiStatus> {
    const choice = await this.resolveChoice(u, pick)
    if (!choice) throw new ForbiddenError('No AI model is available to you')
    if (pick.auto && !(await this.autoModels(u)).available) throw new ForbiddenError('Auto model choice is not available to you')
    const values = {
      provider: choice.model.provider,
      model: choice.model.id,
      thinkingLevel: choice.thinkingLevel,
      auto: pick.auto,
      updatedAt: new Date(),
    }
    await this.db
      .insert(aiPreferences)
      .values({ userId: u.id, ...values })
      .onConflictDoUpdate({ target: aiPreferences.userId, set: values })
    return this.statusFor(u)
  }

  async statusFor(u: SessionUser): Promise<AiStatus> {
    const off = { available: false, model: null, thinkingLevel: 'off' as const, models: [], auto: { available: false, on: false, light: null, strong: null } }
    const policy = await this.policyFor(u)
    if (policy.mode === 'none') return { ...off, reason: "You don't have access to the AI agent" }
    const allowed = await this.allowedModels(u)
    const choice = await this.resolveChoice(u, undefined, allowed)
    if (!choice) {
      const connected = (await this.models.getAvailable()).length > 0
      return { ...off, reason: connected ? 'No AI model is available to you' : 'No AI provider is connected yet' }
    }
    const auto = await this.autoModels(u, allowed)
    // Auto is the default: people are on it until they pick a model.
    const saved = await this.savedPreference(u.id)
    const on = auto.available && (saved ? saved.auto : true)
    return {
      available: true,
      model: modelInfo(choice.model),
      thinkingLevel: choice.thinkingLevel,
      models: allowed.map(modelInfo),
      auto: { available: auto.available, on, light: auto.light ? modelInfo(auto.light) : null, strong: auto.strong ? modelInfo(auto.strong) : null },
    }
  }

  // ---- Auto routing and failing providers -------------------------------------

  /**
   * Auto routing for this person: all three models configured and connected,
   * and the person may use the light and the strong one (the judge only
   * classifies; its answer is never shown).
   */
  private async autoModels(u: SessionUser, allowed?: Model<Api>[]) {
    const { judge, light, strong } = this.settings.auto
    const models = allowed ?? (await this.allowedModels(u))
    const find = (ref: AiModelRef | null, list: readonly Model<Api>[]) => (ref ? list.find(m => sameModel(ref, m)) : undefined)
    const available = await this.models.getAvailable()
    const picked = { judge: find(judge, available), light: find(light, models), strong: find(strong, models) }
    return { ...picked, available: !!(picked.judge && picked.light && picked.strong) }
  }

  /** Ask the judge which tier a message needs. Failures and timeouts go to the strong model. */
  private async classify(judge: Model<Api>, input: { text: string; context: string }, previous: Tier | undefined, record: (usage: Usage) => void): Promise<Tier> {
    try {
      const res = await this.models.completeSimple(
        judge,
        { messages: [{ role: 'user', content: judgePrompt(input.text, input.context, previous), timestamp: Date.now() }] },
        { signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS) },
      )
      record(res.usage)
      if (res.stopReason === 'error') {
        this.health.recordFailure(judge.provider, res.errorMessage ?? 'Request failed')
        return 'strong'
      }
      this.health.recordSuccess(judge.provider)
      return parseTier(res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')) ?? 'strong'
    } catch (err) {
      this.health.recordFailure(judge.provider, err instanceof Error ? err.message : String(err))
      return 'strong'
    }
  }

  /**
   * The model for one message: the person's pick (or auto routing's choice),
   * moved to another model they may use while its provider keeps failing.
   */
  async planMessage(
    u: SessionUser,
    pick: AiPreference | undefined,
    input: { text: string; context: string },
    previous: Tier | undefined,
    record: (model: Model<Api>, usage: Usage) => void,
  ): Promise<MessagePlan | undefined> {
    const allowed = await this.allowedModels(u)
    const preference = pick ?? (await this.savedPreference(u.id))
    const notices: string[] = []
    let plan: MessagePlan | undefined
    // Without a saved pick, people are on Auto (when it is set up).
    if (preference ? preference.auto : true) {
      const auto = await this.autoModels(u, allowed)
      if (auto.available) {
        const tier = await this.classify(auto.judge!, input, previous, usage => record(auto.judge!, usage))
        const model = tier === 'light' ? auto.light! : auto.strong!
        // Light questions get a quick answer; strong ones the person's thinking level, or a high one.
        const level = tier === 'light' ? 'off' : !preference || preference.thinkingLevel === 'off' ? 'high' : preference.thinkingLevel
        plan = { model, thinkingLevel: clampThinkingLevel(model, level), tier, notices }
        notices.push(tier === 'light' ? `Auto: ${model.name} for a quick answer` : `Auto: ${model.name} for this task`)
      }
    }
    if (!plan) {
      const choice = await this.resolveChoice(u, pick && { ...pick, auto: false }, allowed)
      if (!choice) return undefined
      plan = { ...choice, notices }
    }
    if (this.health.isOpen(plan.model.provider)) {
      const failing = plan.model
      const healthy = allowed.filter(m => m.provider !== failing.provider && !this.health.isOpen(m.provider))
      const fallback = healthy[0]
      if (fallback) {
        const providerName = this.models.getProvider(failing.provider)?.name ?? failing.provider
        notices.push(`${providerName} keeps failing; ${fallback.name} answers this message instead`)
        plan = { ...plan, model: fallback, thinkingLevel: clampThinkingLevel(fallback, plan.thinkingLevel) }
      }
    }
    return plan
  }

  /** Called for every model response, so failing shared credentials are noticed. */
  recordOutcome(provider: string, outcome: 'ok' | 'error' | 'aborted', error?: string): void {
    if (outcome === 'ok') this.health.recordSuccess(provider)
    else if (outcome === 'error') this.health.recordFailure(provider, error ?? 'Request failed')
  }

  // ---- AI groups ----------------------------------------------------------

  async listGroups(): Promise<AiGroup[]> {
    const members = this.db
      .select({ groupId: aiUserGroups.groupId, n: count().as('n') })
      .from(aiUserGroups)
      .groupBy(aiUserGroups.groupId)
      .as('members')
    const rows = await this.db
      .select({ id: aiGroups.id, name: aiGroups.name, policy: aiGroups.policy, members: members.n })
      .from(aiGroups)
      .leftJoin(members, eq(members.groupId, aiGroups.id))
      .orderBy(asc(aiGroups.name))
    return rows.flatMap(r => {
      const policy = AiAccessPolicy.safeParse(r.policy)
      return policy.success ? [{ id: r.id, name: r.name, policy: policy.data, members: r.members ?? 0 }] : []
    })
  }

  private async group(id: string): Promise<AiGroup> {
    const found = (await this.listGroups()).find(g => g.id === id)
    if (!found) throw new NotFoundError('AI group not found')
    return found
  }

  async createGroup(body: AiGroupBody): Promise<AiGroup> {
    const id = crypto.randomUUID()
    await this.db.insert(aiGroups).values({ id, name: body.name, policy: body.policy })
    return this.group(id)
  }

  async updateGroup(id: string, body: AiGroupBody): Promise<AiGroup> {
    const updated = await this.db.update(aiGroups).set({ name: body.name, policy: body.policy, updatedAt: new Date() }).where(eq(aiGroups.id, id)).returning()
    if (!updated.length) throw new NotFoundError('AI group not found')
    return this.group(id)
  }

  /** Its members are left without a group (so without AI) until an admin moves them. */
  async deleteGroup(id: string): Promise<void> {
    const deleted = await this.db.delete(aiGroups).where(eq(aiGroups.id, id)).returning()
    if (!deleted.length) throw new NotFoundError('AI group not found')
  }

  /** Put someone in a group, or with null in none. */
  async setUserGroup(userId: string, groupId: string | null): Promise<void> {
    const [exists] = await this.db.select({ id: user.id }).from(user).where(eq(user.id, userId))
    if (!exists) throw new NotFoundError('User not found')
    if (!groupId) {
      await this.db.delete(aiUserGroups).where(eq(aiUserGroups.userId, userId))
      return
    }
    await this.group(groupId)
    await this.db.insert(aiUserGroups).values({ userId, groupId }).onConflictDoUpdate({ target: aiUserGroups.userId, set: { groupId } })
  }

  // ---- Provider logins ----------------------------------------------------

  private async deviceId(): Promise<string> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, DEVICE_ID_KEY))
    if (row && typeof row.value === 'string') return row.value
    const id = crypto.randomUUID()
    await this.db.insert(appSettings).values({ key: DEVICE_ID_KEY, value: id }).onConflictDoNothing()
    const [again] = await this.db.select().from(appSettings).where(eq(appSettings.key, DEVICE_ID_KEY))
    return String(again?.value ?? id)
  }

  async startLogin(providerId: string, type: AuthType): Promise<AiLoginState> {
    const provider = this.models.getProvider(providerId)
    if (!provider) throw new NotFoundError(`Unknown provider ${providerId}`)
    if (type === 'oauth' && !provider.auth.oauth) throw new BadRequestError(`${provider.name} has no sign-in`)
    if (type === 'api_key' && !provider.auth.apiKey?.login) throw new BadRequestError(`${provider.name} takes no API key`)
    this.pruneLogins()
    for (const s of this.logins.values()) if (s.providerId === providerId) s.cancel()

    const session = new LoginSession(providerId, type)
    this.logins.set(session.id, session)
    const deviceId = await this.deviceId()
    void this.models
      .login(
        providerId,
        type,
        {
          signal: session.controller.signal,
          prompt: p => session.prompt(p),
          notify: e => session.notify(e),
        },
        { agentName: 'ColTex', getDeviceId: () => deviceId },
      )
      .then(
        () => {
          if (session.status === 'running') session.status = 'done'
          // New credentials: give the provider a clean slate.
          this.health.reset(providerId)
        },
        (err: unknown) => {
          if (session.status !== 'running') return
          session.status = 'error'
          session.error = err instanceof Error ? err.message : String(err)
        },
      )
    // Give fast flows (an immediate prompt or URL) a moment so the first response is useful.
    await new Promise(r => setTimeout(r, 50))
    return session.state()
  }

  private login(id: string): LoginSession {
    const session = this.logins.get(id)
    if (!session) throw new NotFoundError('Login not found')
    return session
  }

  loginState(id: string): AiLoginState {
    return this.login(id).state()
  }

  async answerLogin(id: string, promptId: string, value: string): Promise<AiLoginState> {
    this.login(id).answer(promptId, value)
    await new Promise(r => setTimeout(r, 50))
    return this.login(id).state()
  }

  cancelLogin(id: string): AiLoginState {
    const session = this.login(id)
    session.cancel()
    return session.state()
  }

  private pruneLogins(): void {
    for (const [id, s] of this.logins) {
      if (Date.now() - s.startedAt > LOGIN_TTL_MS) {
        s.cancel()
        this.logins.delete(id)
      }
    }
  }

  async logout(providerId: string): Promise<void> {
    if (!this.models.getProvider(providerId)) throw new NotFoundError(`Unknown provider ${providerId}`)
    await this.models.logout(providerId)
    this.health.reset(providerId)
  }

  /** Send a tiny request to check that a model answers. */
  async testModel(ref: { provider: string; id: string }): Promise<{ ok: boolean; message: string; ms: number }> {
    const model = this.models.getModel(ref.provider, ref.id)
    if (!model) throw new NotFoundError(`Unknown model ${ref.provider}/${ref.id}`)
    const started = Date.now()
    const res = await this.models.completeSimple(
      model,
      { messages: [{ role: 'user', content: 'Reply with the single word: ready', timestamp: Date.now() }] },
      { signal: AbortSignal.timeout(60_000) },
    )
    const ms = Date.now() - started
    if (res.stopReason === 'error' || res.stopReason === 'aborted') {
      return { ok: false, message: res.errorMessage ?? 'Request failed', ms }
    }
    const text = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim()
    return { ok: true, message: text.slice(0, 200) || '(empty reply)', ms }
  }

  // ---- Usage --------------------------------------------------------------

  async recordUsage(entry: { userId: string; projectId: string; provider: string; model: string; usage: Usage }): Promise<void> {
    const { usage } = entry
    await this.db.insert(aiUsage).values({
      userId: entry.userId,
      projectId: entry.projectId,
      provider: entry.provider,
      model: entry.model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      cost: usage.cost.total,
    })
  }

  /** Totals, a day-by-day series and a per-model breakdown, for everyone or one person. */
  async usageReport(days: number, userId?: string): Promise<AiUsageReport> {
    const now = Date.now()
    const since = new Date(now - days * 86_400_000)
    const where = and(gte(aiUsage.createdAt, since), userId ? eq(aiUsage.userId, userId) : undefined)
    const input = sql<number>`coalesce(sum(${aiUsage.inputTokens} + ${aiUsage.cacheReadTokens} + ${aiUsage.cacheWriteTokens}), 0)::float8`
    const output = sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)::float8`
    const cost = sql<number>`coalesce(sum(${aiUsage.cost}), 0)::float8`
    const requests = sql<number>`count(*)::int`
    const [dayRows, byModel] = await Promise.all([
      this.db
        .select({ date: sql<string>`to_char(date_trunc('day', ${aiUsage.createdAt}), 'YYYY-MM-DD')`, requests, input, output, cost })
        .from(aiUsage)
        .where(where)
        .groupBy(sql`1`),
      this.db
        .select({ provider: aiUsage.provider, model: aiUsage.model, requests, inputTokens: input, outputTokens: output, cost })
        .from(aiUsage)
        .where(where)
        .groupBy(aiUsage.provider, aiUsage.model)
        .orderBy(desc(requests)),
    ])
    // A continuous series: days without requests are zero.
    const byDate = new Map(dayRows.map(d => [d.date, d]))
    const byDay = Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10)
      const d = byDate.get(date)
      return { date, requests: d?.requests ?? 0, tokens: d ? d.input + d.output : 0, cost: d?.cost ?? 0 }
    })
    const totals = byModel.reduce(
      (t, m) => ({ requests: t.requests + m.requests, inputTokens: t.inputTokens + m.inputTokens, outputTokens: t.outputTokens + m.outputTokens, cost: t.cost + m.cost }),
      { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
    )
    return { days, totals, byDay, byModel }
  }

  /** Everyone, with their usage over the last `days` days and their own access rule, if any. */
  async userRows(days: number): Promise<AiUserRow[]> {
    const since = new Date(Date.now() - days * 86_400_000)
    const usage = this.db
      .select({
        userId: aiUsage.userId,
        requests: sql<number>`count(*)::int`.as('requests'),
        inputTokens: sql<number>`sum(${aiUsage.inputTokens} + ${aiUsage.cacheReadTokens} + ${aiUsage.cacheWriteTokens})::float8`.as('input_tokens'),
        outputTokens: sql<number>`sum(${aiUsage.outputTokens})::float8`.as('output_tokens'),
        cost: sql<number>`sum(${aiUsage.cost})::float8`.as('cost'),
        lastUsedAt: sql<Date>`max(${aiUsage.createdAt})`.as('last_used_at'),
      })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since))
      .groupBy(aiUsage.userId)
      .as('usage')
    const rows = await this.db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        requests: usage.requests,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost: usage.cost,
        lastUsedAt: usage.lastUsedAt,
        groupId: aiUserGroups.groupId,
      })
      .from(user)
      .leftJoin(usage, eq(usage.userId, user.id))
      .leftJoin(aiUserGroups, eq(aiUserGroups.userId, user.id))
      .orderBy(desc(sql`coalesce(${usage.requests}, 0)`), user.name)
    return rows.map(r => {
      return {
        userId: r.userId,
        name: r.name,
        email: r.email,
        role: r.role ?? null,
        banned: !!r.banned,
        requests: r.requests ?? 0,
        inputTokens: r.inputTokens ?? 0,
        outputTokens: r.outputTokens ?? 0,
        cost: r.cost ?? 0,
        lastUsedAt: r.lastUsedAt ? new Date(r.lastUsedAt).toISOString() : null,
        groupId: r.groupId ?? null,
      }
    })
  }
}

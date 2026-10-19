import crypto from 'node:crypto'
import type { Agent, AgentEvent, AgentMessage } from '@earendil-works/pi-agent-core'
import type { AssistantMessage, Usage } from '@earendil-works/pi-ai'
import type { AiItem, AiSessionState, AiStreamEvent } from '@coltex/shared'
import { contextTokens } from './compact.ts'
import { SKILLS_SECTION, skillsSection } from './prompt.ts'
import type { AiService } from './service.ts'
import type { LoadedSkill } from './skills.ts'
import { describeToolCall } from './tools.ts'

export const shortId = () => crypto.randomUUID().slice(0, 12)

/** What a conversation starts from when it is reopened. */
export type SavedChat = { id: string; items: AiItem[]; messages: AgentMessage[]; contextTokens: number | null }

/**
 * A conversation with the agent as the panel shows it: items, live events
 * for subscribers, and the agent's events turned into items. The project
 * panel (`AiSession`) and the skills chat (`SkillWorkshop`) build on it.
 */
export abstract class AgentChat {
  readonly id: string
  readonly userId: string
  lastActive = Date.now()
  protected readonly ai: AiService
  /** Usage is counted against this project (null: none, e.g. the skills chat). */
  protected readonly usageProject: string | null
  protected readonly items: AiItem[]
  /** A reopened conversation's transcript, until the agent takes it over. */
  protected restored?: AgentMessage[]
  protected context: number | null
  protected agent?: Agent
  protected running = false
  /** Deleted: nothing is saved any more, even by a reply that was still coming. */
  protected forgotten = false
  /** The skills this person can use here, read at each message. */
  protected skills: LoadedSkill[] = []
  private readonly listeners = new Set<(e: AiStreamEvent) => void>()
  private assistantItem?: { id: string; text: string }

  constructor(ai: AiService, userId: string, usageProject: string | null, saved?: SavedChat) {
    this.ai = ai
    this.userId = userId
    this.usageProject = usageProject
    this.id = saved?.id ?? crypto.randomUUID()
    this.items = saved?.items ?? []
    this.restored = saved?.messages
    this.context = saved?.contextTokens ?? null
  }

  abstract state(): AiSessionState

  // ---- Events ---------------------------------------------------------------

  subscribe(listener: (e: AiStreamEvent) => void): () => void {
    this.listeners.add(listener)
    listener({ type: 'snapshot', state: this.state() })
    return () => this.listeners.delete(listener)
  }

  protected emit(event: AiStreamEvent): void {
    for (const l of this.listeners) l(event)
  }

  protected upsert(item: AiItem): void {
    const i = this.items.findIndex(x => x.id === item.id)
    if (i === -1) this.items.push(item)
    else this.items[i] = item
    this.emit({ type: 'item', item })
  }

  protected notice(level: 'info' | 'success' | 'error', text: string): void {
    this.upsert({ kind: 'notice', id: shortId(), level, text })
  }

  /** The agent's transcript, or the saved one before the agent exists. */
  protected transcript(): AgentMessage[] {
    return this.agent?.state.messages ?? this.restored ?? []
  }

  get isRunning(): boolean {
    return this.running
  }

  forget(): void {
    this.forgotten = true
    this.abort()
  }

  abort(): void {
    this.agent?.abort()
  }

  async waitForIdle(): Promise<void> {
    await this.agent?.waitForIdle()
  }

  protected recordUsage(model: { provider: string; id: string }, usage: Usage): void {
    void this.ai.recordUsage({ userId: this.userId, projectId: this.usageProject, provider: model.provider, model: model.id, usage }).catch(() => {})
  }

  /**
   * Put the current list of skills into the prompt: a system message
   * replacing the skills section, only when the list changed since the
   * transcript last said (so the prompt cache survives).
   */
  protected syncSkills(agent: Agent): void {
    const section = skillsSection(this.skills)
    let current: string | null | undefined
    for (const m of agent.state.messages) {
      const value = m.role === 'system' ? (m as { sections?: Record<string, string | null> }).sections?.[SKILLS_SECTION] : undefined
      if (value !== undefined) current = value
    }
    if (current === section) return
    agent.state.messages = [...agent.state.messages, { role: 'system', content: '', sections: { [SKILLS_SECTION]: section }, timestamp: Date.now() } as AgentMessage]
  }

  /** After a tool finished (the project panel refreshes its draft). */
  protected afterTool(_name: string): void {}

  protected onAgentEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'message_start':
        if (event.message.role === 'assistant') this.assistantItem = undefined
        break
      case 'message_update': {
        const e = event.assistantMessageEvent
        if (e.type !== 'text_delta') break
        if (!this.assistantItem) {
          this.assistantItem = { id: shortId(), text: '' }
          this.upsert({ kind: 'assistant', id: this.assistantItem.id, text: '' })
        }
        this.assistantItem.text += e.delta
        this.emit({ type: 'delta', id: this.assistantItem.id, text: e.delta })
        break
      }
      case 'message_end': {
        if (event.message.role !== 'assistant') break
        const message = event.message as AssistantMessage
        const text = message.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
        if (text.trim()) {
          const id = this.assistantItem?.id ?? shortId()
          const i = this.items.findIndex(x => x.id === id)
          if (i === -1) this.items.push({ kind: 'assistant', id, text })
          else this.items[i] = { kind: 'assistant', id, text }
          // Clients already have the text from deltas unless the provider didn't stream.
          if (!this.assistantItem || this.assistantItem.text !== text) this.emit({ type: 'item', item: { kind: 'assistant', id, text } })
        }
        this.assistantItem = undefined
        this.context = contextTokens(message.usage) ?? this.context
        if (message.stopReason === 'error') this.notice('error', message.errorMessage ?? 'The model request failed')
        this.ai.recordOutcome(
          message.provider,
          message.stopReason === 'error' ? 'error' : message.stopReason === 'aborted' ? 'aborted' : 'ok',
          message.errorMessage,
        )
        this.recordUsage({ provider: message.provider, id: message.model }, message.usage)
        break
      }
      case 'tool_execution_start':
        this.upsert({
          kind: 'tool',
          id: event.toolCallId,
          name: event.toolName,
          label: describeToolCall(event.toolName, (event.args ?? {}) as Record<string, unknown>),
          status: 'running',
        })
        break
      case 'tool_execution_end': {
        const existing = this.items.find(x => x.id === event.toolCallId)
        const output = event.result.content.flatMap((b: { type: string; text?: string }) => (b.type === 'text' ? [b.text ?? ''] : [])).join('')
        const failed = event.isError || event.result.isError
        if (existing?.kind === 'tool') {
          this.upsert({
            ...existing,
            status: failed ? 'error' : 'ok',
            // Errors explain themselves; for compiles the first line is the useful summary.
            result: failed ? output.slice(0, 400) : event.toolName === 'compile' ? output.split('\n')[0] : undefined,
          })
        }
        this.afterTool(event.toolName)
        break
      }
    }
  }
}

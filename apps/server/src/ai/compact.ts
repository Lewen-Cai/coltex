import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { Usage } from '@earendil-works/pi-ai'

/** The system prompt section that carries the summary of a compacted conversation. */
export const SUMMARY_SECTION = 'conversation-summary'

/** How much of the transcript the summariser reads (its tail, when longer). */
const MAX_TRANSCRIPT_CHARS = 300_000

export const COMPACT_SYSTEM_PROMPT = `You summarise a conversation between a LaTeX author and their writing assistant, so the assistant can continue it with a fresh context. Write the summary for the assistant, in the language the author used.

Keep:
- what the author asked for and decided, and their preferences (style, language, what not to touch);
- which files and sections were discussed or changed, and how (draft changes the author applied or discarded);
- open problems: errors still in the build, questions not yet answered, what was about to happen next.

Leave out pleasantries, full file contents and long logs. Use short headed lists. No preamble.`

/** Tokens the context holds after a reply: what was sent plus what came back. */
export function contextTokens(usage: Usage | undefined): number | null {
  if (!usage) return null
  const total = usage.input + usage.cacheRead + usage.cacheWrite + usage.output
  return total > 0 ? total : null
}

function text(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.flatMap((b: { type?: string; text?: string }) => (b.type === 'text' && b.text ? [b.text] : [])).join('\n')
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} […]` : s)

/** The summary carried over from an earlier compaction, if any. */
export function earlierSummary(messages: AgentMessage[]): string | undefined {
  let found: string | undefined
  for (const m of messages) {
    if (m.role !== 'system') continue
    const section = (m as { sections?: Record<string, string | null> }).sections?.[SUMMARY_SECTION]
    if (section !== undefined) found = section ?? undefined
  }
  return found
}

/** The conversation as plain text for the summariser (no tool schemas needed to read it). */
export function renderTranscript(messages: AgentMessage[]): string {
  const parts: string[] = []
  const earlier = earlierSummary(messages)
  if (earlier) parts.push(`EARLIER SUMMARY:\n${earlier}`)
  for (const m of messages) {
    if (m.role === 'user') parts.push(`AUTHOR:\n${text(m.content)}`)
    else if (m.role === 'assistant') {
      const said = text(m.content)
      const calls = (m.content as { type: string; name?: string; arguments?: unknown }[])
        .filter(b => b.type === 'toolCall')
        .map(b => `[tool ${b.name} ${clip(JSON.stringify(b.arguments ?? {}), 300)}]`)
      parts.push(`ASSISTANT:\n${[said, ...calls].filter(Boolean).join('\n')}`)
    } else if (m.role === 'toolResult') {
      const r = m as { toolName: string; content: unknown; isError: boolean }
      parts.push(`[${r.toolName} ${r.isError ? 'failed' : 'result'}: ${clip(text(r.content), 1500)}]`)
    }
  }
  const all = parts.join('\n\n')
  return all.length > MAX_TRANSCRIPT_CHARS ? `[…]\n${all.slice(-MAX_TRANSCRIPT_CHARS)}` : all
}

/**
 * The transcript after compacting: the system messages (prompt and tool
 * declarations) and one more that puts the summary into the prompt, so the
 * next message starts a short context that still knows what happened.
 */
export function compactedTranscript(messages: AgentMessage[], summary: string): AgentMessage[] {
  const system = messages.filter(m => m.role === 'system')
  const section = `<conversation-summary>\nEarlier in this conversation (summarised to save context):\n${summary.trim()}\n</conversation-summary>`
  return [...system, { role: 'system', content: '', sections: { [SUMMARY_SECTION]: section }, timestamp: Date.now() } as AgentMessage]
}

/** A rough token count (four characters a token), for right after compacting. */
export function estimateTokens(messages: AgentMessage[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4)
}

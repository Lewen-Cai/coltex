import { MENTION_PATTERN } from '@coltex/shared'

/**
 * Mentions travel as `<@userId>` (see @coltex/shared). People type and edit
 * them as `@Name`: the composer turns `<@id>` into `@Name` for editing and
 * back again before sending.
 */

export type Mentionable = { userId: string; name: string; email?: string }

/** The person picked last for a name, so two members called the same keep apart. */
const picked = new Map<string, string>()

export function rememberPick(person: Mentionable): void {
  picked.set(person.name, person.userId)
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `<@id>` → `@Name`; ids of people not in `names` stay as they are. */
export function mentionsToText(content: string, names: ReadonlyMap<string, string>): string {
  return content.replace(MENTION_PATTERN, (token, id: string) => {
    const name = names.get(id)
    return name ? `@${name}` : token
  })
}

/**
 * Typed `@Name` → `<@id>`, for the people who can be mentioned. Longer names
 * win (`@Ann Lee` before `@Ann`). A name ending in a Latin letter or digit
 * must end a word, so `@Ann` in `@Anna` is left alone; CJK names need no
 * space after them. An `@` inside a word (an email address) is not a mention.
 */
export function textToMentions(text: string, people: readonly Mentionable[]): string {
  const byName = new Map<string, string>()
  for (const p of people) if (p.name.trim() && !byName.has(p.name)) byName.set(p.name, p.userId)
  for (const [name, id] of picked) if (byName.has(name)) byName.set(name, id)
  if (byName.size === 0) return text
  const names = [...byName.keys()].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(
    `(?<![A-Za-z0-9._%+-])@(${names.map(n => `${escape(n)}${/[A-Za-z0-9]$/.test(n) ? '(?![A-Za-z0-9_])' : ''}`).join('|')})`,
    'g',
  )
  return text.replace(pattern, (_, name: string) => `<@${byName.get(name)}>`)
}

export type MentionPart = { text: string } | { userId: string }

/** Text and mentions, in order. */
export function splitMentions(content: string): MentionPart[] {
  const parts: MentionPart[] = []
  let last = 0
  for (const m of content.matchAll(MENTION_PATTERN)) {
    if (m.index > last) parts.push({ text: content.slice(last, m.index) })
    parts.push({ userId: m[1]! })
    last = m.index + m[0].length
  }
  if (last < content.length) parts.push({ text: content.slice(last) })
  return parts
}

/**
 * The `@query` being typed just before the caret, if any: where its `@` is
 * and what follows it. Names may contain spaces, so the query may too.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  const query = before.slice(at + 1)
  if (query.length > 40 || /[\n@]/.test(query) || /^\s/.test(query)) return null
  if (at > 0 && /[A-Za-z0-9._%+-]/.test(before[at - 1]!)) return null
  return { start: at, query }
}

/** People whose name or email matches the query: names that start with it first. */
export function matchPeople<T extends Mentionable>(people: readonly T[], query: string, limit = 8): T[] {
  const q = query.toLocaleLowerCase()
  const scored: [number, T][] = []
  for (const p of people) {
    const name = p.name.toLocaleLowerCase()
    const email = p.email?.toLocaleLowerCase() ?? ''
    const score = name.startsWith(q) ? 0 : name.split(/\s+/).some(w => w.startsWith(q)) ? 1 : name.includes(q) || email.startsWith(q) ? 2 : -1
    if (score >= 0) scored.push([score, p])
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, p]) => p)
}

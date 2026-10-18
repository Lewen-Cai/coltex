// The judge prompt follows PilotDeck's (https://github.com/OpenBMB/PilotDeck,
// AGPL-3.0, src/router/tokenSaver/generateJudgePrompt.ts and parseTier.ts @ 52660d5),
// with ColTex's two fixed tiers described for LaTeX work.

export type Tier = 'light' | 'strong'

const TIERS = `- light: a quick, self-contained question or a small change. For example: what a LaTeX command or package option does, how to write a symbol or a short formula, explaining one error message, rewording or translating a sentence or two, a one-line fix.
- strong: work that needs reading several files or careful reasoning. For example: fixing several compile errors, changes across files, restructuring or converting a document, tables, figures or TikZ that take real work, reviewing a section's writing, anything with several steps.`

/**
 * Ask a cheap model which tier a message needs. Short follow-ups ("go on",
 * "好的") keep the previous tier, so a task doesn't drop to the light model
 * halfway through.
 */
export function judgePrompt(text: string, context: string, previous: Tier | undefined): string {
  const continuation = previous
    ? `\nThe previous message was classified as ${previous}. Short replies such as "continue", "go on", "ok", "yes", "do it", "好的", "继续", "可以", "开始" continue that task: return <tier>${previous}</tier> for them. Only choose another tier when the message starts a new task.\n`
    : ''
  return `You route messages in a LaTeX editor's assistant to a model tier. Reply with exactly one tier wrapped in <tier>...</tier>.

Tiers:
${TIERS}
${continuation}
Message:
"""
${text.slice(0, 4000)}
"""
${context ? `\nAttached by the editor: ${context}\n` : ''}
When unsure, choose strong. Respond with only <tier>NAME</tier>.`
}

export function parseTier(reply: string): Tier | undefined {
  const m = /<tier>\s*(light|strong)\s*<\/tier>/i.exec(reply) ?? /\b(light|strong)\b/i.exec(reply)
  return m ? (m[1]!.toLowerCase() as Tier) : undefined
}

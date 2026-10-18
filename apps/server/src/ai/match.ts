/**
 * Finding the text an edit replaces. Models often copy a passage slightly
 * wrong: curly quotes where the file has straight ones (or TeX's ``…''),
 * a non-breaking space, trailing spaces, a tab for spaces. The idea comes from
 * PilotDeck's editNormalization (OpenBMB/PilotDeck, AGPL-3.0,
 * src/tool/builtin/filesystem/editNormalization.ts @ 52660d5); this version
 * maps every normalised character back to the original, so the
 * normalisations may change lengths, and it never guesses between several
 * matches.
 */

export type MatchKind = 'exact' | 'quotes' | 'whitespace'

export type Match = { start: number; end: number; kind: MatchKind }

export type MatchResult = { match: Match } | { error: 'not_found' } | { error: 'ambiguous'; count: number; kind: MatchKind }

/** A normalised text, with the original span [start[i], end[i]) of each of its characters. */
type Normalized = { text: string; start: number[]; end: number[] }

const QUOTES: [RegExp, string][] = [
  // TeX's quotes first, so `` and '' become one character like the typographic ones.
  [/``|''|[“”„«»]/y, '"'],
  [/[`‘’‚]/y, "'"],
]

function normalize(text: string, whitespace: boolean): Normalized {
  const out: string[] = []
  const start: number[] = []
  const end: number[] = []
  const push = (ch: string, from: number, to: number) => {
    out.push(ch)
    start.push(from)
    end.push(to)
  }
  let i = 0
  outer: while (i < text.length) {
    for (const [re, ch] of QUOTES) {
      re.lastIndex = i
      const m = re.exec(text)
      if (m) {
        push(ch, i, i + m[0].length)
        i += m[0].length
        continue outer
      }
    }
    const c = text[i]!
    if (whitespace) {
      if (c === '\r' && text[i + 1] === '\n') {
        i++
        continue
      }
      if (c === ' ' || c === '\t' || c === ' ') {
        let j = i
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === ' ')) j++
        // Trailing whitespace (before a newline or at the end) disappears; a run inside a line is one space.
        if (j < text.length && text[j] !== '\n' && text[j] !== '\r') push(' ', i, j)
        i = j
        continue
      }
    } else if (c === ' ') {
      push(' ', i, i + 1)
      i++
      continue
    }
    push(c, i, i + 1)
    i++
  }
  return { text: out.join(''), start, end }
}

function occurrences(haystack: string, needle: string): number[] {
  const found: number[] = []
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + Math.max(1, needle.length))) found.push(i)
  return found
}

/**
 * Where `needle` occurs in `text`: exactly, else after normalising quotes,
 * else after also normalising whitespace. Each level must find exactly one
 * place; several places at a level is an error (the caller asks for more
 * context), never a guess.
 */
export function findEditTarget(text: string, needle: string): MatchResult {
  const exact = occurrences(text, needle)
  if (exact.length === 1) return { match: { start: exact[0]!, end: exact[0]! + needle.length, kind: 'exact' } }
  if (exact.length > 1) return { error: 'ambiguous', count: exact.length, kind: 'exact' }

  for (const kind of ['quotes', 'whitespace'] as const) {
    const hay = normalize(text, kind === 'whitespace')
    const pin = normalize(needle, kind === 'whitespace').text
    if (!pin) continue
    const found = occurrences(hay.text, pin)
    if (found.length > 1) return { error: 'ambiguous', count: found.length, kind }
    if (found.length === 1) {
      const at = found[0]!
      return { match: { start: hay.start[at]!, end: hay.end[at + pin.length - 1]!, kind } }
    }
  }
  return { error: 'not_found' }
}

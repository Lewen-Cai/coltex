/**
 * Project-wide search and replace: finding matches in the project's text
 * files and working out replacements. Runs in the browser, so a costly
 * regular expression only ever slows the tab that typed it.
 */

export type SearchOptions = {
  query: string
  caseSensitive: boolean
  regex: boolean
  wholeWord: boolean
}

export type SearchMatch = {
  path: string
  /** Offsets in the file's text (UTF-16, as CodeMirror and Yjs count). */
  from: number
  to: number
  /** 1-based line, and the line around the match for display. */
  line: number
  before: string
  /** The match as shown (its first line). */
  text: string
  after: string
  /** The whole match, which a regular expression may take across lines. */
  matched: string
  /** Capture groups, for $1… in regex replacements. */
  groups: (string | undefined)[]
  named?: Record<string, string | undefined>
}

const WORD_CHAR = '(?![\\p{sc=Han}\\p{sc=Hiragana}\\p{sc=Katakana}\\p{sc=Hangul}])[\\p{L}\\p{N}_]'

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The pattern for a search; throws on an invalid regular expression. */
export function buildPattern({ query, caseSensitive, regex, wholeWord }: SearchOptions): RegExp {
  let source = regex ? query : escapeRegExp(query)
  // \b knows only ASCII words: a word character here is a letter or digit of
  // any script, except CJK, which is written without spaces (so in 和colour,
  // colour is a word of its own).
  if (wholeWord) source = `(?<!${WORD_CHAR})(?:${source})(?!${WORD_CHAR})`
  return new RegExp(source, `gu${caseSensitive ? '' : 'i'}`)
}

const PREVIEW = 48

function lineStarts(text: string): number[] {
  const starts = [0]
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1)
  return starts
}

function lineIndexOf(starts: number[], pos: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid]! <= pos) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Every match in the files, in file order, up to `limit`. */
export function searchFiles(
  files: { path: string; content: string }[],
  options: SearchOptions,
  limit = 2000,
): { matches: SearchMatch[]; truncated: boolean } {
  const matches: SearchMatch[] = []
  if (!options.query) return { matches, truncated: false }
  const pattern = buildPattern(options)
  for (const { path, content } of files) {
    const starts = lineStarts(content)
    pattern.lastIndex = 0
    for (let m = pattern.exec(content); m; m = pattern.exec(content)) {
      if (m[0] === '') {
        // An empty match (e.g. a*) finds nothing to show or replace; move on.
        pattern.lastIndex++
        continue
      }
      if (matches.length >= limit) return { matches, truncated: true }
      const from = m.index
      const to = from + m[0].length
      const index = lineIndexOf(starts, from)
      const lineEnd = index + 1 < starts.length ? starts[index + 1]! - 1 : content.length
      const lineStart = starts[index]!
      const beforeStart = Math.max(lineStart, from - PREVIEW)
      matches.push({
        path,
        from,
        to,
        line: index + 1,
        before: (beforeStart > lineStart ? '…' : '') + content.slice(beforeStart, from).trimStart(),
        text: content.slice(from, Math.min(to, lineEnd)),
        matched: m[0],
        after: content.slice(Math.min(to, lineEnd), Math.min(lineEnd, to + PREVIEW)),
        groups: m.slice(1),
        named: m.groups,
      })
    }
  }
  return { matches, truncated: false }
}

/**
 * The text a match is replaced with. With regular expressions, $& is the
 * match, $1… and $<name> its groups and $$ a dollar sign (as in
 * String.prototype.replace); otherwise the replacement is taken as it is.
 */
export function replacementFor(match: Pick<SearchMatch, 'groups' | 'named' | 'matched'>, replacement: string, regex: boolean): string {
  if (!regex) return replacement
  return replacement.replace(/\$(\$|&|<([^>]+)>|(\d{1,2}))/g, (all, token: string, name?: string, digits?: string) => {
    if (token === '$') return '$'
    if (token === '&') return match.matched
    if (name !== undefined) return match.named && name in match.named ? (match.named[name] ?? '') : all
    const n = Number(digits)
    // $12 with only one group is $1 followed by "2".
    if (n >= 1 && n <= match.groups.length) return match.groups[n - 1] ?? ''
    if (digits!.length === 2) {
      const first = Number(digits![0])
      if (first >= 1 && first <= match.groups.length) return (match.groups[first - 1] ?? '') + digits![1]
    }
    return all
  })
}

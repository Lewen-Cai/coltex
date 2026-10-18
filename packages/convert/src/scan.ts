/**
 * A small, predictable LaTeX scanner: enough to find commands and
 * environments with their arguments, respecting braces, comments and
 * verbatim text. It never rewrites anything by itself; callers cut and splice
 * the original source using the positions it reports.
 */

/** Verbatim-like environments whose content must never be touched. */
const VERBATIM_ENVS = ['verbatim', 'verbatim*', 'Verbatim', 'lstlisting', 'minted', 'comment', 'alltt']

/**
 * The source with comments and verbatim content replaced by spaces (newlines
 * kept), so positions in the mask and the source line up 1:1.
 */
export function mask(src: string): string {
  const out = src.split('')
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' '
  }
  // Verbatim environments first (their content may contain %).
  for (const env of VERBATIM_ENVS) {
    const open = `\\begin{${env}}`
    const close = `\\end{${env}}`
    for (let i = src.indexOf(open); i !== -1; i = src.indexOf(open, i + 1)) {
      const end = src.indexOf(close, i + open.length)
      if (end === -1) break
      blank(i + open.length, end)
      i = end
    }
  }
  // \verb|...| and \verb*|...|
  for (const m of src.matchAll(/\\verb\*?([^a-zA-Z\s*])/g)) {
    const delim = m[1]!
    const from = m.index! + m[0].length
    const to = src.indexOf(delim, from)
    if (to !== -1 && !src.slice(from, to).includes('\n')) blank(from, to)
  }
  // Comments: an unescaped % to the end of the line.
  const text = out.join('')
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '%') continue
    let backslashes = 0
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) backslashes++
    if (backslashes % 2 === 1) continue
    let end = text.indexOf('\n', i)
    if (end === -1) end = text.length
    blank(i, end)
    i = end
  }
  return out.join('')
}

export type Group = { start: number; end: number; inner: string }
export type MacroHit = { start: number; end: number; star: boolean; opts: Group[]; args: Group[] }
export type EnvHit = { start: number; end: number; bodyStart: number; bodyEnd: number; opts: Group[]; args: Group[] }

/** Skip spaces and at most one newline (a blank line ends a command's arguments). */
function skipSpace(m: string, pos: number): number {
  let newlines = 0
  while (pos < m.length && /\s/.test(m[pos]!)) {
    if (m[pos] === '\n' && ++newlines > 1) break
    pos++
  }
  return pos
}

/** A balanced {...} or [...] group starting at `pos` (after optional spaces). */
export function readGroup(m: string, src: string, pos: number, open: '{' | '['): Group | undefined {
  const at = skipSpace(m, pos)
  if (m[at] !== open) return undefined
  const close = open === '{' ? '}' : ']'
  let depth = 0
  for (let i = at; i < m.length; i++) {
    const c = m[i]
    if (c === '\\') {
      i++ // escaped character, e.g. \{ or \]
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      if (open === '{' && depth === 1) return { start: at, end: i + 1, inner: src.slice(at + 1, i) }
      depth--
      if (depth < 0) return undefined
    } else if (c === close && depth === 0) {
      return { start: at, end: i + 1, inner: src.slice(at + 1, i) }
    }
  }
  return undefined
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Every `\name` with up to `opts` optional and `args` mandatory arguments.
 * Missing mandatory arguments are tolerated (the hit just has fewer).
 */
export function findMacros(m: string, src: string, name: string, spec: { opts?: number; args?: number } = {}, from = 0, to = m.length): MacroHit[] {
  const hits: MacroHit[] = []
  const re = new RegExp(`\\\\${escapeRe(name)}(?![a-zA-Z@])`, 'g')
  re.lastIndex = from
  for (let match = re.exec(m); match && match.index < to; match = re.exec(m)) {
    // Skip escaped backslashes ("\\name" is a line break followed by text).
    let backslashes = 0
    for (let j = match.index - 1; j >= 0 && m[j] === '\\'; j--) backslashes++
    if (backslashes % 2 === 1) continue
    let pos = match.index + match[0].length
    let star = false
    if (m[pos] === '*') {
      star = true
      pos++
    }
    const opts: Group[] = []
    const args: Group[] = []
    for (let k = 0; k < (spec.opts ?? 0); k++) {
      const g = readGroup(m, src, pos, '[')
      if (!g) break
      opts.push(g)
      pos = g.end
    }
    for (let k = 0; k < (spec.args ?? 0); k++) {
      const g = readGroup(m, src, pos, '{')
      if (!g) break
      args.push(g)
      pos = g.end
    }
    hits.push({ start: match.index, end: pos, star, opts, args })
    re.lastIndex = pos
  }
  return hits
}

/** Every `\begin{name}...\end{name}` (outermost first), with arguments after \begin{name}. */
export function findEnvs(m: string, src: string, name: string, spec: { opts?: number; args?: number } = {}, from = 0, to = m.length): EnvHit[] {
  const hits: EnvHit[] = []
  const open = `\\begin{${name}}`
  const close = `\\end{${name}}`
  let i = m.indexOf(open, from)
  while (i !== -1 && i < to) {
    // Find the matching \end, counting nested environments of the same name.
    let depth = 1
    let j = i + open.length
    let endAt = -1
    while (depth > 0) {
      const nextOpen = m.indexOf(open, j)
      const nextClose = m.indexOf(close, j)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        j = nextOpen + open.length
      } else {
        depth--
        j = nextClose + close.length
        if (depth === 0) endAt = nextClose
      }
    }
    if (endAt === -1) break
    let pos = i + open.length
    const opts: Group[] = []
    const args: Group[] = []
    for (let k = 0; k < (spec.opts ?? 0); k++) {
      const g = readGroup(m, src, pos, '[')
      if (!g) break
      opts.push(g)
      pos = g.end
    }
    for (let k = 0; k < (spec.args ?? 0); k++) {
      const g = readGroup(m, src, pos, '{')
      if (!g) break
      args.push(g)
      pos = g.end
    }
    hits.push({ start: i, end: endAt + close.length, bodyStart: pos, bodyEnd: endAt, opts, args })
    i = m.indexOf(open, endAt + close.length)
  }
  return hits
}

/**
 * Split at top-level (brace depth 0) occurrences of `sep`, a literal string
 * such as "\\and", "\\\\", "," or "\\sep". Commands are matched whole.
 */
export function splitTop(s: string, sep: string): string[] {
  const m = mask(s)
  const parts: string[] = []
  let depth = 0
  let last = 0
  const isCommand = /^\\[a-zA-Z]+$/.test(sep)
  for (let i = 0; i < m.length; i++) {
    const c = m[i]
    if (c === '\\' && !m.startsWith(sep, i)) {
      i++
      continue
    }
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (depth === 0 && m.startsWith(sep, i)) {
      if (isCommand && /[a-zA-Z]/.test(m[i + sep.length] ?? '')) continue
      parts.push(s.slice(last, i))
      i += sep.length - 1
      last = i + 1
      // "\\" may carry an optional spacing argument: \\[2pt]
      if (sep === '\\\\') {
        const g = readGroup(m, s, last, '[')
        if (g && g.start === last) {
          last = g.end
          i = g.end - 1
        }
      }
    }
  }
  parts.push(s.slice(last))
  return parts
}

/** Cut ranges out of `src` (ranges may be in any order but must not overlap). */
export function cut(src: string, ranges: readonly { start: number; end: number }[]): string {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  for (const r of sorted) {
    if (r.start < pos) continue
    out += src.slice(pos, r.start)
    pos = r.end
  }
  return out + src.slice(pos)
}

/** Text for metadata: comments dropped, whitespace collapsed, ~ as a space. */
export function clean(s: string): string {
  return mask(s).replace(/~/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Remove the outer braces of a fully braced string ("{x}" → "x"). */
export function unbrace(s: string): string {
  const t = s.trim()
  if (t.startsWith('{') && t.endsWith('}')) {
    const g = readGroup(t, t, 0, '{')
    if (g && g.end === t.length) return g.inner.trim()
  }
  return t
}

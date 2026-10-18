/**
 * Just enough BibTeX parsing for the citation picker: each entry's key,
 * type and the fields people search by. Not a full parser (no @string
 * expansion or concatenation); entries it can't read are skipped.
 */

export type BibEntry = {
  key: string
  type: string
  path: string
  title: string
  authors: string
  year: string
  venue: string
}

/** Field values, keyed by lower-case name, from an entry's body after its key. */
function fields(body: string): Map<string, string> {
  const out = new Map<string, string>()
  let i = 0
  while (i < body.length) {
    const name = /\s*,?\s*([A-Za-z][\w-]*)\s*=\s*/y
    name.lastIndex = i
    const m = name.exec(body)
    if (!m) break
    i = name.lastIndex
    let value = ''
    const open = body[i]
    if (open === '{' || open === '"') {
      const close = open === '{' ? '}' : '"'
      let depth = 0
      let j = i
      for (; j < body.length; j++) {
        const ch = body[j]
        if (ch === '\\') {
          j++
          continue
        }
        if (open === '{') {
          if (ch === '{') depth++
          else if (ch === '}' && --depth === 0) break
        } else if (ch === close && j > i) {
          break
        }
      }
      value = body.slice(i + 1, j)
      i = j + 1
    } else {
      const bare = /[^,}\s]*/y
      bare.lastIndex = i
      value = bare.exec(body)?.[0] ?? ''
      i = bare.lastIndex
    }
    out.set(m[1]!.toLowerCase(), value)
  }
  return out
}

/** Braces and common accent commands out of a field, for display and search. */
export function plainText(value: string): string {
  return value
    .replace(/\\[`'^"~=.uvHcdbtk]\s*\{?([A-Za-z])\}?/g, '$1')
    .replace(/\\(?:emph|textit|textbf|textsc|mathrm|text)\s*\{([^{}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\\&/g, '&')
    .replace(/~/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Smith, John and Li, Bo and Others" → "Smith, Li, Others". */
function surnames(authors: string): string {
  return plainText(authors)
    .split(/\s+and\s+/i)
    .map(a => (a.includes(',') ? a.split(',')[0]! : a.split(' ').at(-1)!).trim())
    .filter(Boolean)
    .join(', ')
}

export function parseBib(path: string, text: string): BibEntry[] {
  const entries: BibEntry[] = []
  const start = /@([A-Za-z]+)\s*[{(]\s*([^,\s]+)\s*,/g
  for (let m = start.exec(text); m; m = start.exec(text)) {
    const type = m[1]!.toLowerCase()
    if (type === 'comment' || type === 'string' || type === 'preamble') continue
    // The entry runs to its closing brace.
    let depth = 1
    let j = start.lastIndex
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === '\\') j++
      else if (text[j] === '{') depth++
      else if (text[j] === '}') depth--
    }
    const f = fields(text.slice(start.lastIndex, j - 1))
    entries.push({
      key: m[2]!,
      type,
      path,
      title: plainText(f.get('title') ?? ''),
      authors: surnames(f.get('author') ?? f.get('editor') ?? ''),
      year: (f.get('year') ?? f.get('date') ?? '').match(/\d{4}/)?.[0] ?? '',
      venue: plainText(f.get('journal') ?? f.get('journaltitle') ?? f.get('booktitle') ?? f.get('publisher') ?? ''),
    })
    start.lastIndex = j
  }
  return entries
}

/** Entries matching every word of the query, in key, title, authors, year or venue. */
export function filterEntries(entries: BibEntry[], query: string): BibEntry[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return entries
  return entries.filter(e => {
    const hay = `${e.key} ${e.title} ${e.authors} ${e.year} ${e.venue}`.toLocaleLowerCase()
    return words.every(w => hay.includes(w))
  })
}

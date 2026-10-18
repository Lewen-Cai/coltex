import { BadRequestError } from '../errors.ts'

/**
 * BibTeX for a DOI (or an arXiv id), by content negotiation at doi.org. The
 * server only follows redirects to the DOI registration agencies, so this
 * can't be used to make it fetch arbitrary addresses.
 */

export type DoiFetch = (url: string, init: RequestInit) => Promise<Response>

/** Hosts doi.org hands BibTeX requests to (and their subdomains). */
const AGENCIES = ['doi.org', 'crossref.org', 'datacite.org', 'crosscite.org', 'medra.org', 'japanlinkcenter.org', 'chinadoi.cn', 'airiti.com', 'kisti.re.kr']
const MAX_BYTES = 1_000_000
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** A DOI from what someone pasted: a bare DOI, doi:…, a doi.org link, or an arXiv id. */
export function normalizeDoi(input: string): string {
  const s = input.trim()
  const arxiv = /^(?:arxiv:|https?:\/\/arxiv\.org\/(?:abs|pdf)\/)?(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?$/i.exec(s)
  if (arxiv) return `10.48550/arXiv.${arxiv[1]}`
  const doi = /^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+)$/i.exec(s)
  if (!doi) throw new BadRequestError('Not a DOI or an arXiv id')
  return decodeURIComponent(doi[1]!)
}

const allowed = (url: URL, base: URL) =>
  url.host === base.host ||
  (url.protocol === 'https:' && AGENCIES.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`)))

export async function fetchDoiBibtex(doi: string, opts: { base?: string; fetch?: DoiFetch } = {}): Promise<string> {
  const doFetch = opts.fetch ?? ((url, init) => globalThis.fetch(url, init))
  const base = new URL(opts.base ?? 'https://doi.org')
  let url = new URL(`/${doi.split('/').map(encodeURIComponent).join('/')}`, base)
  for (let hop = 0; hop < 6; hop++) {
    let res: Response
    try {
      res = await doFetch(url.toString(), {
        headers: { Accept: 'application/x-bibtex; charset=utf-8' },
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
      })
    } catch {
      throw new BadRequestError('Could not reach doi.org')
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      if (!next) break
      url = new URL(next, url)
      if (!allowed(url, base)) throw new BadRequestError(`doi.org sent the request to ${url.hostname}, which isn't a DOI registration agency`)
      continue
    }
    if (res.status === 404) throw new BadRequestError(`DOI ${doi} was not found`)
    if (!res.ok) throw new BadRequestError(`doi.org answered ${res.status} for ${doi}`)
    const body = await res.text()
    if (body.length > MAX_BYTES) throw new BadRequestError('The BibTeX for this DOI is too large')
    const entry = body.trim()
    if (!/^@\w+\s*\{/.test(entry)) throw new BadRequestError(`No BibTeX is available for ${doi}`)
    return entry
  }
  throw new BadRequestError('Too many redirects from doi.org')
}

/** The citation key of the first entry, e.g. Smith_2020 in "@article{Smith_2020, …". */
export function entryKey(entry: string): string | undefined {
  return /^@\w+\s*\{\s*([^,\s]+)\s*,/.exec(entry.trim())?.[1]
}

/**
 * A citation key for a looked-up entry: its own when that is a plain word
 * (Crossref's Smith_2020), else the first author's surname and the year
 * (DataCite gives a doi.org link as the key).
 */
export function citationKey(entry: string): string {
  const own = entryKey(entry)
  if (own && /^[A-Za-z][\w:-]*$/.test(own)) return own
  const field = (name: string) => new RegExp(`\\b${name}\\s*=\\s*[{"]([^}"]*)`, 'i').exec(entry)?.[1]?.trim()
  const firstAuthor = field('author')?.split(/\s+and\s+/)[0] ?? ''
  const surname = (firstAuthor.includes(',') ? firstAuthor.split(',')[0]! : firstAuthor.split(/\s+/).at(-1) ?? '')
    .normalize('NFKD')
    .replace(/[^A-Za-z]/g, '')
  const year = field('year')?.match(/\d{4}/)?.[0] ?? ''
  return surname || year ? `${surname || 'ref'}${year}` : 'ref'
}

/** Every citation key in a .bib text. */
export function bibKeys(text: string): Set<string> {
  return new Set([...text.matchAll(/^\s*@(?!comment|string|preamble)\w+\s*\{\s*([^,\s]+)\s*,/gim)].map(m => m[1]!))
}

/** The key of the entry in `text` with this DOI, if any. */
export function keyWithDoi(text: string, doi: string): string | undefined {
  const target = doi.toLowerCase()
  for (const block of text.split(/^\s*(?=@)/m)) {
    const m = /\bdoi\s*=\s*[{"]\s*(?:https?:\/\/(?:dx\.)?doi\.org\/)?([^}"]+?)\s*[}"]/i.exec(block)
    if (m && m[1]!.toLowerCase() === target) return entryKey(block)
  }
  return undefined
}

/**
 * One field per line (doi.org's BibTeX comes on a single line), with the key
 * changed to `key`.
 */
export function formatEntry(entry: string, key: string): string {
  const open = entry.indexOf('{')
  const type = entry.slice(0, open).trim()
  const body = entry.slice(open + 1, entry.lastIndexOf('}'))
  const fields: string[] = []
  let depth = 0
  let quoted = false
  let current = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (ch === '\\') {
      current += ch + (body[i + 1] ?? '')
      i++
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === '"' && depth === 0) quoted = !quoted
    if (ch === ',' && depth === 0 && !quoted) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) fields.push(current.trim())
  const rest = fields
    .slice(1)
    .map(f => f.replace(/^(\w[\w-]*)\s*=\s*/, (_, name: string) => `${name.toLowerCase()} = `))
    // BibTeX knows months as jan…dec; Crossref writes e.g. "month = Sept".
    .map(f => f.replace(/^month = ([A-Za-z]+)$/, (all, m: string) => (MONTHS.includes(m.slice(0, 3).toLowerCase()) ? `month = ${m.slice(0, 3).toLowerCase()}` : all)))
  return `${type}{${key},\n${rest.map(f => `  ${f}`).join(',\n')}\n}\n`
}

import type { LiteratureHit, LiteratureSearchResult } from '@coltex/shared'

/**
 * Searching the literature by title, author or keywords: Crossref (journals,
 * proceedings, books) and arXiv (preprints). Only these two fixed HTTPS APIs
 * are asked, without following redirects, so a query can't make the server
 * fetch anything else. Each hit carries the id `addDoi` takes.
 */

export type SearchFetch = (url: string, init: RequestInit) => Promise<Response>

const CROSSREF = 'https://api.crossref.org/works'
const ARXIV = 'https://export.arxiv.org/api/query'
const PER_SOURCE = 12
const MAX_BYTES = 2_000_000
const CACHE_MS = 10 * 60_000
const CACHE_SIZE = 200

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Text of an XML or Crossref (JATS-tagged) string: tags dropped, entities decoded, spaces collapsed. */
export function plainText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

async function getText(doFetch: SearchFetch, url: string, accept: string, userAgent: string): Promise<string> {
  const res = await doFetch(url, { headers: { Accept: accept, 'User-Agent': userAgent }, redirect: 'error', signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`)
  const body = await res.text()
  if (body.length > MAX_BYTES) throw new Error('The answer is too large')
  return body
}

type CrossrefWork = {
  DOI?: string
  title?: string[]
  author?: { given?: string; family?: string; name?: string }[]
  issued?: { 'date-parts'?: (number | null)[][] }
  'container-title'?: string[]
  type?: string
}

export function parseCrossref(json: string): LiteratureHit[] {
  const items = (JSON.parse(json) as { message?: { items?: CrossrefWork[] } }).message?.items ?? []
  return items
    .filter(w => w.DOI && w.title?.[0])
    .map(w => ({
      source: 'crossref' as const,
      id: w.DOI!,
      doi: w.DOI!,
      title: plainText(w.title![0]!),
      authors: (w.author ?? []).map(a => plainText(a.name ?? [a.given, a.family].filter(Boolean).join(' '))).filter(Boolean),
      year: w.issued?.['date-parts']?.[0]?.[0] ?? null,
      venue: w['container-title']?.[0] ? plainText(w['container-title'][0]) : null,
    }))
}

export function parseArxiv(xml: string): LiteratureHit[] {
  const hits: LiteratureHit[] = []
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const tag = (name: string) => new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(entry!)?.[1]
    const id = /arxiv\.org\/abs\/([^<\s]+?)(?:v\d+)?\s*</.exec(entry!)?.[1]
    const title = tag('title')
    if (!id || !title) continue
    const doi = tag('arxiv:doi')
    hits.push({
      source: 'arxiv',
      // The published version's DOI when arXiv knows it, else the preprint (as arXiv:<id>).
      id: doi ? plainText(doi) : `arXiv:${id}`,
      doi: doi ? plainText(doi) : null,
      title: plainText(title),
      authors: [...entry!.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map(m => plainText(m[1]!)),
      year: Number(tag('published')?.slice(0, 4)) || null,
      venue: tag('arxiv:journal_ref') ? plainText(tag('arxiv:journal_ref')!) : null,
    })
  }
  return hits
}

const doiKey = (doi: string | null) => doi?.toLowerCase()

/** Crossref and arXiv in turn (best of each first), without the same DOI twice. */
export function mergeHits(crossref: LiteratureHit[], arxiv: LiteratureHit[]): LiteratureHit[] {
  const seen = new Set<string>()
  const out: LiteratureHit[] = []
  for (let i = 0; i < Math.max(crossref.length, arxiv.length); i++) {
    for (const hit of [crossref[i], arxiv[i]]) {
      if (!hit) continue
      const key = doiKey(hit.doi) ?? hit.id
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
    }
  }
  return out
}

const comparable = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** A hit whose title is the query (a pasted title) goes first. */
export function exactFirst(hits: LiteratureHit[], query: string): LiteratureHit[] {
  const q = comparable(query)
  return [...hits.filter(h => comparable(h.title) === q), ...hits.filter(h => comparable(h.title) !== q)]
}

export class LiteratureSearch {
  private readonly fetch: SearchFetch
  private readonly userAgent: string
  private readonly cache = new Map<string, { at: number; result: Promise<LiteratureSearchResult> }>()

  constructor(opts: { fetch?: SearchFetch; version?: string } = {}) {
    this.fetch = opts.fetch ?? ((url, init) => globalThis.fetch(url, init))
    // Crossref asks API users to say who they are.
    this.userAgent = `ColTex/${opts.version ?? 'dev'} (https://github.com/coltexeditor/coltex)`
  }

  search(query: string): Promise<LiteratureSearchResult> {
    const q = query.trim().replace(/\s+/g, ' ')
    const key = q.toLowerCase()
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.result
    const result = this.run(q)
    this.cache.set(key, { at: Date.now(), result })
    // A failed source shouldn't stick for ten minutes.
    void result.then(r => r.unavailable.length && this.cache.delete(key), () => this.cache.delete(key))
    while (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!)
    return result
  }

  private async run(q: string): Promise<LiteratureSearchResult> {
    const crossrefUrl = `${CROSSREF}?${new URLSearchParams({ 'query.bibliographic': q, rows: String(PER_SOURCE), select: 'DOI,title,author,issued,container-title,type' })}`
    // The title as a phrase, or every word anywhere: a pasted title then ranks first.
    const words = q.split(' ').map(w => w.replace(/[^\p{L}\p{N}\-.]/gu, '')).filter(Boolean)
    const terms = words.length ? `ti:"${words.join(' ')}" OR (${words.map(w => `all:${w}`).join(' AND ')})` : ''
    const arxivUrl = `${ARXIV}?${new URLSearchParams({ search_query: terms, start: '0', max_results: String(PER_SOURCE) })}`
    const [crossref, arxiv] = await Promise.allSettled([
      getText(this.fetch, crossrefUrl, 'application/json', this.userAgent).then(parseCrossref),
      terms ? getText(this.fetch, arxivUrl, 'application/atom+xml', this.userAgent).then(parseArxiv) : Promise.resolve([]),
    ])
    const unavailable: LiteratureSearchResult['unavailable'] = []
    if (crossref.status === 'rejected') unavailable.push('crossref')
    if (arxiv.status === 'rejected') unavailable.push('arxiv')
    const hits = mergeHits(crossref.status === 'fulfilled' ? crossref.value : [], arxiv.status === 'fulfilled' ? arxiv.value : [])
    return { hits: exactFirst(hits, q), unavailable }
  }
}

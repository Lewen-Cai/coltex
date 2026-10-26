import type { WebSearchService } from '@coltex/shared'
import { fetchPublicUrl, type FetchedFile } from '../projects/url-fetch.ts'

/**
 * Web access for the AI agent. What leaves the server is kept to what a
 * search needs, so a model misled by text it read can't send the project
 * anywhere: queries go only to the search service the admin chose (and are
 * short), and pages are read only at addresses the author wrote or a search
 * returned, exactly as given (`WebScope`), with plain GETs.
 */

export type WebResult = { title: string; url: string; snippet: string; date?: string }
export type WebPage = { url: string; title: string; text: string }
export type WebFetch = (url: string, init: RequestInit) => Promise<Response>

/** DeepSeek's limit, and short enough that no real amount of text fits into a query. */
export const MAX_QUERY_LENGTH = 128
const MAX_RESULTS = 8
const TIMEOUT_MS = 30_000
/** Pages read directly; longer ones are cut. */
const MAX_PAGE_BYTES = 5 * 1024 * 1024

export const SERVICE_NAMES: Record<WebSearchService, string> = { deepseek: 'DeepSeek', tavily: 'Tavily', exa: 'Exa', brave: 'Brave Search' }

/** Providers whose own web search ColTex can turn on, with the API it works through. */
export const NATIVE_SEARCH: Record<string, string> = {
  anthropic: 'anthropic-messages',
  openai: 'openai-responses',
  'openai-codex': 'openai-codex-responses',
}

export const nativeSearchFits = (model: { provider: string; api: string }) => NATIVE_SEARCH[model.provider] === model.api

// ---- Search services ----------------------------------------------------------

type Json = Record<string, any>

async function answer(service: WebSearchService, res: Response): Promise<Json> {
  const body = await res.text()
  let json: Json | undefined
  try {
    json = JSON.parse(body) as Json
  } catch {
    // Not JSON: the status says enough.
  }
  if (!res.ok) {
    const e = json?.error
    const detail = (typeof e === 'string' ? e : e?.message ?? e?.detail) ?? json?.detail?.error ?? json?.detail ?? json?.message ?? body
    throw new Error(`${SERVICE_NAMES[service]} answered ${res.status}: ${String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300)}`)
  }
  if (!json) throw new Error(`${SERVICE_NAMES[service]} sent an answer that isn't JSON`)
  return json
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function request(service: WebSearchService, key: string, kind: 'search' | 'read', input: string): { url: string; init: RequestInit } {
  const json = (url: string, headers: Record<string, string>, body: unknown) => ({
    url,
    init: { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) },
  })
  switch (service) {
    case 'deepseek':
      return kind === 'search'
        ? json('https://api.deepseek.com/v1/tools/search', { authorization: `Bearer ${key}` }, { query: input, count: MAX_RESULTS })
        : json('https://api.deepseek.com/v1/tools/fetch', { authorization: `Bearer ${key}` }, { url: input })
    case 'tavily':
      return kind === 'search'
        ? json('https://api.tavily.com/search', { authorization: `Bearer ${key}` }, { query: input, max_results: MAX_RESULTS, search_depth: 'basic' })
        : json('https://api.tavily.com/extract', { authorization: `Bearer ${key}` }, { urls: [input], format: 'markdown' })
    case 'exa':
      return kind === 'search'
        ? json('https://api.exa.ai/search', { 'x-api-key': key }, { query: input, numResults: MAX_RESULTS, type: 'auto', contents: { text: { maxCharacters: 600 } } })
        : json('https://api.exa.ai/contents', { 'x-api-key': key }, { urls: [input], text: true })
    case 'brave': {
      const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: input, count: String(MAX_RESULTS) })}`
      return { url, init: { method: 'GET', headers: { accept: 'application/json', 'x-subscription-token': key } } }
    }
  }
}

function results(service: WebSearchService, json: Json): WebResult[] {
  const list: Json[] = (service === 'brave' ? json.web?.results : json.results) ?? []
  return list
    .map(r => {
      const snippet = service === 'deepseek' ? str(r.summary) || str(r.snippet) : service === 'brave' ? stripTags(str(r.description)) : str(r.content) || str(r.text)
      const date = str(r.date) || str(r.published_date) || str(r.publishedDate) || str(r.page_age) || str(r.age)
      return { title: stripTags(str(r.title)).trim(), url: str(r.url), snippet: snippet.replace(/\s+/g, ' ').trim().slice(0, 900), ...(date ? { date } : {}) }
    })
    .filter(r => r.url)
}

/** A page through the search service's reader (Brave has none). */
function servicePage(service: WebSearchService, json: Json, url: string): WebPage | undefined {
  if (service === 'deepseek') return { url, title: str(json.title), text: str(json.content) }
  const r: Json | undefined = json.results?.[0]
  if (!r) return undefined
  return { url: str(r.url) || url, title: str(r.title), text: str(r.raw_content) || str(r.text) }
}

export type WebDeps = {
  /** The search services' APIs (fixed HTTPS hosts). */
  fetch?: WebFetch
  /** Pages read directly: only public addresses (url-fetch.ts). */
  fetchPage?: (url: string) => Promise<FetchedFile>
}

export class WebSearch {
  private readonly keyFor: (service: WebSearchService) => Promise<string | undefined>
  private readonly fetch: WebFetch
  private readonly fetchPage: (url: string) => Promise<FetchedFile>

  constructor(keyFor: (service: WebSearchService) => Promise<string | undefined>, deps: WebDeps = {}) {
    this.keyFor = keyFor
    this.fetch = deps.fetch ?? ((url, init) => fetch(url, init))
    this.fetchPage = deps.fetchPage ?? (url => fetchPublicUrl(url, MAX_PAGE_BYTES))
  }

  private async call(service: WebSearchService, kind: 'search' | 'read', input: string, signal?: AbortSignal): Promise<Json> {
    const key = await this.keyFor(service)
    if (!key) throw new Error(`No API key is set for ${SERVICE_NAMES[service]}`)
    const { url, init } = request(service, key, kind, input)
    const timeout = AbortSignal.timeout(TIMEOUT_MS)
    const res = await this.fetch(url, { ...init, signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    return answer(service, res)
  }

  async search(service: WebSearchService, query: string, signal?: AbortSignal): Promise<WebResult[]> {
    const q = query.trim()
    if (!q) throw new Error('The query is empty')
    if (q.length > MAX_QUERY_LENGTH) throw new Error(`Queries are at most ${MAX_QUERY_LENGTH} characters`)
    return results(service, await this.call(service, 'search', q, signal))
  }

  /** A page as text: through the search service's reader when it has one, else fetched here. */
  async read(service: WebSearchService | null, url: string, signal?: AbortSignal): Promise<WebPage> {
    if (service && service !== 'brave') {
      try {
        const page = servicePage(service, await this.call(service, 'read', url, signal), url)
        if (page?.text.trim()) return page
      } catch (err) {
        if (signal?.aborted) throw err
        // Some sites refuse the service's reader: try it from here.
      }
    }
    return pageText(await this.fetchPage(url))
  }
}

// ---- Pages read directly --------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', reg: '®',
  trade: '™', middot: '·', times: '×', deg: '°', plusmn: '±', shy: '',
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ''))
}

/** The readable text of an HTML page: headings, paragraphs, lists and tables kept apart; scripts, styles and navigation left out. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').replace(/\s+/g, ' ').trim()
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|noscript|svg|template|head|nav|footer|iframe|form|button|select)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<h([1-6])\b[^>]*>/gi, (_, n: string) => `\n\n${'#'.repeat(Number(n))} `)
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<(td|th)\b[^>]*>/gi, ' | ')
      .replace(/<(br|hr)\b[^>]*>/gi, '\n')
      .replace(/<\/(p|div|section|article|aside|main|header|h[1-6]|tr|table|ul|ol|dl|dt|dd|pre|blockquote|figure|figcaption)\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
  return {
    title,
    text: text
      .split('\n')
      .map(l => l.replace(/[ \t\f\v ]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

function charsetOf(contentType: string | undefined, head: string): string {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1]
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1]
  return (fromHeader ?? fromMeta ?? 'utf-8').toLowerCase()
}

export function pageText(file: FetchedFile): WebPage {
  const type = (file.contentType ?? '').split(';')[0]!.trim().toLowerCase()
  const head = file.data.subarray(0, 2048).toString('latin1')
  const html = type === 'text/html' || type === 'application/xhtml+xml' || (!type && /<html|<!doctype html/i.test(head))
  const textual = html || type.startsWith('text/') || /(json|xml|javascript|x-tex|x-bibtex)/.test(type)
  if (!textual) {
    throw new Error(`${file.url} is ${type || 'a binary file'}, which can't be read as text${type === 'application/pdf' ? '; look for an HTML version of it (on arXiv, the abs or html page)' : ''}`)
  }
  let decoded: string
  try {
    decoded = new TextDecoder(charsetOf(file.contentType, head)).decode(file.data)
  } catch {
    decoded = file.data.toString('utf8')
  }
  if (!html) return { url: file.url, title: '', text: decoded }
  return { url: file.url, ...htmlToText(decoded) }
}

// ---- Which addresses may be read ----------------------------------------------------

/** One spelling per address: no fragment, no trailing slash after a path. */
export function normalizeUrl(raw: string): string | undefined {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  url.hash = ''
  const href = url.href
  return url.pathname.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href
}

/** Web addresses written in a text (ASCII; a closing bracket only when it closes one in the address). */
export function urlsIn(text: string): string[] {
  const found: string[] = []
  for (const [m] of text.matchAll(/https?:\/\/[!#-;=?-~]+/g)) {
    let url = m.replace(/[.,;:!?'"`*_]+$/, '')
    while (/[)\]}>]$/.test(url)) {
      const close = url.at(-1)!
      const open = { ')': '(', ']': '[', '}': '{', '>': '<' }[close]!
      if (url.split(open).length >= url.split(close).length) break
      url = url.slice(0, -1).replace(/[.,;:!?'"`*_]+$/, '')
    }
    const normal = normalizeUrl(url)
    if (normal) found.push(normal)
  }
  return found
}

/**
 * The addresses a conversation may read: the ones the author wrote and the
 * ones its searches returned. The model can't make up others, so it can't
 * put anything of the project into an address.
 */
export class WebScope {
  private readonly urls = new Set<string>()

  add(urls: Iterable<string>): void {
    for (const raw of urls) {
      const url = normalizeUrl(raw)
      if (url) this.urls.add(url)
    }
  }

  allows(raw: string): boolean {
    const url = normalizeUrl(raw)
    return !!url && this.urls.has(url)
  }
}

// ---- The models' own web search -------------------------------------------------------

/** Adds the provider's own web search tool to a request's payload. */
export function withNativeSearch(payload: unknown, api: string): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const p = payload as { tools?: unknown }
  const tool = api === 'anthropic-messages' ? { type: 'web_search_20250305', name: 'web_search', max_uses: 5 } : { type: 'web_search' }
  return { ...p, tools: [...(Array.isArray(p.tools) ? p.tools : []), tool] }
}

export type NativeSearchEvent = { kind: 'search'; id: string; query: string } | { kind: 'open'; id: string; url: string } | { kind: 'urls'; urls: string[] }

/**
 * Follows a response's raw stream events (pi-ai keeps only text and tool
 * calls) for the searches the model ran itself and the pages they found:
 * Anthropic's server_tool_use and web_search_tool_result blocks, OpenAI's
 * web_search_call items and URL citations. One per request.
 */
export function nativeSearchTracker(onEvent: (e: NativeSearchEvent) => void): (data: unknown) => void {
  const inputs = new Map<number, { id: string; json: string }>()
  const cited = (content: unknown) => {
    const urls = (Array.isArray(content) ? content : []).flatMap((c: Json) =>
      (Array.isArray(c?.annotations) ? c.annotations : []).flatMap((a: Json) => (a?.type === 'url_citation' && typeof a.url === 'string' ? [a.url] : [])),
    )
    if (urls.length) onEvent({ kind: 'urls', urls })
  }
  return data => {
    const e = data as Json | undefined
    switch (e?.type) {
      case 'content_block_start': {
        const block = e.content_block as Json | undefined
        if (block?.type === 'server_tool_use' && block.name === 'web_search') {
          inputs.set(e.index, { id: String(block.id), json: block.input && Object.keys(block.input).length ? JSON.stringify(block.input) : '' })
        } else if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          onEvent({ kind: 'urls', urls: block.content.flatMap((r: Json) => (typeof r?.url === 'string' ? [r.url] : [])) })
        }
        break
      }
      case 'content_block_delta': {
        const input = inputs.get(e.index)
        if (input && e.delta?.type === 'input_json_delta') input.json += str(e.delta.partial_json)
        break
      }
      case 'content_block_stop': {
        const input = inputs.get(e.index)
        if (!input) break
        inputs.delete(e.index)
        let query = ''
        try {
          query = str((JSON.parse(input.json || '{}') as Json).query)
        } catch {
          // A cut-off input: the step is still shown, without its query.
        }
        onEvent({ kind: 'search', id: input.id, query })
        break
      }
      case 'response.output_item.done': {
        const item = e.item as Json | undefined
        if (item?.type === 'web_search_call') {
          const action = (item.action ?? {}) as Json
          if (action.type === 'open_page' && typeof action.url === 'string') onEvent({ kind: 'open', id: String(item.id), url: action.url })
          else if (action.type !== 'find_in_page') {
            onEvent({ kind: 'search', id: String(item.id), query: str(action.query) || (Array.isArray(action.queries) ? action.queries.join('; ') : '') })
          }
          if (Array.isArray(action.sources)) onEvent({ kind: 'urls', urls: action.sources.flatMap((s: Json) => (typeof s?.url === 'string' ? [s.url] : [])) })
        } else if (item?.type === 'message') {
          cited(item.content)
        }
        break
      }
    }
  }
}

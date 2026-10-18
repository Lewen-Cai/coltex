import { BadRequestError } from '../errors.ts'

/**
 * A small client for the Zotero Web API (v3): checking an API key, listing a
 * person's libraries and collections, and exporting items as BibTeX or
 * BibLaTeX. Requests go only to `base` (api.zotero.org).
 */

export type ZoteroFetch = (url: string, init: RequestInit) => Promise<Response>

/** user:<id> → /users/<id>, group:<id> → /groups/<id> */
export function libraryPath(library: string): string {
  const m = /^(user|group):(\d+)$/.exec(library)
  if (!m) throw new BadRequestError('Invalid Zotero library')
  return `/${m[1] === 'user' ? 'users' : 'groups'}/${m[2]}`
}

const PAGE = 100
/** More than any one bibliography needs; stops a runaway export. */
export const MAX_ITEMS = 10_000

export class ZoteroClient {
  private readonly base: string
  private readonly fetch: ZoteroFetch

  constructor(opts: { base?: string; fetch?: ZoteroFetch } = {}) {
    this.base = (opts.base ?? 'https://api.zotero.org').replace(/\/$/, '')
    this.fetch = opts.fetch ?? ((url, init) => globalThis.fetch(url, init))
  }

  private async get(path: string, apiKey: string, query: Record<string, string | number> = {}): Promise<Response> {
    const url = new URL(this.base + path)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
    let res: Response
    try {
      res = await this.fetch(url.toString(), {
        headers: { 'Zotero-API-Key': apiKey, 'Zotero-API-Version': '3' },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new BadRequestError('Could not reach Zotero')
    }
    if (res.status === 403) throw new BadRequestError('Zotero refused the API key, or it has no access to this library')
    if (res.status === 404) throw new BadRequestError('Not found in Zotero')
    if (res.status === 429 || res.status === 503) throw new BadRequestError('Zotero is busy; try again in a minute')
    if (!res.ok) throw new BadRequestError(`Zotero answered ${res.status}`)
    return res
  }

  /** Whose key this is. */
  async keyInfo(apiKey: string): Promise<{ userId: string; username: string }> {
    const body = (await (await this.get('/keys/current', apiKey)).json()) as { userID?: number; username?: string }
    if (!body.userID) throw new BadRequestError('This Zotero key belongs to no user')
    return { userId: String(body.userID), username: body.username ?? String(body.userID) }
  }

  /** The person's own library and the groups they belong to. */
  async libraries(zoteroUserId: string, apiKey: string): Promise<{ id: string; name: string }[]> {
    const groups = (await (await this.get(`/users/${zoteroUserId}/groups`, apiKey, { limit: 100 })).json()) as {
      id: number
      data?: { name?: string }
    }[]
    return [
      { id: `user:${zoteroUserId}`, name: 'My Library' },
      ...groups.map(g => ({ id: `group:${g.id}`, name: g.data?.name ?? `Group ${g.id}` })),
    ]
  }

  /** Every collection in a library, named with its parents ("Thesis / Chapter 2"). */
  async collections(library: string, apiKey: string): Promise<{ key: string; name: string }[]> {
    const all: { key: string; data: { name: string; parentCollection?: string | false } }[] = []
    for (let start = 0; start < 5_000; start += PAGE) {
      const res = await this.get(`${libraryPath(library)}/collections`, apiKey, { limit: PAGE, start })
      const page = (await res.json()) as typeof all
      all.push(...page)
      const total = Number(res.headers.get('Total-Results') ?? all.length)
      if (page.length < PAGE || all.length >= total) break
    }
    const byKey = new Map(all.map(c => [c.key, c]))
    const fullName = (key: string, depth = 0): string => {
      const c = byKey.get(key)
      if (!c) return ''
      const parent = c.data.parentCollection
      return parent && depth < 20 && byKey.has(parent) ? `${fullName(parent, depth + 1)} / ${c.data.name}` : c.data.name
    }
    return all.map(c => ({ key: c.key, name: fullName(c.key) })).sort((a, b) => a.name.localeCompare(b.name))
  }

  /** The library's (or a collection's) top-level items as one .bib text. */
  async exportItems(
    library: string,
    collection: string | undefined,
    format: 'bibtex' | 'biblatex',
    apiKey: string,
  ): Promise<{ text: string; items: number }> {
    const path = `${libraryPath(library)}${collection ? `/collections/${collection}` : ''}/items/top`
    const pages: string[] = []
    let total = 0
    for (let start = 0; start < MAX_ITEMS; start += PAGE) {
      const res = await this.get(path, apiKey, { format, limit: PAGE, start, sort: 'creator' })
      total = Number(res.headers.get('Total-Results') ?? 0)
      const text = (await res.text()).trim()
      if (text) pages.push(text)
      if (start + PAGE >= total) break
    }
    return { text: pages.join('\n\n') + '\n', items: Math.min(total, MAX_ITEMS) }
  }
}

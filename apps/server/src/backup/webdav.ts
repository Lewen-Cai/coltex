import fs from 'node:fs'
import { Readable } from 'node:stream'

export class WebDavError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type RemoteFile = { name: string; size: number }

const REASONS: Record<number, string> = {
  401: 'wrong user name or password',
  403: 'no permission for this folder',
  404: 'not found',
  405: 'not allowed',
  409: 'the parent folder doesn’t exist',
  423: 'locked',
  507: 'the server is out of space',
}

/**
 * The few WebDAV calls backups need (Nextcloud, ownCloud, Synology, Apache
 * mod_dav, rclone serve webdav…): make the folder, upload with a known
 * length, list it and delete old files. Basic authentication, which is what
 * these servers offer for app passwords; use https.
 */
export class WebDav {
  private readonly base: URL
  private readonly auth: string | undefined

  constructor(opts: { url: string; username: string; password: string }) {
    this.base = new URL(opts.url.endsWith('/') ? opts.url : `${opts.url}/`)
    this.auth = opts.username || opts.password ? `Basic ${Buffer.from(`${opts.username}:${opts.password}`).toString('base64')}` : undefined
  }

  private href(name = ''): URL {
    return new URL(encodeURIComponent(name), this.base)
  }

  private async request(method: string, url: URL, init: RequestInit & { allow?: number[] } = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.auth) headers.set('authorization', this.auth)
    let res: Response
    try {
      res = await fetch(url, { ...init, method, headers, redirect: 'follow' })
    } catch (err) {
      const cause = (err as { cause?: { code?: string; message?: string } }).cause
      throw new WebDavError(`WebDAV ${method} ${url.pathname}: cannot connect (${cause?.code ?? cause?.message ?? (err as Error).message})`, 0)
    }
    if (res.ok || init.allow?.includes(res.status)) return res
    await res.body?.cancel()
    const reason = REASONS[res.status] ?? res.statusText
    throw new WebDavError(`WebDAV ${method} ${url.pathname} failed: ${res.status}${reason ? ` (${reason})` : ''}`, res.status)
  }

  /** Create the backup folder (and missing parents) if it isn't there. */
  async ensureFolder(url = this.base, depth = 0): Promise<void> {
    const found = await this.request('PROPFIND', url, { headers: { depth: '0' }, allow: [404] })
    await found.body?.cancel()
    if (found.status !== 404) return
    const made = await this.request('MKCOL', url, { allow: [405, 409] })
    await made.body?.cancel()
    if (made.status === 409 && depth < 8) {
      const parent = new URL('..', url)
      if (parent.pathname === url.pathname) throw new WebDavError(`WebDAV MKCOL ${url.pathname} failed: 409`, 409)
      await this.ensureFolder(parent, depth + 1)
      const again = await this.request('MKCOL', url, { allow: [405] })
      await again.body?.cancel()
    }
  }

  async upload(name: string, file: string): Promise<void> {
    const size = (await fs.promises.stat(file)).size
    const res = await this.request('PUT', this.href(name), {
      // A known length: some servers (nginx dav, older Apache) refuse chunked uploads.
      headers: { 'content-type': 'application/octet-stream', 'content-length': String(size) },
      body: Readable.toWeb(fs.createReadStream(file)) as ReadableStream,
      duplex: 'half',
    } as RequestInit)
    await res.body?.cancel()
  }

  async put(name: string, content: string): Promise<void> {
    const res = await this.request('PUT', this.href(name), { headers: { 'content-type': 'text/plain' }, body: content })
    await res.body?.cancel()
  }

  async remove(name: string): Promise<void> {
    const res = await this.request('DELETE', this.href(name), { allow: [404] })
    await res.body?.cancel()
  }

  /** Files directly in the folder. */
  async list(): Promise<RemoteFile[]> {
    const res = await this.request('PROPFIND', this.base, {
      headers: { depth: '1', 'content-type': 'application/xml' },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>',
    })
    const xml = await res.text()
    const files: RemoteFile[] = []
    // Namespace prefixes differ between servers (d:, D:, lp1:…), so match on local names.
    for (const [, response] of xml.matchAll(/<(?:[\w-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?response>/g)) {
      const href = /<(?:[\w-]+:)?href\b[^>]*>([^<]*)</.exec(response!)?.[1]
      if (!href || /<(?:[\w-]+:)?collection\b/.test(response!)) continue
      const path = href.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      const name = decodeURIComponent(path.replace(/\/+$/, '').split('/').pop() ?? '')
      const size = Number(/<(?:[\w-]+:)?getcontentlength\b[^>]*>(\d+)</.exec(response!)?.[1] ?? NaN)
      if (name) files.push({ name, size })
    }
    return files
  }
}

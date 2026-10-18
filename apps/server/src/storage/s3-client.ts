import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'

export type S3Config = {
  /** e.g. https://s3.eu-central-1.amazonaws.com or http://minio:9000 */
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /** Bucket in the path (MinIO, Garage, SeaweedFS…) rather than in the host name. */
  pathStyle: boolean
}

export type S3Object = { key: string; size: number; etag: string; modified: number }

export class S3Error extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1)))
    return XML_ENTITIES[e] ?? m
  })
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, c => `&${Object.entries(XML_ENTITIES).find(([, v]) => v === c)![0]};`)
}

/** Text of the first `<tag>` in an S3 XML document (S3 responses use no namespace prefixes). */
function tag(xml: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)
  return m ? unescapeXml(m[1]!) : undefined
}

function blocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))].map(m => m[1]!)
}

const sha256 = (body: Buffer | string) => crypto.createHash('sha256').update(body).digest('hex')

/**
 * The few S3 calls the project store needs, signed with SigV4 (aws4fetch).
 * Works with AWS and S3-compatible services (MinIO, Garage, SeaweedFS,
 * Cloudflare R2…). Payloads are signed rather than sent as UNSIGNED-PAYLOAD,
 * which some compatible services reject.
 */
export class S3Client {
  private readonly aws: AwsClient
  private readonly base: string
  private readonly bucket: string

  constructor(cfg: S3Config) {
    this.bucket = cfg.bucket
    this.aws = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: 's3', region: cfg.region, retries: 3 })
    const endpoint = new URL(cfg.endpoint)
    const root = endpoint.pathname.replace(/\/+$/, '')
    this.base = cfg.pathStyle
      ? `${endpoint.protocol}//${endpoint.host}${root}/${encodeURIComponent(cfg.bucket)}`
      : `${endpoint.protocol}//${cfg.bucket}.${endpoint.host}${root}`
  }

  private url(key: string, query?: Record<string, string>): string {
    const path = key ? `/${key.split('/').map(encodeURIComponent).join('/')}` : '/'
    const qs = query ? `?${new URLSearchParams(query).toString().replace(/=(&|$)/g, '$1')}` : ''
    return `${this.base}${path}${qs}`
  }

  private async request(
    method: string,
    key: string,
    opts: { query?: Record<string, string>; body?: Buffer | string; headers?: Record<string, string>; allow?: number[] } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = { ...opts.headers, 'x-amz-content-sha256': sha256(opts.body ?? '') }
    const res = await this.aws.fetch(this.url(key, opts.query), { method, headers, body: opts.body })
    if (res.ok || opts.allow?.includes(res.status)) return res
    const text = await res.text().catch(() => '')
    const code = tag(text, 'Code')
    const message = tag(text, 'Message')
    throw new S3Error(`S3 ${method} ${key || '/'} failed: ${res.status}${code ? ` ${code}` : ''}${message ? ` (${message})` : ''}`, res.status, code)
  }

  /** Fails with a readable error when the bucket can't be reached with these credentials. */
  async checkBucket(): Promise<void> {
    await this.request('GET', '', { query: { 'list-type': '2', 'max-keys': '1' } })
  }

  async get(key: string): Promise<Buffer | null> {
    const res = await this.request('GET', key, { allow: [404] })
    if (res.status === 404) {
      await res.body?.cancel()
      return null
    }
    return Buffer.from(await res.arrayBuffer())
  }

  async head(key: string): Promise<{ size: number; etag: string } | null> {
    const res = await this.request('HEAD', key, { allow: [404] })
    if (res.status === 404) return null
    return { size: Number(res.headers.get('content-length') ?? 0), etag: res.headers.get('etag') ?? '' }
  }

  async put(key: string, body: Buffer | string): Promise<void> {
    const res = await this.request('PUT', key, { body, headers: { 'content-type': 'application/octet-stream' } })
    await res.body?.cancel()
  }

  async delete(key: string): Promise<void> {
    const res = await this.request('DELETE', key, { allow: [404] })
    await res.body?.cancel()
  }

  /** DeleteObjects, 1000 keys per request. */
  async deleteMany(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 1000) {
      const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${keys
        .slice(i, i + 1000)
        .map(k => `<Object><Key>${escapeXml(k)}</Key></Object>`)
        .join('')}</Delete>`
      const md5 = crypto.createHash('md5').update(body).digest('base64')
      const res = await this.request('POST', '', { query: { delete: '' }, body, headers: { 'content-md5': md5, 'content-type': 'application/xml' } })
      const failed = blocks(await res.text(), 'Error')
      if (failed.length) throw new S3Error(`S3 delete failed for ${tag(failed[0]!, 'Key')}: ${tag(failed[0]!, 'Code')}`, 500, tag(failed[0]!, 'Code'))
    }
  }

  async copy(from: string, to: string): Promise<void> {
    const source = `/${encodeURIComponent(this.bucket)}/${from.split('/').map(encodeURIComponent).join('/')}`
    const res = await this.request('PUT', to, { headers: { 'x-amz-copy-source': source } })
    // CopyObject can fail after answering 200; the error is then in the body.
    const text = await res.text()
    if (text.includes('<Error>')) throw new S3Error(`S3 copy ${from} → ${to} failed: ${tag(text, 'Code')}`, 500, tag(text, 'Code'))
  }

  /** Every object under a prefix (ListObjectsV2, paged). */
  async list(prefix: string, opts: { max?: number } = {}): Promise<S3Object[]> {
    const out: S3Object[] = []
    let token: string | undefined
    do {
      const query: Record<string, string> = { 'list-type': '2', prefix, 'encoding-type': 'url' }
      if (opts.max) query['max-keys'] = String(Math.min(opts.max, 1000))
      if (token) query['continuation-token'] = token
      const xml = await (await this.request('GET', '', { query })).text()
      for (const c of blocks(xml, 'Contents')) {
        out.push({
          key: decodeURIComponent(tag(c, 'Key')!.replace(/\+/g, ' ')),
          size: Number(tag(c, 'Size') ?? 0),
          etag: tag(c, 'ETag') ?? '',
          modified: Date.parse(tag(c, 'LastModified') ?? '') || 0,
        })
      }
      token = tag(xml, 'IsTruncated') === 'true' ? tag(xml, 'NextContinuationToken') : undefined
      if (opts.max && out.length >= opts.max) break
    } while (token)
    return out
  }
}

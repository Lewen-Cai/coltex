import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { BadRequestError } from '../errors.ts'

/**
 * Downloads for files linked from a URL. The server fetches what a member
 * typed, so it must not become a way into the private network it sits in
 * (Postgres, Valkey, the compiler, a cloud metadata service): only http(s),
 * only public addresses — checked on the address actually connected to, so
 * DNS can't be made to answer differently later — and every redirect is
 * checked again. Size and time are limited.
 */

export const MAX_LINKED_BYTES = 50 * 1024 * 1024
const TIMEOUT_MS = 30_000
const MAX_REDIRECTS = 5

// 198.18.0.0/15 (benchmarking) is left out on purpose: proxies in "fake IP"
// mode (Clash and the like) answer every lookup with an address from it.
const blocked = new net.BlockList()
for (const [range, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(range, prefix, 'ipv4')
}
for (const [range, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(range, prefix, 'ipv6')
}

/** Whether an address is on the public internet (not loopback, private, link-local, …). */
export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address)
  if (family === 4) return !blocked.check(address, 'ipv4')
  if (family === 6) {
    // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms carry an IPv4 address.
    const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
    if (mapped) return isPublicAddress(mapped[1]!)
    return !blocked.check(address, 'ipv6')
  }
  return false
}

/** A dns.lookup that refuses non-public answers (used for the connection itself). */
const publicLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0)
    const list = addresses as dns.LookupAddress[]
    const bad = list.find(a => !isPublicAddress(a.address))
    if (bad || list.length === 0) {
      return callback(Object.assign(new Error(`${hostname} is not a public address`), { code: 'ENOTPUBLIC' }), '', 0)
    }
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list)
    callback(null, list[0]!.address, list[0]!.family)
  })
}

export type FetchedFile = { data: Buffer; url: string; contentType?: string }

function parse(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new BadRequestError('That is not a valid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BadRequestError('Only http and https links can be added')
  if (url.username || url.password) throw new BadRequestError('Links with a user name or password are not supported')
  // A literal address skips the lookup, so check it here.
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && !isPublicAddress(host)) throw new BadRequestError('Links to private or local addresses are not allowed')
  return url
}

function get(url: URL, signal: AbortSignal): Promise<http.IncomingMessage> {
  const client = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = client.get(url, { lookup: publicLookup, signal, headers: { 'user-agent': 'ColTex linked files', accept: '*/*' } }, resolve)
    req.on('error', err => {
      if ((err as NodeJS.ErrnoException).code === 'ENOTPUBLIC') reject(new BadRequestError('Links to private or local addresses are not allowed'))
      else if (err.name === 'AbortError') reject(new BadRequestError('The download took too long'))
      else reject(new BadRequestError(`Could not download the file: ${err.message}`))
    })
  })
}

export async function fetchPublicUrl(raw: string, maxBytes = MAX_LINKED_BYTES): Promise<FetchedFile> {
  let url = parse(raw)
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  for (let hop = 0; ; hop++) {
    const res = await get(url, signal)
    const status = res.statusCode ?? 0
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume()
      if (hop >= MAX_REDIRECTS) throw new BadRequestError('Too many redirects')
      url = parse(new URL(res.headers.location, url).toString())
      continue
    }
    if (status < 200 || status >= 300) {
      res.resume()
      throw new BadRequestError(`The server answered ${status}`)
    }
    const declared = Number(res.headers['content-length'])
    if (declared > maxBytes) {
      res.destroy()
      throw new BadRequestError('The file is larger than 50 MB')
    }
    const chunks: Buffer[] = []
    let size = 0
    try {
      for await (const chunk of res) {
        size += (chunk as Buffer).length
        if (size > maxBytes) {
          res.destroy()
          throw new BadRequestError('The file is larger than 50 MB')
        }
        chunks.push(chunk as Buffer)
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
      throw new BadRequestError(signal.aborted ? 'The download took too long' : `Could not download the file: ${(err as Error).message}`)
    }
    return { data: Buffer.concat(chunks), url: url.toString(), contentType: res.headers['content-type'] }
  }
}

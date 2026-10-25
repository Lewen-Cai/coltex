// The xdb search is ported from ip2region's JavaScript binding (Apache-2.0 OR MIT).
// Upstream: binding/javascript/searcher.js, util.js @ 1bf6cabfb63c1a14af0971749c2120a3e5c77d72
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import type { IpPlace } from '@coltex/shared'

const HEADER = 256
const VECTOR_COLS = 256
const VECTOR_SIZE = 8
const VECTOR_BYTES = 256 * VECTOR_COLS * VECTOR_SIZE

/** One xdb file (format 3.0): its vector index in memory, the rest read from the file as needed. */
class Xdb {
  private readonly fd: number
  private readonly vector: Buffer
  readonly bytes: 4 | 16

  constructor(file: string) {
    this.fd = fs.openSync(file, 'r')
    const header = this.read(0, HEADER)
    const structure = header.readUInt16LE(0)
    const ipVersion = header.readUInt16LE(16)
    if (structure !== 3 || (ipVersion !== 4 && ipVersion !== 6)) throw new Error(`${path.basename(file)}: unknown xdb format ${structure}/${ipVersion}`)
    this.bytes = ipVersion === 4 ? 4 : 16
    this.vector = this.read(HEADER, VECTOR_BYTES)
  }

  private read(offset: number, length: number): Buffer {
    const buff = Buffer.alloc(length)
    if (fs.readSync(this.fd, buff, 0, length, offset) !== length) throw new Error('xdb: incomplete read')
    return buff
  }

  /** IPv4 index entries hold the addresses little-endian (the old format's order); IPv6 ones big-endian. */
  private compare(ip: Buffer, block: Buffer, offset: number): number {
    if (this.bytes === 16) return ip.compare(block, offset, offset + 16)
    for (let i = 0, j = offset + 3; i < 4; i++, j--) {
      if (ip[i]! !== block[j]!) return ip[i]! < block[j]! ? -1 : 1
    }
    return 0
  }

  /** The region string for these address bytes, or '' when the database has none. */
  search(ip: Buffer): string {
    const idx = ip[0]! * VECTOR_COLS * VECTOR_SIZE + ip[1]! * VECTOR_SIZE
    const start = this.vector.readUInt32LE(idx)
    const end = this.vector.readUInt32LE(idx + 4)
    if (start === 0 || end === 0) return ''
    const indexSize = this.bytes * 2 + 6
    let low = 0
    let high = (end - start) / indexSize
    while (low <= high) {
      const mid = (low + high) >> 1
      const block = this.read(start + mid * indexSize, indexSize)
      if (this.compare(ip, block, 0) < 0) high = mid - 1
      else if (this.compare(ip, block, this.bytes) > 0) low = mid + 1
      else {
        const length = block.readUInt16LE(this.bytes * 2)
        return length ? this.read(block.readUInt32LE(this.bytes * 2 + 2), length).toString('utf8') : ''
      }
    }
    return ''
  }
}

function ipv4Bytes(ip: string): Buffer {
  return Buffer.from(ip.split('.').map(Number))
}

function ipv6Bytes(ip: string): Buffer {
  // An embedded IPv4 tail (::ffff:1.2.3.4) as two groups.
  const v4 = ip.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (v4) {
    const b = ipv4Bytes(v4[1]!)
    ip = ip.slice(0, -v4[1]!.length) + `${((b[0]! << 8) | b[1]!).toString(16)}:${((b[2]! << 8) | b[3]!).toString(16)}`
  }
  const [head, tail] = ip.split('::')
  const groups = (s: string | undefined) => (s ? s.split(':') : [])
  const left = groups(head)
  const right = tail === undefined ? [] : groups(tail)
  const all = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  const out = Buffer.alloc(16)
  all.forEach((g, i) => out.writeUInt16BE(parseInt(g, 16), i * 2))
  return out
}

/** IPv4 inside IPv6 (::ffff:a.b.c.d), as Node reports addresses on a dual-stack socket. */
function unmapped(ip: string): string {
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  return m ? m[1]! : ip
}

function inV4(b: Buffer, prefix: [number, number, number, number], bits: number): boolean {
  const ip = b.readUInt32BE(0)
  const net = Buffer.from(prefix).readUInt32BE(0)
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return ((ip & mask) >>> 0) === ((net & mask) >>> 0)
}

/** What kind of address it is, before any lookup: this machine, the local network, the tailnet. */
function kindOf(ip: string): IpPlace['kind'] {
  if (net.isIPv4(ip)) {
    const b = ipv4Bytes(ip)
    if (inV4(b, [127, 0, 0, 0], 8)) return 'loopback'
    if (inV4(b, [100, 64, 0, 0], 10)) return 'tailscale'
    if (inV4(b, [10, 0, 0, 0], 8) || inV4(b, [172, 16, 0, 0], 12) || inV4(b, [192, 168, 0, 0], 16) || inV4(b, [169, 254, 0, 0], 16)) return 'lan'
    return 'public'
  }
  if (net.isIPv6(ip)) {
    const b = ipv6Bytes(ip)
    if (b.equals(ipv6Bytes('::1'))) return 'loopback'
    if (b.subarray(0, 6).equals(Buffer.from([0xfd, 0x7a, 0x11, 0x5c, 0xa1, 0xe0]))) return 'tailscale'
    if ((b[0]! & 0xfe) === 0xfc || (b[0] === 0xfe && (b[1]! & 0xc0) === 0x80)) return 'lan'
    return 'public'
  }
  return 'unknown'
}

/**
 * Where an address is: this machine, the local network, the tailnet, or for public addresses
 * the place in ip2region's offline databases: the country's ISO code and the region, city and
 * network operator as the database has them (in Chinese for places in China, else in English;
 * the web app names countries and translates Chinese names for each interface language).
 * Nothing is sent anywhere. Without the databases (`pnpm --filter @coltex/server ip2region`),
 * public addresses have no place.
 */
export class IpPlaces {
  private readonly v4?: Xdb
  private readonly v6?: Xdb

  constructor(dir: string) {
    // A database that is missing or can't be read only costs the places, never the server.
    const open = (name: string) => {
      const file = path.join(dir, name)
      if (!fs.existsSync(file)) return undefined
      try {
        return new Xdb(file)
      } catch (err) {
        console.error(`[ip2region] ${name} can't be read: ${(err as Error).message}`)
        return undefined
      }
    }
    this.v4 = open('ip2region_v4.xdb')
    this.v6 = open('ip2region_v6.xdb')
  }

  get available(): boolean {
    return !!(this.v4 && this.v6)
  }

  place(address: string | null | undefined): IpPlace {
    if (!address) return { kind: 'unknown' }
    const ip = unmapped(address.trim())
    const kind = kindOf(ip)
    if (kind !== 'public') return { kind }
    try {
      const found = net.isIPv4(ip) ? this.v4?.search(ipv4Bytes(ip)) : this.v6?.search(ipv6Bytes(ip))
      return found ? { kind, ...placeParts(found) } : { kind }
    } catch {
      return { kind }
    }
  }
}

/** Hong Kong, Macao and Taiwan, which ip2region files under China, as places of their own. */
const OWN_REGIONS: Record<string, { country: string; short: string }> = {
  香港特别行政区: { country: 'HK', short: '香港' },
  澳门特别行政区: { country: 'MO', short: '澳门' },
  台湾省: { country: 'TW', short: '台湾' },
}

/**
 * "中国|广东省|深圳市|电信|CN" as { country: 'CN', region: '广东省', city: '深圳市', isp: '电信' }:
 * unknown parts ("0") left out, the country as its ISO code (named by the web app).
 */
export function placeParts(raw: string): Omit<IpPlace, 'kind'> {
  const [countryName, province, city, isp, iso] = raw.split('|').map(p => p.trim())
  const known = (v: string | undefined) => (v && v !== '0' && v !== 'Reserved' ? v : undefined)
  let country = known(iso)
  let region = known(province)
  let town = known(city)
  const own = country === 'CN' && region ? OWN_REGIONS[region] : undefined
  if (own) {
    country = own.country
    region = undefined
    if (town === own.short) town = undefined
  }
  // "Singapore|Singapore|…": the region adds nothing to the country.
  if (region && region === countryName) region = undefined
  if (town === region) town = undefined
  return {
    ...(country && /^[A-Z]{2}$/.test(country) ? { country } : {}),
    ...(region ? { region } : {}),
    ...(town ? { city: town } : {}),
    ...(known(isp) ? { isp: known(isp) } : {}),
  }
}

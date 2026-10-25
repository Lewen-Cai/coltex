import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { solveChallenge } from 'altcha-lib/v1'
import type { SignInChallenge, SignInEventPage } from '@coltex/shared'
import { IpPlaces, placeParts } from '../src/auth/ip-place.ts'
import { RULES } from '../src/auth/sign-in-guard.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const PASSWORD = 'Long-password-1'
// better-auth wants requests that carry cookies to come from its own pages.
const ORIGIN = 'http://localhost:3000'

/** A TOTP code (RFC 6238, SHA-1, 6 digits, 30 s) for a base32 secret. */
function totp(secret: string, at = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  const key = Buffer.from(bits.match(/.{8}/g)!.map(b => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const mac = crypto.createHmac('sha1', key).update(counter).digest()
  const offset = mac[mac.length - 1]! & 0xf
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

describe('sign-ins', () => {
  let t: TestApp
  let admin = ''
  let adminId = ''
  let aliceId = ''
  let clock = 0

  /** A sign-in from an address (forwarded by a proxy on this machine, as Tailscale's and Cloudflare's are). */
  const signIn = (email: string, password: string, ip: string, challenge?: string) =>
    t.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'x-forwarded-for': ip, 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/140.0', ...(challenge ? { 'x-coltex-challenge': challenge } : {}) },
      payload: { email, password },
    })
  const solve = async (c: SignInChallenge) => {
    const solution = await solveChallenge(c.challenge, c.salt, c.algorithm, c.maxnumber).promise
    return Buffer.from(JSON.stringify({ ...c, number: solution!.number })).toString('base64')
  }
  /** Sign in, solving the proof of work when it is asked for. */
  const signInSolving = async (email: string, password: string, ip: string) => {
    const first = await signIn(email, password, ip)
    if (first.statusCode !== 400 || first.json().code !== 'SIGN_IN_CHALLENGE') return first
    return signIn(email, password, ip, await solve(first.json().challenge))
  }
  const later = (minutes: number) => {
    clock += minutes * 60_000
  }
  const events = async (cookie: string, url = '/api/me/sign-ins') => (await t.app.inject({ method: 'GET', url, headers: { cookie } })).json() as SignInEventPage

  before(async () => {
    t = await createTestApp()
    const now = () => Date.now() + clock
    t.counters.now = now
    t.signIns.now = () => new Date(now())
    const setup = await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: PASSWORD } })
    admin = cookieFrom(setup)
    adminId = setup.json().user.id
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: { email: 'alice@lab.test' } })
    const joined = await t.app.inject({ method: 'POST', url: `/api/invites/${invite.json().token}/accept`, payload: { name: 'Alice', email: 'alice@lab.test', password: PASSWORD } })
    aliceId = joined.json().user.id
  })
  after(() => t.close())

  test('a sign-in is recorded with the address the proxy forwarded, and only the person sees theirs', async () => {
    const res = await signIn('alice@lab.test', PASSWORD, '192.168.1.20')
    assert.equal(res.statusCode, 200)
    const mine = await events(cookieFrom(res))
    assert.equal(mine.events[0]!.outcome, 'success')
    assert.equal(mine.events[0]!.method, 'password')
    assert.equal(mine.events[0]!.ip, '192.168.1.20')
    assert.deepEqual(mine.events[0]!.place, { kind: 'lan' })
    assert.match(mine.events[0]!.device!, /Firefox/)
    assert.ok(mine.events.every(e => e.user?.id === aliceId))
    // Someone else's proxy header from a non-local client is not believed.
    const direct = await t.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      remoteAddress: '198.51.100.7',
      headers: { 'x-forwarded-for': '10.9.9.9' },
      payload: { email: 'alice@lab.test', password: 'wrong' },
    })
    assert.equal(direct.statusCode, 401)
    const all = await events(admin, '/api/admin/sign-ins?failed=true')
    assert.equal(all.events[0]!.ip, '198.51.100.7')
    assert.equal(all.events[0]!.outcome, 'failure')
    assert.equal((await t.app.inject({ method: 'GET', url: '/api/admin/sign-ins', headers: { cookie: cookieFrom(res) } })).statusCode, 403)
  })

  test('unfamiliar addresses: a proof of work from the third try, a wait after five, locked at ten', async () => {
    const ip = '203.0.113.5'
    assert.equal((await signIn('alice@lab.test', 'wrong', ip)).statusCode, 401)
    // The failure from 198.51.100.7 above counts too: it is the account that is counted.
    const third = await signIn('alice@lab.test', 'wrong', ip)
    assert.equal(third.statusCode, 400)
    assert.equal(third.json().code, 'SIGN_IN_CHALLENGE')
    // A solution works once.
    const payload = await solve(third.json().challenge)
    assert.equal((await signIn('alice@lab.test', 'wrong', ip, payload)).statusCode, 401)
    assert.equal((await signIn('alice@lab.test', 'wrong', ip, payload)).json().code, 'SIGN_IN_CHALLENGE')
    assert.equal((await signInSolving('alice@lab.test', 'wrong', ip)).statusCode, 401) // 4
    assert.equal((await signInSolving('alice@lab.test', 'wrong', '203.0.113.6')).statusCode, 401) // 5: another address
    const waiting = await signInSolving('alice@lab.test', PASSWORD, ip)
    assert.equal(waiting.statusCode, 429)
    assert.equal(waiting.json().code, 'SIGN_IN_COOLDOWN')
    assert.ok(waiting.json().retryAfter > 800)

    later(16)
    for (let i = 6; i <= RULES.lockAfter; i++) assert.equal((await signInSolving('alice@lab.test', 'wrong', '203.0.113.' + i)).statusCode, 401, `try ${i}`)
    const locked = await signInSolving('alice@lab.test', PASSWORD, '203.0.113.99')
    assert.equal(locked.statusCode, 403)
    assert.equal(locked.json().code, 'SIGN_IN_ACCOUNT_LOCKED')
    // Where Alice signed in before still works.
    assert.equal((await signIn('alice@lab.test', PASSWORD, '192.168.1.20')).statusCode, 200)

    // The system administrator hears of it, and sees it on the users page.
    const inbox = (await t.app.inject({ method: 'GET', url: '/api/me/notifications', headers: { cookie: admin } })).json()
    assert.equal(inbox.notifications[0].kind, 'account_locked')
    assert.equal(inbox.notifications[0].actor.id, aliceId)
    const users = (await t.app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie: admin } })).json()
    assert.equal(users.find((u: { id: string }) => u.id === aliceId).locked, true)
    const blocks = (await t.app.inject({ method: 'GET', url: '/api/admin/sign-ins/blocks', headers: { cookie: admin } })).json()
    assert.deepEqual(blocks.accounts.map((a: { id: string }) => a.id), [aliceId])

    assert.equal((await t.app.inject({ method: 'POST', url: `/api/admin/users/${aliceId}/unlock`, headers: { cookie: admin } })).statusCode, 204)
    // Unlocked, with the count cleared: no proof of work needed.
    assert.equal((await signIn('alice@lab.test', PASSWORD, '203.0.113.99')).statusCode, 200)
    const outcomes = (await events(admin, `/api/admin/sign-ins?user=${aliceId}`)).events.map(e => e.outcome)
    assert.ok(outcomes.includes('locked') && outcomes.includes('unlocked') && outcomes.includes('refused'))
  })

  test('familiar addresses wait after every five failures and are never locked', async () => {
    const ip = '192.168.1.20'
    for (let i = 1; i <= RULES.familiarFailuresPer; i++) assert.equal((await signIn('alice@lab.test', 'wrong', ip)).statusCode, 401)
    const waiting = await signIn('alice@lab.test', PASSWORD, ip)
    assert.equal(waiting.json().code, 'SIGN_IN_COOLDOWN')
    later(16)
    assert.equal((await signIn('alice@lab.test', PASSWORD, ip)).statusCode, 200)
  })

  test('emails without an account answer the same way', async () => {
    const ip = '203.0.113.50'
    assert.equal((await signIn('nobody@lab.test', 'x', ip)).statusCode, 401)
    assert.equal((await signIn('nobody@lab.test', 'x', ip)).statusCode, 401)
    assert.equal((await signIn('nobody@lab.test', 'x', ip)).json().code, 'SIGN_IN_CHALLENGE')
    for (let i = 3; i <= RULES.lockAfter; i++) {
      if (i === RULES.cooldownAfter + 1) later(16)
      assert.equal((await signInSolving('nobody@lab.test', 'x', ip)).statusCode, 401)
    }
    assert.equal((await signInSolving('nobody@lab.test', 'x', '203.0.113.51')).json().code, 'SIGN_IN_ACCOUNT_LOCKED')
  })

  test('an address failing 20 times in an hour is blocked for a day', async () => {
    const ip = '198.51.100.20'
    for (let i = 0; i < RULES.addressFailures; i++) assert.equal((await signInSolving(`spray${i}@lab.test`, 'x', ip)).statusCode, 401)
    const blocked = await signIn('alice@lab.test', PASSWORD, ip)
    assert.equal(blocked.statusCode, 429)
    assert.equal(blocked.json().code, 'SIGN_IN_ADDRESS_BLOCKED')
    const blocks = (await t.app.inject({ method: 'GET', url: '/api/admin/sign-ins/blocks', headers: { cookie: admin } })).json()
    assert.deepEqual(blocks.addresses.map((a: { ip: string }) => a.ip), [ip])
    assert.equal((await t.app.inject({ method: 'POST', url: '/api/admin/sign-ins/unblock', headers: { cookie: admin }, payload: { ip } })).statusCode, 204)
    assert.equal((await signInSolving('alice@lab.test', PASSWORD, ip)).statusCode, 200)
    // A local address is never blocked: everyone may share it.
    for (let i = 0; i < RULES.addressFailures; i++) await signInSolving(`lan${i}@lab.test`, 'x', '172.17.0.1')
    assert.equal((await signIn('alice@lab.test', PASSWORD, '172.17.0.1')).statusCode, 200)
  })

  test('two-step verification: the code after the password, a recovery code, wrong codes recorded', async () => {
    const alice = cookieFrom(await signIn('alice@lab.test', PASSWORD, '192.168.1.20'))
    const enable = await t.app.inject({ method: 'POST', url: '/api/auth/two-factor/enable', headers: { cookie: alice, origin: ORIGIN }, payload: { password: PASSWORD } })
    assert.equal(enable.statusCode, 200)
    const { totpURI, backupCodes } = enable.json() as { totpURI: string; backupCodes: string[] }
    assert.equal(backupCodes.length, 10)
    const secret = new URL(totpURI).searchParams.get('secret')!
    // Turning it on means confirming one code while signed in; that is not a sign-in.
    const before = (await events(admin, `/api/admin/sign-ins?user=${aliceId}`)).events.length
    const confirm = await t.app.inject({ method: 'POST', url: '/api/auth/two-factor/verify-totp', headers: { cookie: cookieFrom(enable) || alice, origin: ORIGIN }, payload: { code: totp(secret) } })
    assert.equal(confirm.statusCode, 200)
    assert.equal((await events(admin, `/api/admin/sign-ins?user=${aliceId}`)).events.length, before)

    const step = await signIn('alice@lab.test', PASSWORD, '192.168.1.20')
    assert.equal(step.statusCode, 200)
    assert.equal(step.json().twoFactorRedirect, true)
    const pending = cookieFrom(step)
    const wrong = await t.app.inject({ method: 'POST', url: '/api/auth/two-factor/verify-totp', headers: { cookie: pending, origin: ORIGIN, 'x-forwarded-for': '192.168.1.20' }, payload: { code: '000000' } })
    assert.equal(wrong.statusCode, 401)
    const right = await t.app.inject({ method: 'POST', url: '/api/auth/two-factor/verify-totp', headers: { cookie: pending, origin: ORIGIN, 'x-forwarded-for': '192.168.1.20' }, payload: { code: totp(secret) } })
    assert.equal(right.statusCode, 200)
    const [last, previous] = (await events(cookieFrom(right))).events
    assert.deepEqual([last!.outcome, last!.method], ['success', 'totp'])
    assert.equal(previous!.outcome, 'two_factor_failure')

    const again = cookieFrom(await signIn('alice@lab.test', PASSWORD, '192.168.1.20'))
    const recovery = await t.app.inject({ method: 'POST', url: '/api/auth/two-factor/verify-backup-code', headers: { cookie: again, origin: ORIGIN, 'x-forwarded-for': '192.168.1.20' }, payload: { code: backupCodes[0] } })
    assert.equal(recovery.statusCode, 200)
    assert.equal((await events(cookieFrom(recovery))).events[0]!.method, 'recovery_code')
    const users = (await t.app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie: admin } })).json()
    assert.equal(users.find((u: { id: string }) => u.id === aliceId).twoFactor, true)
  })

  test('the system administrator sees and ends the sessions of an account', async () => {
    const res = await t.app.inject({ method: 'GET', url: `/api/admin/users/${aliceId}/sessions`, headers: { cookie: admin } })
    assert.equal(res.statusCode, 200)
    const sessions = res.json() as { id: string; ip: string; current: boolean }[]
    assert.ok(sessions.length >= 1)
    assert.ok(sessions.every(s => !s.current))
    const own = (await t.app.inject({ method: 'GET', url: `/api/admin/users/${adminId}/sessions`, headers: { cookie: admin } })).json()
    assert.equal(own.filter((s: { current: boolean }) => s.current).length, 1)
    assert.equal((await t.app.inject({ method: 'DELETE', url: `/api/admin/users/${aliceId}/sessions`, headers: { cookie: admin } })).statusCode, 204)
    assert.deepEqual((await t.app.inject({ method: 'GET', url: `/api/admin/users/${aliceId}/sessions`, headers: { cookie: admin } })).json(), [])
  })

  test("better-auth's rate limits count in the shared store", async () => {
    const storage = t.signIns.rateLimitStorage()
    const rule = { window: 10, max: 2 }
    assert.equal((await storage.consume('1.2.3.4|/sign-in/email', rule)).allowed, true)
    assert.equal((await storage.consume('1.2.3.4|/sign-in/email', rule)).allowed, true)
    const third = await storage.consume('1.2.3.4|/sign-in/email', rule)
    assert.equal(third.allowed, false)
    assert.ok(third.retryAfter! > 0)
    later(1)
    assert.equal((await storage.consume('1.2.3.4|/sign-in/email', rule)).allowed, true)
  })
})

describe('where an address is', () => {
  test('kinds without a database, places from one', async () => {
    const none = new IpPlaces(path.join(os.tmpdir(), 'no-such-ip2region'))
    assert.deepEqual(none.place('127.0.0.1'), { kind: 'loopback' })
    assert.deepEqual(none.place('::ffff:192.168.3.4'), { kind: 'lan' })
    assert.deepEqual(none.place('100.100.1.2'), { kind: 'tailscale' })
    assert.deepEqual(none.place('fd7a:115c:a1e0::5'), { kind: 'tailscale' })
    assert.deepEqual(none.place('8.8.8.8'), { kind: 'public' })
    assert.deepEqual(none.place(null), { kind: 'unknown' })

    // A tiny xdb of each kind, in the format ip2region writes (3.0).
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-xdb-'))
    await fs.writeFile(path.join(dir, 'ip2region_v4.xdb'), xdb(4, [[ip4('1.0.0.0'), ip4('1.0.0.255'), 'Australia|0|0|0|AU'], [ip4('1.0.1.0'), ip4('1.0.3.255'), '中国|福建省|福州市|电信|CN']]))
    await fs.writeFile(path.join(dir, 'ip2region_v6.xdb'), xdb(6, [[ip6('2400:3200::'), ip6('2400:3200:ffff:ffff:ffff:ffff:ffff:ffff'), '中国|浙江省|杭州市|阿里|CN']]))
    const places = new IpPlaces(dir)
    assert.deepEqual(places.place('1.0.0.7'), { kind: 'public', country: 'AU' })
    assert.deepEqual(places.place('1.0.2.1'), { kind: 'public', country: 'CN', region: '福建省', city: '福州市', isp: '电信' })
    assert.deepEqual(places.place('1.0.4.1'), { kind: 'public' })
    assert.deepEqual(places.place('2400:3200::1'), { kind: 'public', country: 'CN', region: '浙江省', city: '杭州市', isp: '阿里' })
    await fs.rm(dir, { recursive: true })
    // Hong Kong, Macao and Taiwan are places of their own.
    assert.deepEqual(placeParts('中国|香港特别行政区|香港|电讯盈科|CN'), { country: 'HK', isp: '电讯盈科' })
    assert.deepEqual(placeParts('中国|澳门特别行政区|澳门半岛|0|CN'), { country: 'MO', city: '澳门半岛' })
    assert.deepEqual(placeParts('中国|台湾省|台北市|中华电信|CN'), { country: 'TW', city: '台北市', isp: '中华电信' })
    assert.deepEqual(placeParts('Reserved|Reserved|Reserved|0|0'), {})
    assert.deepEqual(placeParts('Singapore|Singapore|0|0|SG'), { country: 'SG' })
  })
})

function ip4(s: string) {
  return Buffer.from(s.split('.').map(Number))
}
function ip6(s: string) {
  const [head, tail = ''] = s.split('::')
  const l = head ? head.split(':') : []
  const r = tail ? tail.split(':') : []
  const groups = s.includes('::') ? [...l, ...Array(8 - l.length - r.length).fill('0'), ...r] : l
  const b = Buffer.alloc(16)
  groups.forEach((g, i) => b.writeUInt16BE(parseInt(g, 16), i * 2))
  return b
}

/** An xdb file with these ranges (each within one /16, as ip2region splits them). */
function xdb(version: 4 | 6, ranges: [Buffer, Buffer, string][]): Buffer {
  const bytes = version === 4 ? 4 : 16
  const indexSize = bytes * 2 + 6
  const vectorBytes = 256 * 256 * 8
  const data = Buffer.concat(ranges.map(r => Buffer.from(r[2])))
  const dataStart = 256 + vectorBytes
  const indexStart = dataStart + data.length
  const header = Buffer.alloc(256)
  header.writeUInt16LE(3, 0)
  header.writeUInt16LE(version, 16)
  header.writeUInt16LE(4, 18)
  const vector = Buffer.alloc(vectorBytes)
  const index = Buffer.alloc(ranges.length * indexSize)
  let dataPtr = dataStart
  ranges.forEach(([start, end, region], i) => {
    const at = i * indexSize
    // IPv4 entries are little-endian, IPv6 ones as they are.
    ;(version === 4 ? Buffer.from(start).reverse() : start).copy(index, at)
    ;(version === 4 ? Buffer.from(end).reverse() : end).copy(index, at + bytes)
    index.writeUInt16LE(Buffer.byteLength(region), at + bytes * 2)
    index.writeUInt32LE(dataPtr, at + bytes * 2 + 2)
    dataPtr += Buffer.byteLength(region)
    const v = start[0]! * 256 * 8 + start[1]! * 8
    if (!vector.readUInt32LE(v)) vector.writeUInt32LE(indexStart + at, v)
    vector.writeUInt32LE(indexStart + at, v + 4)
  })
  return Buffer.concat([header, vector, data, index])
}

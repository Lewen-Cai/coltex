import crypto from 'node:crypto'
import { and, desc, eq, gt, inArray, lt, type SQL } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type { Redis } from 'ioredis'
import { createChallenge, verifySolution } from 'altcha-lib/v1'
import type {
  SignInBlocks,
  SignInChallenge,
  SignInEvent,
  SignInEventPage,
  SignInMethod,
  SignInOutcome,
  SignInRefusal,
} from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { signInEvents, signInLocks, user } from '../db/schema.ts'
import type { NotificationService } from '../notifications/service.ts'
import type { IpPlaces } from './ip-place.ts'

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * The rules (user's decision 2026-10-24). An address is familiar for an account when the account
 * signed in from it in the last 90 days.
 * - Unfamiliar addresses: failures count per account (whatever the address): from the third
 *   attempt on, each one needs a proof of work (ALTCHA); after 5, 15 minutes' wait; at 10 the
 *   account is closed to unfamiliar addresses until the system administrator unlocks it.
 * - Familiar addresses: each 5 failures mean 15 minutes' wait; never locked, so the owner still
 *   gets in from where they usually work while their account is locked.
 * - Any address on the internet that fails 20 times within an hour (whichever accounts) is
 *   blocked for a day.
 * Emails without an account are counted the same way, so the answers never tell whether an
 * account exists.
 */
export const RULES = {
  familiarDays: 90,
  challengeAfter: 2,
  cooldownAfter: 5,
  lockAfter: 10,
  cooldownSeconds: 15 * MINUTE,
  /** Unfamiliar-address failures are forgotten after this long without another. */
  failureMemorySeconds: 30 * DAY,
  familiarFailuresPer: 5,
  addressFailures: 20,
  addressWindowSeconds: HOUR,
  addressBlockSeconds: DAY,
  keepDays: 90,
  /** At most one record of a refused attempt per account, address and reason in this time. */
  refusalRecordSeconds: 15 * MINUTE,
  /** How hard the proof of work is (the browser tries up to this many hashes, half on average). */
  challengeMaxNumber: 100_000,
  challengeSeconds: 10 * MINUTE,
  pendingSeconds: 10 * MINUTE,
} as const

/** Counters and flags with an expiry: Valkey in the server, a map in tests. */
export interface CounterStore {
  /** Add one; the expiry starts with the first. */
  incr(key: string, ttlSeconds: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  /** Set only when not there; whether it was set. */
  setNew(key: string, value: string, ttlSeconds: number): Promise<boolean>
  /** Seconds left, or 0 when the key isn't there. */
  ttl(key: string): Promise<number>
  del(...keys: string[]): Promise<void>
  /** The keys starting with this prefix, with their seconds left. */
  list(prefix: string): Promise<{ key: string; ttl: number }[]>
}

const PREFIX = 'coltex:signin:'

export class RedisCounters implements CounterStore {
  private readonly redis: Redis
  constructor(redis: Redis) {
    this.redis = redis
  }
  async incr(key: string, ttlSeconds: number) {
    const n = await this.redis.incr(PREFIX + key)
    if (n === 1) await this.redis.expire(PREFIX + key, ttlSeconds)
    return n
  }
  get(key: string) {
    return this.redis.get(PREFIX + key)
  }
  async set(key: string, value: string, ttlSeconds: number) {
    await this.redis.set(PREFIX + key, value, 'EX', ttlSeconds)
  }
  async setNew(key: string, value: string, ttlSeconds: number) {
    return (await this.redis.set(PREFIX + key, value, 'EX', ttlSeconds, 'NX')) === 'OK'
  }
  async ttl(key: string) {
    return Math.max(0, await this.redis.ttl(PREFIX + key))
  }
  async del(...keys: string[]) {
    if (keys.length) await this.redis.del(...keys.map(k => PREFIX + k))
  }
  async list(prefix: string) {
    const out: { key: string; ttl: number }[] = []
    let cursor = '0'
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${PREFIX}${prefix}*`, 'COUNT', 200)
      cursor = next
      for (const k of keys) out.push({ key: k.slice(PREFIX.length), ttl: Math.max(0, await this.redis.ttl(k)) })
    } while (cursor !== '0')
    return out
  }
}

/** In memory, with a clock tests can move. */
export class MemoryCounters implements CounterStore {
  private readonly items = new Map<string, { value: string; until: number }>()
  now: () => number = Date.now
  private live(key: string) {
    const item = this.items.get(key)
    if (item && item.until <= this.now()) this.items.delete(key)
    return this.items.get(key)
  }
  async incr(key: string, ttlSeconds: number) {
    const item = this.live(key)
    const n = Number(item?.value ?? 0) + 1
    this.items.set(key, { value: String(n), until: item?.until ?? this.now() + ttlSeconds * 1000 })
    return n
  }
  async get(key: string) {
    return this.live(key)?.value ?? null
  }
  async set(key: string, value: string, ttlSeconds: number) {
    this.items.set(key, { value, until: this.now() + ttlSeconds * 1000 })
  }
  async setNew(key: string, value: string, ttlSeconds: number) {
    if (this.live(key)) return false
    await this.set(key, value, ttlSeconds)
    return true
  }
  async ttl(key: string) {
    const item = this.live(key)
    return item ? Math.ceil((item.until - this.now()) / 1000) : 0
  }
  async del(...keys: string[]) {
    for (const k of keys) this.items.delete(k)
  }
  async list(prefix: string) {
    return [...this.items.keys()].filter(k => k.startsWith(prefix) && this.live(k)).map(k => ({ key: k, ttl: Math.ceil((this.items.get(k)!.until - this.now()) / 1000) }))
  }
}

/** An attempt that is answered without checking the password. Messages stay English (errors). */
export type Refusal = { status: number; body: { code: string; message: string; retryAfter?: number; challenge?: SignInChallenge } }

/** A password that was right, waiting for the second step (keyed by the two-factor cookie). */
type Pending = { userId: string; email: string }

type Attempt = { email: string; ip: string; userAgent: string | null }

const keys = {
  unfamiliar: (email: string) => `fail:${email}`,
  cooldown: (email: string) => `cool:${email}`,
  familiar: (email: string, ip: string) => `known:${email}:${ip}`,
  familiarCooldown: (email: string, ip: string) => `coolk:${email}:${ip}`,
  address: (ip: string) => `ipfail:${ip}`,
  blocked: (ip: string) => `ipban:${ip}`,
  pending: (cookie: string) => `tfa:${crypto.createHash('sha256').update(cookie).digest('hex')}`,
  refusal: (email: string, ip: string, reason: string) => `refused:${reason}:${email}:${ip}`,
  challenge: (signature: string) => `altcha:${signature}`,
}

/**
 * Sign-in protection and the sign-in record. The Fastify bridge (auth/fastify.ts) asks `check`
 * before better-auth sees a password, and reports what came of it (`afterPassword`,
 * `afterCode`). Everything is done here, with no third-party service: the proof of work is
 * ALTCHA's open protocol, checked with our own key.
 */
export class SignInGuard {
  private readonly db: Db
  private readonly counters: CounterStore
  private readonly places: IpPlaces
  private readonly notifications: NotificationService
  private readonly challengeKey: string
  now: () => Date = () => new Date()

  constructor(opts: { db: Db; counters: CounterStore; places: IpPlaces; notifications: NotificationService; secret: string }) {
    this.db = opts.db
    this.counters = opts.counters
    this.places = opts.places
    this.notifications = opts.notifications
    this.challengeKey = crypto.createHmac('sha256', opts.secret).update('coltex:sign-in-challenge').digest('hex')
  }

  private async accountFor(email: string) {
    const [row] = await this.db.select({ id: user.id }).from(user).where(eq(user.email, email))
    return row?.id ?? null
  }

  /** Whether this account signed in from this address in the last 90 days. */
  async familiar(userId: string | null, ip: string): Promise<boolean> {
    if (!userId) return false
    const since = new Date(this.now().getTime() - RULES.familiarDays * DAY * 1000)
    const [row] = await this.db
      .select({ id: signInEvents.id })
      .from(signInEvents)
      .where(and(eq(signInEvents.userId, userId), eq(signInEvents.ip, ip), eq(signInEvents.outcome, 'success'), gt(signInEvents.createdAt, since)))
      .limit(1)
    return !!row
  }

  private async locked(userId: string | null, email: string): Promise<boolean> {
    if (userId) {
      const [row] = await this.db.select({ id: signInLocks.userId }).from(signInLocks).where(eq(signInLocks.userId, userId))
      return !!row
    }
    // An email without an account "locks" the same way, so the answer gives nothing away.
    return Number((await this.counters.get(keys.unfamiliar(email))) ?? 0) >= RULES.lockAfter
  }

  async challenge(): Promise<SignInChallenge> {
    const c = await createChallenge({
      hmacKey: this.challengeKey,
      maxnumber: RULES.challengeMaxNumber,
      expires: new Date(this.now().getTime() + RULES.challengeSeconds * 1000),
    })
    return { algorithm: c.algorithm, challenge: c.challenge, maxnumber: c.maxnumber ?? RULES.challengeMaxNumber, salt: c.salt, signature: c.signature }
  }

  /** A solved challenge (the base64 payload the browser sends), each usable once. */
  private async solved(payload: string | undefined): Promise<boolean> {
    if (!payload || payload.length > 2000) return false
    try {
      if (!(await verifySolution(payload, this.challengeKey, true))) return false
      const { signature } = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as { signature: string }
      return await this.counters.setNew(keys.challenge(signature), '1', RULES.challengeSeconds)
    } catch {
      return false
    }
  }

  private async refuse(reason: SignInRefusal, attempt: Attempt, userId: string | null, retryAfter?: number): Promise<Refusal> {
    // Recorded once in a while, not for every try: a script hammering a locked account
    // shouldn't fill the table. Asking for a proof of work is part of the form, not a refusal.
    if (reason !== 'challenge' && (await this.counters.setNew(keys.refusal(attempt.email, attempt.ip, reason), '1', RULES.refusalRecordSeconds))) {
      await this.record({ userId, email: attempt.email, outcome: 'refused', reason, ip: attempt.ip, userAgent: attempt.userAgent })
    }
    const minutes = Math.max(1, Math.ceil((retryAfter ?? 0) / 60))
    switch (reason) {
      case 'ip_blocked':
        return { status: 429, body: { code: 'SIGN_IN_ADDRESS_BLOCKED', message: 'Too many failed sign-ins from this address. Try again later.', retryAfter } }
      case 'locked':
        return {
          status: 403,
          body: { code: 'SIGN_IN_ACCOUNT_LOCKED', message: 'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.' },
        }
      case 'cooldown':
        return { status: 429, body: { code: 'SIGN_IN_COOLDOWN', message: `Too many failed sign-ins. Try again in ${minutes} minutes.`, retryAfter } }
      case 'challenge':
        return { status: 400, body: { code: 'SIGN_IN_CHALLENGE', message: 'Solve the challenge to sign in', challenge: await this.challenge() } }
    }
  }

  /** Before the password is checked: a refusal, or null to go ahead. */
  async check(attempt: Attempt, challengePayload: string | undefined): Promise<Refusal | null> {
    const { email, ip } = attempt
    const userId = await this.accountFor(email)
    const blocked = await this.counters.ttl(keys.blocked(ip))
    if (blocked > 0) return this.refuse('ip_blocked', attempt, userId, blocked)
    if (await this.familiar(userId, ip)) {
      const wait = await this.counters.ttl(keys.familiarCooldown(email, ip))
      return wait > 0 ? this.refuse('cooldown', attempt, userId, wait) : null
    }
    if (await this.locked(userId, email)) return this.refuse('locked', attempt, userId)
    const wait = await this.counters.ttl(keys.cooldown(email))
    if (wait > 0) return this.refuse('cooldown', attempt, userId, wait)
    const failures = Number((await this.counters.get(keys.unfamiliar(email))) ?? 0)
    if (failures >= RULES.challengeAfter && !(await this.solved(challengePayload))) return this.refuse('challenge', attempt, userId)
    return null
  }

  /** What better-auth answered to the email and password. */
  async afterPassword(attempt: Attempt, res: Response): Promise<void> {
    if (res.status === 401) return this.failed(attempt)
    if (res.status !== 200) return
    const body = (await res.json().catch(() => null)) as { user?: { id: string }; twoFactorRedirect?: boolean } | null
    if (body?.twoFactorRedirect) {
      // The password was right; the sign-in counts once the code is.
      const cookie = twoFactorCookie(res.headers.getSetCookie().join('; '))
      const userId = await this.accountFor(attempt.email)
      if (cookie && userId) await this.counters.set(keys.pending(cookie), JSON.stringify({ userId, email: attempt.email } satisfies Pending), RULES.pendingSeconds)
      return
    }
    if (body?.user?.id) await this.succeeded(attempt, body.user.id, 'password')
  }

  /** The sign-in this second step belongs to, from its cookie; null for other uses of the endpoints (turning two-step verification on). */
  async pending(cookieHeader: string | undefined): Promise<Pending | null> {
    const cookie = twoFactorCookie(cookieHeader ?? '')
    if (!cookie) return null
    const raw = await this.counters.get(keys.pending(cookie))
    return raw ? (JSON.parse(raw) as Pending) : null
  }

  /** Before a code is checked: only a blocked address is refused (the codes have better-auth's own limits). */
  async checkCode(attempt: Attempt, pending: Pending): Promise<Refusal | null> {
    const blocked = await this.counters.ttl(keys.blocked(attempt.ip))
    return blocked > 0 ? this.refuse('ip_blocked', attempt, pending.userId, blocked) : null
  }

  async afterCode(attempt: Attempt, pending: Pending, method: SignInMethod, res: Response, cookieHeader: string | undefined): Promise<void> {
    if (res.status === 200) {
      await this.counters.del(keys.pending(twoFactorCookie(cookieHeader ?? '')!))
      return this.succeeded(attempt, pending.userId, method)
    }
    if (res.status !== 401 && res.status !== 400) return
    await this.record({ userId: pending.userId, email: pending.email, outcome: 'two_factor_failure', method, ip: attempt.ip, userAgent: attempt.userAgent })
    await this.addressFailed(attempt)
  }

  private async succeeded(attempt: Attempt, userId: string, method: SignInMethod) {
    await this.record({ userId, email: attempt.email, outcome: 'success', method, ip: attempt.ip, userAgent: attempt.userAgent })
    await this.counters.del(keys.unfamiliar(attempt.email), keys.familiar(attempt.email, attempt.ip))
  }

  private async failed(attempt: Attempt) {
    const { email, ip } = attempt
    const userId = await this.accountFor(email)
    await this.record({ userId, email, outcome: 'failure', method: 'password', ip, userAgent: attempt.userAgent })
    if (await this.familiar(userId, ip)) {
      const n = await this.counters.incr(keys.familiar(email, ip), HOUR)
      if (n % RULES.familiarFailuresPer === 0) await this.counters.set(keys.familiarCooldown(email, ip), '1', RULES.cooldownSeconds)
    } else {
      const n = await this.counters.incr(keys.unfamiliar(email), RULES.failureMemorySeconds)
      if (n === RULES.cooldownAfter) await this.counters.set(keys.cooldown(email), '1', RULES.cooldownSeconds)
      if (n >= RULES.lockAfter && userId) await this.lock(userId, email)
    }
    await this.addressFailed(attempt)
  }

  private async addressFailed({ email, ip, userAgent }: Attempt) {
    // Only addresses on the internet are blocked. Local, tailnet and this machine's addresses can
    // be shared by everyone (Docker Desktop and some setups show every visitor as Docker's
    // gateway), and blocking one would shut everybody out; the per-account rules still apply.
    if (this.places.place(ip).kind !== 'public') return
    const n = await this.counters.incr(keys.address(ip), RULES.addressWindowSeconds)
    if (n < RULES.addressFailures) return
    await this.counters.set(keys.blocked(ip), '1', RULES.addressBlockSeconds)
    await this.counters.del(keys.address(ip))
    await this.record({ userId: await this.accountFor(email), email, outcome: 'ip_blocked', ip, userAgent })
  }

  private async lock(userId: string, email: string) {
    const inserted = await this.db.insert(signInLocks).values({ userId }).onConflictDoNothing().returning({ id: signInLocks.userId })
    if (!inserted.length) return
    await this.record({ userId, email, outcome: 'locked', ip: null, userAgent: null })
    await this.notifications.accountLocked(userId)
  }

  /** Open a locked account again (Manage users → sign-ins, or `cli.ts unlock`). */
  async unlock(userId: string): Promise<boolean> {
    const [target] = await this.db.select({ email: user.email }).from(user).where(eq(user.id, userId))
    if (!target) return false
    const removed = await this.db.delete(signInLocks).where(eq(signInLocks.userId, userId)).returning({ id: signInLocks.userId })
    await this.counters.del(keys.unfamiliar(target.email), keys.cooldown(target.email))
    if (removed.length) await this.record({ userId, email: target.email, outcome: 'unlocked', ip: null, userAgent: null })
    return removed.length > 0
  }

  async unblock(ip: string): Promise<boolean> {
    const was = (await this.counters.ttl(keys.blocked(ip))) > 0
    await this.counters.del(keys.blocked(ip), keys.address(ip))
    return was
  }

  async blocks(): Promise<SignInBlocks> {
    const accounts = await this.db
      .select({ id: user.id, name: user.name, email: user.email, lockedAt: signInLocks.lockedAt })
      .from(signInLocks)
      .innerJoin(user, eq(user.id, signInLocks.userId))
      .orderBy(desc(signInLocks.lockedAt))
    const now = this.now().getTime()
    const addresses = (await this.counters.list('ipban:'))
      .map(({ key, ttl }) => {
        const ip = key.slice('ipban:'.length)
        return { ip, place: this.places.place(ip), until: new Date(now + ttl * 1000).toISOString() }
      })
      .sort((a, b) => b.until.localeCompare(a.until))
    return { accounts: accounts.map(a => ({ ...a, lockedAt: a.lockedAt.toISOString() })), addresses }
  }

  async isLocked(userId: string): Promise<boolean> {
    return this.locked(userId, '')
  }

  async record(e: {
    userId: string | null
    email: string
    outcome: SignInOutcome
    method?: SignInMethod
    reason?: SignInRefusal
    ip: string | null
    userAgent: string | null
  }): Promise<void> {
    await this.db.insert(signInEvents).values({
      id: newId(),
      userId: e.userId,
      email: e.email.slice(0, 254),
      outcome: e.outcome,
      method: e.method ?? null,
      reason: e.reason ?? null,
      ip: e.ip,
      userAgent: e.userAgent?.slice(0, 500) ?? null,
      createdAt: this.now(),
    })
  }

  /** Newest first, 50 at a time: one person's, or (for the system administrator) everyone's. */
  async events(filter: { userId?: string; failed?: boolean; before?: string }): Promise<SignInEventPage> {
    const limit = 50
    const where: (SQL | undefined)[] = [
      filter.userId ? eq(signInEvents.userId, filter.userId) : undefined,
      filter.failed ? inArray(signInEvents.outcome, ['failure', 'two_factor_failure', 'refused', 'locked', 'ip_blocked']) : undefined,
      filter.before ? lt(signInEvents.createdAt, new Date(filter.before)) : undefined,
    ]
    const rows = await this.db
      .select({ e: signInEvents, name: user.name })
      .from(signInEvents)
      .leftJoin(user, eq(user.id, signInEvents.userId))
      .where(and(...where))
      .orderBy(desc(signInEvents.createdAt))
      .limit(limit + 1)
    return {
      hasMore: rows.length > limit,
      events: rows.slice(0, limit).map(({ e, name }): SignInEvent => ({
        id: e.id,
        at: e.createdAt.toISOString(),
        outcome: e.outcome,
        method: e.method,
        reason: e.reason,
        user: e.userId && name ? { id: e.userId, name } : null,
        email: e.email,
        ip: e.ip,
        place: this.places.place(e.ip),
        device: e.userAgent,
      })),
    }
  }

  /** Records older than 90 days go (run every hour by the server). */
  async prune(): Promise<void> {
    const before = new Date(this.now().getTime() - RULES.keepDays * DAY * 1000)
    await this.db.delete(signInEvents).where(lt(signInEvents.createdAt, before))
  }

  /** better-auth's own rate limits (per address and endpoint), in the same store so restarts don't reset them. */
  rateLimitStorage() {
    return {
      consume: async (key: string, rule: { window: number; max: number }) => {
        const n = await this.counters.incr(`rl:${key}`, rule.window)
        if (n <= rule.max) return { allowed: true, retryAfter: null }
        return { allowed: false, retryAfter: Math.max(1, await this.counters.ttl(`rl:${key}`)) }
      },
    }
  }
}

/** The two-factor sign-in cookie's value, from a Cookie or Set-Cookie header. */
function twoFactorCookie(header: string): string | null {
  const m = header.match(/(?:^|[;,]\s*)(?:__Secure-)?better-auth\.two_factor=([^;,\s]+)/)
  return m?.[1] ?? null
}


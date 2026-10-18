// Ported from PilotDeck (https://github.com/OpenBMB/PilotDeck), AGPL-3.0.
// Upstream: src/router/health/ProviderHealthTracker.ts @ 52660d5
// ColTex: tracks the last error per provider for the admin page, drops the
// success-rate window and the unused helpers, and uses ColTex's thresholds.

export type ProviderHealthState = 'healthy' | 'degraded' | 'open' | 'half_open'

/** Consecutive failures before a provider counts as degraded, and before requests go elsewhere. */
const DEGRADE_THRESHOLD = 2
const OPEN_THRESHOLD = 3
/** How long requests go elsewhere before one is let through to try again. */
const OPEN_DURATION_MS = 60_000

type ProviderRecord = {
  state: ProviderHealthState
  consecutiveFailures: number
  /** When the circuit was opened. */
  openedAt: number
  lastError: string | null
  lastErrorAt: number | null
}

/**
 * A circuit breaker per provider, for the instance's shared credentials:
 *   healthy  → degraded  after DEGRADE_THRESHOLD consecutive failures
 *   degraded → open      after OPEN_THRESHOLD consecutive failures
 *   open     → half_open after OPEN_DURATION_MS (one request may try again)
 *   half_open → healthy on success, open on failure
 * In memory: a restart starts everyone healthy again.
 */
export class ProviderHealth {
  private readonly records = new Map<string, ProviderRecord>()
  private readonly openDurationMs: number

  constructor(options?: { openDurationMs?: number }) {
    this.openDurationMs = options?.openDurationMs ?? OPEN_DURATION_MS
  }

  private record(providerId: string): ProviderRecord {
    let rec = this.records.get(providerId)
    if (!rec) {
      rec = { state: 'healthy', consecutiveFailures: 0, openedAt: 0, lastError: null, lastErrorAt: null }
      this.records.set(providerId, rec)
    }
    return rec
  }

  recordSuccess(providerId: string): void {
    const rec = this.record(providerId)
    rec.consecutiveFailures = 0
    rec.state = 'healthy'
  }

  recordFailure(providerId: string, error: string): void {
    const rec = this.record(providerId)
    rec.consecutiveFailures++
    rec.lastError = error.slice(0, 500)
    rec.lastErrorAt = Date.now()
    if (rec.state === 'half_open' || rec.consecutiveFailures >= OPEN_THRESHOLD) {
      if (rec.state !== 'open') {
        rec.state = 'open'
        rec.openedAt = Date.now()
      }
    } else if (rec.consecutiveFailures >= DEGRADE_THRESHOLD && rec.state === 'healthy') {
      rec.state = 'degraded'
    }
  }

  state(providerId: string): ProviderHealthState {
    const rec = this.records.get(providerId)
    if (!rec) return 'healthy'
    if (rec.state === 'open' && Date.now() - rec.openedAt >= this.openDurationMs) rec.state = 'half_open'
    return rec.state
  }

  /** Requests should go elsewhere for now. */
  isOpen(providerId: string): boolean {
    return this.state(providerId) === 'open'
  }

  snapshot(providerId: string): { state: ProviderHealthState; failures: number; lastError: string | null; lastErrorAt: string | null } {
    const rec = this.records.get(providerId)
    return {
      state: this.state(providerId),
      failures: rec?.consecutiveFailures ?? 0,
      lastError: rec?.lastError ?? null,
      lastErrorAt: rec?.lastErrorAt ? new Date(rec.lastErrorAt).toISOString() : null,
    }
  }

  reset(providerId: string): void {
    this.records.delete(providerId)
  }
}

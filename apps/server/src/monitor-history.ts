import { lt, sql } from 'drizzle-orm'
import type { MonitorHistory as History, MonitorPoint, MonitorRange, ResourceSample } from '@coltex/shared'
import type { CompilerContainer } from './compile-queue.ts'
import type { Db } from './db/client.ts'
import { compileRuns, monitorSamples } from './db/schema.ts'
import { cgroupMemory, cpuAllowance, hostMemory } from './monitor.ts'

/** How often resources are sampled; each minute's samples become one row. */
const TICK_MS = 10_000
const MINUTE = 60_000
const RETAIN_MS = 30 * 86_400_000

/** Each range and the width of its buckets (about 60–180 points per chart). */
const RANGES: Record<MonitorRange, { ms: number; bucketSeconds: number }> = {
  '1h': { ms: 3_600_000, bucketSeconds: 60 },
  '6h': { ms: 6 * 3_600_000, bucketSeconds: 300 },
  '24h': { ms: 86_400_000, bucketSeconds: 900 },
  '7d': { ms: 7 * 86_400_000, bucketSeconds: 3600 },
  '30d': { ms: 30 * 86_400_000, bucketSeconds: 4 * 3600 },
}

const round = (n: number) => Math.round(n * 10) / 10
const pct = (used: number | null, limit: number | null) => (used === null || !limit ? null : round((used / limit) * 100))

/** Sum the compiler workers: memory adds up, CPU is weighted by each worker's CPUs. */
export function compilerTotals(containers: CompilerContainer[]): Pick<ResourceSample, 'compilerCpu' | 'compilerMem' | 'compilerMemLimit'> {
  if (containers.length === 0) return { compilerCpu: null, compilerMem: null, compilerMemLimit: null }
  const withCpu = containers.filter(c => c.cpu !== null && c.cpus)
  const cpus = withCpu.reduce((n, c) => n + c.cpus!, 0)
  return {
    compilerCpu: cpus ? round(withCpu.reduce((n, c) => n + c.cpu! * c.cpus!, 0) / cpus) : null,
    compilerMem: containers.reduce((n, c) => n + c.used, 0),
    // A worker without a limit can use the whole machine: no meaningful sum.
    compilerMemLimit: containers.every(c => c.limit) ? containers.reduce((n, c) => n + c.limit!, 0) : null,
  }
}

/**
 * The admin overview's history. Samples the server's own CPU and memory and
 * the compiler workers' reports every few seconds, writes one averaged row a
 * minute, and records every finished build, so the charts cover earlier
 * server processes and the time nobody had the page open.
 */
export class MonitorHistory {
  private readonly db: Db
  private readonly compilers: () => Promise<CompilerContainer[]>
  private readonly boot = new Date()
  private timer: ReturnType<typeof setInterval> | undefined
  private lastCpu = { usage: process.cpuUsage(), at: Date.now() }
  /** This minute's samples, written when the minute is over. */
  private pending: { minute: number; samples: ResourceSample[] } | undefined
  private lastPrune = 0
  latest: ResourceSample | null = null

  constructor(db: Db, compilers: () => Promise<CompilerContainer[]>) {
    this.db = db
    this.compilers = compilers
  }

  start(): void {
    this.timer = setInterval(() => void this.tick().catch(() => {}), TICK_MS)
    this.timer.unref()
  }

  async stop(): Promise<void> {
    clearInterval(this.timer)
    if (this.pending) await this.flush(this.pending).catch(() => {})
    this.pending = undefined
  }

  /** Take a sample now (the timer calls this). */
  async tick(now = Date.now()): Promise<void> {
    const usage = process.cpuUsage(this.lastCpu.usage)
    const elapsed = now - this.lastCpu.at
    this.lastCpu = { usage: process.cpuUsage(), at: now }
    const [cpus, own, host, containers] = await Promise.all([cpuAllowance(), cgroupMemory(), hostMemory(), this.compilers().catch(() => [])])
    const sample: ResourceSample = {
      serverCpu: elapsed > 0 ? Math.min(100, round(((usage.user + usage.system) / 1000 / elapsed / cpus) * 100)) : 0,
      // In a container, what `docker stats` shows; otherwise the process.
      serverMem: own?.used ?? process.memoryUsage().rss,
      serverMemLimit: own?.limit ?? host.total,
      ...compilerTotals(containers),
    }
    await this.record(sample, now)
  }

  /** Add a sample taken at `now`; a new minute writes the previous one. */
  async record(sample: ResourceSample, now = Date.now()): Promise<void> {
    this.latest = sample
    const minute = Math.floor(now / MINUTE) * MINUTE
    if (this.pending && this.pending.minute !== minute) await this.flush(this.pending)
    if (!this.pending || this.pending.minute !== minute) this.pending = { minute, samples: [] }
    this.pending.samples.push(sample)
    if (now - this.lastPrune > 3_600_000) {
      this.lastPrune = now
      const cutoff = new Date(now - RETAIN_MS)
      await this.db.delete(monitorSamples).where(lt(monitorSamples.at, cutoff))
      await this.db.delete(compileRuns).where(lt(compileRuns.at, cutoff))
    }
  }

  /** A minute's samples as one row: average CPU, peak memory. */
  private summary(samples: ResourceSample[]): ResourceSample {
    const avg = (pick: (s: ResourceSample) => number | null) => {
      const xs = samples.map(pick).filter((x): x is number => x !== null)
      return xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null
    }
    const max = (pick: (s: ResourceSample) => number | null) => {
      const xs = samples.map(pick).filter((x): x is number => x !== null)
      return xs.length ? Math.max(...xs) : null
    }
    return {
      serverCpu: avg(s => s.serverCpu) ?? 0,
      serverMem: max(s => s.serverMem) ?? 0,
      serverMemLimit: max(s => s.serverMemLimit) ?? 0,
      compilerCpu: avg(s => s.compilerCpu),
      compilerMem: max(s => s.compilerMem),
      compilerMemLimit: max(s => s.compilerMemLimit),
    }
  }

  private async flush(pending: { minute: number; samples: ResourceSample[] }): Promise<void> {
    if (pending.samples.length === 0) return
    await this.db
      .insert(monitorSamples)
      .values({ at: new Date(pending.minute), boot: this.boot, ...this.summary(pending.samples) })
      .onConflictDoNothing()
  }

  recordBuild(ms: number, status: string, at = new Date()): Promise<void> {
    return this.db
      .insert(compileRuns)
      .values({ at, ms: Math.round(ms), status })
      .then(
        () => {},
        () => {},
      )
  }

  /** Builds since `since`: how many, how many failed, and their average time. */
  async builds(since: Date): Promise<{ total: number; failed: number; avgMs: number | null }> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        failed: sql<number>`(count(*) filter (where ${compileRuns.status} <> 'success'))::int`,
        avgMs: sql<number | null>`round(avg(${compileRuns.ms}))::int`,
      })
      .from(compileRuns)
      .where(sql`${compileRuns.at} >= ${since}`)
    return { total: row?.total ?? 0, failed: row?.failed ?? 0, avgMs: row?.avgMs ?? null }
  }

  async history(range: MonitorRange, now = Date.now()): Promise<History> {
    const { ms, bucketSeconds } = RANGES[range]
    const step = bucketSeconds * 1000
    const end = Math.floor(now / step) * step
    const start = end - ms + step
    const from = new Date(start)
    const interval = sql.raw(`'${bucketSeconds} seconds'::interval`)
    const bucket = (column: unknown) => sql`date_bin(${interval}, ${column}, timestamptz '2000-01-01')`
    const samples = await this.db
      .select({
        b: sql<Date>`${bucket(monitorSamples.at)}`.as('b'),
        serverCpu: sql<number>`avg(${monitorSamples.serverCpu})`,
        serverMem: sql<number>`max(${monitorSamples.serverMem})`,
        serverMemLimit: sql<number>`max(${monitorSamples.serverMemLimit})`,
        compilerCpu: sql<number | null>`avg(${monitorSamples.compilerCpu})`,
        compilerMem: sql<number | null>`max(${monitorSamples.compilerMem})`,
        compilerMemLimit: sql<number | null>`max(${monitorSamples.compilerMemLimit})`,
      })
      .from(monitorSamples)
      .where(sql`${monitorSamples.at} >= ${from}`)
      .groupBy(sql`1`)
    const builds = await this.db
      .select({
        b: sql<Date>`${bucket(compileRuns.at)}`.as('b'),
        n: sql<number>`count(*)::int`,
        failed: sql<number>`(count(*) filter (where ${compileRuns.status} <> 'success'))::int`,
      })
      .from(compileRuns)
      .where(sql`${compileRuns.at} >= ${from}`)
      .groupBy(sql`1`)
    const boots = await this.db
      .selectDistinct({ boot: monitorSamples.boot })
      .from(monitorSamples)
      .where(sql`${monitorSamples.at} >= ${from}`)

    const key = (d: Date | string) => new Date(d).getTime()
    const byBucket = new Map(samples.map(s => [key(s.b), s]))
    const buildsBy = new Map(builds.map(b => [key(b.b), b]))
    const points: MonitorPoint[] = []
    for (let at = start; at <= end; at += step) {
      let s: Omit<ResourceSample, 'serverCpu' | 'serverMem' | 'serverMemLimit'> & { serverCpu: number | null; serverMem: number | null; serverMemLimit: number | null } =
        byBucket.get(at) ?? { serverCpu: null, serverMem: null, serverMemLimit: null, compilerCpu: null, compilerMem: null, compilerMemLimit: null }
      // The current minute isn't written yet: show it from memory.
      if (this.pending?.samples.length && at === Math.floor(this.pending.minute / step) * step && s.serverCpu === null) s = this.summary(this.pending.samples)
      const num = (x: number | string | null) => (x === null ? null : Number(x))
      const b = buildsBy.get(at)
      points.push({
        at: new Date(at).toISOString(),
        serverCpu: s.serverCpu === null ? null : round(Number(s.serverCpu)),
        serverMem: num(s.serverMem),
        serverMemPct: pct(num(s.serverMem), num(s.serverMemLimit)),
        compilerCpu: s.compilerCpu === null ? null : round(Number(s.compilerCpu)),
        compilerMem: num(s.compilerMem),
        compilerMemPct: pct(num(s.compilerMem), num(s.compilerMemLimit)),
        builds: b?.n ?? 0,
        failedBuilds: b?.failed ?? 0,
      })
    }
    const restarts = [...new Set([...boots.map(b => b.boot.getTime()), this.boot.getTime()])]
      .filter(t => t > start)
      .sort((a, b) => a - b)
      .map(t => new Date(t).toISOString())
    return { range, bucketSeconds, points, restarts }
  }
}

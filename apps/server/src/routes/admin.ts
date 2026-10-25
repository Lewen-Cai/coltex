import os from 'node:os'
import { and, count, eq, gte, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AdminStats, MonitorHistory, MonitorRange, type ServiceHealth } from '@coltex/shared'
import { cgroupMemory, diskSpace, hostMemory, inDocker } from '../monitor.ts'
import { requireAdmin } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Db } from '../db/client.ts'
import { projects, user } from '../db/schema.ts'
import type { Deps } from '../deps.ts'

const startedAt = new Date()
/** Summing storage walks every project, so the overview's polling reuses it for a while. */
const STORAGE_TTL_MS = 60_000

async function countWhere(db: Db, table: typeof user | typeof projects, where?: ReturnType<typeof and>) {
  const [row] = await db.select({ n: count() }).from(table).where(where)
  return row?.n ?? 0
}

export const adminRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db, store, queue, monitor }) => {
  let storage: { at: number; bytes: number; files: number } | undefined

  async function storageTotals() {
    if (storage && Date.now() - storage.at < STORAGE_TTL_MS) return storage
    let bytes = 0
    let files = 0
    for (const { id } of await db.select({ id: projects.id }).from(projects)) {
      const tree = await store.listTree(id).catch(() => undefined)
      for (const f of tree?.files ?? []) {
        bytes += f.size
        files++
      }
    }
    storage = { at: Date.now(), bytes, files }
    return storage
  }

  async function pingDatabase(): Promise<number | null> {
    const started = Date.now()
    try {
      await db.execute(sql`select 1`)
      return Date.now() - started
    } catch {
      return null
    }
  }

  // The monitoring overview, polled by the admin page.
  app.get('/admin/stats', { schema: { response: { 200: AdminStats } } }, async req => {
    requireAdmin(req)
    const now = Date.now()
    const day = 86_400_000
    const [total, admins, suspended, newUsers, projectTotal, active, totals, dbMs, compiler, builds, disk, memory, own, docker] = await Promise.all([
      countWhere(db, user),
      countWhere(db, user, and(eq(user.role, 'admin'))),
      countWhere(db, user, and(eq(user.banned, true))),
      countWhere(db, user, and(gte(user.createdAt, new Date(now - 30 * day)))),
      countWhere(db, projects),
      countWhere(db, projects, and(gte(projects.updatedAt, new Date(now - 7 * day)))),
      storageTotals(),
      pingDatabase(),
      queue.stats().catch(() => ({ workers: 0, slots: 0, waiting: 0, active: 0, failed: 0, valkeyMs: null, containers: [] })),
      monitor.builds(new Date(now - day)),
      diskSpace(config.dataDir),
      hostMemory(),
      cgroupMemory(),
      inDocker(),
    ])

    const services: ServiceHealth[] = [
      { id: 'api', status: 'ok', latencyMs: null },
      { id: 'database', status: dbMs === null ? 'down' : 'ok', latencyMs: dbMs },
      { id: 'valkey', status: compiler.valkeyMs === null ? 'down' : 'ok', latencyMs: compiler.valkeyMs },
      // Builds wait in the queue while no worker is up; a backlog with workers up is slow, not down.
      { id: 'compiler', status: compiler.workers === 0 ? 'down' : compiler.waiting > Math.max(compiler.workers, compiler.slots) * 4 ? 'degraded' : 'ok', latencyMs: null },
    ]
    const mem = process.memoryUsage()

    return {
      users: { total, admins, suspended, newLast30d: newUsers },
      projects: { total: projectTotal, activeLast7d: active, storageBytes: totals.bytes, files: totals.files },
      services,
      compiler: { workers: compiler.workers, slots: compiler.slots, waiting: compiler.waiting, active: compiler.active, failed: compiler.failed },
      compiles: builds,
      host: {
        cpus: os.availableParallelism(),
        loadAvg: os.loadavg(),
        memTotal: memory.total,
        memAvailable: memory.available,
        platform: `${os.type()} ${os.arch()}`,
        docker,
      },
      containers: [
        ...(own ? [{ id: 'server' as const, name: os.hostname(), ...own }] : []),
        ...compiler.containers.map(c => ({ id: 'compiler' as const, ...c })),
      ],
      process: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      live: monitor.latest,
      disk,
      server: {
        version: config.version,
        uptimeSeconds: Math.round((now - startedAt.getTime()) / 1000),
        startedAt: startedAt.toISOString(),
      },
    }
  })

  // Resource use and builds over a period, from what the server recorded (across restarts).
  app.get(
    '/admin/stats/history',
    { schema: { querystring: z.object({ range: MonitorRange.default('1h') }), response: { 200: MonitorHistory } } },
    async req => {
      requireAdmin(req)
      return monitor.history(req.query.range)
    },
  )
}

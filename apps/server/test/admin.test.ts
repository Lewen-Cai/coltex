import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { MonitorHistory as History, ResourceSample } from '@coltex/shared'
import { config } from '../src/config.ts'
import { MonitorHistory, compilerTotals } from '../src/monitor-history.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('admin overview', () => {
  let t: TestApp
  let admin = ''
  let member = ''

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: { email: 'm@lab.test' } })
    member = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'Member', email: 'm@lab.test', password: 'Correct-horse-2' },
      }),
    )
    await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: {} })
    const p = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: admin }, payload: { name: 'P' } })).json()
    await t.app.inject({ method: 'POST', url: `/api/projects/${p.id}/members`, headers: { cookie: admin }, payload: { email: 'm@lab.test', role: 'editor' } })
  })

  after(async () => {
    await t?.close()
  })

  test('stats count users, projects and storage, and report services and the host', async () => {
    const res = await t.app.inject({ url: '/api/admin/stats', headers: { cookie: admin } })
    assert.equal(res.statusCode, 200, res.body)
    const s = res.json()
    assert.deepEqual(s.users, { total: 2, admins: 1, suspended: 0, newLast30d: 2 })
    assert.equal(s.projects.total, 1)
    assert.equal(s.projects.activeLast7d, 1)
    assert.equal(s.projects.files, 1)
    assert.ok(s.projects.storageBytes > 100)
    assert.equal(s.compiler.workers, 1)
    assert.deepEqual(
      s.services.map((x: { id: string; status: string }) => [x.id, x.status]),
      [['api', 'ok'], ['database', 'ok'], ['valkey', 'ok'], ['compiler', 'ok']],
    )
    assert.ok(s.host.cpus >= 1 && s.host.memTotal > 0 && s.host.memAvailable <= s.host.memTotal)
    assert.deepEqual(
      s.containers.find((c: { id: string }) => c.id === 'compiler'),
      { id: 'compiler', name: 'compiler-1', used: 1e9, limit: 4e9 },
      "compiler workers' reports are passed on",
    )
    assert.ok(s.process.rss > 0)
    assert.ok(s.disk.total > 0)
    assert.equal(s.compiles.total, 0)
    assert.equal(s.live, null, 'nothing sampled yet')
    assert.equal(s.server.version, '0.0.1')
  })

  test('the history keeps earlier server processes, shows gaps, and counts builds', async () => {
    const now = Date.now()
    const min = 60_000
    const sample = (cpu: number, mem: number): ResourceSample => ({
      serverCpu: cpu,
      serverMem: mem,
      serverMemLimit: 1000,
      compilerCpu: null,
      compilerMem: null,
      compilerMemLimit: null,
    })
    // A server process that ran earlier and stopped.
    const earlier = new MonitorHistory(t.db, async () => [])
    // Both samples in one minute, wherever in the minute the test runs.
    const minuteStart = Math.floor((now - 50 * min) / min) * min
    await earlier.record(sample(10, 100), minuteStart + 5_000)
    await earlier.record(sample(30, 300), minuteStart + 15_000)
    await earlier.stop()
    // The current one.
    await t.monitor.record({ ...sample(50, 500), compilerCpu: 20, compilerMem: 2e9, compilerMemLimit: 4e9 }, now - 5 * min)
    await t.monitor.record(sample(5, 200), now - 4 * min)
    await t.monitor.recordBuild(1000, 'success', new Date(now - 5 * min))
    await t.monitor.recordBuild(3000, 'failure', new Date(now - 5 * min))

    const res = await t.app.inject({ url: '/api/admin/stats/history?range=1h', headers: { cookie: admin } })
    assert.equal(res.statusCode, 200, res.body)
    const h = res.json() as History
    assert.equal(h.bucketSeconds, 60)
    assert.equal(h.points.length, 60)
    const at = (ms: number) => h.points.find(p => p.at === new Date(Math.floor(ms / min) * min).toISOString())!
    // A minute is one row: average CPU, peak memory, memory as a share of the limit.
    assert.deepEqual([at(now - 50 * min).serverCpu, at(now - 50 * min).serverMem, at(now - 50 * min).serverMemPct], [20, 300, 30])
    // Nothing recorded while the server was down.
    assert.equal(at(now - 30 * min).serverCpu, null)
    const recent = at(now - 5 * min)
    assert.deepEqual([recent.compilerCpu, recent.compilerMemPct, recent.builds, recent.failedBuilds], [20, 50, 2, 1])
    // The minute still in memory shows too.
    assert.equal(at(now - 4 * min).serverCpu, 5)
    assert.equal(h.restarts.length, 2, 'both server processes started within the hour')

    const week = (await t.app.inject({ url: '/api/admin/stats/history?range=7d', headers: { cookie: admin } })).json() as History
    assert.equal(week.points.length, 168)
    assert.equal((await t.app.inject({ url: '/api/admin/stats/history?range=2y', headers: { cookie: admin } })).statusCode, 400)

    const stats = (await t.app.inject({ url: '/api/admin/stats', headers: { cookie: admin } })).json()
    assert.deepEqual(stats.compiles, { total: 2, failed: 1, avgMs: 2000 })
  })

  test('sampling reads this process, and compiler workers add up', async () => {
    await t.monitor.tick()
    const live = (await t.app.inject({ url: '/api/admin/stats', headers: { cookie: admin } })).json().live as ResourceSample
    assert.ok(live.serverMem > 0 && live.serverMemLimit >= live.serverMem)
    assert.ok(live.serverCpu >= 0 && live.serverCpu <= 100)
    assert.deepEqual(live.compilerCpu, 25, "the test queue's worker")
    assert.deepEqual(
      compilerTotals([
        { name: 'a', used: 1, limit: 4, cpu: 10, cpus: 1 },
        { name: 'b', used: 3, limit: 4, cpu: 40, cpus: 3 },
      ]),
      { compilerCpu: 32.5, compilerMem: 4, compilerMemLimit: 8 },
    )
    assert.equal(compilerTotals([{ name: 'a', used: 1, limit: null, cpu: null, cpus: null }]).compilerMemLimit, null)
  })

  test('only admins see stats', async () => {
    assert.equal((await t.app.inject({ url: '/api/admin/stats', headers: { cookie: member } })).statusCode, 403)
    assert.equal((await t.app.inject({ url: '/api/admin/stats/history', headers: { cookie: member } })).statusCode, 403)
  })

  test('project lists include how many people have access', async () => {
    const [p] = (await t.app.inject({ url: '/api/projects', headers: { cookie: member } })).json()
    assert.equal(p.memberCount, 2)
    assert.equal(p.role, 'editor')
  })
})

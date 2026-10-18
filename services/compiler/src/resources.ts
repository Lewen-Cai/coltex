import fs from 'node:fs/promises'
import os from 'node:os'
import type { Redis } from 'ioredis'
import { COMPILER_RESOURCES_KEY } from '@coltex/shared'

/** How often each worker reports its container's CPU and memory for the admin overview. */
const REPORT_MS = 5000

async function readNumber(file: string): Promise<number | undefined> {
  try {
    const n = Number((await fs.readFile(file, 'utf8')).trim())
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

async function inactiveFile(file: string, field: string): Promise<number> {
  try {
    const line = (await fs.readFile(file, 'utf8')).split('\n').find(l => l.startsWith(`${field} `))
    return Number(line?.split(' ')[1] ?? 0) || 0
  } catch {
    return 0
  }
}

/** The container's memory as `docker stats` counts it, from cgroup v2 (or v1). */
async function containerMemory(): Promise<{ used: number; limit: number | null } | undefined> {
  const current = await readNumber('/sys/fs/cgroup/memory.current')
  if (current !== undefined) {
    const max = await fs.readFile('/sys/fs/cgroup/memory.max', 'utf8').then(s => s.trim(), () => 'max')
    const inactive = await inactiveFile('/sys/fs/cgroup/memory.stat', 'inactive_file')
    return { used: Math.max(0, current - inactive), limit: max === 'max' ? null : Number(max) || null }
  }
  const usage = await readNumber('/sys/fs/cgroup/memory/memory.usage_in_bytes')
  if (usage === undefined) return undefined
  const limit = await readNumber('/sys/fs/cgroup/memory/memory.limit_in_bytes')
  const inactive = await inactiveFile('/sys/fs/cgroup/memory/memory.stat', 'total_inactive_file')
  return { used: Math.max(0, usage - inactive), limit: limit && limit < 2 ** 60 ? limit : null }
}

/** CPU time the container has used, in microseconds (cgroup v2, else v1). */
async function containerCpuUsec(): Promise<number | undefined> {
  const v2 = await inactiveFile('/sys/fs/cgroup/cpu.stat', 'usage_usec')
  if (v2 > 0) return v2
  const v1 = await readNumber('/sys/fs/cgroup/cpuacct/cpuacct.usage')
  return v1 === undefined ? undefined : v1 / 1000
}

/** How many CPUs the container may use: its quota (`--cpus`), else the machine's cores. */
async function containerCpus(): Promise<number> {
  const max = await fs.readFile('/sys/fs/cgroup/cpu.max', 'utf8').then(s => s.trim().split(/\s+/), () => undefined)
  if (max && max[0] !== 'max') return Number(max[0]) / Number(max[1] ?? 100_000)
  const quota = await readNumber('/sys/fs/cgroup/cpu/cpu.cfs_quota_us')
  const period = await readNumber('/sys/fs/cgroup/cpu/cpu.cfs_period_us')
  if (quota && quota > 0 && period) return quota / period
  return os.availableParallelism()
}

/**
 * Publish this worker's container CPU and memory to Valkey, where the server
 * reads them (the server has no Docker socket, by design). CPU is the share of
 * the container's CPUs used since the previous report. Entries carry a
 * timestamp so stopped workers drop out.
 */
export function reportResources(connection: Redis): () => void {
  const field = os.hostname()
  let last: { usec: number; at: number } | undefined
  const report = async () => {
    const memory = await containerMemory()
    if (!memory) return
    const usec = await containerCpuUsec()
    const cpus = await containerCpus()
    const at = Date.now()
    let cpu: number | null = null
    if (usec !== undefined && last && at > last.at) cpu = Math.min(100, Math.max(0, ((usec - last.usec) / 1000 / (at - last.at) / cpus) * 100))
    if (usec !== undefined) last = { usec, at }
    // The full edition has the package manuals the assistant can read (texlive_doc).
    const manuals = process.env.COLTEX_EDITION === 'full'
    await connection.hset(COMPILER_RESOURCES_KEY, field, JSON.stringify({ ...memory, cpu, cpus, at, manuals }))
  }
  void report().catch(() => {})
  const timer = setInterval(() => void report().catch(() => {}), REPORT_MS)
  timer.unref()
  return () => {
    clearInterval(timer)
    void connection.hdel(COMPILER_RESOURCES_KEY, field).catch(() => {})
  }
}

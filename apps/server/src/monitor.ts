import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import { promisify } from 'node:util'

const run = promisify(execFile)

async function readNumber(file: string): Promise<number | undefined> {
  try {
    const text = (await fs.readFile(file, 'utf8')).trim()
    const n = Number(text)
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

async function statField(file: string, field: string): Promise<number> {
  try {
    const line = (await fs.readFile(file, 'utf8')).split('\n').find(l => l.startsWith(`${field} `))
    return Number(line?.split(' ')[1] ?? 0) || 0
  } catch {
    return 0
  }
}

/**
 * This process's container memory, from its cgroup: usage as `docker stats`
 * counts it (without reclaimable page cache) and the limit, if one is set.
 * Undefined outside a container (e.g. the dev server on macOS).
 */
export async function cgroupMemory(): Promise<{ used: number; limit: number | null } | undefined> {
  // cgroup v2
  const current = await readNumber('/sys/fs/cgroup/memory.current')
  if (current !== undefined) {
    const max = await fs.readFile('/sys/fs/cgroup/memory.max', 'utf8').then(s => s.trim(), () => 'max')
    const inactive = await statField('/sys/fs/cgroup/memory.stat', 'inactive_file')
    return { used: Math.max(0, current - inactive), limit: max === 'max' ? null : Number(max) || null }
  }
  // cgroup v1
  const usage = await readNumber('/sys/fs/cgroup/memory/memory.usage_in_bytes')
  if (usage === undefined) return undefined
  const limit = await readNumber('/sys/fs/cgroup/memory/memory.limit_in_bytes')
  const inactive = await statField('/sys/fs/cgroup/memory/memory.stat', 'total_inactive_file')
  // "No limit" is reported as a huge number.
  return { used: Math.max(0, usage - inactive), limit: limit && limit < 2 ** 60 ? limit : null }
}

/**
 * Memory of the machine this process sees. Inside Docker that is the Docker
 * host (on macOS and Windows, Docker Desktop's VM with the memory it was
 * given). On macOS itself, os.freemem() leaves out the file cache, which
 * makes a healthy Mac look full, so available memory comes from vm_stat.
 */
export async function hostMemory(): Promise<{ total: number; available: number }> {
  const total = os.totalmem()
  if (process.platform !== 'darwin') return { total, available: os.freemem() }
  try {
    const { stdout } = await run('vm_stat', { timeout: 2000 })
    const pageSize = Number(/page size of (\d+) bytes/.exec(stdout)?.[1] ?? 4096)
    const pages = (name: string) => Number(new RegExp(`${name}:\\s+(\\d+)`).exec(stdout)?.[1] ?? 0)
    const available = (pages('Pages free') + pages('Pages inactive') + pages('Pages speculative') + pages('Pages purgeable')) * pageSize
    return { total, available: Math.min(total, available) }
  } catch {
    return { total, available: os.freemem() }
  }
}

let docker: Promise<boolean> | undefined
export function inDocker(): Promise<boolean> {
  docker ??= fs.access('/.dockerenv').then(
    () => true,
    () => false,
  )
  return docker
}

/** How many CPUs this process may use: its container's quota (`--cpus`), else the machine's cores. */
export async function cpuAllowance(): Promise<number> {
  const max = await fs.readFile('/sys/fs/cgroup/cpu.max', 'utf8').then(s => s.trim().split(/\s+/), () => undefined)
  if (max && max[0] !== 'max') return Number(max[0]) / Number(max[1] ?? 100_000)
  const quota = await readNumber('/sys/fs/cgroup/cpu/cpu.cfs_quota_us')
  const period = await readNumber('/sys/fs/cgroup/cpu/cpu.cfs_period_us')
  if (quota && quota > 0 && period) return quota / period
  return os.availableParallelism()
}

let diskCache: { at: number; dir: string; value: Promise<{ total: number; free: number } | null> } | undefined

/**
 * The size and free space of the filesystem holding `dir`. From `df -Pk`
 * (POSIX: 1024-byte blocks), because Node's statfs has no fragment size:
 * on some filesystems (virtiofs, Docker Desktop's bind mounts) the block
 * count is in 4 KiB fragments while bsize says 1 MiB, which made the disk
 * look 256 times larger. statfs is the fallback. Cached for 30 s (the
 * overview asks every 5 s).
 */
export function diskSpace(dir: string): Promise<{ total: number; free: number } | null> {
  if (diskCache && diskCache.dir === dir && Date.now() - diskCache.at < 30_000) return diskCache.value
  const value = new Promise<{ total: number; free: number } | null>(resolve => {
    execFile('df', ['-Pk', dir], { timeout: 5000 }, (err, stdout) => {
      const cols = err ? undefined : stdout.trim().split('\n').at(-1)?.split(/\s+/)
      const total = Number(cols?.[1])
      const free = Number(cols?.[3])
      if (cols && Number.isFinite(total) && Number.isFinite(free) && total > 0) return resolve({ total: total * 1024, free: free * 1024 })
      fs.statfs(dir).then(
        st => resolve({ total: st.blocks * st.bsize, free: st.bavail * st.bsize }),
        () => resolve(null),
      )
    })
  })
  diskCache = { at: Date.now(), dir, value }
  return value
}

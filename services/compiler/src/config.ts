import path from 'node:path'

function int(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

const dataDir = path.resolve(process.env.DATA_DIR ?? '/data')

/** REDIS_URL with VALKEY_PASSWORD added, when it is set and the address has none. */
function valkeyUrl(): string {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
  if (process.env.VALKEY_PASSWORD && !url.password) url.password = encodeURIComponent(process.env.VALKEY_PASSWORD)
  return url.toString()
}

export const config = {
  redisUrl: valkeyUrl(),
  /** Read-only project sources, laid out as <projectsDir>/<projectId>/... */
  projectsDir: path.join(dataDir, 'projects'),
  /** Build artifacts, laid out as <outputsDir>/<projectId>/<buildId>/... */
  outputsDir: path.join(dataDir, 'outputs'),
  /** Per-project compile directories, kept between builds to reuse aux files */
  workDir: path.resolve(process.env.WORK_DIR ?? '/work'),
  timeoutMs: int('COMPILE_TIMEOUT', 240) * 1000,
  /** Builds at once; unset, it follows the container's CPUs and free memory (see slots.ts). */
  concurrency: int('COMPILE_CONCURRENCY', 0) || null,
  keepBuilds: int('KEEP_BUILDS', 3),
}

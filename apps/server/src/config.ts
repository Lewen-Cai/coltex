import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function int(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

// Relative paths are resolved against the repository root, so `pnpm dev` (cwd = apps/server)
// and the root .env agree on where ./data is.
const repoRoot = path.resolve(import.meta.dirname, '../../..')
const dataDir = path.resolve(repoRoot, process.env.DATA_DIR ?? './data')

/**
 * Secret used to sign sessions. Taken from COLTEX_SECRET, otherwise generated
 * once and kept in the data directory so self-hosters need no extra setup.
 */
function loadSecret(): string {
  if (process.env.COLTEX_SECRET) return process.env.COLTEX_SECRET
  const file = path.join(dataDir, '.secret')
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    const secret = crypto.randomBytes(32).toString('base64url')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(file, secret, { mode: 0o600, flag: 'wx' })
    return secret
  }
}

/**
 * TRUST_PROXY as set: unset/false (clients connect directly), true, or
 * addresses/ranges such as "uniquelocal" (a proxy on a private network).
 */
function trustProxy(): boolean | string {
  const v = process.env.TRUST_PROXY?.trim()
  if (!v || v === 'false') return false
  return v === 'true' ? true : v
}

/**
 * Fastify's trustProxy: TRUST_PROXY, plus loopback always. Only processes in
 * the server's own container (or on its machine) connect from loopback; the
 * one that forwards is the built-in Tailscale's serve proxy, which passes the
 * tailnet visitor's address in X-Forwarded-For. Anyone else's
 * X-Forwarded-For is still ignored unless TRUST_PROXY says otherwise.
 */
function fastifyTrustProxy(v: boolean | string): boolean | string {
  return v === true ? true : v ? `loopback, ${v}` : 'loopback'
}

/** Unset and empty variables are the same thing (docker compose passes `${VAR:-}` as ""). */
function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

/** Where project files live: STORAGE=local (default) or STORAGE=s3 with the S3_* variables. */
function storage() {
  const driver = env('STORAGE') ?? 'local'
  if (driver === 'local') return { driver: 'local' as const }
  if (driver !== 's3') throw new Error(`STORAGE must be "local" or "s3", not "${driver}"`)
  const missing = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].filter(name => !env(name))
  if (missing.length) throw new Error(`STORAGE=s3 needs ${missing.join(', ')}`)
  const region = env('S3_REGION') ?? 'us-east-1'
  const endpoint = env('S3_ENDPOINT')
  return {
    driver: 's3' as const,
    s3: {
      endpoint: endpoint ?? `https://s3.${region}.amazonaws.com`,
      region,
      bucket: env('S3_BUCKET')!,
      accessKeyId: env('S3_ACCESS_KEY_ID')!,
      secretAccessKey: env('S3_SECRET_ACCESS_KEY')!,
      // Self-hosted services generally need path-style; AWS prefers virtual-hosted.
      pathStyle: env('S3_PATH_STYLE') ? env('S3_PATH_STYLE') === 'true' : endpoint !== undefined,
      prefix: env('S3_PREFIX') ?? '',
    },
  }
}

/** COLTEX_URL when it is set (empty counts as unset: docker-compose passes it through). */
const envPublicUrl = process.env.COLTEX_URL?.trim().replace(/\/+$/, '') || undefined
const port = int('PORT', 3000)
/** better-auth's base URL; the address links use is NetworkService's. */
const publicUrl = envPublicUrl ?? `http://localhost:${port}`

/** This release: the server package's version (COLTEX_VERSION overrides it). */
const version =
  process.env.COLTEX_VERSION?.trim() ||
  (JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version

export const config = {
  version,
  port,
  host: process.env.HOST ?? '0.0.0.0',
  /** better-auth's base URL: COLTEX_URL, else this server on localhost. */
  publicUrl,
  envPublicUrl,
  /** Extra origins allowed to call the API with cookies, e.g. the Vite dev server. */
  /** Behind a reverse proxy, take the client IP (sign-in rate limits) from X-Forwarded-For. */
  trustProxy: trustProxy(),
  /** What Fastify is given (see fastifyTrustProxy). */
  fastifyTrustProxy: fastifyTrustProxy(trustProxy()),
  trustedOrigins: [publicUrl, ...(process.env.TRUSTED_ORIGINS ?? '').split(',').filter(Boolean)],
  /** The built-in Tailscale: tailscaled's program, its state (device keys, socket), the device name. */
  tailscaled: env('TAILSCALED_BIN') ?? 'tailscaled',
  tailscaleStateDir: path.join(dataDir, 'tailscale'),
  tailscaleHostname: env('TS_HOSTNAME') ?? 'coltex',
  /** Where `tailscale serve` sends requests: this server, from inside its own container. */
  tailscaleTarget: `http://127.0.0.1:${port}`,
  /** The built-in Cloudflare Tunnel: cloudflared's program and its local metrics server. */
  cloudflared: env('CLOUDFLARED_BIN') ?? 'cloudflared',
  cloudflaredMetrics: env('CLOUDFLARED_METRICS') ?? '127.0.0.1:20241',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://coltex:coltex@localhost:5432/coltex',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  secret: loadSecret(),
  dataDir,
  projectsDir: path.join(dataDir, 'projects'),
  outputsDir: path.join(dataDir, 'outputs'),
  /** Snapshots (bare git repositories), one per project. */
  historyDir: path.join(dataDir, 'history'),
  /** Rebuildable state: the S3 driver's compile-copy manifests, backup scratch files. */
  cacheDir: path.join(dataDir, 'cache'),
  storage: storage(),
  /** Whether the instance secret comes from COLTEX_SECRET rather than DATA_DIR/.secret. */
  secretFromEnv: !!process.env.COLTEX_SECRET,
  /** PostgreSQL client programs used by backups and restore. */
  pgDump: env('PG_DUMP') ?? 'pg_dump',
  psql: env('PSQL') ?? 'psql',
  compileTimeoutMs: int('COMPILE_TIMEOUT', 240) * 1000,
  /** Built web app to serve in production; unset in development (Vite serves it). */
  webDist: process.env.WEB_DIST ? path.resolve(repoRoot, process.env.WEB_DIST) : undefined,
  maxUploadBytes: int('MAX_UPLOAD_MB', 50) * 1024 * 1024,
  /** Largest project archive accepted by import (compressed size). */
  maxImportBytes: int('MAX_IMPORT_MB', 200) * 1024 * 1024,
}

export type Config = typeof config

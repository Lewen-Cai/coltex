import type { CloudflareState } from '@coltex/shared'
import { BadRequestError } from '../errors.ts'
import { Supervised } from './process.ts'

export type TunnelMode = 'quick' | 'token'

/**
 * The tunnel token from what was pasted: the token itself, or the whole
 * install command the dashboard shows (`cloudflared service install eyJ…`,
 * `docker run … --token eyJ…`). A token is base64 JSON with the account
 * (a), the tunnel (t) and its secret (s); the tunnel ID next to it in the
 * dashboard is not one, and is the usual mix-up.
 */
export function tunnelToken(pasted: string): string {
  const found = /eyJ[A-Za-z0-9+/_=-]{40,}/.exec(pasted)?.[0]
  const hint = 'Paste the tunnel token: the long text starting with eyJ in the install command the Cloudflare dashboard shows (the whole command works too).'
  if (!found) {
    if (/^\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*$/i.test(pasted)) throw new BadRequestError(`That is the tunnel ID, not its token. ${hint}`)
    throw new BadRequestError(`Not a tunnel token. ${hint}`)
  }
  try {
    const json = JSON.parse(Buffer.from(found, 'base64').toString('utf8')) as Record<string, unknown>
    if (typeof json.a === 'string' && typeof json.t === 'string' && typeof json.s === 'string') return found
  } catch {
    // Not JSON: falls through.
  }
  throw new BadRequestError(`Not a tunnel token. ${hint}`)
}

/** The tunnel a token is for (its `t`), to show which one is saved. */
export function tunnelIdOf(token: string): string | null {
  try {
    const t = (JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { t?: unknown }).t
    return typeof t === 'string' ? t : null
  } catch {
    return null
  }
}

/** Lines cloudflared prints when it can't reach Cloudflare over QUIC (UDP is blocked, or a proxy swallows it). */
const QUIC_FAILED = /failed to dial to edge with quic|Failed to dial a quic connection|quic.*(timeout|no recent network activity)/i
/** After this many, it is started again on HTTP/2 (TCP 443), which gets through where QUIC doesn't. */
const QUIC_FAILURES_BEFORE_HTTP2 = 3
/** trycloudflare.com limits how often one address may ask for a temporary link. */
const RATE_LIMITED = /429 Too Many Requests|error code: 1015|status code 429/i
const RATE_LIMIT_DELAY_MS = 30_000
const MAX_RATE_LIMIT_DELAY_MS = 30 * 60_000

/**
 * What a line cloudflared logged means, for the errors people run into, and
 * what to do about it; other lines are shown as they are.
 */
export function explainCloudflared(line: string, metrics: string): string | null {
  if (RATE_LIMITED.test(line)) {
    return 'trycloudflare.com is limiting temporary links from this address (429 Too Many Requests). ColTex asks again less and less often; a tunnel with your own domain has no such limit.'
  }
  if (/address already in use/i.test(line) && line.includes(metrics.split(':').pop()!)) {
    return `Another cloudflared is using ${metrics} (one started by hand in the server's container?). Stop it, or restart the server.`
  }
  if (/token is not valid|Unauthorized: Invalid tunnel secret|Invalid tunnel token/i.test(line)) {
    return 'The tunnel token is not valid (the tunnel was deleted, or its token was refreshed). Paste the command from the Cloudflare dashboard again.'
  }
  if (QUIC_FAILED.test(line) || /failed to dial to edge|dial tcp .*:7844|edge discovery/i.test(line)) {
    return "Can't reach Cloudflare: outgoing connections to Cloudflare's edge (port 7844, UDP for QUIC or TCP for HTTP/2) seem blocked by a firewall or proxy. A proxy with fake IPs (198.18.x.x) should let cloudflared's traffic go direct."
  }
  return null
}

/**
 * cloudflared run by the server (the image ships it), as a tunnel only:
 * Cloudflare carries the traffic and ColTex's own accounts sign people in
 * (no Cloudflare Access). Two ways:
 *   - quick: no account, a random trycloudflare.com address that changes
 *     every time it starts (for trying things out);
 *   - token: a tunnel made in the Cloudflare dashboard, whose public
 *     hostnames (pointed at http://localhost:<port>) are set there. The
 *     token goes in the environment, never on the command line.
 * The state comes from cloudflared's metrics server (`/ready`, and
 * `/quicktunnel` for the quick address) and, for the hostnames of a token
 * tunnel, from the configuration it logs. When QUIC keeps timing out it
 * switches to HTTP/2 until the server restarts (unless the protocol was
 * set with TUNNEL_TRANSPORT_PROTOCOL); a rate limit waits longer each time.
 */
export class CloudflareTunnel {
  private readonly proc: Supervised
  private readonly target: string
  private readonly metrics: string
  private mode: TunnelMode | null = null
  private token?: string
  /** Hostnames the tunnel's configuration routes (token tunnels). */
  private hostnames: string[] = []
  private quicFailures = 0
  private http2 = false

  constructor(opts: { binary: string; target: string; metrics: string; restartDelayMs?: number }) {
    this.proc = new Supervised(opts.binary, opts.restartDelayMs)
    this.target = opts.target
    this.metrics = opts.metrics
    this.proc.onStart = () => {
      this.hostnames = []
      this.quicFailures = 0
    }
    this.proc.onLine = line => {
      if (!this.http2 && !process.env.TUNNEL_TRANSPORT_PROTOCOL && QUIC_FAILED.test(line) && ++this.quicFailures >= QUIC_FAILURES_BEFORE_HTTP2) {
        this.http2 = true
        if (this.mode) void this.start(this.mode, this.token).catch(() => {})
        return
      }
      // e.g. INF Updated to new configuration config="{\"ingress\":[{\"hostname\":\"tex.example.org\",\"service\":\"http://localhost:3690\"},…
      if (!line.includes('Updated to new configuration')) return
      const found = [...line.matchAll(/hostname\\*"\s*:\s*\\*"([^"\\]+)/g)].map(m => m[1]!)
      this.hostnames = [...new Set(found.filter(h => !h.startsWith('*')))]
    }
    const rateLimitDelay = opts.restartDelayMs ? opts.restartDelayMs * 6 : RATE_LIMIT_DELAY_MS
    this.proc.restartDelay = (lines, failures) =>
      lines.some(l => RATE_LIMITED.test(l)) ? Math.min(MAX_RATE_LIMIT_DELAY_MS, rateLimitDelay * 2 ** (failures - 1)) : undefined
  }

  installed(): boolean {
    return this.proc.installed()
  }

  /** Whether it switched to HTTP/2 because QUIC didn't get through. */
  onHttp2(): boolean {
    return this.http2
  }

  async start(mode: TunnelMode, token?: string): Promise<void> {
    this.mode = mode
    this.token = token
    const common = ['tunnel', '--no-autoupdate', '--metrics', this.metrics, ...(this.http2 ? ['--protocol', 'http2'] : [])]
    if (mode === 'quick') await this.proc.start([...common, '--url', this.target])
    else await this.proc.start([...common, 'run'], { TUNNEL_TOKEN: token ?? '' })
  }

  stop(): Promise<void> {
    this.mode = null
    this.token = undefined
    return this.proc.stop()
  }

  async state(enabled: boolean, hasToken: boolean): Promise<CloudflareState> {
    const base: CloudflareState = { state: 'off', enabled, mode: this.mode, url: null, urls: [], hasToken, tunnelId: null, error: null }
    if (!this.installed()) return { ...base, state: 'unavailable' }
    if (!enabled || !this.proc.wantedOn()) return base
    const error = this.loggedError() ?? this.proc.lastError()
    if (!this.proc.running()) return { ...base, state: error ? 'error' : 'starting', error }
    const ready = await this.get('/ready')
    const connected = (ready?.readyConnections as number | undefined) ?? 0
    if (!connected) return { ...base, state: error ? 'error' : 'starting', error }
    let urls: string[] = []
    if (this.mode === 'quick') {
      const quick = await this.get('/quicktunnel')
      if (typeof quick?.hostname === 'string' && quick.hostname) urls = [`https://${quick.hostname}`]
    } else urls = this.hostnames.map(h => `https://${h}`)
    return { ...base, state: 'connected', url: urls[0] ?? null, urls }
  }

  /** The reason cloudflared keeps failing to connect, from its log (a wrong token, say), explained when it's a known one. */
  private loggedError(): string | null {
    const line = [...this.proc.lines].reverse().find(l => /\b(ERR|FTL)\b/.test(l) || explainCloudflared(l, this.metrics))
    if (!line) return null
    return explainCloudflared(line, this.metrics) ?? line.replace(/^\S+\s+(ERR|FTL)\s+/, '')
  }

  private async get(path: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`http://${this.metrics}${path}`, { signal: AbortSignal.timeout(2000) })
      return (await res.json()) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

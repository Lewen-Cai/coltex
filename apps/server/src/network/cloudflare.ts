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
 * tunnel, from the configuration it logs.
 */
export class CloudflareTunnel {
  private readonly proc: Supervised
  private readonly target: string
  private readonly metrics: string
  private mode: TunnelMode | null = null
  /** Hostnames the tunnel's configuration routes (token tunnels). */
  private hostnames: string[] = []

  constructor(opts: { binary: string; target: string; metrics: string }) {
    this.proc = new Supervised(opts.binary)
    this.target = opts.target
    this.metrics = opts.metrics
    this.proc.onStart = () => {
      this.hostnames = []
    }
    this.proc.onLine = line => {
      // e.g. INF Updated to new configuration config="{\"ingress\":[{\"hostname\":\"tex.example.org\",\"service\":\"http://localhost:3690\"},…
      if (!line.includes('Updated to new configuration')) return
      const found = [...line.matchAll(/hostname\\*"\s*:\s*\\*"([^"\\]+)/g)].map(m => m[1]!)
      this.hostnames = [...new Set(found.filter(h => !h.startsWith('*')))]
    }
  }

  installed(): boolean {
    return this.proc.installed()
  }

  async start(mode: TunnelMode, token?: string): Promise<void> {
    this.mode = mode
    const common = ['tunnel', '--no-autoupdate', '--metrics', this.metrics]
    if (mode === 'quick') await this.proc.start([...common, '--url', this.target])
    else await this.proc.start([...common, 'run'], { TUNNEL_TOKEN: token ?? '' })
  }

  stop(): Promise<void> {
    this.mode = null
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

  /** The reason cloudflared keeps failing to connect, from its log (a wrong token, say). */
  private loggedError(): string | null {
    const line = [...this.proc.lines].reverse().find(l => /\b(ERR|FTL)\b/.test(l))
    return line ? line.replace(/^\S+\s+(ERR|FTL)\s+/, '') : null
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

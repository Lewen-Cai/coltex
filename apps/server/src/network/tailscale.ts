import fs from 'node:fs/promises'
import http from 'node:http'
import type { TailscaleState } from '@coltex/shared'
import { BadRequestError } from '../errors.ts'

/** The part of tailscaled's status that matters here (LocalAPI `GET /localapi/v0/status`). */
type Status = {
  BackendState?: string
  AuthURL?: string
  Self?: { DNSName?: string; TailscaleIPs?: string[] | null }
  CurrentTailnet?: { Name?: string } | null
  CertDomains?: string[] | null
}

type ServeConfig = {
  TCP?: Record<string, { HTTPS?: boolean; HTTP?: boolean }>
  Web?: Record<string, { Handlers?: Record<string, { Proxy?: string }> }>
}

const STATES: Record<string, TailscaleState['state']> = {
  NoState: 'starting',
  Starting: 'starting',
  NeedsLogin: 'needs-login',
  NeedsMachineAuth: 'needs-approval',
  Stopped: 'stopped',
  Running: 'running',
}

const UNAVAILABLE: TailscaleState = {
  state: 'unavailable',
  enabled: false,
  authUrl: null,
  name: null,
  addresses: [],
  tailnet: null,
  https: false,
  servingUrl: null,
  error: null,
}

/**
 * tailscaled's LocalAPI on its socket (the built-in Tailscale, see
 * daemon.ts). The device joins a tailnet and, when asked, serves ColTex there
 * (`tailscale serve`, HTTPS when the tailnet issues certificates).
 */
export class TailscaleClient {
  private readonly socket: string
  /** Where serve sends requests: this server, as tailscaled reaches it. */
  private readonly target: string
  /** The device's name on the tailnet. */
  private readonly hostname: string

  constructor(opts: { socket: string; target: string; hostname?: string }) {
    this.socket = opts.socket
    this.target = opts.target
    this.hostname = opts.hostname ?? 'coltex'
  }

  async available(): Promise<boolean> {
    return fs.stat(this.socket).then(
      s => s.isSocket(),
      () => false,
    )
  }

  async state(): Promise<TailscaleState> {
    if (!(await this.available())) return UNAVAILABLE
    try {
      const status = (await this.call('GET', '/localapi/v0/status')).json as Status
      const name = status.Self?.DNSName?.replace(/\.$/, '') || null
      const state = STATES[status.BackendState ?? ''] ?? 'starting'
      return {
        state,
        enabled: true,
        authUrl: state === 'needs-login' ? status.AuthURL || null : null,
        name,
        addresses: status.Self?.TailscaleIPs ?? [],
        tailnet: status.CurrentTailnet?.Name ?? null,
        https: !!status.CertDomains?.length,
        servingUrl: state === 'running' && name ? servingUrl(await this.serveConfig().then(c => c.config), name) : null,
        error: null,
      }
    } catch (err) {
      return { ...UNAVAILABLE, state: 'error', error: (err as Error).message }
    }
  }

  /** Start signing this device in; the link to finish it appears in the state. */
  async login(): Promise<TailscaleState> {
    await this.requireAvailable()
    // What `tailscale up` does: want to be connected, then ask the control server for a sign-in link.
    await this.call('PATCH', '/localapi/v0/prefs', { WantRunning: true, WantRunningSet: true, Hostname: this.hostname, HostnameSet: true })
    await this.call('POST', '/localapi/v0/login-interactive')
    // The control server answers with the link shortly.
    for (let i = 0; i < 40; i++) {
      const s = await this.state()
      if (s.authUrl || s.state === 'running') return s
      await new Promise(r => setTimeout(r, 250))
    }
    return this.state()
  }

  /** Leave the tailnet (and stop serving there). */
  async logout(): Promise<void> {
    await this.requireAvailable()
    await this.call('POST', '/localapi/v0/logout')
  }

  /** Serve ColTex on the tailnet, over HTTPS when the tailnet issues certificates, else plain HTTP. */
  async serve(enabled: boolean): Promise<TailscaleState> {
    const s = await this.state()
    if (s.state !== 'running' || !s.name) throw new BadRequestError('Tailscale is not connected')
    const port = s.https ? '443' : '80'
    const config: ServeConfig = enabled
      ? {
          TCP: { [port]: s.https ? { HTTPS: true } : { HTTP: true } },
          Web: { [`${s.name}:${port}`]: { Handlers: { '/': { Proxy: this.target } } } },
        }
      : {}
    const { etag } = await this.serveConfig()
    await this.call('POST', '/localapi/v0/serve-config', config, etag ? { 'If-Match': etag } : {})
    return this.state()
  }

  private async serveConfig(): Promise<{ config: ServeConfig; etag?: string }> {
    const res = await this.call('GET', '/localapi/v0/serve-config')
    return { config: (res.json ?? {}) as ServeConfig, etag: res.etag }
  }

  private async requireAvailable(): Promise<void> {
    if (!(await this.available())) throw new BadRequestError('Tailscale is not turned on')
  }

  private call(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, headers: Record<string, string> = {}) {
    return new Promise<{ json: unknown; etag?: string }>((resolve, reject) => {
      const req = http.request(
        {
          socketPath: this.socket,
          host: 'local-tailscaled.sock',
          method,
          path,
          timeout: 10_000,
          // LocalAPI refuses requests without it (a guard against browsers reaching the socket).
          headers: { 'Sec-Tailscale': 'localapi', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
        },
        res => {
          const chunks: Buffer[] = []
          res.on('data', c => chunks.push(c))
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8')
            if ((res.statusCode ?? 500) >= 400) {
              let message = text.trim()
              try {
                message = (JSON.parse(text) as { error?: string }).error ?? message
              } catch {
                // Plain-text error.
              }
              return reject(new Error(`Tailscale: ${message || `HTTP ${res.statusCode}`}`))
            }
            let json: unknown = null
            try {
              json = text ? JSON.parse(text) : null
            } catch {
              json = null
            }
            resolve({ json, etag: res.headers.etag })
          })
        },
      )
      req.on('timeout', () => req.destroy(new Error('Tailscale did not answer')))
      req.on('error', reject)
      if (body !== undefined) req.write(JSON.stringify(body))
      req.end()
    })
  }
}

/** The address a serve config makes ColTex reachable at, if it serves it. */
function servingUrl(config: ServeConfig, name: string): string | null {
  if (config.Web?.[`${name}:443`]) return `https://${name}`
  if (config.Web?.[`${name}:80`]) return `http://${name}`
  return null
}

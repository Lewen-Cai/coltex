import { eq } from 'drizzle-orm'
import type { CloudflareBody, CloudflareState, LinkAddress, TailscaleState } from '@coltex/shared'
import type { SecretBox } from '../ai/credentials.ts'
import { tunnelIdOf, tunnelToken, type CloudflareTunnel, type TunnelMode } from './cloudflare.ts'
import type { Db } from '../db/client.ts'
import { appSettings } from '../db/schema.ts'
import { BadRequestError } from '../errors.ts'
import type { TailscaleDaemon } from './daemon.ts'
import type { TailscaleClient } from './tailscale.ts'

const SETTINGS_KEY = 'network'
/** How long the extra sign-in origins are reused (they are looked up on every sign-in request). */
const ORIGINS_TTL_MS = 15_000

/** (Earlier versions also kept `publicUrl` and `addresses` here; they are ignored.) */
type Stored = {
  tailscale?: boolean
  /** The tunnel token is sealed with the instance secret. */
  cloudflare?: { enabled: boolean; mode: TunnelMode; token?: string }
}

/**
 * The addresses links offer (COLTEX_URL, the tailnet's while Tailscale
 * serves ColTex, the Cloudflare Tunnel's while connected; browsers add their
 * own), which sign-in also accepts besides the address a request is made
 * to, and the built-in Tailscale and Cloudflare Tunnel.
 */
export class NetworkService {
  private readonly db: Db
  private readonly envUrl: string | undefined
  readonly tailscale: TailscaleClient
  /** The built-in tailscaled; absent where the server doesn't run it (tests with a fake LocalAPI). */
  private readonly daemon?: TailscaleDaemon
  private readonly cloudflare?: CloudflareTunnel
  private readonly box?: SecretBox
  private origins?: { at: number; list: Promise<string[]> }
  /** Why the saved tunnel token wasn't used (one saved before tokens were checked). */
  private cloudflareProblem: string | null = null

  constructor(opts: {
    db: Db
    envPublicUrl: string | undefined
    tailscale: TailscaleClient
    daemon?: TailscaleDaemon
    cloudflare?: CloudflareTunnel
    box?: SecretBox
  }) {
    this.db = opts.db
    this.envUrl = opts.envPublicUrl
    this.tailscale = opts.tailscale
    this.daemon = opts.daemon
    this.cloudflare = opts.cloudflare
    this.box = opts.box
  }

  /** At startup, and when the settings may have changed (the CLI signals the server): run tailscaled if it's turned on. */
  async apply(): Promise<void> {
    const stored = await this.stored()
    if (this.daemon) {
      if (stored.tailscale === true && this.daemon.installed()) await this.daemon.start()
      else await this.daemon.stop()
    }
    if (this.cloudflare) {
      const cf = stored.cloudflare
      let token = cf?.token && this.box ? this.box.open(cf.token) : undefined
      this.cloudflareProblem = null
      if (cf?.enabled && cf.mode === 'token' && token) {
        try {
          token = tunnelToken(token)
        } catch (err) {
          this.cloudflareProblem = (err as Error).message
          token = undefined
        }
      }
      if (cf?.enabled && this.cloudflare.installed() && (cf.mode === 'quick' || token)) await this.cloudflare.start(cf.mode, token)
      else await this.cloudflare.stop()
    }
    this.forget()
  }

  async dispose(): Promise<void> {
    await Promise.all([this.daemon?.stop(), this.cloudflare?.stop()])
  }

  async cloudflareState(): Promise<CloudflareState> {
    const cf = (await this.stored()).cloudflare
    const off: CloudflareState = { state: 'unavailable', enabled: false, mode: null, url: null, urls: [], hasToken: false, tunnelId: null, error: null }
    if (!this.cloudflare) return off
    const tunnelId = cf?.token && this.box ? tunnelIdOf(this.box.open(cf.token)) : null
    const state = { ...(await this.cloudflare.state(cf?.enabled === true, !!cf?.token)), tunnelId }
    if (cf?.enabled && this.cloudflareProblem) return { ...state, state: 'error', mode: cf.mode, error: this.cloudflareProblem }
    return { ...state, mode: state.mode ?? cf?.mode ?? null }
  }

  /** Turn the built-in Cloudflare Tunnel on (quick, or with a token from the dashboard) or off. */
  async setCloudflare(body: CloudflareBody): Promise<CloudflareState> {
    if (this.cloudflare && !this.cloudflare.installed()) throw new BadRequestError('cloudflared is not installed on this server')
    await this.setCloudflareSetting(body)
    await this.apply()
    return this.cloudflareState()
  }

  /** Only the setting (the CLI, which then signals the server). */
  async setCloudflareSetting(body: CloudflareBody): Promise<void> {
    const stored = await this.stored()
    const prev = stored.cloudflare
    const mode = body.mode ?? prev?.mode ?? 'quick'
    const token = body.token ? this.box!.seal(tunnelToken(body.token)) : prev?.token
    if (body.enabled && mode === 'token' && !token) throw new BadRequestError('A tunnel token is needed')
    await this.save({ ...stored, cloudflare: { enabled: body.enabled, mode, ...(token ? { token } : {}) } })
  }

  /** The built-in Tailscale as the admin page shows it. */
  async tailscaleState(): Promise<TailscaleState> {
    if (!this.daemon) return this.tailscale.state()
    const off = { ...(await this.tailscale.state()), state: 'off' as const, enabled: false }
    if (!this.daemon.installed()) return { ...off, state: 'unavailable' }
    if (!(await this.stored()).tailscale) return off
    const error = this.daemon.lastError()
    if (error) return { ...off, enabled: true, state: 'error', error }
    const s = await this.tailscale.state()
    return s.state === 'unavailable' ? { ...s, state: 'starting', enabled: true } : s
  }

  /** Only the setting (the CLI, which then signals the server). */
  async setTailscaleSetting(enabled: boolean): Promise<void> {
    await this.save({ ...(await this.stored()), tailscale: enabled })
  }

  /** Turn the built-in Tailscale on (and start signing in) or off (it keeps its device keys). */
  async setTailscale(enabled: boolean): Promise<TailscaleState> {
    if (this.daemon && !this.daemon.installed()) throw new BadRequestError('tailscaled is not installed on this server')
    await this.setTailscaleSetting(enabled)
    await this.apply()
    if (enabled) {
      const s = await this.tailscale.state()
      if (s.state === 'needs-login' && !s.authUrl) await this.tailscale.login()
    }
    return this.tailscaleState()
  }

  /** Every address links offer, follows Tailscale on its own (no setting to undo when it stops). */
  async linkAddresses(): Promise<LinkAddress[]> {
    const [ts, cf] = await Promise.all([this.tailscaleState(), this.cloudflareState()])
    const list: LinkAddress[] = [
      ...(this.envUrl ? [{ kind: 'env' as const, url: this.envUrl, label: '' }] : []),
      ...cf.urls.map(url => ({ kind: 'cloudflare' as const, url, label: 'Cloudflare' })),
      ...(ts.servingUrl ? [{ kind: 'tailnet' as const, url: ts.servingUrl, label: 'Tailscale' }] : []),
    ]
    return list.filter((a, i) => list.findIndex(b => b.url === a.url) === i)
  }

  private async save(value: Stored): Promise<void> {
    await this.db
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
  }

  /** The public address and ColTex's address on the tailnet, for sign-in's origin check. */
  extraOrigins(): Promise<string[]> {
    if (!this.origins || Date.now() - this.origins.at > ORIGINS_TTL_MS) {
      const list = this.linkAddresses().then(
        all => all.map(a => a.url),
        () => [],
      )
      this.origins = { at: Date.now(), list }
    }
    return this.origins.list
  }

  /** Something they depend on changed. */
  forget(): void {
    this.origins = undefined
  }

  private async stored(): Promise<Stored> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, SETTINGS_KEY))
    return (row?.value as Stored | undefined) ?? {}
  }
}

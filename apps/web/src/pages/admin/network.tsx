import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CircleCheck, ChevronRight, Copy, ExternalLink, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { encode } from 'uqr'
import type { CloudflareBody, CloudflareState, NetworkInfo, TailscaleState } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { choiceLabel } from '@/components/link-list'
import { ProviderIcon } from '@/components/provider-icon'
import { TailscaleLogo } from '@/components/tailscale-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { t, tk } from '@/lib/i18n'
import { linkChoices } from '@/lib/public-url'
import { cn } from '@/lib/utils'

/** Product names, the same in every language. */
const TAILSCALE = 'Tailscale' // i18n-ignore
const CLOUDFLARE = 'Cloudflare Tunnel' // i18n-ignore

type Badged = { label: string; tone: string }
const MUTED = 'bg-muted text-muted-foreground'
const AMBER = 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
const GREEN = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
const RED = 'bg-destructive/10 text-destructive'

const TS_STATE: Record<TailscaleState['state'], Badged> = {
  unavailable: { label: tk('Not installed'), tone: MUTED },
  off: { label: tk('Off'), tone: MUTED },
  starting: { label: tk('Starting'), tone: MUTED },
  'needs-login': { label: tk('Not signed in'), tone: AMBER },
  'needs-approval': { label: tk('Waiting for approval'), tone: AMBER },
  stopped: { label: tk('Stopped'), tone: MUTED },
  running: { label: tk('Connected'), tone: GREEN },
  error: { label: tk('Error'), tone: RED },
}

const CF_STATE: Record<CloudflareState['state'], Badged> = {
  unavailable: { label: tk('Not installed'), tone: MUTED },
  off: { label: tk('Off'), tone: MUTED },
  starting: { label: tk('Connecting'), tone: MUTED },
  connected: { label: tk('Connected'), tone: GREEN },
  error: { label: tk('Error'), tone: RED },
}

/** States that change on their own (someone signing in elsewhere, a program starting): follow them. */
const SETTLING = new Set<string>(['starting', 'needs-login', 'needs-approval'])

function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('Copy')}
      onClick={async () => {
        if (await copyText(text)) toast.success(t('Copied'))
      }}
    >
      <Copy />
    </Button>
  )
}

/** An address with an optional label, and copy and open buttons. */
function AddressBox({ url, label, open = true }: { url: string; label?: string; open?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 py-1 pr-1 pl-1.5">
      {label ? (
        <Badge variant="secondary" className="max-w-40 shrink-0 truncate font-normal">
          {label}
        </Badge>
      ) : (
        <span className="w-1" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-sm" title={url}>
        {url}
      </span>
      <CopyButton text={url} />
      {open && (
        <Button variant="ghost" size="icon-sm" asChild aria-label={t('Open')}>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
      )}
    </div>
  )
}

/** A QR code drawn from its modules, so a phone can open the sign-in link. */
function QrCode({ text, className }: { text: string; className?: string }) {
  const path = useMemo(() => {
    const { data } = encode(text, { border: 2 })
    const cells: string[] = []
    data.forEach((row, y) => row.forEach((on, x) => on && cells.push(`M${x} ${y}h1v1h-1z`)))
    return { d: cells.join(''), size: data.length }
  }, [text])
  return (
    <svg viewBox={`0 0 ${path.size} ${path.size}`} className={cn('rounded-md bg-white text-black', className)} shapeRendering="crispEdges" role="img" aria-label={t('QR code')}>
      <path d={path.d} fill="currentColor" />
    </svg>
  )
}

/** Whether this page was opened through one of these addresses (turning it off cuts this very session). */
function reachedThrough(urls: string[], hosts: string[] = []): boolean {
  const here = window.location
  return hosts.includes(here.hostname) || urls.some(u => {
    try {
      return new URL(u).origin === here.origin
    } catch {
      return false
    }
  })
}

/** Turning a connection off from afar cuts everyone using it: always ask first. */
function confirmTurnOff(name: string, cutsThisPage: boolean, description: string): Promise<boolean> {
  return confirmDialog({
    title: t('Turn off {name}?', { name }),
    description: cutsThisPage ? `${description} ${t('You are using ColTex through it right now, so this page will lose its connection.')}` : description,
    confirmLabel: t('Turn off'),
    destructive: true,
  })
}

function StateBadge({ badge }: { badge: Badged }) {
  return (
    <Badge variant="secondary" className={cn('font-normal', badge.tone)}>
      {t(badge.label)}
    </Badge>
  )
}

/**
 * Settings → Network: the addresses ColTex is reached at (and links offer),
 * then the built-in Tailscale and Cloudflare Tunnel side by side, and how
 * requests arrive. Ports and the server's own listen addresses stay in its
 * environment.
 */
export function AdminNetworkPage() {
  const [info, setInfo] = useState<NetworkInfo>()
  const load = useCallback(
    () =>
      api.adminNetwork().then(setInfo, e => {
        toast.error((e as Error).message)
      }),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  const settling = !!info && (SETTLING.has(info.tailscale.state) || SETTLING.has(info.cloudflare.state))
  useEffect(() => {
    if (!settling) return
    const timer = window.setInterval(() => void load(), 2500)
    return () => window.clearInterval(timer)
  }, [settling, load])

  return (
    <>
      {!info ? (
        <div className="grid gap-6">
          <Skeleton className="h-36 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AddressesCard info={info} />
          </motion.div>
          {/* Side by side, one height. */}
          <div className="grid min-w-0 gap-6 lg:grid-cols-2 [&>*]:min-w-0 [&_[data-slot=card]]:h-full">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <TailscaleCard info={info} onChanged={load} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <CloudflareCard info={info} onChanged={load} />
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <RequestsCard info={info} />
          </motion.div>
        </div>
      )}
    </>
  )
}

/** Where ColTex is reached now: the same list invitations and Git addresses offer. */
function AddressesCard({ info }: { info: NetworkInfo }) {
  const choices = linkChoices([
    ...(info.envUrl ? [{ kind: 'env' as const, url: info.envUrl, label: '' }] : []),
    ...info.cloudflare.urls.map(url => ({ kind: 'cloudflare' as const, url, label: 'Cloudflare' })),
    ...(info.tailscale.servingUrl ? [{ kind: 'tailnet' as const, url: info.tailscale.servingUrl, label: 'Tailscale' }] : []),
  ])
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Addresses')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {choices.map(c => (
          <AddressBox key={c.url} url={c.url} label={choiceLabel(c)} open={c.kind !== 'local'} />
        ))}
        {choices.every(c => c.kind === 'local') && (
          <Warning>{t('Only this computer can open a localhost link. Open ColTex at an address others can reach (a LAN IP, a public IP or a domain), or turn on Tailscale or Cloudflare Tunnel in Settings → Network.')}</Warning>
        )}
      </CardContent>
    </Card>
  )
}

function TailscaleCard({ info, onChanged }: { info: NetworkInfo; onChanged: () => Promise<void> }) {
  const ts = info.tailscale
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      await onChanged()
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TailscaleLogo />
          {TAILSCALE}
          <StateBadge badge={TS_STATE[ts.state]} />
          {busy && <Spinner className="size-3.5 text-muted-foreground" />}
        </CardTitle>
        {ts.state !== 'unavailable' && (
          <CardAction>
            <Switch
              checked={ts.enabled}
              aria-label={TAILSCALE}
              disabled={busy}
              onCheckedChange={async on => {
                if (on) return void run(() => api.tailscaleEnable(true))
                const ok = await confirmTurnOff(
                  TAILSCALE,
                  reachedThrough(ts.servingUrl ? [ts.servingUrl] : [], ts.addresses),
                  t('ColTex stops being reachable over the tailnet until it is turned on again. It stays signed in.'),
                )
                if (ok) void run(() => api.tailscaleEnable(false))
              }}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 empty:hidden">
        {ts.state === 'unavailable' && <p className="text-sm text-muted-foreground">{t('tailscaled is not installed on this server.')}</p>}
        {ts.state === 'starting' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> {t('Starting…')}
          </p>
        )}
        {ts.state === 'error' && (
          <div className="grid gap-3">
            <Warning>{ts.error}</Warning>
            <div>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => api.tailscaleEnable(true))}>
                {t('Try again')}
              </Button>
            </div>
          </div>
        )}
        {ts.state === 'needs-login' &&
          (ts.authUrl ? (
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <QrCode text={ts.authUrl} className="size-36 justify-self-center border sm:justify-self-start" />
              <div className="grid min-w-0 gap-3">
                <p className="text-sm font-medium">{t('Sign this server in to your tailnet: scan the code, or open the link on any device.')}</p>
                <AddressBox url={ts.authUrl} />
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-3.5" /> {t('Waiting for the sign-in…')}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Button disabled={busy} onClick={() => void run(() => api.tailscaleLogin())}>
                {t('Sign in to a tailnet')}
              </Button>
            </div>
          ))}
        {ts.state === 'needs-approval' && <p className="text-sm">{t('An administrator of the tailnet has to approve this device.')}</p>}
        {(ts.state === 'running' || ts.state === 'needs-approval') && ts.name && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {ts.tailnet && <Fact label={t('Tailnet')}>{ts.tailnet}</Fact>}
            <Fact label={t('Device')}>{ts.name}</Fact>
            {ts.addresses.length > 0 && <Fact label={t('Addresses')}>{ts.addresses.join(', ')}</Fact>}
            <Fact label="HTTPS">{ts.https ? t('Available') : t('Not enabled for this tailnet')}</Fact>
          </dl>
        )}
        {ts.state === 'running' && (
          <div className="grid gap-3 rounded-lg border p-3">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{t('Serve ColTex on the tailnet')}</span>
              <Switch checked={!!ts.servingUrl} disabled={busy} onCheckedChange={v => void run(() => api.tailscaleServe(v))} />
            </label>
            {ts.servingUrl && <AddressBox url={ts.servingUrl} />}
          </div>
        )}
        {ts.state === 'running' && (
          <div>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: t('Sign out of the tailnet?'),
                  description: t('ColTex leaves the tailnet and stops being reachable at its tailnet address. Signing in again adds it back.'),
                  confirmLabel: t('Sign out'),
                  destructive: true,
                })
                if (ok) void run(() => api.tailscaleLogout())
              }}
            >
              {t('Sign out of the tailnet')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * The tunnel token in what was pasted: "Run the following command" from the
 * Cloudflare dashboard, for any system (`cloudflared.exe service install
 * eyJ…`, `sudo cloudflared service install eyJ…`, `docker run … --token
 * eyJ…`), or the token alone. A token is base64 JSON with the account (a),
 * the tunnel (t) and its secret (s); the server checks the same.
 */
function readToken(pasted: string): { token: string; tunnel: string } | { problem: string } | null {
  const text = pasted.trim()
  if (!text) return null
  const token = /eyJ[A-Za-z0-9+/_=-]{40,}/.exec(text)?.[0]
  if (token) {
    try {
      const json = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/'))) as { a?: unknown; t?: unknown; s?: unknown }
      if (typeof json.a === 'string' && typeof json.t === 'string' && typeof json.s === 'string') return { token, tunnel: json.t }
    } catch {
      // Not a token: below.
    }
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return { problem: t('That is the tunnel ID, not the command. Copy the command under “Run the following command”.') }
  }
  return { problem: t('No tunnel token in this. Copy the command under “Run the following command” in the Cloudflare dashboard.') }
}

/** eyJhIjoi…k2In0= */
const masked = (token: string) => `${token.slice(0, 10)}…${token.slice(-6)}`

/**
 * Cloudflare Tunnel as a tunnel only (ColTex's own accounts sign people in):
 * a temporary trycloudflare.com link, or a tunnel with your own domain from
 * the Cloudflare dashboard.
 */
function CloudflareCard({ info, onChanged }: { info: NetworkInfo; onChanged: () => Promise<void> }) {
  const cf = info.cloudflare
  const [view, setView] = useState<'quick' | 'token'>(cf.mode ?? 'quick')
  const [pasted, setPasted] = useState('')
  const [replacing, setReplacing] = useState(false)
  /** Switched on here, before a kind of tunnel is picked (nothing runs yet). */
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const on = cf.enabled || opened
  const read = readToken(pasted)
  const found = read && 'token' in read ? read : null
  const run = async (body: CloudflareBody) => {
    setBusy(true)
    try {
      await api.cloudflare(body)
      setPasted('')
      setReplacing(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      await onChanged()
      setBusy(false)
    }
  }
  const active = cf.enabled && cf.mode === view
  const pasteBox = (
    <div className="grid gap-2">
      <Label htmlFor="cf-command">{t('The command under “Run the following command”')}</Label>
      <Textarea
        id="cf-command"
        value={pasted}
        onChange={e => setPasted(e.target.value)}
        placeholder="sudo cloudflared service install eyJhIjoi…"
        rows={3}
        spellCheck={false}
        className="font-mono text-xs break-all"
        aria-invalid={!!read && 'problem' in read}
      />
      {read && 'problem' in read && <p className="text-sm text-destructive">{read.problem}</p>}
      {found && (
        <div className="grid gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <span className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
            <CircleCheck className="size-4" /> {t('Token found')}
          </span>
          <span className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 text-muted-foreground">
            <span>{t('Tunnel')}</span>
            <span className="truncate font-mono text-foreground">{found.tunnel}</span>
            <span>{t('Token')}</span>
            <span className="truncate font-mono text-foreground">{masked(found.token)}</span>
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !found} onClick={() => found && void run({ enabled: true, mode: 'token', token: found.token })}>
          {busy && <Spinner />} {t('Connect the tunnel')}
        </Button>
        {replacing && (
          <Button variant="ghost" onClick={() => (setReplacing(false), setPasted(''))}>
            {t('Cancel')}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProviderIcon provider="cloudflare" className="size-5" />
          {CLOUDFLARE}
          {/* Switched on but nothing picked yet: no "Off" next to an on switch. */}
          {!(opened && !cf.enabled) && <StateBadge badge={CF_STATE[cf.state]} />}
          {busy && <Spinner className="size-3.5 text-muted-foreground" />}
        </CardTitle>
        {cf.state !== 'unavailable' && (
          <CardAction>
            <Switch
              checked={on}
              aria-label={CLOUDFLARE}
              disabled={busy}
              onCheckedChange={async v => {
                if (v) return setOpened(true)
                if (!cf.enabled) return (setOpened(false), setReplacing(false), setPasted(''))
                const ok = await confirmTurnOff(
                  CLOUDFLARE,
                  reachedThrough(cf.urls),
                  t('Its links stop working until it is turned on again. A saved tunnel stays saved.'),
                )
                if (!ok) return
                setOpened(false)
                void run({ enabled: false })
              }}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 empty:hidden">
        {cf.state === 'unavailable' ? (
          <p className="text-sm text-muted-foreground">{t('cloudflared is not installed on this server.')}</p>
        ) : !on ? null : (
          <>
            <div className="flex h-8 w-fit items-center rounded-md bg-muted p-0.5 text-sm" role="tablist" aria-label={t('Tunnel')}>
              {(
                [
                  ['quick', tk('Temporary link')],
                  ['token', tk('Tunnel with my domain')],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={view === m}
                  onClick={() => setView(m)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-[5px] px-3 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
                    view === m && 'bg-background font-medium text-foreground shadow-sm',
                  )}
                >
                  {t(label)}
                  {cf.enabled && cf.mode === m && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />}
                </button>
              ))}
            </div>

            {/* What this kind is doing, if it's the one running. */}
            {active && cf.state === 'starting' && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> {t('Connecting to Cloudflare…')}
              </p>
            )}
            {active && cf.state === 'error' && <Warning>{cf.error ?? t('The tunnel did not connect.')}</Warning>}
            {active && cf.state === 'connected' && cf.urls.map(url => <AddressBox key={url} url={url} label={view === 'quick' ? t('Temporary link') : t('Tunnel link')} />)}

            {view === 'quick' &&
              (active ? (
                <p className="text-xs text-muted-foreground">{t('Changes every time the tunnel starts.')}</p>
              ) : (
                <div>
                  <Button disabled={busy} onClick={() => void run({ enabled: true, mode: 'quick' })}>
                    {cf.enabled ? t('Switch to a temporary link') : t('Get a temporary link')}
                  </Button>
                </div>
              ))}

            {view === 'token' &&
              (active && !replacing ? (
                <div className="grid gap-3">
                  {cf.state === 'connected' && cf.urls.length === 0 && (
                    <Warning>{t('No public hostname yet: add one to the tunnel in the Cloudflare dashboard, pointing to http://localhost:3690.')}</Warning>
                  )}
                  {cf.tunnelId && (
                    <dl className="text-sm">
                      <Fact label={t('Tunnel')}>{cf.tunnelId}</Fact>
                    </dl>
                  )}
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
                      {t('Change the tunnel')}
                    </Button>
                  </div>
                </div>
              ) : cf.hasToken && !replacing ? (
                <div className="grid gap-3">
                  {cf.tunnelId && (
                    <dl className="text-sm">
                      <Fact label={t('Saved tunnel')}>{cf.tunnelId}</Fact>
                    </dl>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void run({ enabled: true, mode: 'token' })}>
                      {t('Use the saved tunnel')}
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => setReplacing(true)}>
                      {t('Connect a new tunnel')}
                    </Button>
                  </div>
                </div>
              ) : (
                pasteBox
              ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono">{children}</dd>
    </div>
  )
}

function RequestsCard({ info }: { info: NetworkInfo }) {
  const proxyWarning = info.forwarded && !info.trustProxy
  const [open, setOpen] = useState(proxyWarning)
  return (
    <Card className="gap-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center gap-2 text-left">
            <ChevronRight className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
            <CardTitle>{t('How requests arrive')}</CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-4 pt-5">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Fact label={t('Your IP as the server sees it')}>{info.clientIp}</Fact>
              <Fact label={t('Reverse proxy (TRUST_PROXY)')}>{info.trustProxy ?? t('Not set')}</Fact>
              <Fact label={t('Other trusted addresses (TRUSTED_ORIGINS)')}>{info.trustedOrigins.length ? info.trustedOrigins.join(', ') : '—'}</Fact>
            </dl>
            {proxyWarning && (
              <Warning>{t('Requests arrive through a proxy but TRUST_PROXY is not set: everyone looks like the proxy, so they share one sign-in rate limit.')}</Warning>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

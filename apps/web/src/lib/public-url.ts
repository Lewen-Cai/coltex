import { useEffect, useState } from 'react'
import type { LinkAddress } from '@coltex/shared'
import { api } from './api.ts'

/**
 * Where a link can point: what the server lists (COLTEX_URL, addresses added
 * in Settings → Network, the tailnet's while Tailscale serves ColTex) and
 * the address this browser is using, by kind. Links are offered for each, so
 * people on the LAN, on the tailnet or outside (FRP, a domain) each get one
 * they can open, and nothing needs resetting when Tailscale stops.
 */
export type LinkChoice = { url: string; kind: LinkAddress['kind'] | 'lan' | 'local' | 'here'; label: string }

/** Only this machine can open such an address. */
export const isLoopbackUrl = (url: string) => {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || /^127\./.test(host)
  } catch {
    return false
  }
}

/** What kind of address this is, judged by its host. */
export function addressKind(url: string): 'local' | 'lan' | 'tailnet' | 'here' {
  if (isLoopbackUrl(url)) return 'local'
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return 'here'
  }
  const v4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host)
  // Tailscale: MagicDNS names and its CGNAT range 100.64.0.0/10.
  if (host.endsWith('.ts.net') || (v4 && v4[1] === '100' && Number(v4[2]) >= 64 && Number(v4[2]) <= 127)) return 'tailnet'
  if (v4 && (v4[1] === '10' || (v4[1] === '172' && Number(v4[2]) >= 16 && Number(v4[2]) <= 31) || (v4[1] === '192' && v4[2] === '168'))) return 'lan'
  if (host.endsWith('.local') || /^\[f[cd]/i.test(host) || /^\[fe80/i.test(host)) return 'lan'
  return 'here'
}

/** The server's addresses plus this browser's, without duplicates; localhost only when there is nothing else. */
export function linkChoices(server: LinkAddress[], here = window.location.origin): LinkChoice[] {
  const list: LinkChoice[] = server.map(a => ({ ...a }))
  if (!list.some(a => a.url === here)) {
    const kind = addressKind(here)
    list.push({ url: here, kind: kind === 'tailnet' ? 'tailnet' : kind, label: kind === 'tailnet' ? 'Tailscale' : '' })
  }
  return list.some(a => a.kind !== 'local') ? list.filter(a => a.kind !== 'local') : list
}

/** The link choices, loaded from the server (undefined until then). */
export function useLinkChoices(): LinkChoice[] | undefined {
  const [choices, setChoices] = useState<LinkChoice[]>()
  useEffect(() => {
    let live = true
    api.instance().then(
      i => live && setChoices(linkChoices(i.addresses)),
      () => live && setChoices(linkChoices([])),
    )
    return () => {
      live = false
    }
  }, [])
  return choices
}

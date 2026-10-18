import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { copyText } from '@/lib/clipboard'
import { t } from '@/lib/i18n'
import { useLinkChoices, type LinkChoice } from '@/lib/public-url'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

/** What a choice is called (translated at render). */
export function choiceLabel(c: LinkChoice): string {
  if (c.kind === 'env') return t('Public address')
  if (c.kind === 'tailnet') return 'Tailscale'
  if (c.kind === 'cloudflare') return c.url.endsWith('.trycloudflare.com') ? t('Cloudflare (temporary)') : 'Cloudflare'
  if (c.kind === 'lan') return t('LAN')
  if (c.kind === 'local') return t('This computer')
  return t('This address')
}

/**
 * A link people pass on, once for every address ColTex can be reached at
 * (LAN, Tailscale, an FRP address or domain…), each with its own copy
 * button: the person picks the one the recipient can open.
 */
export function LinkList({ format, choices: given, copiedMessage, className }: { format: (base: string) => string; choices?: LinkChoice[]; copiedMessage?: string; className?: string }) {
  const loaded = useLinkChoices()
  const choices = given ?? loaded
  const [copied, setCopied] = useState<string>()
  if (!choices) return <Skeleton className="h-9 w-full" />
  const onlyLocal = choices.every(c => c.kind === 'local')
  return (
    <div className={cn('grid gap-1.5', className)}>
      {choices.map(c => {
        const text = format(c.url)
        return (
          <div key={c.url} className="flex min-w-0 items-center gap-2 rounded-md border bg-card py-1 pr-1 pl-1.5">
            <Badge variant="secondary" className="max-w-32 shrink-0 truncate font-normal">
              {choiceLabel(c)}
            </Badge>
            <span className="min-w-0 flex-1 truncate font-mono text-xs" title={text}>
              {text}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('Copy')}
              onClick={async () => {
                if (!(await copyText(text))) return toast.error('Could not copy; select the link and copy it by hand')
                setCopied(c.url)
                toast.success(copiedMessage ?? t('Copied'))
                window.setTimeout(() => setCopied(v => (v === c.url ? undefined : v)), 1500)
              }}
            >
              {copied === c.url ? <Check /> : <Copy />}
            </Button>
          </div>
        )
      })}
      {onlyLocal && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>{t('Only this computer can open a localhost link. Open ColTex at an address others can reach (a LAN IP, a public IP or a domain), or turn on Tailscale or Cloudflare Tunnel in Settings → Network.')}</span>
        </p>
      )}
    </div>
  )
}

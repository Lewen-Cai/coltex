import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import type { IpPlace, SignInEvent, SignInEventPage } from '@coltex/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { timeAgo } from '@/lib/format'
import { getLocale, intlLocale, t } from '@/lib/i18n'
import { placeNames, usePlaceNames, type PlaceNames } from '@/lib/ip-places'
import { COLUMN } from '@/lib/table'
import { deviceName } from '@/lib/user-agent'
import { cn } from '@/lib/utils'

/**
 * Where an address is, in the interface's language: "China, Guangdong, Shenzhen · China Telecom",
 * "中国 广东省 深圳市 · 电信", "Local network", "Tailscale", "This server". `names` are the
 * language's place names (`usePlaceNames`).
 */
export function placeText(place: IpPlace, names: PlaceNames | null | undefined): string | undefined {
  if (place.kind === 'lan') return t('Local network')
  if (place.kind === 'tailscale') return 'Tailscale'
  if (place.kind === 'loopback') return t('This server')
  const locale = getLocale()
  const { where, operator } = placeNames(place, locale, names ?? null)
  const joined = where.join(/^(zh|ja|ko)/.test(locale) ? ' ' : ', ')
  return [joined, operator].filter(Boolean).join(' · ') || undefined
}

/** An address with where it is: "203.0.113.5 · 中国 广东省 深圳市", "192.168.1.20 · Local network". */
export function addressText(ip: string | null, place: IpPlace, names: PlaceNames | null | undefined): string {
  return [ip, placeText(place, names)].filter(Boolean).join(' · ') || '—'
}

const exactTime = (at: string) => new Date(at).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'medium' })

function Outcome({ e }: { e: SignInEvent }) {
  const failed = 'border-red-300 text-red-700 dark:border-red-500/40 dark:text-red-300'
  const warning = 'border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300'
  switch (e.outcome) {
    case 'success':
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> {t('Signed in')}
          </Badge>
          {e.method === 'totp' && <span className="text-xs text-muted-foreground">{t('Authenticator app')}</span>}
          {e.method === 'recovery_code' && <span className="text-xs text-muted-foreground">{t('Recovery code')}</span>}
        </span>
      )
    case 'failure':
      return (
        <Badge variant="outline" className={failed}>
          {e.user ? t('Wrong password') : t('No such account')}
        </Badge>
      )
    case 'two_factor_failure':
      return (
        <Badge variant="outline" className={failed}>
          {t('Wrong code')}
        </Badge>
      )
    case 'refused':
      return (
        <Badge variant="outline" className={warning}>
          {e.reason === 'locked' ? t('Refused: account locked') : e.reason === 'ip_blocked' ? t('Refused: address blocked') : t('Refused: too many failures')}
        </Badge>
      )
    case 'locked':
      return (
        <Badge variant="outline" className={warning}>
          {t('Account locked')}
        </Badge>
      )
    case 'unlocked':
      return <Badge variant="outline">{t('Unlocked')}</Badge>
    case 'ip_blocked':
      return (
        <Badge variant="outline" className={warning}>
          {t('Address blocked for a day')}
        </Badge>
      )
  }
}

/**
 * A list of sign-ins, newest first, 50 at a time: one's own (Settings → Account), or for the
 * system administrator everyone's or one person's, with the person in a column of its own.
 */
export function SignInList({
  load,
  showPerson,
  onPerson,
}: {
  load: (before?: string) => Promise<SignInEventPage>
  showPerson?: boolean
  onPerson?: (e: SignInEvent) => void
}) {
  const [events, setEvents] = useState<SignInEvent[]>()
  const names = usePlaceNames(getLocale())
  const [hasMore, setHasMore] = useState(false)
  const [more, setMore] = useState(false)

  const first = useCallback(() => {
    load().then(
      page => {
        setEvents(page.events)
        setHasMore(page.hasMore)
      },
      e => toast.error((e as Error).message),
    )
  }, [load])
  useEffect(first, [first])

  const next = async () => {
    setMore(true)
    try {
      const page = await load(events?.at(-1)?.at)
      setEvents(list => [...(list ?? []), ...page.events])
      setHasMore(page.hasMore)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setMore(false)
    }
  }

  const columns = showPerson ? 5 : 4
  return (
    <div className="@container min-w-0">
      {/* Equal columns (table-fixed): long values are cut short, the full text is in their tooltip. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4 whitespace-nowrap">{t('When')}</TableHead>
            {showPerson && <TableHead className={COLUMN.gap}>{t('User')}</TableHead>}
            <TableHead className={COLUMN.gap}>{t('Result')}</TableHead>
            <TableHead className={cn(COLUMN.gap, '@max-[760px]:hidden')}>{t('Device')}</TableHead>
            <TableHead className={cn(COLUMN.gap, '@max-[640px]:hidden')}>{t('Address')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!events &&
            Array.from({ length: 3 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columns}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {events?.map((e, i) => (
            <motion.tr
              key={e.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.02 }}
              className="border-b transition-colors hover:bg-muted/40"
            >
              <TableCell className="pl-4 text-sm whitespace-nowrap text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{timeAgo(e.at)}</span>
                  </TooltipTrigger>
                  <TooltipContent>{exactTime(e.at)}</TooltipContent>
                </Tooltip>
              </TableCell>
              {showPerson && (
                <TableCell className={COLUMN.gap}>
                  {e.user && onPerson ? (
                    <button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => onPerson(e)}>
                      {e.user.name}
                    </button>
                  ) : (
                    <span className="block truncate font-medium">{e.user?.name}</span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">{e.email}</span>
                </TableCell>
              )}
              <TableCell className={COLUMN.gap}>
                <Outcome e={e} />
              </TableCell>
              <TableCell className={cn(COLUMN.gap, 'truncate text-sm @max-[760px]:hidden')} title={e.device ?? undefined}>
                {deviceName(e.device) ?? '—'}
              </TableCell>
              <TableCell className={cn(COLUMN.gap, '@max-[640px]:hidden')} title={addressText(e.ip, e.place, names)}>
                <span className="block truncate text-sm">{e.ip ?? '—'}</span>
                {placeText(e.place, names) && <span className="block truncate text-xs text-muted-foreground">{placeText(e.place, names)}</span>}
              </TableCell>
            </motion.tr>
          ))}
          {events && events.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns} className="py-10 text-center text-sm text-muted-foreground">
                {t('No sign-ins yet.')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex justify-center border-t p-3">
          <Button variant="ghost" size="sm" disabled={more} onClick={() => void next()}>
            {more && <Spinner />} {t('Show more')}
          </Button>
        </div>
      )}
    </div>
  )
}

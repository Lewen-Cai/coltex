import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Lock, LogOut, MonitorSmartphone, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import type { AccountSession, ManagedUser, SignInBlocks } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { SignInList, addressText } from '@/components/sign-in-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { getLocale, intlLocale, t } from '@/lib/i18n'
import { usePlaceNames } from '@/lib/ip-places'
import { navigate, useHashRoute } from '@/lib/router'
import { deviceName } from '@/lib/user-agent'

/** Locked accounts and blocked addresses, each with the button that opens it again. */
function Blocks({ blocks, onChange }: { blocks: SignInBlocks; onChange: () => void }) {
  const names = usePlaceNames(getLocale())
  if (!blocks.accounts.length && !blocks.addresses.length) return null
  const act = async (fn: () => Promise<void>, done: string) => {
    try {
      await fn()
      toast.success(done)
    } catch (e) {
      toast.error((e as Error).message)
    }
    onChange()
  }
  return (
    <Card className="mb-6 gap-0 py-0">
      <ul className="divide-y">
        {blocks.accounts.map(a => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <button type="button" className="min-w-0 text-left" onClick={() => navigate(`/admin/sign-ins?user=${a.id}`)}>
              <span className="block truncate font-medium hover:underline">{a.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
            </button>
            <span className="text-sm text-muted-foreground">{t('Locked {time}', { time: timeAgo(a.lockedAt) })}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => void act(() => api.unlockUser(a.id), t('Unlocked {name}', { name: a.name }))}>
              <Unlock /> {t('Unlock')}
            </Button>
          </li>
        ))}
        {blocks.addresses.map(a => (
          <li key={a.ip} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="min-w-0 truncate text-sm font-medium">{addressText(a.ip, a.place, names)}</span>
            <span className="text-sm text-muted-foreground">{t('Blocked until {time}', { time: new Date(a.until).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' }) })}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => void act(() => api.unblockAddress(a.ip), t('Unblocked {address}', { address: a.ip }))}>
              <Unlock /> {t('Unblock')}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** The devices someone is signed in on, each with its own sign-out. */
function Devices({ person }: { person: ManagedUser }) {
  const names = usePlaceNames(getLocale())
  const [sessions, setSessions] = useState<AccountSession[]>()
  const load = useCallback(() => api.userSessions(person.id).then(setSessions, e => toast.error((e as Error).message)), [person.id])
  useEffect(() => {
    void load()
  }, [load])

  const end = async (s?: AccountSession) => {
    const ok = await confirmDialog({
      title: s ? t('Sign out this device?') : t('Sign {name} out everywhere?', { name: person.name }),
      confirmLabel: t('Sign out'),
      destructive: true,
    })
    if (!ok) return
    try {
      await (s ? api.endSession(person.id, s.id) : api.endAllSessions(person.id))
    } catch (e) {
      toast.error((e as Error).message)
    }
    await load()
  }

  return (
    <Card className="mb-6 gap-0 pb-0">
      <CardHeader className="flex flex-row items-center pb-4">
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-muted-foreground" /> {t('Signed-in devices')}
        </CardTitle>
        {!!sessions?.length && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void end()}>
            <LogOut /> {t('Sign out everywhere')}
          </Button>
        )}
      </CardHeader>
      <ul className="divide-y border-t">
        {!sessions && (
          <li className="px-4 py-3">
            <Skeleton className="h-6 w-full" />
          </li>
        )}
        {sessions?.map(s => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="font-medium">{deviceName(s.device) ?? t('Unknown device')}</span>
            {s.current && <Badge variant="secondary">{t('This device')}</Badge>}
            {s.ip && <span className="text-muted-foreground">{addressText(s.ip, s.place, names)}</span>}
            <span className="text-muted-foreground">{t('Signed in {time}', { time: timeAgo(s.createdAt) })}</span>
            {!s.current && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void end(s)}>
                {t('Sign out')}
              </Button>
            )}
          </li>
        ))}
        {sessions?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">{t('Not signed in anywhere.')}</li>}
      </ul>
    </Card>
  )
}

/**
 * Administration → Sign-ins (the system administrator only): locked accounts and blocked
 * addresses, then everyone's sign-ins; with `?user=` one person's devices and sign-ins.
 */
export function AdminSignInsPage() {
  const route = useHashRoute()
  const userId = new URLSearchParams(route.split('?')[1]).get('user') ?? undefined
  const [failed, setFailed] = useState(false)
  const [blocks, setBlocks] = useState<SignInBlocks>()
  const [users, setUsers] = useState<ManagedUser[]>()

  const loadBlocks = useCallback(() => api.signInBlocks().then(setBlocks, e => toast.error((e as Error).message)), [])
  useEffect(() => {
    void loadBlocks()
    api.managedUsers().then(setUsers, () => setUsers([]))
  }, [loadBlocks])

  const person = useMemo(() => users?.find(u => u.id === userId), [users, userId])
  const locked = !!blocks?.accounts.some(a => a.id === userId)
  const load = useCallback((page: number) => api.signIns({ user: userId, failed, page }), [userId, failed])

  const unlock = async () => {
    try {
      await api.unlockUser(userId!)
      toast.success(t('Unlocked {name}', { name: person?.name ?? '' }))
    } catch (e) {
      toast.error((e as Error).message)
    }
    void loadBlocks()
  }

  return (
    <>
      {userId ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label={t('All sign-ins')} onClick={() => navigate('/admin/sign-ins')}>
            <ArrowLeft />
          </Button>
          {person && <UserAvatar id={person.id} name={person.name} className="shrink-0" />}
          <div className="min-w-0">
            <div className="truncate font-medium">{person?.name ?? userId}</div>
            <div className="truncate text-xs text-muted-foreground">{person?.email}</div>
          </div>
          {locked && (
            <>
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300">
                {t('Locked')}
              </Badge>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => void unlock()}>
                <Unlock /> {t('Unlock')}
              </Button>
            </>
          )}
        </div>
      ) : (
        blocks && <Blocks blocks={blocks} onChange={() => void loadBlocks()} />
      )}

      {userId && person && <Devices person={person} />}

      <div className="mb-4">
        <Tabs value={failed ? 'failed' : 'all'} onValueChange={v => setFailed(v === 'failed')}>
          <TabsList>
            <TabsTrigger value="all">{t('All')}</TabsTrigger>
            <TabsTrigger value="failed">{t('Failed')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <SignInList key={`${userId}:${failed}`} load={load} showPerson={!userId} onPerson={e => navigate(`/admin/sign-ins?user=${e.user!.id}`)} />
      </Card>
    </>
  )
}

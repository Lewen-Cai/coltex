import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Check, CheckCheck, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import type { Notification } from '@coltex/shared'
import { PageHeader } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { intlLocale, t } from '@/lib/i18n'
import {
  markRead,
  notificationExcerpt,
  notificationTitle,
  onNotification,
  openNotification,
  useUnreadNotifications,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'

/** Mentions, replies to comments, and projects shared with you, newest first. */
export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [list, setList] = useState<Notification[]>()
  const [users, setUsers] = useState<Record<string, string>>({})
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const unread = useUnreadNotifications()

  const load = useCallback(async (before?: string) => {
    const page = await api.notifications({ before, unread: filter === 'unread' })
    setUsers(u => ({ ...u, ...page.users }))
    setList(current => (before ? [...(current ?? []), ...page.notifications] : page.notifications))
    setHasMore(page.hasMore)
  }, [filter])

  useEffect(() => {
    setList(undefined)
    load().catch(e => toast.error((e as Error).message))
  }, [load])

  // New ones appear at the top while the page is open.
  useEffect(
    () =>
      onNotification((n, more) => {
        setUsers(u => ({ ...u, ...more }))
        setList(current => (current && !current.some(x => x.id === n.id) ? [n, ...current] : current))
      }),
    [],
  )

  const setRead = async (ids: string[] | undefined, read: boolean) => {
    try {
      await markRead(ids, read)
      setList(current => current?.map(n => (!ids || ids.includes(n.id) ? { ...n, read } : n)))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      await load(list?.at(-1)?.id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('Notifications')}
        actions={
          <Button variant="outline" onClick={() => void setRead(undefined, true)} disabled={unread === 0}>
            <CheckCheck /> {t('Mark all as read')}
          </Button>
        }
      />
      <Tabs value={filter} onValueChange={v => setFilter(v as 'all' | 'unread')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t('All')}</TabsTrigger>
          <TabsTrigger value="unread">
            {t('Unread')}
            {unread > 0 && <span className="ml-1.5 tabular-nums text-muted-foreground">{unread}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!list ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      ) : list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>{filter === 'unread' ? t('You’re all caught up') : t('No notifications yet')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {list.map((n, i) => (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: Math.min(i, 15) * 0.02 } }}
                >
                  <Row n={n} users={users} onRead={read => void setRead([n.id], read)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
      )}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore && <Spinner />} {t('Load more')}
          </Button>
        </div>
      )}
    </>
  )
}

function Row({ n, users, onRead }: { n: Notification; users: Record<string, string>; onRead: (read: boolean) => void }) {
  const excerpt = notificationExcerpt(n, users)
  return (
    <div className={cn('group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60', !n.read && 'bg-primary/[0.04]')}>
      <button type="button" onClick={() => openNotification(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className={cn('mt-3 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-label={n.read ? undefined : t('Unread')} />
        {n.project ? (
          <UserAvatar id={n.actor.id ?? n.id} name={n.actor.name} className="size-9" />
        ) : (
          // About the account itself, from no one in particular.
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <KeyRound className="size-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm', !n.read && 'font-medium')}>{notificationTitle(n)}</span>
          {excerpt && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{excerpt}</span>}
          <span className="mt-1 block text-[13px] text-muted-foreground">
            {n.project && `${n.project.name} · `}
            <time title={new Date(n.createdAt).toLocaleString(intlLocale())}>{timeAgo(n.createdAt)}</time>
          </span>
        </span>
      </button>
      {!n.read && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-primary" aria-label={t('Mark as read')} onClick={() => onRead(true)}>
              <Check />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Mark as read')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

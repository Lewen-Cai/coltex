import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import type { Notification, NotificationEvent, ProjectRole } from '@coltex/shared'
import { api } from './api.ts'
import { inSentence, t, tk } from './i18n.ts'
import { mentionsToText } from './mentions.ts'
import { navigate } from './router.ts'

/**
 * The signed-in person's notifications: the unread count (kept live over
 * server-sent events), a toast for each new one, and helpers to describe and
 * open them.
 */

let unread = 0
const countListeners = new Set<() => void>()
const arrivalListeners = new Set<(n: Notification, users: Record<string, string>) => void>()
/** Set by the editor: notifications about what is on screen there need no toast. */
let onScreen: ((n: Notification) => boolean) | null = null

function setUnread(n: number): void {
  if (n === unread) return
  unread = n
  for (const l of countListeners) l()
}

export function useUnreadNotifications(): number {
  return useSyncExternalStore(
    l => {
      countListeners.add(l)
      return () => countListeners.delete(l)
    },
    () => unread,
  )
}

/** Hear about notifications as they arrive (the notifications page prepends them). */
export function onNotification(listener: (n: Notification, users: Record<string, string>) => void): () => void {
  arrivalListeners.add(listener)
  return () => arrivalListeners.delete(listener)
}

export function setOnScreen(test: ((n: Notification) => boolean) | null): void {
  onScreen = test
}

export async function markRead(ids?: string[], read = true): Promise<void> {
  setUnread((await api.markNotificationsRead(ids, read)).unread)
}

/** Where a notification leads: the chat, the comment thread, or the project (the account settings for one about the account; a locked account's sign-ins). */
export function notificationHref(n: Notification): string {
  if (n.kind === 'account_locked') return n.actor.id ? `/admin/sign-ins?user=${n.actor.id}` : '/admin/sign-ins'
  if (!n.project) return '/settings'
  const base = `/project/${n.project.id}`
  if (n.threadId) return `${base}?thread=${n.threadId}`
  if (n.source === 'chat') return `${base}?chat`
  return base
}

export function openNotification(n: Notification): void {
  toast.dismiss(n.id)
  if (!n.read) void markRead([n.id]).catch(() => {})
  navigate(notificationHref(n))
}

const ROLE: Record<ProjectRole, string> = { owner: tk('Owner'), editor: tk('Can edit'), reviewer: tk('Can review'), viewer: tk('Can view') }

/** “Alice mentioned you in a comment on main.tex”. */
export function notificationTitle(n: Notification): string {
  const name = n.actor.id ? n.actor.name : t('Deleted user')
  const file = n.path ?? t('a deleted file')
  switch (n.kind) {
    case 'mention':
      return n.source === 'chat' ? t('{name} mentioned you in the chat', { name }) : t('{name} mentioned you in a comment on {file}', { name, file })
    case 'reply':
      return t('{name} replied to a comment on {file}', { name, file })
    case 'added':
      return t('{name} added you to this project ({role})', { name, role: inSentence(t(ROLE[n.role ?? 'viewer'])) })
    case 'owner':
      return t('{name} made you the owner of this project', { name })
    case 'password_reset':
      return t('Your password was reset from the server’s command line')
    case 'two_factor_reset':
      return t('Two-step verification was turned off for your account from the server’s command line')
    case 'account_locked':
      return t('{name}’s account was locked after too many failed sign-ins', { name })
  }
}

/** The message, with mentions as @Name. */
export function notificationExcerpt(n: Notification, users: Record<string, string>): string {
  return mentionsToText(n.excerpt, new Map(Object.entries(users))).replace(/\s+/g, ' ').trim()
}

/** Keep the unread count live and toast new notifications, while signed in. */
export function useNotificationStream(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return
    const source = new EventSource(api.notificationEventsUrl())
    source.onmessage = message => {
      const e = JSON.parse(message.data as string) as NotificationEvent
      setUnread(e.unread)
      if (!e.notification) return
      const n = e.notification
      const users = e.users ?? {}
      for (const l of arrivalListeners) l(n, users)
      if (onScreen?.(n)) return
      const excerpt = notificationExcerpt(n, users)
      const where = n.project?.name
      const short = excerpt.length > 120 ? `${excerpt.slice(0, 120)}…` : excerpt
      toast(notificationTitle(n), {
        id: n.id,
        description: [where, short].filter(Boolean).join(' · ') || undefined,
        action: { label: t('Open'), onClick: () => openNotification(n) },
      })
    }
    return () => source.close()
  }, [userId])
}

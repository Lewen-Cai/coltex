import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MessagesSquare, Pencil, SendHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatMessage, ProjectMember } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { intlLocale, t, translateServerMessage } from '../lib/i18n.ts'
import { renderMath, useKatex } from '../lib/katex.ts'
import { mentionsToText, textToMentions } from '../lib/mentions.ts'
import { cn } from '../lib/utils.ts'
import { confirmDialog } from './confirm.tsx'
import { Button } from './ui/button.tsx'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty.tsx'
import { Mention, MentionTextarea } from './mentions.tsx'
import { Spinner } from './ui/spinner.tsx'
import { UserAvatar } from './user-avatar.tsx'

/** Messages from one person within this long of each other share a header. */
const GROUP_GAP_MS = 5 * 60 * 1000

/** Mentions, $…$, $$…$$, \(…\), \[…\] and links, as in Overleaf's chat. */
const TOKEN = /(<@[A-Za-z0-9_-]{1,64}>|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$\n]+?\$|https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g
const HAS_MATH = /\$[^$]+\$|\\\(|\\\[/

function MessageText({ text, names, selfId, mine }: { text: string; names: ReadonlyMap<string, string>; selfId: string; mine: boolean }) {
  const katex = useKatex(HAS_MATH.test(text))
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const token = m[0]
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (token.startsWith('<@')) {
      const id = token.slice(2, -1)
      parts.push(<Mention key={m.index} name={names.get(id) ?? t('Someone')} self={id === selfId} onPrimary={mine} />)
    } else if (/^https?:/.test(token)) {
      parts.push(
        <a key={m.index} href={token} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
          {token}
        </a>,
      )
    } else {
      const display = token.startsWith('$$') || token.startsWith('\\[')
      const tex = token.startsWith('$$') ? token.slice(2, -2) : token.startsWith('$') ? token.slice(1, -1) : token.slice(2, -2)
      parts.push(
        katex ? (
          <span
            key={m.index}
            className={display ? 'my-1 block overflow-x-auto' : undefined}
            dangerouslySetInnerHTML={{ __html: renderMath(katex, tex, display) }}
          />
        ) : (
          <code key={m.index}>{token}</code>
        ),
      )
    }
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span className="break-words whitespace-pre-wrap">{parts}</span>
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t('Today')
  if (d.toDateString() === yesterday.toDateString()) return t('Yesterday')
  return d.toLocaleDateString(intlLocale(), { year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric', month: 'long', day: 'numeric' })
}

const time = (iso: string) => new Date(iso).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })

export function ChatPanel({
  projectId,
  userId,
  messages,
  hasMore,
  error,
  members,
  onLoadOlder,
  onChanged,
  onClose,
}: {
  projectId: string
  userId: string
  /** The project's members, for mentions. */
  members: ProjectMember[]
  messages: ChatMessage[] | undefined
  hasMore: boolean
  error?: string
  onLoadOlder: () => Promise<void>
  onChanged: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string }>()
  const [loadingOlder, setLoadingOlder] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const keepOffset = useRef<number>(undefined)
  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const msg of messages ?? []) if (msg.userId) m.set(msg.userId, msg.userName)
    for (const p of members) m.set(p.userId, p.name)
    return m
  }, [messages, members])
  const people = useMemo(() => members.filter(p => p.userId !== userId), [members, userId])

  // Follow new messages while scrolled to the bottom; keep the view still when older ones are prepended.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (keepOffset.current !== undefined) {
      el.scrollTop = el.scrollHeight - keepOffset.current
      keepOffset.current = undefined
    } else if (atBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await api.sendChat(projectId, textToMentions(text, people))
      setDraft('')
      atBottom.current = true
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    const text = editing.text.trim()
    if (!text) return
    try {
      await api.editChat(projectId, editing.id, textToMentions(text, people))
      setEditing(undefined)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async (m: ChatMessage) => {
    const ok = await confirmDialog({
      title: t('Delete this message?'),
      description: t('It is removed for everyone in the project.'),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.deleteChat(projectId, m.id)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const loadOlder = async () => {
    const el = scroller.current
    if (el) keepOffset.current = el.scrollHeight - el.scrollTop
    setLoadingOlder(true)
    try {
      await onLoadOlder()
    } catch (e) {
      keepOffset.current = undefined
      toast.error((e as Error).message)
    } finally {
      setLoadingOlder(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex h-full flex-col">

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        onScroll={e => {
          const el = e.currentTarget
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
      >
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        {!messages ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessagesSquare />
              </EmptyMedia>
              <EmptyTitle>{t('No messages yet')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {hasMore && (
              <div className="mb-3 flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder}>
                  {loadingOlder && <Spinner />} {t('Load earlier messages')}
                </Button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const prev = messages[i - 1]
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
                const grouped =
                  !newDay && prev?.userId === m.userId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS
                const mine = m.userId === userId
                const name = m.userId ? m.userName : translateServerMessage(m.userName)
                return (
                  // One keyed element per message (date line included): AnimatePresence can't track fragments.
                  <motion.div
                    key={m.id}
                    layout="position"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {newDay && (
                      <div className="my-3 flex items-center gap-2 text-[13px] text-muted-foreground">
                        <span className="h-px flex-1 bg-border" />
                        {dayLabel(m.createdAt)}
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div className={cn('group flex gap-2', mine && 'flex-row-reverse', grouped ? 'mt-0.5' : 'mt-3')}>
                      <div className="w-7 shrink-0">{!grouped && <UserAvatar id={m.userId ?? m.id} name={name} className="size-7 text-[11px]" />}</div>
                      <div className={cn('flex min-w-0 max-w-[85%] flex-col', mine && 'items-end')}>
                        {!grouped && (
                          <div className={cn('mb-0.5 flex items-baseline gap-1.5 text-sm', mine && 'flex-row-reverse')}>
                            <span className="font-medium">{mine ? t('You') : name}</span>
                            <span className="text-muted-foreground">{time(m.createdAt)}</span>
                          </div>
                        )}
                        {editing?.id === m.id ? (
                          <div className="w-64 max-w-full">
                            <MentionTextarea
                              autoFocus
                              people={people}
                              value={editing.text}
                              onValueChange={text => setEditing({ id: m.id, text })}
                              onKeyDown={e => {
                                if (e.key === 'Escape') setEditing(undefined)
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                  e.preventDefault()
                                  void saveEdit()
                                }
                              }}
                              className="min-h-16 text-sm"
                            />
                            <div className="mt-1 flex justify-end gap-1">
                              <Button size="xs" variant="ghost" onClick={() => setEditing(undefined)}>
                                {t('Cancel')}
                              </Button>
                              <Button size="xs" onClick={() => void saveEdit()} disabled={!editing.text.trim()}>
                                {t('Save')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={cn('flex items-center gap-1', mine && 'flex-row-reverse')}>
                            <div
                              title={new Date(m.createdAt).toLocaleString(intlLocale())}
                              className={cn(
                                'rounded-2xl px-3 py-1.5 text-sm',
                                mine ? 'rounded-tr-md bg-primary text-primary-foreground [&_a]:text-primary-foreground' : 'rounded-tl-md bg-muted',
                                grouped && (mine ? 'rounded-tr-2xl' : 'rounded-tl-2xl'),
                              )}
                            >
                              <MessageText text={m.content} names={names} selfId={userId} mine={mine} />
                              {m.editedAt && <span className="ml-1.5 text-[11px] opacity-70">{t('(edited)')}</span>}
                            </div>
                            {mine && (
                              <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <Button variant="ghost" size="icon-xs" onClick={() => setEditing({ id: m.id, text: mentionsToText(m.content, names) })} aria-label={t('Edit message')}>
                                  <Pencil />
                                </Button>
                                <Button variant="ghost" size="icon-xs" onClick={() => void remove(m)} aria-label={t('Delete message')}>
                                  <Trash2 />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </>
        )}
      </div>

      <div className="shrink-0 border-t p-2">
        <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <MentionTextarea
            people={people}
            value={draft}
            onValueChange={setDraft}
            onKeyDown={onKey}
            placeholder={t('Message everyone in the project…')}
            rows={1}
            className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button size="icon-sm" onClick={() => void send()} disabled={!draft.trim() || sending} aria-label={t('Send')}>
            {sending ? <Spinner /> : <SendHorizontal />}
          </Button>
        </div>
      </div>
    </div>
  )
}

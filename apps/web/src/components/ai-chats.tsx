import { useEffect, useState, type FormEvent } from 'react'
import { compactTokens } from '../lib/ai-limits.ts'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import type { AiConversation } from '@coltex/shared'
import { confirmDialog } from './confirm.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { Input } from './ui/input.tsx'
import { Skeleton } from './ui/skeleton.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'
import { timeAgo } from '../lib/format.ts'
import { plural, t } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'

/** 12.3k, 200k, 1M: token counts, the same in every language. */
export const tokens = compactTokens

/** How much of the model's context the conversation takes: a ring and the numbers. */
export function ContextMeter({ used, window }: { used: number | null; window: number | null }) {
  if (!window) return null
  const share = used === null ? null : Math.min(1, used / window)
  const tone = share === null ? 'text-muted-foreground' : share >= 0.9 ? 'text-destructive' : share >= 0.7 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
  const r = 6
  const circumference = 2 * Math.PI * r
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 tabular-nums" aria-label={t('Context')}>
          <svg viewBox="0 0 16 16" className={cn('size-3.5 -rotate-90', tone)} aria-hidden>
            <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="2.5" />
            {share !== null && (
              <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${share * circumference} ${circumference}`} strokeLinecap="round" />
            )}
          </svg>
          {used === null ? '—' : tokens(used)} / {tokens(window)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {used === null
          ? t('Context window: {window} tokens', { window: window.toLocaleString() })
          : t('Context: {used} of {window} tokens ({share}%)', { used: used.toLocaleString(), window: window.toLocaleString(), share: Math.round((share ?? 0) * 100) })}
      </TooltipContent>
    </Tooltip>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: () => Promise<AiConversation[]>
  onPick: (id: string) => void
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

/** This project's previous chats (the person's own): open one, rename or delete it. */
export function ChatsDialog({ open, onOpenChange, list, onPick, onRename, onDelete }: Props) {
  const [chats, setChats] = useState<AiConversation[]>()
  const [editing, setEditing] = useState<string>()
  const [title, setTitle] = useState('')
  const reload = () => list().then(setChats, () => setChats([]))
  useEffect(() => {
    if (!open) return
    setChats(undefined)
    setEditing(undefined)
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = async (e: FormEvent, id: string) => {
    e.preventDefault()
    if (title.trim()) await onRename(id, title.trim())
    setEditing(undefined)
    await reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(36rem,85vh)] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Chats')}</DialogTitle>
        </DialogHeader>
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto">
          {!chats && (
            <div className="grid gap-2 px-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          )}
          {chats?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t('No chats yet.')}</p>}
          <ul className="grid gap-0.5">
            {chats?.map(c => (
              <li key={c.id} className="group flex items-center gap-1 rounded-md px-2 hover:bg-muted/60">
                {editing === c.id ? (
                  <form className="flex flex-1 items-center gap-2 py-1.5" onSubmit={e => void save(e, c.id)}>
                    <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus maxLength={120} className="h-8" onKeyDown={e => e.key === 'Escape' && (e.stopPropagation(), setEditing(undefined))} />
                    <Button type="submit" size="sm">
                      {t('Save')}
                    </Button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
                      onClick={() => {
                        onOpenChange(false)
                        if (!c.current) onPick(c.id)
                      }}
                    >
                      <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                      <span className="grid min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{c.title}</span>
                          {c.current && (
                            <Badge variant="secondary" className="shrink-0 font-normal">
                              {t('Current')}
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {plural(c.messages, '{n} message', '{n} messages')} · {timeAgo(c.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t('Rename')} onClick={() => (setEditing(c.id), setTitle(c.title))}>
                            <Pencil />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('Rename')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Delete')}
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: t('Delete this chat?'),
                                description: c.title,
                                confirmLabel: t('Delete'),
                                destructive: true,
                              })
                              if (!ok) return
                              await onDelete(c.id)
                              await reload()
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('Delete')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

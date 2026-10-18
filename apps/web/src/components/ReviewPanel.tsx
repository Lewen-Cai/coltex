import { createContext, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  CheckCheck,
  ChevronRight,
  Ellipsis,
  FileText,
  MessageSquare,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
  X,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ResolvedChange, ResolvedReview } from '@coltex/review'
import type { CommentThread, ProjectMember, ReviewState, TrackChangesState } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { plural, t } from '../lib/i18n.ts'
import { timeAgo } from '../lib/format.ts'
import { mentionsToText, textToMentions, type Mentionable } from '../lib/mentions.ts'
import type { ReviewFocus } from '../lib/review-extension.ts'
import { cn } from '../lib/utils.ts'
import { confirmDialog } from './confirm.tsx'
import { MentionText, MentionTextarea, mentionPreview } from './mentions.tsx'
import { Button } from './ui/button.tsx'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'
import { Switch } from './ui/switch.tsx'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'
import { UserAvatar } from './user-avatar.tsx'

/** A comment being written: the range, its anchors (taken when the composer opened) and the quoted text. */
export type CommentDraft = { docId: string; from: number; to: number; start: object; end: object; quote: string }

/** Names for showing mentions, and who can be mentioned, for every card in the panel. */
const MentionContext = createContext<{ names: ReadonlyMap<string, string>; people: readonly Mentionable[]; selfId: string }>({
  names: new Map(),
  people: [],
  selfId: '',
})

type Props = {
  projectId: string
  userId: string
  /** The project's members, for names and mentions. */
  members: ProjectMember[]
  canEdit: boolean
  state?: ReviewState
  reload: () => Promise<void>
  /** The file open in the editor. */
  doc?: { docId: string; path: string }
  /** Live positions in the open file, straight from its Yjs document. */
  live?: ResolvedReview
  lineOf: (pos: number) => number
  /** Comments and changes under the cursor. */
  focus: ReviewFocus
  draft: CommentDraft | null
  onDraftDone: () => void
  tracking: boolean
  /** Reviewers' edits are always tracked; they can't switch it. */
  reviewer?: boolean
  /** Select a range in the open file. */
  onSelect: (from: number, to: number, id: string) => void
  /** Open another file at a line. */
  onOpenFile: (path: string, line?: number) => void
  /** Highlight an item in the editor while the pointer is over its card. */
  onHover: (id: string | null) => void
  onClose: () => void
}

type ChangeEntry = {
  kind: 'change'
  key: string
  from: number
  to: number
  ids: string[]
  userId: string
  ts: number
  deleted?: string
  inserted?: string
}
type ThreadEntry = { kind: 'thread'; key: string; from: number; to: number; thread: CommentThread }
type Entry = ChangeEntry | ThreadEntry

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n)}…` : s)
/** Changed text for a card: line breaks stay visible as ↵ instead of blank lines. */
const shown = (s: string, n?: number) => clip(s, n).replace(/\n/g, '↵ ')

/** A deletion and an insertion by the same person at the same spot read as one replacement. */
function changeEntries(changes: readonly ResolvedChange[]): ChangeEntry[] {
  const used = new Set<string>()
  const out: ChangeEntry[] = []
  for (const c of changes) {
    if (used.has(c.id)) continue
    used.add(c.id)
    if (c.type === 'delete') {
      const ins = changes.find(i => i.type === 'insert' && !used.has(i.id) && i.userId === c.userId && i.from === c.from)
      if (ins) used.add(ins.id)
      out.push({
        kind: 'change',
        key: c.id,
        from: c.from,
        to: ins?.to ?? c.to,
        ids: ins ? [c.id, ins.id] : [c.id],
        userId: c.userId,
        ts: Math.max(c.ts, ins?.ts ?? 0),
        deleted: c.text,
        inserted: ins?.text,
      })
    } else {
      const del = changes.find(d => d.type === 'delete' && !used.has(d.id) && d.userId === c.userId && d.from === c.from)
      if (del) used.add(del.id)
      out.push({
        kind: 'change',
        key: c.id,
        from: c.from,
        to: c.to,
        ids: del ? [del.id, c.id] : [c.id],
        userId: c.userId,
        ts: Math.max(c.ts, del?.ts ?? 0),
        deleted: del?.text,
        inserted: c.text,
      })
    }
  }
  return out
}

export function ReviewPanel(props: Props) {
  const { projectId, state, doc, live, focus, draft, canEdit } = props
  const [tab, setTab] = useState<'file' | 'all'>('file')
  const { members } = props
  const listRef = useRef<HTMLDivElement>(null)

  // The overview reads tracked changes from the server, which aren't pushed while people type.
  useEffect(() => {
    if (tab !== 'all') return
    void props.reload().catch(() => {})
    const timer = setInterval(() => void props.reload().catch(() => {}), 10_000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // A new comment is written in "This file".
  useEffect(() => {
    if (draft) setTab('file')
  }, [draft])

  const names = useMemo(() => {
    const m = new Map<string, string>(Object.entries(state?.users ?? {}))
    for (const p of members) m.set(p.userId, p.name)
    return m
  }, [state?.users, members])
  const nameOf = (id: string | null) => (id && names.get(id)) || t('Someone')
  const mentions = useMemo(
    () => ({ names, people: members.filter(p => p.userId !== props.userId), selfId: props.userId }),
    [names, members, props.userId],
  )

  const openThreads = useMemo(() => state?.threads.filter(th => !th.resolved) ?? [], [state])
  const resolvedThreads = useMemo(() => state?.threads.filter(th => th.resolved) ?? [], [state])

  const fileEntries = useMemo<Entry[]>(() => {
    if (!doc) return []
    const changes = changeEntries(live?.changes ?? [])
    const threads: ThreadEntry[] = openThreads
      .filter(th => th.docId === doc.docId)
      .map(th => {
        const c = live?.comments.find(x => x.id === th.id)
        return { kind: 'thread', key: th.id, from: c?.from ?? Number.MAX_SAFE_INTEGER, to: c?.to ?? Number.MAX_SAFE_INTEGER, thread: th }
      })
    return [...changes, ...threads].sort((a, b) => a.from - b.from || (a.kind === 'thread' ? 1 : -1))
  }, [doc, live, openThreads])

  const focused = new Set([...focus.threadIds, ...focus.changeIds])
  const isFocused = (e: Entry) => (e.kind === 'thread' ? focused.has(e.thread.id) : e.ids.some(id => focused.has(id)))

  // Bring the card for the text under the cursor into view.
  const focusKey = [...focused].join()
  useEffect(() => {
    if (!focusKey) return
    listRef.current?.querySelector('[data-focused="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusKey])

  const fileChangeIds = (live?.changes ?? []).map(c => c.id)
  const allChanges = state?.changes ?? []
  const totalOpen = openThreads.length + allChanges.filter(c => c.docId !== doc?.docId).length + fileChangeIds.length

  /** `scope` names what a bulk decision covers, for its confirmation. */
  const decide = async (decision: 'accept' | 'reject', target: { docId?: string; ids?: string[] }, scope?: 'file' | 'project') => {
    if (!target.ids || target.ids.length > 1) {
      const accept = decision === 'accept'
      if (
        !target.ids &&
        !(await confirmDialog({
          title:
            scope === 'file'
              ? accept
                ? t('Accept all changes in this file?')
                : t('Reject all changes in this file?')
              : accept
                ? t('Accept all changes in the project?')
                : t('Reject all changes in the project?'),
          description: accept
            ? t('The changes stay in the text and their markers are removed.')
            : t('Insertions are removed and deleted text is restored. The previous state is kept in the history.'),
          confirmLabel: accept ? t('Accept all') : t('Reject all'),
          destructive: decision === 'reject',
        }))
      ) {
        return
      }
    }
    try {
      const { count, undoId } = await api.decideChanges(projectId, decision, target)
      // Every decision can be taken back for a while: a misclick shouldn't need the history.
      toast.success(
        decision === 'accept'
          ? plural(count, 'Accepted {n} change', 'Accepted {n} changes')
          : plural(count, 'Rejected {n} change', 'Rejected {n} changes'),
        undoId
          ? {
              action: {
                label: t('Undo'),
                onClick: async () => {
                  try {
                    await api.undoDecision(projectId, undoId)
                    await props.reload()
                  } catch (e) {
                    toast.error((e as Error).message)
                  }
                },
              },
            }
          : undefined,
      )
      await props.reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <MentionContext.Provider value={mentions}>
      <div className="flex h-full flex-col">
        <header className="flex h-11 shrink-0 items-center justify-center gap-2 border-b px-3">
          <TrackChangesMenu
            projectId={projectId}
            canEdit={canEdit}
            value={state?.trackChanges}
            members={members}
            tracking={props.tracking}
            reviewer={props.reviewer}
            onChanged={props.reload}
          />
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <Tabs value={tab} onValueChange={v => setTab(v as 'file' | 'all')} className="min-w-0 flex-1">
            <TabsList className="h-8 w-full">
              <TabsTrigger value="file" className="gap-1.5 text-sm">
                {t('This file')}
                <span className="tabular-nums text-muted-foreground">{fileEntries.length}</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5 text-sm">
                {t('All files')}
                <span className="tabular-nums text-muted-foreground">{totalOpen}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {canEdit && (tab === 'file' ? fileChangeIds.length > 0 : allChanges.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CheckCheck /> {t('All')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={() => void decide('accept', tab === 'file' ? { docId: doc?.docId } : {}, tab === 'file' ? 'file' : 'project')}
                >
                  <Check className="text-emerald-600 dark:text-emerald-400" /> {tab === 'file' ? t('Accept all in this file') : t('Accept all changes')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void decide('reject', tab === 'file' ? { docId: doc?.docId } : {}, tab === 'file' ? 'file' : 'project')}
                >
                  <X /> {tab === 'file' ? t('Reject all in this file') : t('Reject all changes')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3" onMouseLeave={() => props.onHover(null)}>
          <AnimatePresence initial={false}>
            {draft && tab === 'file' && (
              <motion.div key="draft" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <NewComment projectId={projectId} draft={draft} onDone={props.onDraftDone} reload={props.reload} />
              </motion.div>
            )}
          </AnimatePresence>

          {tab === 'file' ? (
            <>
              {!doc && <EmptyState icon={FileText} text={t('Open a file to see its comments and changes.')} />}
              {doc && fileEntries.length === 0 && !draft && (
                <EmptyState
                  icon={MessageSquare}
                  text={
                    props.tracking
                      ? t('Nothing to review here yet. Your edits are being tracked.')
                      : t('No comments or tracked changes in this file.')
                  }
                />
              )}
              {fileEntries.map((e, i) => (
                <motion.div
                  key={e.key}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.02, duration: 0.18 }}
                  data-focused={isFocused(e)}
                  onMouseEnter={() => props.onHover(e.kind === 'thread' ? e.thread.id : e.ids[e.ids.length - 1]!)}
                >
                  {e.kind === 'change' ? (
                    <ChangeCard
                      entry={e}
                      name={nameOf(e.userId)}
                      line={props.lineOf(e.from + (e.inserted?.match(/^\n*/)?.[0].length ?? 0))}
                      active={isFocused(e)}
                      canEdit={canEdit}
                      mine={e.userId === props.userId}
                      onSelect={() => props.onSelect(e.from, e.to, e.ids[0]!)}
                      onDecide={d => void decide(d, { docId: doc!.docId, ids: e.ids })}
                    />
                  ) : (
                    <ThreadCard
                      projectId={projectId}
                      thread={e.thread}
                      userId={props.userId}
                      canEdit={canEdit}
                      active={isFocused(e)}
                      line={e.from === Number.MAX_SAFE_INTEGER ? null : props.lineOf(e.from)}
                      onSelect={() => e.from !== Number.MAX_SAFE_INTEGER && props.onSelect(e.from, e.to, e.thread.id)}
                      reload={props.reload}
                    />
                  )}
                </motion.div>
              ))}
            </>
          ) : (
            <Overview
              state={state}
              openThreads={openThreads}
              onOpen={(path, line) => props.onOpenFile(path, line)}
              canEdit={canEdit}
              onDecide={(d, docId, ids) => void decide(d, { docId, ids })}
            />
          )}

          {resolvedThreads.length > 0 && (
            <Collapsible className="pt-2">
              <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                {t('Resolved comments')}
                <span className="tabular-nums">{resolvedThreads.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {resolvedThreads.map(th => (
                  <ResolvedCard
                    key={th.id}
                    projectId={projectId}
                    thread={th}
                    userId={props.userId}
                    canEdit={canEdit}
                    onOpen={() => props.onOpenFile(th.path, th.line ?? undefined)}
                    reload={props.reload}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </MentionContext.Provider>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof MessageSquare; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
      <span className="rounded-full bg-muted p-3">
        <Icon className="size-5" />
      </span>
      {text}
    </div>
  )
}

function CardShell({ active, children, onClick, accent }: { active: boolean; children: ReactNode; onClick?: () => void; accent?: string }) {
  return (
    <div
      onClick={onClick}
      style={accent ? ({ '--accent-color': accent } as React.CSSProperties) : undefined}
      className={cn(
        'group/card relative cursor-pointer rounded-lg border bg-card p-2.5 shadow-xs transition-[box-shadow,border-color]',
        accent && 'border-l-[3px] border-l-[var(--accent-color)]',
        active ? 'border-primary/50 shadow-md ring-2 ring-primary/15' : 'hover:shadow-sm',
      )}
    >
      {children}
    </div>
  )
}

function Who({ id, name, at, extra }: { id: string | null; name: string; at: string | number; extra?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar id={id ?? name} name={name} className="size-6" />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-[13px] text-muted-foreground">
          {timeAgo(new Date(at))}
          {extra}
        </div>
      </div>
    </div>
  )
}

function ChangeCard({
  entry,
  name,
  line,
  active,
  canEdit,
  mine,
  onSelect,
  onDecide,
}: {
  entry: ChangeEntry
  name: string
  line: number
  active: boolean
  canEdit: boolean
  /** Your own suggestion: you can withdraw it even when you can't decide (reviewers). */
  mine: boolean
  onSelect: () => void
  onDecide: (d: 'accept' | 'reject') => void
}) {
  const verb = entry.deleted !== undefined && entry.inserted !== undefined ? t('Replaced') : entry.inserted !== undefined ? t('Added') : t('Deleted')
  return (
    <CardShell active={active} onClick={onSelect}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Who id={entry.userId} name={name} at={entry.ts} extra={` · ${t('line {line}', { line })}`} />
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-0.5" onClick={e => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
                  onClick={() => onDecide('accept')}
                  aria-label={t('Accept')}
                >
                  <Check />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Accept')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                  onClick={() => onDecide('reject')}
                  aria-label={t('Reject')}
                >
                  <X />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Reject')}</TooltipContent>
            </Tooltip>
          </div>
        )}
        {!canEdit && mine && (
          <div className="flex shrink-0" onClick={e => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" onClick={() => onDecide('reject')} aria-label={t('Withdraw')}>
                  <Undo2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Withdraw')}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      <div className="mt-2 text-sm leading-relaxed">
        <span className="mr-1 font-medium text-muted-foreground">{verb}</span>
        {entry.deleted !== undefined && (
          <del className="rounded bg-red-500/10 px-0.5 whitespace-pre-wrap break-words text-red-700 decoration-red-500/70 dark:text-red-400">{shown(entry.deleted)}</del>
        )}
        {entry.deleted !== undefined && entry.inserted !== undefined && <span className="mx-1 text-muted-foreground">→</span>}
        {entry.inserted !== undefined && (
          <ins className="rounded bg-emerald-500/10 px-0.5 whitespace-pre-wrap break-words text-emerald-800 no-underline dark:text-emerald-300">{shown(entry.inserted)}</ins>
        )}
      </div>
    </CardShell>
  )
}

/** Enter sends, Shift+Enter adds a line. */
function onEnterSend(e: KeyboardEvent<HTMLTextAreaElement>, send: () => void) {
  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault()
    send()
  }
}

function NewComment({ projectId, draft, onDone, reload }: { projectId: string; draft: CommentDraft; onDone: () => void; reload: () => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const { people } = useContext(MentionContext)
  const send = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await api.createThread(projectId, { docId: draft.docId, start: draft.start, end: draft.end, content: textToMentions(text.trim(), people) })
      await reload()
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="rounded-lg border border-primary/40 bg-card p-2.5 shadow-md ring-2 ring-primary/10">
      <Quote text={draft.quote} />
      <MentionTextarea
        autoFocus
        people={people}
        value={text}
        onValueChange={setText}
        onKeyDown={e => {
          if (e.key === 'Escape') onDone()
          else onEnterSend(e, () => void send())
        }}
        placeholder={t('Add a comment…')}
        className="mt-2 min-h-16 resize-none text-sm"
      />
      <div className="mt-2 flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button size="sm" onClick={() => void send()} disabled={!text.trim() || busy}>
          <Send /> {t('Comment')}
        </Button>
      </div>
    </div>
  )
}

function Quote({ text }: { text: string }) {
  return text ? (
    <div className="line-clamp-2 border-l-2 border-amber-400 pl-2 font-mono text-[13px] leading-snug text-muted-foreground">{text}</div>
  ) : (
    <div className="border-l-2 border-muted-foreground/30 pl-2 text-[13px] italic text-muted-foreground">{t('The commented text was deleted')}</div>
  )
}

function Message({
  projectId,
  threadId,
  m,
  mine,
  canDelete,
  reload,
}: {
  projectId: string
  threadId: string
  m: CommentThread['messages'][number]
  mine: boolean
  canDelete: boolean
  reload: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const { names, people, selfId } = useContext(MentionContext)
  const save = async () => {
    if (!text.trim()) return
    try {
      await api.editMessage(projectId, threadId, m.id, textToMentions(text.trim(), people))
      setEditing(false)
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const remove = async () => {
    if (!(await confirmDialog({ title: t('Delete this message?'), confirmLabel: t('Delete'), destructive: true }))) return
    try {
      await api.deleteMessage(projectId, threadId, m.id)
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <div className="group/msg">
      <div className="flex items-start justify-between gap-2">
        <Who id={m.userId} name={m.name} at={m.createdAt} extra={m.editedAt ? ` · ${t('edited')}` : undefined} />
        {(mine || canDelete) && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover/msg:opacity-100 data-[state=open]:opacity-100" aria-label={t('Message actions')}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              {mine && (
                <DropdownMenuItem
                  onSelect={() => {
                    setText(mentionsToText(m.content, names))
                    setEditing(true)
                  }}
                >
                  <Pencil /> {t('Edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => void remove()}>
                <Trash2 /> {t('Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {editing ? (
        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
          <MentionTextarea
            autoFocus
            people={people}
            value={text}
            onValueChange={setText}
            onKeyDown={e => {
              if (e.key === 'Escape') setEditing(false)
              else onEnterSend(e, () => void save())
            }}
            className="min-h-12 resize-none text-sm"
          />
          <div className="mt-1.5 flex justify-end gap-1">
            <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
              {t('Cancel')}
            </Button>
            <Button size="xs" onClick={() => void save()}>
              {t('Save')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 pl-8 text-sm whitespace-pre-wrap break-words">
          <MentionText content={m.content} names={names} selfId={selfId} />
        </p>
      )}
    </div>
  )
}

function ThreadCard({
  projectId,
  thread,
  userId,
  canEdit,
  active,
  line,
  onSelect,
  reload,
}: {
  projectId: string
  thread: CommentThread
  userId: string
  canEdit: boolean
  active: boolean
  line: number | null
  onSelect: () => void
  reload: () => Promise<void>
}) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const { people } = useContext(MentionContext)
  const canModerate = canEdit || thread.createdBy === userId

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const send = () => {
    const content = reply.trim()
    if (!content || busy) return
    void act(async () => {
      await api.replyThread(projectId, thread.id, textToMentions(content, people))
      setReply('')
    })
  }
  const remove = async () => {
    const ok = await confirmDialog({
      title: t('Delete this comment thread?'),
      description: t('All replies are deleted too.'),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return
    void act(() => api.deleteThread(projectId, thread.id))
  }

  return (
    <CardShell active={active} onClick={onSelect} accent="var(--review-comment)">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Quote text={thread.quote} />
        </div>
        {line !== null && <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">L{line}</span>}
        {canModerate && (
          <div className="-mt-1 flex shrink-0 gap-0.5" onClick={e => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" disabled={busy} onClick={() => void act(() => api.resolveThread(projectId, thread.id, true))} aria-label={t('Resolve')}>
                  <CheckCheck />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Resolve')}</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={t('Thread actions')}>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void act(() => api.resolveThread(projectId, thread.id, true))}>
                  <CheckCheck /> {t('Resolve')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void remove()}>
                  <Trash2 /> {t('Delete thread')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {thread.messages.map(m => (
          <Message key={m.id} projectId={projectId} threadId={thread.id} m={m} mine={m.userId === userId} canDelete={canEdit} reload={reload} />
        ))}
      </div>
      <div className="mt-2.5 flex items-end gap-1.5" onClick={e => e.stopPropagation()}>
        <MentionTextarea
          people={people}
          value={reply}
          onValueChange={setReply}
          onKeyDown={e => onEnterSend(e, send)}
          placeholder={t('Reply…')}
          rows={1}
          className="min-h-8 resize-none py-1.5 text-sm"
        />
        <Button size="icon-sm" variant={reply.trim() ? 'default' : 'ghost'} disabled={!reply.trim() || busy} onClick={send} aria-label={t('Send reply')}>
          <Send />
        </Button>
      </div>
    </CardShell>
  )
}

function ResolvedCard({
  projectId,
  thread,
  userId,
  canEdit,
  onOpen,
  reload,
}: {
  projectId: string
  thread: CommentThread
  userId: string
  canEdit: boolean
  onOpen: () => void
  reload: () => Promise<void>
}) {
  const canModerate = canEdit || thread.createdBy === userId
  const first = thread.messages[0]
  const { names } = useContext(MentionContext)
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <div className="rounded-lg border border-dashed bg-card/70 p-2.5 text-sm opacity-90">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-1.5 text-left text-[13px] text-muted-foreground hover:text-foreground">
        <FileText className="size-3" />
        <span className="truncate font-mono">{thread.path}</span>
        {thread.line !== null && <span className="tabular-nums">:{thread.line}</span>}
      </button>
      <div className="mt-1.5">
        <Quote text={thread.quote} />
      </div>
      {first && (
        <p className="mt-1.5 line-clamp-2 text-sm">
          <span className="font-medium">{first.name}:</span> {mentionPreview(first.content, names)}
          {thread.messages.length > 1 && <span className="text-muted-foreground"> (+{thread.messages.length - 1})</span>}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <span className="flex-1 text-[13px] text-muted-foreground">
          {t('Resolved by {name}', { name: thread.resolved?.name ?? '' })} · {thread.resolved && timeAgo(thread.resolved.at)}
        </span>
        {canModerate && (
          <>
            <Button variant="ghost" size="xs" onClick={() => void act(() => api.resolveThread(projectId, thread.id, false))}>
              <RotateCcw /> {t('Reopen')}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('Delete thread')}
              onClick={async () => {
                if (await confirmDialog({ title: t('Delete this comment thread?'), confirmLabel: t('Delete'), destructive: true }))
                  void act(() => api.deleteThread(projectId, thread.id))
              }}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/** Every file with open comments or tracked changes, from the server. */
function Overview({
  state,
  openThreads,
  onOpen,
  canEdit,
  onDecide,
}: {
  state?: ReviewState
  openThreads: CommentThread[]
  onOpen: (path: string, line?: number) => void
  canEdit: boolean
  onDecide: (d: 'accept' | 'reject', docId: string, ids?: string[]) => void
}) {
  const { names } = useContext(MentionContext)
  const groups = useMemo(() => {
    const m = new Map<string, { path: string; docId: string; rows: { line: number; node: ReactNode; key: string }[] }>()
    const group = (docId: string, path: string) => {
      let g = m.get(docId)
      if (!g) m.set(docId, (g = { path, docId, rows: [] }))
      return g
    }
    for (const c of state?.changes ?? []) {
      group(c.docId, c.path).rows.push({
        key: c.id,
        line: c.line,
        node: (
          <>
            <span className={cn('size-1.5 shrink-0 rounded-full', c.type === 'insert' ? 'bg-emerald-500' : 'bg-red-500')} />
            <span className="truncate">
              <span className="text-muted-foreground">{c.name} </span>
              {c.type === 'insert' ? (
                <ins className="text-emerald-800 no-underline dark:text-emerald-300">{shown(c.text, 80)}</ins>
              ) : (
                <del className="text-red-700 dark:text-red-400">{shown(c.text, 80)}</del>
              )}
            </span>
          </>
        ),
      })
    }
    for (const th of openThreads) {
      const first = th.messages[0]
      group(th.docId, th.path).rows.push({
        key: th.id,
        line: th.line ?? Number.MAX_SAFE_INTEGER,
        node: (
          <>
            <MessageSquare className="size-3.5 shrink-0 text-amber-500" />
            <span className="truncate">
              <span className="text-muted-foreground">{first?.name} </span>
              {first && mentionPreview(first.content, names)}
              {th.messages.length > 1 && (
                <span className="text-muted-foreground"> · {plural(th.messages.length - 1, '{n} reply', '{n} replies')}</span>
              )}
            </span>
          </>
        ),
      })
    }
    return [...m.values()].map(g => ({ ...g, rows: g.rows.sort((a, b) => a.line - b.line) })).sort((a, b) => a.path.localeCompare(b.path))
  }, [state, openThreads, names])

  if (!state) return null
  if (groups.length === 0) return <EmptyState icon={CheckCheck} text={t('Nothing to review in this project.')} />
  return (
    <div className="space-y-2">
      {groups.map((g, i) => (
        <motion.div
          key={g.docId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 10) * 0.03 }}
          className="overflow-hidden rounded-lg border bg-card shadow-xs"
        >
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-2.5 py-1.5">
            <FileText className="size-3.5 text-primary" />
            <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{g.path}</span>
            {canEdit && (state.changes.some(c => c.docId === g.docId)) && (
              <>
                <Button variant="ghost" size="icon-xs" className="text-emerald-600 dark:text-emerald-400" aria-label={t('Accept all in this file')} onClick={() => onDecide('accept', g.docId)}>
                  <Check />
                </Button>
                <Button variant="ghost" size="icon-xs" className="text-red-600 dark:text-red-400" aria-label={t('Reject all in this file')} onClick={() => onDecide('reject', g.docId)}>
                  <X />
                </Button>
              </>
            )}
          </div>
          <ul className="divide-y">
            {g.rows.map(r => (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => onOpen(g.path, r.line === Number.MAX_SAFE_INTEGER ? undefined : r.line)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent/60"
                >
                  <span className="w-8 shrink-0 text-right font-mono text-[13px] text-muted-foreground tabular-nums">
                    {r.line === Number.MAX_SAFE_INTEGER ? '–' : r.line}
                  </span>
                  {r.node}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  )
}

/** Who has track changes on. Editors can switch it for everyone or per person. */
function TrackChangesMenu({
  projectId,
  canEdit,
  value,
  members,
  tracking,
  reviewer,
  onChanged,
}: {
  projectId: string
  canEdit: boolean
  value?: TrackChangesState
  members: ProjectMember[]
  tracking: boolean
  reviewer?: boolean
  onChanged: () => Promise<void>
}) {
  const save = async (next: TrackChangesState) => {
    try {
      await api.setTrackChanges(projectId, next)
      await onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const v = value ?? { everyone: false, users: [] }
  const writers = members.filter(m => m.role === 'owner' || m.role === 'editor')
  const reviewers = members.filter(m => m.role === 'reviewer')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-7 gap-1.5 text-sm', tracking && 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300')}>
          <span className={cn('size-2 rounded-full', tracking ? 'bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20' : 'bg-muted-foreground/40')} />
          {t('Track changes')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b p-3">
          <div className="text-sm font-semibold">{t('Track changes')}</div>
        </div>
        <div className="space-y-1 p-2">
          <label className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
            <span className="flex-1 text-sm font-medium">{t('For everyone')}</span>
            <Switch checked={v.everyone} disabled={!canEdit} onCheckedChange={everyone => void save({ ...v, everyone })} />
          </label>
          {writers.map(m => {
            const on = v.everyone || v.users.includes(m.userId)
            return (
              <label key={m.userId} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                <UserAvatar id={m.userId} name={m.name} className="size-6" />
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                <Switch
                  checked={on}
                  disabled={!canEdit || v.everyone}
                  onCheckedChange={checked =>
                    void save({ ...v, users: checked ? [...v.users, m.userId] : v.users.filter(id => id !== m.userId) })
                  }
                />
              </label>
            )
          })}
          {reviewers.length > 0 && (
            <p className="px-2 pt-1 text-sm text-muted-foreground">
              {t('Always tracked (reviewers): {names}', { names: reviewers.map(m => m.name).join(', ') })}
            </p>
          )}
          {!canEdit && (
            <p className="px-2 pb-1 text-sm text-muted-foreground">
              {reviewer ? t('As a reviewer, your edits are always tracked.') : t('Only editors can change this.')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

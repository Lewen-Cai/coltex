import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FolderTree,
  Languages,
  PenLine,
  Search,
  Wrench,
  FileDiff,
  History,
  Loader2,
  SquarePen,
  TextSelect,
  CircleAlert,
  Copy,
  type LucideIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Undo2,
  Wand2,
  } from 'lucide-react'
import { motion } from 'motion/react'
import type { AiAllowance, AiItem, AiPermission, AiModelInfo, AiPreference, AiSessionState, AiSkillBody, AiSkillSummary, AiStatus, SkillSource, ThinkingLevel } from '@coltex/shared'
import { aiPick, type AiSessionHandle } from '../lib/ai.ts'
import { CURRENT_PERIOD, allowanceShare, compactTokens, dollars, useAiAllowance } from '../lib/ai-limits.ts'
import { PERMISSIONS, PERMISSION_TITLE, useAiPermission } from '../lib/ai-permission.ts'
import { ApiError } from '../lib/api.ts'
import { ChatsDialog, ContextMeter, tokens } from './ai-chats.tsx'
import { confirmDialog } from './confirm.tsx'
import { intlLocale, plural, t, tk, translateServerMessage } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'
import { AiReview, type ReviewScope } from './AiReview.tsx'
import { Markdown } from './Markdown.tsx'
import { SkillEditor } from './skills/skill-editor.tsx'
import { ProviderIcon } from './provider-icon.tsx'
import { toast } from 'sonner'
import { copyText } from '../lib/clipboard.ts'
import { Button } from './ui/button.tsx'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'
import { useComposerHeight } from './composer-height.tsx'

export type AiContextInfo = {
  /** Errors in the latest compile, offered as context. */
  errors: number
  /** The editor's current selection, if any. */
  selection?: { path: string; fromLine: number; toLine: number }
}

type Props = {
  session: AiSessionHandle
  /** The models this person may use and their current pick. */
  status: AiStatus
  onChoose: (pick: AiPreference) => void
  context: AiContextInfo
  onSend: (text: string, include: { errors: boolean; selection: boolean }, skill?: string) => void
  onApplied: (result: Awaited<ReturnType<AiSessionHandle['apply']>>) => void
  onUndone: (result: Awaited<ReturnType<AiSessionHandle['undo']>>) => void
  onOpenFile: (path: string) => void
  onClose: () => void
  /** Editors can apply drafts; everyone else asks questions only. */
  canEdit: boolean
  reviewing: boolean
  setReviewing: (v: boolean) => void
}

export function AiPanel(props: Props) {
  const { session, status, context, onSend, reviewing, setReviewing } = props
  const [scope, setScope] = useState<ReviewScope>('all')
  const review = (next: ReviewScope) => {
    setScope(next)
    setReviewing(true)
  }
  const { state, error, busy } = session
  const [text, setText] = useState('')
  const box = useComposerHeight('ai', text)
  const [withErrors, setWithErrors] = useState(true)
  const [withSelection, setWithSelection] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)
  const running = state?.running ?? false
  // Asked again after each answer, so the meter follows.
  const allowance = useAiAllowance(running)
  const [permission, setPermission] = useAiPermission()
  const permissionChoice: PermissionChoice | undefined = props.canEdit && permission ? { value: permission, onChoose: p => void setPermission(p) } : undefined
  const limited = !!allowance?.exceeded
  const changes = state?.changes
  const changed = changes?.files.length ?? 0
  const latestTurnCard = state?.items.findLast(i => i.kind === 'changes')?.id
  const [chatsOpen, setChatsOpen] = useState(false)
  /** The highlighted entry of the "/" menu. */
  const [command, setCommand] = useState(0)

  /** Leaving this chat drops its draft (drafts aren't saved with the conversation): ask first. */
  const leave = async (): Promise<boolean> =>
    !changed ||
    confirmDialog({
      title: t('Leave this chat?'),
      description: plural(changed, 'Its draft changes ({n} file) are not kept.', 'Its draft changes ({n} files) are not kept.'),
      confirmLabel: t('Discard draft'),
      destructive: true,
    })
  const newChat = async () => {
    if (await leave()) await session.reset()
  }
  const commands: SlashEntry[] = SLASH_COMMANDS.filter(c => !running || c.whileRunning).map(c => ({
    name: c.name,
    label: t(c.label),
    run: () => {
      setText('')
      if (c.name === 'compact') void session.compact(aiPick(status))
      else if (c.name === 'new') void newChat()
      else setChatsOpen(true)
    },
  }))
  // The "/" menu: while the message is a single word starting with "/".
  const slash = /^\/(\S*)$/.exec(text)
  // Skills join the menu; fetched at first and each time it opens, so new ones show without a reload.
  const [skills, setSkills] = useState<AiSkillSummary[]>([])
  const menuOpen = !!slash
  useEffect(() => {
    session.skillMenu().then(setSkills, () => setSkills([]))
  }, [menuOpen, session.skillMenu])
  const skillEntries: SlashEntry[] = running
    ? []
    : skills.map(s => ({ name: s.name, label: s.description, source: s.scope, run: () => setText(`/${s.name} `) }))
  const matches = slash ? [...commands, ...skillEntries].filter(c => c.name.startsWith(slash[1]!.toLowerCase())) : []
  useEffect(() => setCommand(0), [slash?.[1]])

  // Stick to the bottom while the conversation grows.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.items])

  // Leave the review once the draft is gone (applied, discarded or reset).
  useEffect(() => {
    if (reviewing && !changed) setReviewing(false)
  }, [changed, reviewing, setReviewing])

  const submit = (message = text) => {
    const trimmed = message.trim()
    if (!trimmed || running || limited) return
    const typed = commands.find(c => `/${c.name}` === trimmed.toLowerCase())
    if (typed) return typed.run()
    // `/skill the rest`: the skill's instructions go with the rest of the message.
    const invoked = /^\/([a-z0-9-]+)(?:\s+([\s\S]*))?$/.exec(trimmed)
    const skill = invoked && skills.some(s => s.name === invoked[1]) ? invoked[1] : undefined
    onSend(skill ? (invoked![2] ?? '').trim() : trimmed, { errors: withErrors && context.errors > 0, selection: withSelection && !!context.selection }, skill)
    setText('')
  }

  if (reviewing && state && changed) {
    return (
      <AiReview
        changes={state.changes}
        scope={scope}
        onScopeChange={setScope}
        busy={busy}
        error={error}
        onBack={() => setReviewing(false)}
        onDiscard={() => void session.discard()}
        onApply={async files => {
          const result = await session.apply({ files })
          if (result) props.onApplied(result)
        }}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-center gap-1 border-b border-border px-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => void newChat()} disabled={busy || !state?.items.length}>
          <SquarePen /> {t('New chat')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setChatsOpen(true)} disabled={busy}>
          <History /> {t('Chats')}
        </Button>
      </div>
      <ChatsDialog
        open={chatsOpen}
        onOpenChange={setChatsOpen}
        list={session.conversations}
        onPick={async id => {
          if (await leave()) await session.open(id)
        }}
        onRename={async (id, title) => void (await session.rename(id, title))}
        onDelete={async id => {
          // Deleting the open chat drops its draft too.
          if (id === state?.id && !(await leave())) return
          await session.remove(id)
        }}
      />

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {state && state.items.length === 0 && (
          <EmptyState
            errors={context.errors}
            hasSelection={!!context.selection}
            canEdit={props.canEdit}
            onPick={prompt => submit(prompt)}
          />
        )}
        {state &&
          groupItems(state.items).map(entry =>
            entry.kind === 'tools' ? (
              <ToolGroup key={entry.id} items={entry.items} onOpenFile={props.onOpenFile} />
            ) : (
              <Item
                key={entry.item.id}
                item={entry.item}
                onSaveSkill={(body, replace) => session.saveSkill(entry.item.id, { ...body, replace }).then(() => undefined)}
                onOpenFile={props.onOpenFile}
                // Only the latest card can show its diff: the draft has moved on since older turns.
                onReviewTurn={entry.item.id === latestTurnCard && changed && state.changes.turn ? () => review('turn') : undefined}
              />
            ),
          )}
        {running && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> {t('Working…')}
          </div>
        )}
      </div>

      {error && <div className="border-t border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm break-words text-destructive">{error}</div>}

      {state?.lastApplied && !changed && (
        <div className="flex items-center gap-2 border-t border-border bg-accent px-3 py-1.5 text-sm text-emerald-800 dark:text-emerald-300">
          <Check className="size-3.5" />
          <span className="flex-1 truncate">{t('Applied to {files}', { files: state.lastApplied.files.join(', ') })}</span>
          <Button variant="ghost" size="xs" disabled={busy || running} onClick={async () => props.onUndone(await session.undo())}>
            <Undo2 /> {t('Undo')}
          </Button>
        </div>
      )}

      {changes && changed > 0 && (
        <DraftCard state={state!} running={running} busy={busy} onReview={() => review('all')} onDiscard={() => void session.discard()} />
      )}

      <div className="shrink-0 border-t border-border p-2">
        {(context.errors > 0 || context.selection) && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {context.errors > 0 && (
              <Chip active={withErrors} icon={CircleAlert} onClick={() => setWithErrors(v => !v)}>
                {plural(context.errors, '{n} compile error', '{n} compile errors')}
              </Chip>
            )}
            {context.selection && (
              <Chip active={withSelection} icon={TextSelect} onClick={() => setWithSelection(v => !v)}>
                {context.selection.path} L{context.selection.fromLine}
                {context.selection.toLine !== context.selection.fromLine ? `–${context.selection.toLine}` : ''}
              </Chip>
            )}
          </div>
        )}
        <div className="relative rounded-lg border border-border bg-background transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          {box.handle}
          {matches.length > 0 && (
            <div role="listbox" aria-label={t('Commands')} className="absolute inset-x-0 bottom-full z-10 mb-1.5 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
              {matches.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  role="option"
                  aria-selected={i === command}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setCommand(i)}
                  onClick={c.run}
                  className={cn('flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm', i === command && 'bg-accent text-accent-foreground')}
                >
                  <span className="shrink-0 font-mono">/{c.name}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c.label}</span>
                  {c.source === 'builtin' && <span className="shrink-0 text-xs text-muted-foreground">{t('Built-in')}</span>}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (matches.length > 0 && !e.nativeEvent.isComposing) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setCommand(i => (i + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  matches[command]?.run()
                  return
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setText('')
                  return
                }
              }
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            ref={box.ref}
            style={box.style}
            placeholder={t('Ask about LaTeX, your project, or your writing…')}
            className="block min-h-0 w-full bg-transparent px-2.5 pt-2 text-sm outline-none"
          />
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            <ModelPicker status={status} onChoose={props.onChoose} permission={permissionChoice} />
            <span className="flex-1" />
            {running ? (
              <Button variant="secondary" size="icon-sm" onClick={() => void session.abort()} aria-label={t('Stop')}>
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button size="icon-sm" onClick={() => submit()} disabled={!text.trim() || busy || limited} aria-label={t('Send')}>
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
        <SessionStatus status={status} state={state} allowance={allowance} permission={permissionChoice?.value} />
      </div>
    </div>
  )
}

type SlashEntry = { name: string; label: string; source?: SkillSource; run: () => void }

/** The "/" commands built in; the person's and the project's skills follow them in the menu. */
const SLASH_COMMANDS: { name: 'compact' | 'new' | 'chats'; label: string; whileRunning: boolean }[] = [
  { name: 'compact', label: tk('Summarise the chat to free its context'), whileRunning: false },
  { name: 'new', label: tk('Start a new chat'), whileRunning: false },
  { name: 'chats', label: tk('Previous chats'), whileRunning: true },
]

/**
 * Under the composer: how hard the model thinks (when it can and isn't on
 * Auto, which picks per message) and how full the context is. The picker
 * above shows the model only.
 */
export function SessionStatus({
  status,
  state,
  allowance,
  permission,
  className,
}: {
  status: AiStatus
  state: AiSessionState | undefined
  allowance?: AiAllowance | null
  permission?: AiPermission
  className?: string
}) {
  const auto = status.auto.on
  const model = status.model
  const thinking = !auto && !!model && model.thinkingLevels.length >= 2
  // The model the conversation last used; else the one the next message goes to.
  const window = state?.model?.contextWindow ?? (auto ? status.auto.strong?.contextWindow : model?.contextWindow) ?? null
  const used = state?.contextTokens ?? (state && state.items.length === 0 ? 0 : null)
  if (!thinking && !window && !allowance && !permission) return null
  const PermissionIcon = permission && PERMISSION_ICON[permission]
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1.5 text-xs text-muted-foreground', className)}>
      {allowance?.exceeded && (
        <span className="basis-full text-destructive">
          {t('You have reached your AI usage limit. It resets on {date}.', {
            date: new Date(allowance.resetsAt).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' }),
          })}
        </span>
      )}
      {thinking && (
        <span className="flex items-center gap-1">
          <Brain className="size-3" />
          {t('Thinking: {level}', { level: t(THINKING_LABEL[status.thinkingLevel]) })}
        </span>
      )}
      {permission && PermissionIcon && (
        <span className={cn('flex items-center gap-1', permission === 'full' && 'text-amber-700 dark:text-amber-400')}>
          <PermissionIcon className="size-3" />
          {t('Permission: {permission}', { permission: t(PERMISSION_TITLE[permission]) })}
        </span>
      )}
      <span className="flex-1" />
      {allowance && <AllowanceMeter allowance={allowance} />}
      <ContextMeter used={used} window={window} />
    </div>
  )
}

/** What the person has used of their AI group's limit this period: a small bar and the tighter of the two. */
function AllowanceMeter({ allowance: a }: { allowance: AiAllowance }) {
  const share = allowanceShare(a)
  const tone = a.exceeded || share >= 0.9 ? 'bg-destructive' : share >= 0.7 ? 'bg-amber-500' : 'bg-primary'
  const byCost = a.cost !== null && (a.tokens === null || a.usedCost / a.cost >= a.usedTokens / a.tokens)
  const resets = new Date(a.resetsAt).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 tabular-nums" aria-label={t('AI usage')}>
          {t(CURRENT_PERIOD[a.period])}
          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-muted">
            <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.max(4, share * 100)}%` }} />
          </span>
          {byCost ? `${dollars(a.usedCost)} / ${dollars(a.cost!)}` : `${compactTokens(a.usedTokens)} / ${compactTokens(a.tokens!)}`}
        </span>
      </TooltipTrigger>
      <TooltipContent className="grid gap-0.5">
        <span>{t('AI usage')}</span>
        {a.tokens !== null && <span>{t('{used} of {limit} tokens', { used: a.usedTokens.toLocaleString(intlLocale()), limit: a.tokens.toLocaleString(intlLocale()) })}</span>}
        {a.cost !== null && <span>{t('{used} of {limit}', { used: dollars(a.usedCost), limit: dollars(a.cost) })}</span>}
        <span>{t('Resets on {date}', { date: resets })}</span>
      </TooltipContent>
    </Tooltip>
  )
}

type Suggestion = { text: string; icon: typeof Sparkles }

function EmptyState({
  errors,
  hasSelection,
  canEdit,
  onPick,
}: {
  errors: number
  hasSelection: boolean
  canEdit: boolean
  onPick: (prompt: string) => void
}) {
  const contextual: Suggestion[] = [
    ...(errors > 0
      ? [
          ...(canEdit ? [{ text: t('Fix the compile errors.'), icon: Wrench }] : []),
          { text: t('Explain what these errors mean.'), icon: CircleHelp },
        ]
      : []),
    ...(hasSelection
      ? [
          { text: t('Explain the selected LaTeX.'), icon: CircleHelp },
          { text: t('How could the wording of the selection be clearer?'), icon: PenLine },
          { text: t('Translate the selection into English.'), icon: Languages },
        ]
      : []),
  ]
  const general: Suggestion[] = [
    { text: t('Give me an overview of this project: files, packages and structure.'), icon: FolderTree },
    { text: t('How do I make a figure or table span both columns?'), icon: BookOpen },
    { text: t('Are there labels that are never referenced, or references to missing labels?'), icon: Search },
    { text: t('What options does the document class support?'), icon: BookOpen },
  ]
  const pick = (list: Suggestion[], offset: number) =>
    list.map((s, i) => (
      <motion.button
        key={s.text}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (offset + i) * 0.04 }}
        onClick={() => onPick(s.text)}
        className="group flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left text-sm text-foreground/85 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent"
      >
        <s.icon className="size-3.5 shrink-0 text-primary/80" />
        <span className="flex-1">{s.text}</span>
      </motion.button>
    ))
  return (
    <div className="space-y-4 pt-4">
      <div className="text-center">
        <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Sparkles className="size-5" />
        </span>
        <p className="font-semibold">{t('Ask anything')}</p>
      </div>
      {contextual.length > 0 && (
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-muted-foreground">{t('For what you’re looking at')}</p>
          {pick(contextual, 0)}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="px-1 text-[13px] font-medium text-muted-foreground">{t('Try asking')}</p>
        {pick(general, contextual.length)}
      </div>
    </div>
  )
}

/** Context sent with the message; click to leave it out or put it back. */
function Chip({ active, icon: Icon, onClick, children }: { active: boolean; icon: LucideIcon; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
        active ? 'border-primary/30 bg-accent text-accent-foreground' : 'border-border text-muted-foreground line-through hover:text-foreground',
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  )
}

function DraftCard(props: { state: AiSessionState; running: boolean; busy: boolean; onReview: () => void; onDiscard: () => void }) {
  const { files, trial } = props.state.changes
  return (
    <div className="shrink-0 border-t border-primary/30 bg-accent px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <FileDiff className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate">
            <span className="font-medium text-accent-foreground">
              {plural(files.length, '{n} file changed', '{n} files changed')}
            </span>
            {trial && (
              <span className={trial.errors ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                {' · '}
                {trial.errors ? plural(trial.errors, 'test build: {n} error', 'test build: {n} errors') : t('test build: no errors')}
              </span>
            )}
          </div>
          <div className="truncate text-accent-foreground">{files.map(f => f.path).join(', ')}</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" size="sm" onClick={props.onDiscard} disabled={props.running || props.busy}>
            {t('Discard')}
          </Button>
          <Button size="sm" onClick={props.onReview} disabled={props.running}>
            {t('Review')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * What one turn changed: files in the draft with lines added and removed,
 * and files deleted or moved in the project (full access).
 */
function TurnCard({ item, onOpenFile, onReview }: { item: Extract<AiItem, { kind: 'changes' }>; onOpenFile: (path: string) => void; onReview?: () => void }) {
  const label = { modified: '', created: t('new file'), reverted: t('undone'), deleted: t('deleted'), moved: t('moved') }
  const inDraft = item.files.every(f => f.kind !== 'deleted' && f.kind !== 'moved')
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card text-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <FileDiff className="size-4 text-muted-foreground" />
        <span className="flex-1 font-medium">
          {inDraft
            ? plural(item.files.length, 'Changed {n} file in the draft', 'Changed {n} files in the draft')
            : plural(item.files.length, 'Changed {n} file', 'Changed {n} files')}
        </span>
        {onReview && (
          <Button variant="ghost" size="xs" className="text-primary" onClick={onReview}>
            {t('View diff')}
          </Button>
        )}
      </div>
      <ul className="divide-y">
        {item.files.map(f => (
          <li key={`${f.kind}:${f.path}`} className="flex items-center gap-2 px-3 py-1.5">
            {f.kind === 'deleted' ? (
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted-foreground line-through">{f.path}</span>
            ) : (
              <button type="button" className="min-w-0 flex-1 truncate text-left font-mono text-[13px] hover:underline" onClick={() => onOpenFile(f.to ?? f.path)}>
                {f.kind === 'moved' ? `${f.path} → ${f.to}` : f.path}
              </button>
            )}
            {label[f.kind] && <span className="text-[13px] text-muted-foreground">{label[f.kind]}</span>}
            {f.kind !== 'deleted' && f.kind !== 'moved' && (
              <>
                <span className="font-mono text-[13px] tabular-nums text-emerald-600 dark:text-emerald-400">+{f.added}</span>
                <span className="font-mono text-[13px] tabular-nums text-red-600 dark:text-red-400">−{f.removed}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export type SaveDraftedSkill = (body: AiSkillBody, replace: boolean) => Promise<void>

/** A skill the agent drafted: saved to the person's skills only when they save it (as it is, or edited). */
function SkillCard({ item, onSave }: { item: Extract<AiItem, { kind: 'skill' }>; onSave: SaveDraftedSkill }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const files = Object.keys(item.files ?? {})
  /** Saving under a name already taken replaces that skill, once the person agrees. False: they didn't. */
  const saveAs = async (body: AiSkillBody): Promise<void | false> => {
    try {
      await onSave(body, false)
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 409) throw e
      const ok = await confirmDialog({ title: t('Replace your skill “{name}”?', { name: body.name }), confirmLabel: t('Replace') })
      if (!ok) return false
      await onSave(body, true)
    }
    toast.success(t('Saved to your skills'))
  }
  const save = async () => {
    setSaving(true)
    try {
      await saveAs({ name: item.name, description: item.description, body: item.body })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card text-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono font-medium">{item.name}</span>
        {item.saved ? (
          <span className="flex items-center gap-1 text-[13px] text-emerald-700 dark:text-emerald-400">
            <Check className="size-3.5" />
            {t('In your skills')}
          </span>
        ) : (
          <Button variant="ghost" size="xs" className="text-primary" onClick={() => setEditing(true)}>
            {t('Edit')}
          </Button>
        )}
      </div>
      <div className="grid gap-1 px-3 py-2">
        <p className="text-muted-foreground">{item.description}</p>
        <pre className="max-h-40 overflow-y-auto rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[13px] whitespace-pre-wrap">{item.body}</pre>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {files.map(f => (
              <span key={f} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
      {!item.saved && (
        <div className="flex flex-wrap justify-end gap-1.5 border-t px-3 py-2">
          <Button size="xs" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="animate-spin" />}
            {t('Save to my skills')}
          </Button>
        </div>
      )}
      <SkillEditor
        open={editing}
        onOpenChange={setEditing}
        title={t('Save skill')}
        initial={item}
        files={Object.entries(item.files ?? {}).map(([path, text]) => ({ path, size: new Blob([text]).size }))}
        saveLabel={t('Save to my skills')}
        onSave={saveAs}
      />
    </motion.div>
  )
}

/** One entry of a conversation with the agent (also used by the skills chat). */
export function Item({
  item,
  onSaveSkill,
  onOpenFile,
  onReviewTurn,
}: {
  item: AiItem
  onSaveSkill: SaveDraftedSkill
  onOpenFile?: (path: string) => void
  onReviewTurn?: () => void
}) {
  switch (item.kind) {
    case 'skill':
      return <SkillCard item={item} onSave={onSaveSkill} />
    case 'compacted':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t('Context compacted')}
          {item.before !== null && item.after !== null && ` · ${tokens(item.before)} → ${tokens(item.after)}`}
          <span className="h-px flex-1 bg-border" />
        </div>
      )
    case 'changes':
      return <TurnCard item={item} onOpenFile={onOpenFile ?? (() => {})} onReview={onReviewTurn} />
    case 'user':
      return (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
        >
          {item.skill && (
            <span className="mb-0.5 inline-block rounded-full bg-white/20 px-2 py-0.5 font-mono text-[13px]">/{item.skill}</span>
          )}
          {item.text && <div className="whitespace-pre-wrap break-words">{item.text}</div>}
          {item.attachments.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.attachments.map(a => (
                <span key={a} className="rounded-full bg-white/20 px-2 py-0.5 text-[13px] text-primary-foreground">
                  {/* Made by the server in English ("3 compile errors", "main.tex L10–14"). */}
                  {translateServerMessage(a)}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )
    case 'assistant':
      return <AssistantReply text={item.text} />
    case 'tool':
      return <ToolStep item={item} onOpenFile={onOpenFile} />
    case 'notice': {
      const style = {
        info: 'bg-muted text-foreground/80 border-border',
        success: 'bg-accent text-emerald-800 border-emerald-200 dark:text-emerald-300 dark:border-emerald-500/30',
        error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
      }[item.level]
      return <div className={`rounded border px-2 py-1.5 text-sm ${style}`}>{item.level === 'error' ? item.text : translateServerMessage(item.text)}</div>
    }
  }
}

type ToolItem = Extract<AiItem, { kind: 'tool' }>

/** A conversation's items with each run of two or more tool steps in a row gathered into one group. */
export function groupItems(items: AiItem[]): ({ kind: 'item'; item: AiItem } | { kind: 'tools'; id: string; items: ToolItem[] })[] {
  const out: ({ kind: 'item'; item: AiItem } | { kind: 'tools'; id: string; items: ToolItem[] })[] = []
  for (const item of items) {
    const last = out.at(-1)
    if (item.kind === 'tool' && last?.kind === 'tools') last.items.push(item)
    else if (item.kind === 'tool' && last?.kind === 'item' && last.item.kind === 'tool') out[out.length - 1] = { kind: 'tools', id: last.item.id, items: [last.item, item] }
    else out.push({ kind: 'item', item })
  }
  return out
}

function stepIcon(status: ToolItem['status']) {
  if (status === 'running') return <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
  if (status === 'ok') return <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
  return <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
}

/** One tool step: what the agent did (a file it read opens in the editor), and its result. */
function ToolStep({ item, onOpenFile }: { item: ToolItem; onOpenFile?: (path: string) => void }) {
  // Labels come from the server in English; the path is found there and then in the translated label.
  const label = translateServerMessage(item.label)
  const found = /^(?:Read|Edit|Create) (\S+)/.exec(item.label)?.[1]
  const path = found && onOpenFile && label.includes(found) ? found : undefined
  return (
    <div className="text-sm text-muted-foreground">
      <div className="flex items-start gap-1.5">
        {/* On the first line when a long label wraps. */}
        <span className="flex h-5 items-center">{stepIcon(item.status)}</span>
        {path ? (
          <span className="min-w-0 break-words">
            {label.slice(0, label.indexOf(path))}
            <button className="text-left font-mono break-all hover:underline" onClick={() => onOpenFile?.(path)}>
              {path}
            </button>
            {label.slice(label.indexOf(path) + path.length)}
          </span>
        ) : (
          <span className="min-w-0 break-words">{label}</span>
        )}
      </div>
      {item.result && <div className="ml-5 mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{item.status === 'ok' ? translateServerMessage(item.result) : item.result}</div>}
    </div>
  )
}

/**
 * Tool steps in a row, folded into one line (how many, and the latest one)
 * so a busy turn doesn't flood the conversation; opened, it lists them all.
 */
export function ToolGroup({ items, onOpenFile }: { items: ToolItem[]; onOpenFile?: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const status = items.some(i => i.status === 'running') ? 'running' : items.some(i => i.status === 'error') ? 'error' : 'ok'
  const latest = items.at(-1)!
  return (
    <div className="text-sm text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-1.5 text-left transition-colors hover:text-foreground"
      >
        {stepIcon(status)}
        <span className="shrink-0">{plural(items.length, '{n} step', '{n} steps')}</span>
        {!open && <span className="min-w-0 truncate">· {translateServerMessage(latest.label)}</span>}
        <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="mt-1.5 ml-1.5 space-y-1.5 border-l pl-3">
          {items.map(i => (
            <ToolStep key={i.id} item={i} onOpenFile={onOpenFile} />
          ))}
        </div>
      )}
    </div>
  )
}

const THINKING_LABEL: Record<ThinkingLevel, string> = {
  off: tk('Off'),
  minimal: tk('Minimal'),
  low: tk('Low'),
  medium: tk('Medium'),
  high: tk('High'),
  xhigh: tk('Extra high'),
  max: tk('Max'),
}

const pickerButton =
  'flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none data-[state=open]:bg-muted'

/** A reply, with a button to copy its Markdown. */
function AssistantReply({ text }: { text: string }) {
  return (
    <div className="group relative">
      <Markdown text={text} />
      <div className="mt-1 flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('Copy')}
              onClick={async () => {
                if (await copyText(text)) toast.success(t('Copied'))
              }}
            >
              <Copy />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Copy')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

/**
 * The model messages go to and how hard it thinks, in one control (one
 * button, so the composer's row fits a narrow panel): the models the admin
 * lets this person use, and the thinking levels pi-ai lists for the picked
 * one. Auto routing sets the thinking level per message.
 */
const PERMISSION_ICON: Record<AiPermission, LucideIcon> = { manual: ShieldCheck, auto: Shield, full: ShieldAlert }

/** The permission choice inside the model picker (editors only): what the agent may change. */
export type PermissionChoice = { value: AiPermission; onChoose: (p: AiPermission) => void }

export function ModelPicker({ status, onChoose, permission }: { status: AiStatus; onChoose: (pick: AiPreference) => void; permission?: PermissionChoice }) {
  const [open, setOpen] = useState(false)
  const model = status.model
  const auto = status.auto.on
  const keep = (m: { provider: string; id: string }) => ({ provider: m.provider, id: m.id })
  const byProvider = useMemo(() => {
    const groups = new Map<string, AiModelInfo[]>()
    for (const m of status.models) groups.set(m.provider, [...(groups.get(m.provider) ?? []), m])
    return [...groups]
  }, [status.models])
  const levels = model?.thinkingLevels ?? []
  const thinking = !!model && levels.length >= 2 && !auto
  const choosable = status.models.length > 1 || status.auto.available
  const chooseLevel = (thinkingLevel: ThinkingLevel) => model && onChoose({ model: keep(model), thinkingLevel, auto: false })
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={pickerButton} aria-label={t('Model')} disabled={!choosable && !thinking && !permission}>
          {auto ? <Wand2 className="size-3.5 shrink-0" /> : model && <ProviderIcon provider={model.provider} className="size-3.5 shrink-0" />}
          <span className="truncate">{auto ? t('Auto') : (model?.name ?? t('No model'))}</span>
          {(choosable || thinking || permission) && <ChevronDown className="size-3 shrink-0 opacity-60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 p-0">
        {choosable && (
          <Command>
            <CommandInput placeholder={t('Search models…')} />
            <CommandList className="max-h-64">
              <CommandEmpty>{t('No models found.')}</CommandEmpty>
              {status.auto.available && model && (
                <CommandGroup>
                  <CommandItem
                    value="auto"
                    onSelect={() => {
                      onChoose({ model: keep(model), thinkingLevel: status.thinkingLevel, auto: true })
                      setOpen(false)
                    }}
                  >
                    <Wand2 className="size-4 text-muted-foreground" />
                    <span className="grid min-w-0 flex-1">
                      <span>{t('Auto')}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t('{light} or {strong}, depending on the question', { light: status.auto.light?.name ?? '', strong: status.auto.strong?.name ?? '' })}
                      </span>
                    </span>
                    {auto && <Check className="size-3.5 text-primary" />}
                  </CommandItem>
                </CommandGroup>
              )}
              {byProvider.map(([provider, models]) => (
                <CommandGroup
                  key={provider}
                  heading={
                    <span className="flex items-center gap-1.5">
                      <ProviderIcon provider={provider} className="size-3.5" /> {provider}
                    </span>
                  }
                >
                  {models.map(m => (
                    <CommandItem
                      key={m.id}
                      value={`${m.provider} ${m.id} ${m.name}`}
                      onSelect={() => {
                        // Keep the thinking level; it is clamped to what the new model supports.
                        onChoose({ model: keep(m), thinkingLevel: status.thinkingLevel === 'off' ? 'medium' : status.thinkingLevel, auto: false })
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {m.reasoning && <Brain className="size-3.5 text-muted-foreground" />}
                      {!auto && model?.provider === m.provider && model.id === m.id && <Check className="size-3.5 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        )}
        {thinking && (
          <div className={cn('grid gap-2 p-3', choosable && 'border-t')}>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Brain className="size-3.5" /> {t('Thinking')}
            </span>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('Thinking')}>
              {levels.map(level => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={status.thinkingLevel === level}
                  onClick={() => chooseLevel(level)}
                  className={cn(
                    'h-7 rounded-md border px-2.5 text-xs transition-colors',
                    status.thinkingLevel === level ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  {t(THINKING_LABEL[level])}
                </button>
              ))}
            </div>
          </div>
        )}
        {permission && (
          <div className={cn('grid gap-2 p-3', (choosable || thinking) && 'border-t')}>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Shield className="size-3.5" /> {t('Permissions')}
            </span>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('Permissions')}>
              {PERMISSIONS.map(p => {
                const Icon = PERMISSION_ICON[p.value]
                return (
                  <Tooltip key={p.value}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={permission.value === p.value}
                        onClick={() => permission.onChoose(p.value)}
                        className={cn(
                          'flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors',
                          permission.value === p.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {t(p.title)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64">
                      {t(p.description)}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

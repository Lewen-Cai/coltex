import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import type { CreatedGitToken, GitToken, ProjectSummary, TokenUse } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { intlLocale, plural, t, tk } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Personal access tokens (Settings → Sync services for Git, Settings → AI
 * agent for MCP): one list behind both pages, each showing the tokens made
 * for its use.
 */
export function useTokens(): [GitToken[] | undefined, (change: (list: GitToken[]) => GitToken[]) => void] {
  const [tokens, setTokens] = useState<GitToken[]>()
  useEffect(() => {
    api.gitTokens().then(setTokens, e => toast.error((e as Error).message))
  }, [])
  return [tokens, change => setTokens(list => change(list ?? []))]
}

const USE_LABEL: Record<TokenUse, string> = { git: tk('Git'), mcp: tk('MCP') }

/** Days until expiry offered when making a token; 0 = never. */
const EXPIRY = [
  { days: 30, label: tk('30 days') },
  { days: 90, label: tk('90 days') },
  { days: 365, label: tk('1 year') },
  { days: 0, label: tk('No expiry') },
]

const day = (iso: string) => new Date(iso).toLocaleDateString(intlLocale(), { dateStyle: 'medium' })
const when = (iso: string) => new Date(iso).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })

/** Making a token: its name, what it is for, read-only or not, which projects, and when it expires. */
export function CreateTokenDialog({
  open,
  onOpenChange,
  use,
  defaultName = '',
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The use the page is about, ticked to begin with. */
  use: TokenUse
  defaultName?: string
  onCreated: (token: CreatedGitToken) => void
}) {
  const [name, setName] = useState(defaultName)
  const [uses, setUses] = useState<TokenUse[]>([use])
  const [readOnly, setReadOnly] = useState(false)
  const [scope, setScope] = useState<'all' | 'some'>('all')
  const [picked, setPicked] = useState<string[]>([])
  const [expiry, setExpiry] = useState(90)
  const [projects, setProjects] = useState<ProjectSummary[]>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(defaultName)
    setUses([use])
    setReadOnly(false)
    setScope('all')
    setPicked([])
    setExpiry(90)
  }, [open, use, defaultName])

  useEffect(() => {
    if (open && scope === 'some' && !projects) api.listProjects().then(list => setProjects(list.filter(p => !p.trashed)), e => toast.error((e as Error).message))
  }, [open, scope, projects])

  const toggleUse = (u: TokenUse, on: boolean) => setUses(list => (on ? [...list, u] : list.filter(x => x !== u)))
  const togglePick = (id: string) => setPicked(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))
  const valid = !!name.trim() && uses.length > 0 && (scope === 'all' || picked.length > 0)

  const create = async () => {
    setBusy(true)
    try {
      const token = await api.createGitToken({
        name: name.trim(),
        uses: (['git', 'mcp'] as const).filter(u => uses.includes(u)),
        readOnly,
        projectIds: scope === 'all' ? null : picked,
        expiresInDays: expiry || null,
      })
      onCreated(token)
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Create token')}</DialogTitle>
        </DialogHeader>
        <form
          id="create-token"
          className="grid gap-5"
          onSubmit={e => {
            e.preventDefault()
            if (valid) void create()
          }}
        >
          <Field>
            <FieldLabel htmlFor="token-name">{t('Token name')}</FieldLabel>
            <Input id="token-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. My laptop')} autoFocus />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">{t('Used for')}</FieldLegend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(['git', 'mcp'] as const).map(u => (
                <Label key={u} className="flex items-center gap-2 font-normal">
                  <Checkbox checked={uses.includes(u)} onCheckedChange={v => toggleUse(u, v === true)} />
                  {u === 'git' ? t('Git (clone, pull, push)') : t('AI tools (MCP)')}
                </Label>
              ))}
            </div>
            {uses.length === 0 && <p className="text-sm text-destructive">{t('Choose at least one')}</p>}
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">{t('Access')}</FieldLegend>
            <ToggleGroup type="single" variant="outline" value={readOnly ? 'read' : 'write'} onValueChange={v => v && setReadOnly(v === 'read')} className="w-fit">
              <ToggleGroupItem value="write" className="px-3">
                {t('Read and write')}
              </ToggleGroupItem>
              <ToggleGroupItem value="read" className="px-3">
                {t('Read only')}
              </ToggleGroupItem>
            </ToggleGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">{t('Projects')}</FieldLegend>
            <Select value={scope} onValueChange={v => setScope(v as 'all' | 'some')}>
              <SelectTrigger className="w-full" aria-label={t('Projects')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All my projects')}</SelectItem>
                <SelectItem value="some">{t('Only selected projects')}</SelectItem>
              </SelectContent>
            </Select>
            {scope === 'some' &&
              (!projects ? (
                <Spinner className="mx-auto my-4" />
              ) : (
                <Command className="rounded-md border">
                  <CommandInput placeholder={t('Search projects')} />
                  <CommandList className="max-h-48">
                    <CommandEmpty>{t('No projects found.')}</CommandEmpty>
                    {projects.map(p => (
                      <CommandItem key={p.id} value={`${p.name} ${p.id}`} onSelect={() => togglePick(p.id)}>
                        <Check className={cn('size-4', !picked.includes(p.id) && 'invisible')} />
                        <span className="truncate">{p.name}</span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              ))}
            {scope === 'some' && projects && picked.length === 0 && <p className="text-sm text-muted-foreground">{t('Choose at least one')}</p>}
          </FieldSet>

          <Field>
            <FieldLabel>{t('Expires')}</FieldLabel>
            <Select value={String(expiry)} onValueChange={v => setExpiry(Number(v))}>
              <SelectTrigger className="w-full" aria-label={t('Expires')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY.map(x => (
                  <SelectItem key={x.days} value={String(x.days)}>
                    {t(x.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button type="submit" form="create-token" disabled={busy || !valid}>
            {busy && <Spinner />}
            {t('Create token')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A token just made: shown once, to copy. */
export function NewToken({ token }: { token: CreatedGitToken }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
      <p className="text-sm font-medium">{t('Copy the token now: it won’t be shown again.')}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1 font-mono text-xs">{token.token}</code>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (await copyText(token.token)) setCopied(true)
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t('Copied') : t('Copy')}
        </Button>
      </div>
    </div>
  )
}

/** The tokens made for one use, with what each may do, and Revoke. */
export function TokenList({ tokens, use, onRevoked }: { tokens: GitToken[] | undefined; use: TokenUse; onRevoked: (id: string) => void }) {
  const shown = tokens?.filter(x => x.uses.includes(use))

  const revoke = async (token: GitToken) => {
    const ok = await confirmDialog({
      title: t('Revoke “{name}”?', { name: token.name }),
      description: t('Git clients and AI agents using this token stop working.'),
      confirmLabel: t('Revoke'),
    })
    if (!ok) return
    try {
      await api.revokeGitToken(token.id)
      onRevoked(token.id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (!shown) return <Spinner className="size-5 text-muted-foreground" />
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">{t('No tokens yet.')}</p>
  return (
    <ul className="divide-y rounded-lg border">
      {shown.map(token => {
        const expired = !!token.expiresAt && Date.parse(token.expiresAt) <= Date.now()
        const reach = !token.projects
          ? t('All projects')
          : token.projects.length === 0
            ? t('No projects left')
            : token.projects.length <= 2
              ? token.projects.map(p => p.name).join(', ')
              : plural(token.projects.length, '{n} project', '{n} projects')
        return (
          <li key={token.id} className="flex items-center gap-3 px-3 py-2">
            <KeyRound className="size-4 shrink-0 text-muted-foreground" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium">{token.name}</span>
                {token.uses.map(u => (
                  <Badge key={u} variant="secondary" className="px-1.5 py-0 text-[11px]">
                    {t(USE_LABEL[u])}
                  </Badge>
                ))}
                {token.readOnly && (
                  <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                    {t('Read only')}
                  </Badge>
                )}
                {expired && (
                  <Badge variant="outline" className="border-destructive/40 px-1.5 py-0 text-[11px] text-destructive">
                    {t('Expired')}
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground" title={token.projects?.map(p => p.name).join(', ')}>
                {reach}
                {' · '}
                {token.expiresAt ? (expired ? t('expired {date}', { date: day(token.expiresAt) }) : t('expires {date}', { date: day(token.expiresAt) })) : t('no expiry')}
                {' · '}
                {token.lastUsedAt ? t('last used {date}', { date: when(token.lastUsedAt) }) : t('never used')}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void revoke(token)}>
              {t('Revoke')}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

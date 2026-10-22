import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, CircleDollarSign, Coins, MessageSquare, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AiAccessPolicy, AiGroup, AiModelInfo, AiUsageLimits, AiProviderStatus, AiUsageReport, AiUserRow } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { ProviderIcon } from '@/components/provider-icon'
import { PageHeader } from '@/components/shell/app-shell'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import { PERIOD_LABEL, limitSummary } from '@/lib/ai-limits'
import { formatNumber, timeAgo } from '@/lib/format'
import { intlLocale, plural, t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]

const EMPTY_SELECTION: AiAccessPolicy = { mode: 'selected', providers: [], models: [] }

const formatCost = (n: number) => (n > 0 && n < 0.01 ? '< $0.01' : `$${n.toFixed(2)}`)

export function UsageChart({ data, metric }: { data: AiUsageReport['byDay']; metric: 'requests' | 'tokens' }) {
  // Built at render: the label follows the interface language.
  const config = {
    requests: { label: t('Requests'), color: 'var(--chart-1)' },
    tokens: { label: t('Tokens'), color: 'var(--chart-3)' },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <defs>
          <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.45} />
            <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={d => new Date(d).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' })}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={d => new Date(String(d)).toLocaleDateString(intlLocale(), { dateStyle: 'medium' })} indicator="dot" />}
        />
        <Area dataKey={metric} type="monotone" fill={`url(#fill-${metric})`} stroke={`var(--color-${metric})`} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}

function ByModel({ report, providerName }: { report: AiUsageReport; providerName: (id: string) => string }) {
  const max = Math.max(1, ...report.byModel.map(m => m.requests))
  if (report.byModel.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t('No requests in this period.')}</p>
  return (
    <div className="grid gap-3">
      {report.byModel.map((m, i) => (
        <motion.div key={`${m.provider}/${m.model}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <ProviderIcon provider={m.provider} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{m.model}</span>
            <span className="tabular-nums text-muted-foreground">{plural(m.requests, '{n} request', '{n} requests', { n: formatNumber(m.requests) })}</span>
          </div>
          <Progress value={(m.requests / max) * 100} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="truncate">
              {providerName(m.provider)} · {t('{tokens} tokens', { tokens: formatNumber(m.inputTokens + m.outputTokens) })}
            </span>
            {m.cost > 0 && <span>{formatCost(m.cost)}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** What a group's policy allows, in a few words. */
function policySummary(policy: AiAccessPolicy): string {
  if (policy.mode === 'all') return t('All models')
  if (policy.mode === 'none') return t('No access')
  return (
    [
      policy.providers.length ? plural(policy.providers.length, '{n} provider', '{n} providers') : '',
      policy.models.length ? plural(policy.models.length, '{n} model', '{n} models') : '',
    ]
      .filter(Boolean)
      .join(' + ') || t('Nothing selected')
  )
}

/** A person's AI access in a table cell: their group, or none. */
function GroupBadge({ group, isAdmin }: { group: AiGroup | undefined; isAdmin: boolean }) {
  if (isAdmin) return <Badge variant="secondary">{t('All models (system admin)')}</Badge>
  if (!group) return <Badge variant="outline" className="text-muted-foreground">{t('No AI')}</Badge>
  return <Badge>{group.name}</Badge>
}

/**
 * Pick which providers (every model of each) and single models a policy
 * allows. Policies may name providers or models that are no longer
 * connected; they are kept as they are.
 */
function AccessEditor({
  value,
  onChange,
  models,
  providerName,
}: {
  value: AiAccessPolicy
  onChange: (next: AiAccessPolicy) => void
  models: AiModelInfo[]
  providerName: (id: string) => string
}) {
  const [query, setQuery] = useState('')
  const mode = value.mode
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, AiModelInfo[]>()
    for (const m of models) {
      if (q && !`${m.provider} ${m.id} ${m.name}`.toLowerCase().includes(q)) continue
      map.set(m.provider, [...(map.get(m.provider) ?? []), m])
    }
    return [...map]
  }, [models, query])

  const selected = value.mode === 'selected' ? value : EMPTY_SELECTION
  const setSelected = (patch: Partial<AiAccessPolicy>) => onChange({ ...selected, ...patch, mode: 'selected' })
  const hasModel = (m: AiModelInfo) => selected.models.some(r => r.provider === m.provider && r.id === m.id)

  return (
    <div className="grid gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={v => {
          if (!v) return
          onChange(v === 'selected' ? (value.mode === 'selected' ? value : EMPTY_SELECTION) : { mode: 'all', providers: [], models: [] })
        }}
        className="w-full flex-wrap"
      >
        <ToggleGroupItem value="all" className="flex-1">
          {t('All models')}
        </ToggleGroupItem>
        <ToggleGroupItem value="selected" className="flex-1">
          {t('Selected')}
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === 'selected' && (
        <div className="grid gap-2">
          <InputGroup className="h-8">
            <InputGroupInput placeholder={t('Search models…')} value={query} onChange={e => setQuery(e.target.value)} />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <div className="max-h-96 overflow-y-auto rounded-lg border">
            {groups.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t('No models found.')}</p>}
            {groups.map(([provider, list]) => {
              const whole = selected.providers.includes(provider)
              const some = list.some(hasModel)
              return (
                <Collapsible key={provider} defaultOpen={!!query || (some && !whole)} className="border-b last:border-b-0">
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <Checkbox
                      checked={whole ? true : some ? 'indeterminate' : false}
                      onCheckedChange={c =>
                        setSelected({
                          providers: c === true ? [...selected.providers, provider] : selected.providers.filter(p => p !== provider),
                          // Choosing the whole provider makes single picks of its models redundant.
                          models: selected.models.filter(r => r.provider !== provider),
                        })
                      }
                      aria-label={t('All models of {name}', { name: providerName(provider) })}
                    />
                    <ProviderIcon provider={provider} className="size-4" />
                    <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                      <span className="truncate font-medium">{providerName(provider)}</span>
                      <span className="text-xs text-muted-foreground">
                        {whole ? t('every model, including new ones') : plural(list.filter(hasModel).length, '{n} of {total} selected', '{n} of {total} selected', { total: list.length })}
                      </span>
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="grid gap-0.5 pb-2 pl-9 pr-3">
                      {list.map(m => (
                        <label key={m.id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-sm hover:bg-accent', whole && 'cursor-default opacity-60')}>
                          <Checkbox
                            checked={whole || hasModel(m)}
                            disabled={whole}
                            onCheckedChange={c =>
                              setSelected({
                                models: c === true ? [...selected.models, { provider: m.provider, id: m.id }] : selected.models.filter(r => !(r.provider === m.provider && r.id === m.id)),
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 truncate">{m.name}</span>
                          <span className="truncate font-mono text-xs text-muted-foreground">{m.id}</span>
                        </label>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** A group's name and what it may use. */
function GroupDialog({
  group,
  open,
  models,
  providerName,
  onClose,
  onSaved,
}: {
  /** Undefined: a new group. */
  group: AiGroup | undefined
  open: boolean
  models: AiModelInfo[]
  providerName: (id: string) => string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [policy, setPolicy] = useState<AiAccessPolicy>({ mode: 'all', providers: [], models: [] })
  const [period, setPeriod] = useState<AiUsageLimits['period']>('month')
  const [tokenLimit, setTokenLimit] = useState('')
  const [costLimit, setCostLimit] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setPolicy(group?.policy ?? { mode: 'all', providers: [], models: [] })
    setPeriod(group?.limits.period ?? 'month')
    setTokenLimit(group?.limits.tokens != null ? String(group.limits.tokens) : '')
    setCostLimit(group?.limits.cost != null ? String(group.limits.cost) : '')
  }, [open, group])
  // Empty means no limit.
  const tokens = tokenLimit.trim() === '' ? null : Number(tokenLimit)
  const cost = costLimit.trim() === '' ? null : Number(costLimit)
  const invalid = (tokens !== null && !(Number.isInteger(tokens) && tokens >= 1)) || (cost !== null && !(cost >= 0.01))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { name: name.trim(), policy, limits: { period, tokens, cost } }
      if (group) await api.aiUpdateGroup(group.id, body)
      else await api.aiCreateGroup(body)
      toast.success(group ? t('Group updated') : t('Group created'))
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
        <form onSubmit={save} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{group ? t('Edit group') : t('New AI group')}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="ai-group-name">{t('Group name')}</FieldLabel>
            <Input id="ai-group-name" autoFocus required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. PhD students')} />
          </Field>
          <Field>
            <FieldLabel>{t('Model access')}</FieldLabel>
            <AccessEditor value={policy} onChange={setPolicy} models={models} providerName={providerName} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ai-group-tokens">{t('Usage limit for each member')}</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr]">
              <Select value={period} onValueChange={v => setPeriod(v as AiUsageLimits['period'])}>
                <SelectTrigger className="w-full" aria-label={t('Period')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['day', 'week', 'month'] as const).map(p => (
                    <SelectItem key={p} value={p}>
                      {t(PERIOD_LABEL[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputGroup>
                <InputGroupInput
                  id="ai-group-tokens"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={tokenLimit}
                  onChange={e => setTokenLimit(e.target.value)}
                  placeholder={t('No limit')}
                  aria-label={t('Tokens')}
                />
                <InputGroupAddon align="inline-end">{t('tokens')}</InputGroupAddon>
              </InputGroup>
              <InputGroup>
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  type="number"
                  min={0.01}
                  step={0.01}
                  inputMode="decimal"
                  value={costLimit}
                  onChange={e => setCostLimit(e.target.value)}
                  placeholder={t('No limit')}
                  aria-label={t('Cost (US$)')}
                />
              </InputGroup>
            </div>
            {invalid && <p className="text-xs text-destructive">{t('Tokens are a whole number of at least 1, the cost at least $0.01.')}</p>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || invalid}>
              {saving && <Spinner />} {t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** One person: their usage in the period and their AI group. */
function UserSheet({
  row,
  days,
  groups,
  providerName,
  onClose,
  onSaved,
}: {
  row: AiUserRow | undefined
  days: Period
  groups: AiGroup[]
  providerName: (id: string) => string
  onClose: () => void
  onSaved: () => void
}) {
  const [report, setReport] = useState<AiUsageReport>()

  useEffect(() => {
    if (!row) return
    setReport(undefined)
    api.aiUsage(days, row.userId).then(setReport, e => toast.error((e as Error).message))
  }, [row, days])

  const isAdmin = row?.role === 'admin'
  const setGroup = async (groupId: string | null) => {
    if (!row) return
    try {
      await api.aiSetUserGroup(row.userId, groupId)
      toast.success(t('AI group updated'))
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Sheet open={!!row} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {row && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-3">
                <UserAvatar id={row.userId} name={row.name} className="size-10" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{row.name}</SheetTitle>
                  <SheetDescription className="truncate">{row.email}</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="grid gap-6 p-4">
              <section className="grid gap-3">
                <h3 className="text-sm font-semibold">{t('AI group')}</h3>
                {isAdmin ? (
                  <p className="text-sm text-muted-foreground">{t('The system administrator can always use every model.')}</p>
                ) : (
                  <Select value={row.groupId ?? NO_GROUP} onValueChange={v => void setGroup(v === NO_GROUP ? null : v)}>
                    <SelectTrigger className="w-full" aria-label={t('AI group')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_GROUP}>{t('None (no AI agent)')}</SelectItem>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {[g.name, policySummary(g.policy), limitSummary(g.limits)].filter(Boolean).join(' · ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </section>
              <section className="grid gap-3">
                <h3 className="text-sm font-semibold">{plural(days, 'Usage, last {n} day', 'Usage, last {n} days')}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    [t('Requests'), formatNumber(row.requests)],
                    [t('Tokens'), formatNumber(row.inputTokens + row.outputTokens)],
                    [t('Cost'), formatCost(row.cost)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-muted/60 p-2.5">
                      <div className="text-lg font-semibold tabular-nums">{value}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {report ? (
                  <>
                    <UsageChart data={report.byDay} metric="requests" />
                    <ByModel report={report} providerName={providerName} />
                  </>
                ) : (
                  <Skeleton className="h-56" />
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** The groups and what each may use; people outside every group have no AI (admins always have every model). */
function GroupsCard({
  groups,
  models,
  providerName,
  onChanged,
}: {
  groups: AiGroup[] | undefined
  models: AiModelInfo[]
  providerName: (id: string) => string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<{ group?: AiGroup }>()
  const remove = async (g: AiGroup) => {
    const ok = await confirmDialog({
      title: t('Delete the group “{name}”?', { name: g.name }),
      description: plural(g.members, 'Its 1 member keeps no AI access until you add them to another group.', 'Its {n} members keep no AI access until you add them to another group.'),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.aiDeleteGroup(g.id)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <Card className="content-start">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" /> {t('AI groups')}
        </CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => setEditing({})}>
            <Plus /> {t('New group')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2">
        {!groups ? (
          <Skeleton className="h-16" />
        ) : groups.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('No groups yet: only the system administrator can use the AI agent.')}</p>
        ) : (
          groups.map(g => (
            <div key={g.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{g.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[policySummary(g.policy), limitSummary(g.limits), plural(g.members, '{n} member', '{n} members')].filter(Boolean).join(' · ')}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ group: g })} aria-label={t('Edit group')}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => void remove(g)} aria-label={t('Delete')}>
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </CardContent>
      <GroupDialog
        group={editing?.group}
        open={!!editing}
        models={models}
        providerName={providerName}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined)
          onChanged()
        }}
      />
    </Card>
  )
}

const NO_GROUP = '__none__'

/** AI usage across the instance and per person, and who may use which providers and models. */
export function AdminAiUsagePage() {
  const [days, setDays] = useState<Period>(30)
  const [metric, setMetric] = useState<'requests' | 'tokens'>('requests')
  const [report, setReport] = useState<AiUsageReport>()
  const [users, setUsers] = useState<AiUserRow[]>()
  const [models, setModels] = useState<AiModelInfo[]>([])
  const [providers, setProviders] = useState<AiProviderStatus[]>([])
  const [groups, setGroups] = useState<AiGroup[]>()
  const [query, setQuery] = useState('')
  const [openUser, setOpenUser] = useState<string>()

  const loadUsage = useCallback(async (period: Period) => {
    const [r, u, g] = await Promise.all([api.aiUsage(period), api.aiUsers(period), api.aiGroups()])
    setReport(r)
    setUsers(u)
    setGroups(g)
  }, [])

  useEffect(() => {
    loadUsage(days).catch(e => toast.error((e as Error).message))
  }, [days, loadUsage])

  useEffect(() => {
    Promise.all([api.aiAdmin(), api.aiModels()]).then(([state, m]) => {
      setProviders(state.providers)
      setModels(m)
    }, e => toast.error((e as Error).message))
  }, [])

  const providerName = useCallback((id: string) => providers.find(p => p.id === id)?.name ?? id, [providers])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? []).filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  const totals = report?.totals

  return (
    <>
      <PageHeader
        title={t('AI usage & access')}
        actions={
          <Tabs value={String(days)} onValueChange={v => setDays(Number(v) as Period)}>
            <TabsList>
              {PERIODS.map(p => (
                <TabsTrigger key={p} value={String(p)}>
                  {plural(p, '{n} day', '{n} days')}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} label={t('Requests')} value={totals?.requests} icon={MessageSquare} tone="blue" format={n => formatNumber(Math.round(n))} />
        <StatCard index={1} label={t('Input tokens')} value={totals?.inputTokens} icon={ArrowUpFromLine} tone="violet" format={n => formatNumber(Math.round(n))} />
        <StatCard index={2} label={t('Output tokens')} value={totals?.outputTokens} icon={ArrowDownToLine} tone="sky" format={n => formatNumber(Math.round(n))} />
        <StatCard index={3} label={t('Cost (list price)')} value={totals?.cost} icon={CircleDollarSign} tone="amber" format={formatCost} hint={t('Subscriptions and local models count as $0')} />
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('Usage over time')}</CardTitle>
            <CardDescription>{plural(days, 'Everyone, last {n} day', 'Everyone, last {n} days')}</CardDescription>
            <CardAction>
              <Tabs value={metric} onValueChange={v => setMetric(v as 'requests' | 'tokens')}>
                <TabsList className="h-8">
                  <TabsTrigger value="requests" className="text-xs">
                    {t('Requests')}
                  </TabsTrigger>
                  <TabsTrigger value="tokens" className="text-xs">
                    {t('Tokens')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent>{report ? <UsageChart data={report.byDay} metric={metric} /> : <Skeleton className="h-56 w-full" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" /> {t('By model')}
            </CardTitle>
          </CardHeader>
          <CardContent>{report ? <ByModel report={report} providerName={providerName} /> : <Skeleton className="h-48" />}</CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('People')}</CardTitle>
            <CardAction>
              <InputGroup className="h-8 w-48">
                <InputGroupInput placeholder={t('Search people')} value={query} onChange={e => setQuery(e.target.value)} />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </CardAction>
          </CardHeader>
          {/* Columns follow the card's width (container queries), not the window's: the sidebar takes a varying share. */}
          <CardContent className="@container px-0">
            {!users ? (
              <div className="grid gap-2 px-6">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{t('User')}</TableHead>
                    <TableHead>{t('AI group')}</TableHead>
                    <TableHead className="text-right @max-sm:hidden">{t('Requests')}</TableHead>
                    <TableHead className="text-right @max-md:hidden">{t('Tokens')}</TableHead>
                    <TableHead className="text-right @max-xl:hidden">{t('Cost')}</TableHead>
                    <TableHead className="pr-6 text-right @max-2xl:hidden">{t('Last used')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(u => (
                    <TableRow key={u.userId} className={cn('cursor-pointer', u.banned && 'opacity-60')} onClick={() => setOpenUser(u.userId)}>
                      <TableCell className="w-full max-w-0 pl-6">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar id={u.userId} name={u.name} className="size-7 shrink-0 text-[12px]" />
                          <div className="grid min-w-0">
                            <span className="truncate font-medium">{u.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GroupBadge group={groups?.find(g => g.id === u.groupId)} isAdmin={u.role === 'admin'} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums @max-sm:hidden">{formatNumber(u.requests)}</TableCell>
                      <TableCell className="text-right tabular-nums @max-md:hidden">{formatNumber(u.inputTokens + u.outputTokens)}</TableCell>
                      <TableCell className="text-right tabular-nums @max-xl:hidden">{u.cost ? formatCost(u.cost) : '—'}</TableCell>
                      <TableCell className="pr-6 text-right text-muted-foreground @max-2xl:hidden">{u.lastUsedAt ? timeAgo(u.lastUsedAt) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <GroupsCard groups={groups} models={models} providerName={providerName} onChanged={() => void loadUsage(days)} />
      </div>

      <UserSheet
        row={users?.find(u => u.userId === openUser)}
        days={days}
        groups={groups ?? []}
        providerName={providerName}
        onClose={() => setOpenUser(undefined)}
        onSaved={() => void loadUsage(days)}
      />
    </>
  )
}

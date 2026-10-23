import { useEffect, useState, type ReactNode } from 'react'
import { Bot, Check, CircleDollarSign, Coins, Copy, Gauge, MessageSquare, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { AiAllowance, AiPermission, AiUsageReport, CreatedGitToken } from '@coltex/shared'
import { CreateTokenDialog, NewToken, TokenList, useTokens } from '@/components/access-tokens'
import { ToolIcon } from '@/components/provider-icon'
import { PageHeader } from '@/components/shell/app-shell'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ByModel, PeriodTabs, UsageChart, formatCost, type Period } from '@/components/usage-chart'
import { CURRENT_PERIOD, allowanceShare, compactTokens, dollars, useAiAllowance } from '@/lib/ai-limits'
import { PERMISSIONS, useAiPermission } from '@/lib/ai-permission'
import { api } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { formatNumber } from '@/lib/format'
import { inSentence, intlLocale, plural, t } from '@/lib/i18n'
import { useLinkChoices } from '@/lib/public-url'
import { cn } from '@/lib/utils'

/**
 * Settings → AI agent: the person's usage and what is left of their limit
 * (with the AI agent), what AI agents may change for them, and setting up
 * their own AI tools over MCP. Everyone sees it: MCP tools bring their own
 * model.
 */
export function AiSettingsPage() {
  const [available, setAvailable] = useState<boolean>()
  useEffect(() => {
    api.aiStatus().then(
      s => setAvailable(s.available),
      () => setAvailable(false),
    )
  }, [])
  const [days, setDays] = useState<Period>(30)
  return (
    <>
      <PageHeader actions={available && <PeriodTabs value={days} onChange={setDays} />} />
      <div className="grid gap-6">
        {available && <Usage days={days} />}
        <PermissionCard />
        <ToolsCard />
      </div>
    </>
  )
}

/** The figures, the usage curve and the models used in the period chosen in the header, as on AI usage & access. */
function Usage({ days }: { days: Period }) {
  const allowance = useAiAllowance()
  const [report, setReport] = useState<AiUsageReport>()
  const [metric, setMetric] = useState<'requests' | 'tokens'>('tokens')
  useEffect(() => {
    let live = true
    setReport(undefined)
    api.myAiUsage(days).then(
      r => live && setReport(r),
      e => toast.error((e as Error).message),
    )
    return () => {
      live = false
    }
  }, [days])
  const totals = report?.totals
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AllowanceCard allowance={allowance} />
        <StatCard index={1} label={t('Requests')} value={totals?.requests} icon={MessageSquare} format={n => formatNumber(Math.round(n))} />
        <StatCard index={2} label={t('Tokens')} value={totals && totals.inputTokens + totals.outputTokens} icon={Coins} format={compactTokens} animate={false} />
        <StatCard
          index={3}
          label={t('Cost (list price)')}
          value={totals?.cost}
          icon={CircleDollarSign}
          format={formatCost}
          animate={false}
          hint={t('Subscriptions and local models count as $0')}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('Usage over time')}</CardTitle>
            <CardDescription>{plural(days, 'Last {n} day', 'Last {n} days')}</CardDescription>
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
          <CardContent>{report ? <ByModel report={report} /> : <Skeleton className="h-48" />}</CardContent>
        </Card>
      </div>
    </>
  )
}

/** What is left of the limit this period (the tighter of tokens and cost), or that there is none; styled like StatCard. */
function AllowanceCard({ allowance: a }: { allowance: AiAllowance | null | undefined }) {
  if (a === undefined) return <Skeleton className="h-full min-h-28" />
  const share = a ? allowanceShare(a) : 0
  const byCost = !!a && a.cost !== null && (a.tokens === null || a.usedCost / a.cost >= a.usedTokens / a.tokens)
  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="grid gap-1 p-4 sm:p-5">
        <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          {a ? t('Left {period}', { period: inSentence(t(CURRENT_PERIOD[a.period])) }) : t('Usage limit')}
          <Gauge className="size-4 opacity-60" />
        </span>
        {!a ? (
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('No limit')}</span>
        ) : (
          <>
            <span className={cn('text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl', a.exceeded && 'text-destructive')}>
              {byCost ? dollars(Math.max(0, a.cost! - a.usedCost)) : compactTokens(Math.max(0, a.tokens! - a.usedTokens))}
            </span>
            <Progress value={share * 100} className={cn('my-1', share >= 0.9 ? '[&>*]:bg-destructive' : share >= 0.7 && '[&>*]:bg-amber-500')} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {byCost ? t('{used} of {limit}', { used: dollars(a.usedCost), limit: dollars(a.cost!) }) : t('{used} of {limit}', { used: compactTokens(a.usedTokens), limit: compactTokens(a.tokens!) })}
              {' · '}
              {t('Resets on {date}', { date: new Date(a.resetsAt).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' }) })}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PermissionCard() {
  const [permission, setPermission] = useAiPermission()
  const [saving, setSaving] = useState(false)
  const choose = async (p: AiPermission) => {
    setSaving(true)
    await setPermission(p)
    setSaving(false)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('Permissions')}
          {saving && <Spinner className="size-3.5 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!permission ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <RadioGroup value={permission} onValueChange={v => void choose(v as AiPermission)} disabled={saving} aria-label={t('Permissions')} className="md:grid-cols-3">
            {PERMISSIONS.map(m => (
              <FieldLabel key={m.value} htmlFor={`ai-permission-${m.value}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{t(m.title)}</FieldTitle>
                    <FieldDescription>{t(m.description)}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem id={`ai-permission-${m.value}`} value={m.value} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  )
}

/** An AI tool that connects to ColTex over MCP, and how it is told about it. */
type Tool = { id: string; name: string; logo?: string; file?: string; config: (url: string, token: string) => string }

const json = (value: unknown) => JSON.stringify(value, null, 2)
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

const TOOLS: Tool[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    logo: 'claudecode',
    config: (url, token) => `claude mcp add --transport http coltex ${url} --header "Authorization: Bearer ${token}"`,
  },
  {
    id: 'codex',
    name: 'Codex',
    logo: 'codex',
    file: '~/.codex/config.toml',
    config: (url, token) => `# export COLTEX_TOKEN=${token}\n[mcp_servers.coltex]\nurl = "${url}"\nbearer_token_env_var = "COLTEX_TOKEN"`,
  },
  { id: 'cursor', name: 'Cursor', logo: 'cursor', file: '~/.cursor/mcp.json', config: (url, token) => json({ mcpServers: { coltex: { url, headers: bearer(token) } } }) },
  {
    id: 'vscode',
    name: 'VS Code (Copilot)',
    logo: 'githubcopilot',
    file: '.vscode/mcp.json',
    config: (url, token) => json({ servers: { coltex: { type: 'http', url, headers: bearer(token) } } }),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    logo: 'windsurf',
    file: '~/.codeium/windsurf/mcp_config.json',
    config: (url, token) => json({ mcpServers: { coltex: { serverUrl: url, headers: bearer(token) } } }),
  },
  { id: 'gemini', name: 'Gemini CLI', logo: 'geminicli', file: '~/.gemini/settings.json', config: (url, token) => json({ mcpServers: { coltex: { httpUrl: url, headers: bearer(token) } } }) },
  {
    id: 'cline',
    name: 'Cline',
    logo: 'cline',
    file: 'cline_mcp_settings.json',
    config: (url, token) => json({ mcpServers: { coltex: { type: 'streamableHttp', url, headers: bearer(token) } } }),
  },
  { id: 'opencode', name: 'OpenCode', logo: 'opencode', file: 'opencode.json', config: (url, token) => json({ mcp: { coltex: { type: 'remote', url, headers: bearer(token) } } }) },
  { id: 'other', name: 'Other', config: (url, token) => json({ mcpServers: { coltex: { type: 'http', url, headers: bearer(token) } } }) },
]

/** Setting up the person's own AI tools: pick one on the left, its three steps on the right. */
function ToolsCard() {
  const choices = useLinkChoices()
  const [base, setBase] = useState<string>()
  const [tokens, changeTokens] = useTokens()
  const [created, setCreated] = useState<CreatedGitToken>()
  const [creating, setCreating] = useState(false)
  const [toolId, setToolId] = useState(TOOLS[0]!.id)
  const [copied, setCopied] = useState(false)
  const tool = TOOLS.find(x => x.id === toolId) ?? TOOLS[0]!
  const address = base ?? choices?.[0]?.url
  const url = address ? `${address}/api/mcp` : ''
  const config = tool.config(url, created?.token ?? '<token>')

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>{t('Your AI tools (MCP)')}</CardTitle>
      </CardHeader>
      <div className="grid md:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={t('AI tools')} className="flex gap-1 overflow-x-auto border-b p-2 md:flex-col md:overflow-visible md:border-r md:border-b-0">
          {TOOLS.map(x => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setToolId(x.id)
                setCopied(false)
              }}
              aria-current={x.id === tool.id || undefined}
              className={cn('flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent', x.id === tool.id && 'bg-accent font-medium')}
            >
              {x.logo ? <ToolIcon logo={x.logo} className="size-4" /> : <Bot className="size-4 text-muted-foreground" />}
              <span className="whitespace-nowrap">{x.id === 'other' ? t('Other') : x.name}</span>
            </button>
          ))}
        </nav>

        <ol className="grid min-w-0 content-start gap-6 p-5">
          <Step n={1} title={t('Address')}>
            {!choices ? (
              <Skeleton className="h-9 w-full max-w-md" />
            ) : choices.length > 1 ? (
              <Select value={address} onValueChange={setBase}>
                <SelectTrigger className="w-full max-w-md font-mono text-xs" aria-label={t('Address')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choices.map(c => (
                    <SelectItem key={c.url} value={c.url} className="font-mono text-xs">
                      {c.url}/api/mcp
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <code className="w-fit max-w-full rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs break-all">{url}</code>
            )}
          </Step>

          <Step n={2} title={t('Token')}>
            <div className="grid max-w-2xl gap-3">
              {created ? (
                <NewToken token={created} />
              ) : (
                <Button variant="outline" className="w-fit" onClick={() => setCreating(true)}>
                  <Plus />
                  {t('Create token')}
                </Button>
              )}
              <TokenList
                tokens={tokens}
                use="mcp"
                onRevoked={id => {
                  changeTokens(list => list.filter(x => x.id !== id))
                  if (created?.id === id) setCreated(undefined)
                }}
              />
            </div>
            <CreateTokenDialog
              open={creating}
              onOpenChange={setCreating}
              use="mcp"
              defaultName={tool.id === 'other' ? 'MCP' : tool.name}
              onCreated={token => {
                setCreated(token)
                changeTokens(list => [token, ...list])
              }}
            />
          </Step>

          <Step n={3} title={tool.file ? t('Add to {file}', { file: tool.file }) : tool.id === 'claude-code' ? t('Run in a terminal') : t('Configuration')}>
            <div className="relative min-w-0 rounded-lg border bg-muted/40">
              <pre className="p-3 pr-12 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">{url ? config : ' '}</pre>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-1.5 right-1.5"
                aria-label={t('Copy')}
                disabled={!url}
                onClick={async () => {
                  if (!(await copyText(config))) return toast.error('Could not copy; select the text and copy it by hand')
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </Step>
        </ol>
      </div>
    </Card>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">{n}</span>
      <span className="self-center text-sm font-medium">{title}</span>
      <div className="col-start-2 grid min-w-0">{children}</div>
    </li>
  )
}

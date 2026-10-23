import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Activity, Cpu, Database, FolderKanban, Gauge, HardDrive, Layers, Server, Users, Zap } from 'lucide-react'
import type { AdminStats, MonitorHistory, MonitorRange, ServiceHealth } from '@coltex/shared'
import { PageHeader } from '@/components/shell/app-shell'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { formatBytes, formatNumber } from '@/lib/format'
import { intlLocale, plural, t, tk } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const POLL_MS = 5000
/** The history changes once a minute on the server. */
const HISTORY_POLL_MS = 30_000

const RANGES: { value: MonitorRange; label: string }[] = [
  { value: '1h', label: tk('1 hour') },
  { value: '6h', label: tk('6 hours') },
  { value: '24h', label: tk('24 hours') },
  { value: '7d', label: tk('7 days') },
  { value: '30d', label: tk('30 days') },
]

/** Polls the overview while the tab is visible. */
function useLiveStats() {
  const [stats, setStats] = useState<AdminStats>()
  const [error, setError] = useState<string>()
  const [updated, setUpdated] = useState<Date>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let stopped = false
    const poll = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const s = await api.adminStats()
          if (stopped) return
          setStats(s)
          setError(undefined)
          setUpdated(new Date())
        } catch (e) {
          if (!stopped) setError((e as Error).message)
        }
      }
      if (!stopped) timer.current = setTimeout(poll, POLL_MS)
    }
    void poll()
    return () => {
      stopped = true
      clearTimeout(timer.current)
    }
  }, [])
  return { stats, error, updated }
}

/** What the server recorded over the chosen period (it samples whether or not this page is open). */
function useHistory(range: MonitorRange) {
  const [history, setHistory] = useState<MonitorHistory>()
  useEffect(() => {
    let stopped = false
    setHistory(h => (h?.range === range ? h : undefined))
    const load = () => {
      if (document.visibilityState !== 'visible') return
      api.adminHistory(range).then(h => !stopped && setHistory(h), () => {})
    }
    load()
    const timer = setInterval(load, HISTORY_POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [range])
  return history
}

/** Axis labels: times for a day or less, dates beyond. */
function tickLabel(at: number, range: MonitorRange): string {
  const d = new Date(at)
  return range === '7d' || range === '30d'
    ? d.toLocaleDateString(intlLocale(), { month: 'numeric', day: 'numeric' })
    : d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
}

/** Ticks for the time axis: local midnights for the multi-day ranges (every few days for 30), else left to the chart. */
function dayTicks(history: MonitorHistory): number[] | undefined {
  if (history.range !== '7d' && history.range !== '30d') return undefined
  const first = Date.parse(history.points[0]?.at ?? '')
  const last = Date.parse(history.points.at(-1)?.at ?? '')
  const ticks: number[] = []
  const d = new Date(first)
  d.setHours(24, 0, 0, 0)
  for (let i = 0; d.getTime() <= last; i++, d.setDate(d.getDate() + 1)) if (history.range === '7d' || i % 5 === 0) ticks.push(d.getTime())
  return ticks
}

function tooltipLabel(at: number, history: MonitorHistory): string {
  const from = new Date(at)
  const to = new Date(at + history.bucketSeconds * 1000)
  const time = (d: Date) => d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
  const day = from.toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' })
  return history.bucketSeconds <= 60 ? `${day} ${time(from)}` : `${day} ${time(from)}–${time(to)}`
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d ? t('{d}d {h}h', { d, h }) : h ? t('{h}h {m}m', { h, m }) : t('{m}m', { m })
}

/** A green/amber/red dot with a soft pulse for "live" states. */
export function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'down' }) {
  const color = tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <span className="relative inline-flex size-2.5">
      {tone === 'ok' && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${color}`} />}
      <span className={`relative inline-flex size-2.5 rounded-full ${color}`} />
    </span>
  )
}

const SERVICE: Record<ServiceHealth['id'], { label: string; icon: typeof Server }> = {
  api: { label: tk('Web server'), icon: Server },
  database: { label: tk('Database'), icon: Database },
  valkey: { label: tk('Queue'), icon: Layers },
  compiler: { label: tk('Compiler'), icon: Cpu },
}

const STATUS_LABEL = { ok: tk('Operational'), degraded: tk('Busy'), down: tk('Down') }

function ServiceCard({ service, index, extra }: { service: ServiceHealth; index: number; extra?: string }) {
  const meta = SERVICE[service.id]
  const tone = service.status === 'ok' ? 'ok' : service.status === 'degraded' ? 'warn' : 'down'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className={cn('h-full gap-0 py-0', service.status === 'down' && 'border-red-500/40')}>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="rounded-lg bg-muted p-2 text-muted-foreground">
            <meta.icon className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t(meta.label)}</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <StatusDot tone={tone} /> {t(STATUS_LABEL[service.status])}
              </span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {service.latencyMs !== null ? t('Ping {ms} ms', { ms: service.latencyMs }) : extra ?? ' '}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** The latest value of a series, next to its colour. */
function NowValue({ color, label, pct, detail }: { color: string; label: string; pct: number | null; detail?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{pct === null ? '—' : `${pct.toFixed(1)}%`}</span>
      {detail && <span className="text-muted-foreground tabular-nums">· {detail}</span>}
    </span>
  )
}

function Meter({ label, value, max, detail }: { label: string; value: number; max: number; detail: ReactNode }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-auto font-medium tabular-nums">{detail}</span>
        <span className="w-11 text-right text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
      </div>
      <Progress value={pct} className={cn('h-2', pct > 90 ? '[&>*]:bg-red-500' : pct > 75 ? '[&>*]:bg-amber-500' : '')} />
    </div>
  )
}

/** CPU or memory of the server and the compilers, as percentages of what each may use, with server restarts as dashed lines (unlabelled: close restarts would overlap). */
function ResourceChart({ history, metric }: { history: MonitorHistory; metric: 'cpu' | 'memory' }) {
  const config = {
    server: { label: t('ColTex server'), color: 'var(--chart-1)' },
    compiler: { label: t('Compiler'), color: 'var(--chart-3)' },
  } satisfies ChartConfig
  const data = history.points.map(p => ({
    at: Date.parse(p.at),
    server: metric === 'cpu' ? p.serverCpu : p.serverMemPct,
    compiler: metric === 'cpu' ? p.compilerCpu : p.compilerMemPct,
    serverBytes: p.serverMem,
    compilerBytes: p.compilerMem,
  }))
  const first = data[0]?.at ?? 0
  const last = data.at(-1)?.at ?? 0
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 16 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={[first, last]}
          ticks={dayTicks(history)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
          tickFormatter={v => tickLabel(v as number, history.range)}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}%`}
          domain={[0, (max: number) => Math.min(100, Math.max(10, Math.ceil((max * 1.25) / 10) * 10))]}
        />
        {history.restarts.map(r => (
          <ReferenceLine
            key={r}
            x={Math.floor(Date.parse(r) / (history.bucketSeconds * 1000)) * history.bucketSeconds * 1000}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
        ))}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const at = payload?.[0]?.payload?.at as number | undefined
                return at ? tooltipLabel(at, history) : ''
              }}
              formatter={(value, name, item) => {
                const bytes = (item.payload as Record<string, number | null>)[`${String(name)}Bytes`]
                return (
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: `var(--color-${String(name)})` }} />
                      {name === 'server' ? t('ColTex server') : t('Compiler')}
                    </span>
                    <span className="font-mono tabular-nums">
                      {value}%{metric === 'memory' && bytes != null ? ` · ${formatBytes(bytes)}` : ''}
                    </span>
                  </span>
                )
              }}
            />
          }
        />
        {(['server', 'compiler'] as const).map(key => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            // A value with gaps on both sides draws no line: show it as a dot.
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const i = props.index ?? 0
              const lonely = data[i]?.[key] != null && data[i - 1]?.[key] == null && data[i + 1]?.[key] == null
              return lonely && props.cx != null && props.cy != null ? (
                <circle key={i} cx={props.cx} cy={props.cy} r={2.5} fill={`var(--color-${key})`} />
              ) : (
                <g key={i} />
              )
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

/** Builds per bucket over the chosen period, split into clean and failed. */
function CompileChart({ history }: { history: MonitorHistory }) {
  const config = {
    ok: { label: t('Succeeded'), color: 'var(--chart-1)' },
    failed: { label: t('Failed'), color: 'oklch(0.63 0.2 25)' },
  } satisfies ChartConfig
  const data = history.points.map(p => ({ at: Date.parse(p.at), ok: p.builds - p.failedBuilds, failed: p.failedBuilds }))
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={[(min: number) => min - history.bucketSeconds * 500, (max: number) => max + history.bucketSeconds * 500]}
          ticks={dayTicks(history)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={v => tickLabel(v as number, history.range)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const at = payload?.[0]?.payload?.at as number | undefined
                return at ? tooltipLabel(at, history) : ''
              }}
              indicator="dot"
            />
          }
        />
        <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" radius={[0, 0, 2, 2]} />
        <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

/** Monitoring: services, resources and activity of this instance, refreshed live. */
export function AdminOverviewPage() {
  const { stats, error, updated } = useLiveStats()
  const [range, setRange] = useState<MonitorRange>('24h')
  const [metric, setMetric] = useState<'cpu' | 'memory'>('cpu')
  const history = useHistory(range)
  const live = stats?.live
  const failRate = stats?.compiles.total ? Math.round((stats.compiles.failed / stats.compiles.total) * 100) : 0
  const memUsed = stats ? stats.host.memTotal - stats.host.memAvailable : 0

  return (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-2 px-3 py-1 text-xs font-normal text-muted-foreground">
              <StatusDot tone={error ? 'down' : stats ? 'ok' : 'warn'} />
              {updated ? t('Live · updated {time}', { time: updated.toLocaleTimeString(intlLocale()) }) : t('Connecting…')}
            </Badge>
            <Tabs value={range} onValueChange={v => setRange(v as MonitorRange)}>
              <TabsList>
                {RANGES.map(r => (
                  <TabsTrigger key={r.value} value={r.value}>
                    {t(r.label)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        }
      />
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats
          ? stats.services.map((s, i) => (
              <ServiceCard
                key={s.id}
                service={s}
                index={i}
                extra={
                  s.id === 'compiler'
                    ? plural(stats.compiler.workers, '{n} worker', '{n} workers')
                    : s.id === 'api'
                      ? t('Up {uptime}', { uptime: formatUptime(stats.server.uptimeSeconds) })
                      : undefined
                }
              />
            ))
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} label={t('Users')} value={stats?.users.total} icon={Users} tone="blue" hint={stats && t('{n} joined in the last 30 days', { n: stats.users.newLast30d })} />
        <StatCard index={1} label={t('Projects')} value={stats?.projects.total} icon={FolderKanban} tone="violet" hint={stats && t('{n} active this week', { n: stats.projects.activeLast7d })} />
        <StatCard
          index={2}
          label={t('Project storage')}
          value={stats?.projects.storageBytes}
          format={formatBytes}
          animate={false}
          icon={HardDrive}
          tone="sky"
          hint={stats && plural(stats.projects.files, '{n} file', '{n} files', { n: formatNumber(stats.projects.files) })}
        />
        <StatCard
          index={3}
          label={t('Builds (24 h)')}
          value={stats?.compiles.total}
          icon={Zap}
          tone={failRate > 50 ? 'rose' : 'emerald'}
          hint={stats && (stats.compiles.total ? t('{rate}% failed · {seconds} s on average', { rate: failRate, seconds: ((stats.compiles.avgMs ?? 0) / 1000).toFixed(1) }) : t('No builds yet'))}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <motion.div className="xl:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" /> {t('Resource use')}
              </CardTitle>
              <CardDescription>
                {metric === 'cpu' ? t('Share of the CPUs each may use.') : t('Share of each one’s memory limit (the machine’s memory if it has none).')}
              </CardDescription>
              <CardAction>
                <Tabs value={metric} onValueChange={v => setMetric(v as 'cpu' | 'memory')}>
                  <TabsList>
                    <TabsTrigger value="cpu">{t('CPU')}</TabsTrigger>
                    <TabsTrigger value="memory">{t('Memory')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3">
              {live && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <NowValue
                    color="var(--chart-1)"
                    label={t('ColTex server')}
                    pct={metric === 'cpu' ? live.serverCpu : (live.serverMem / live.serverMemLimit) * 100}
                    detail={metric === 'memory' ? `${formatBytes(live.serverMem)} / ${formatBytes(live.serverMemLimit)}` : undefined}
                  />
                  {live.compilerMem !== null && (
                    <NowValue
                      color="var(--chart-3)"
                      label={t('Compiler')}
                      pct={
                        metric === 'cpu'
                          ? live.compilerCpu
                          : live.compilerMemLimit
                            ? (live.compilerMem / live.compilerMemLimit) * 100
                            : null
                      }
                      detail={
                        metric === 'memory'
                          ? live.compilerMemLimit
                            ? `${formatBytes(live.compilerMem)} / ${formatBytes(live.compilerMemLimit)}`
                            : formatBytes(live.compilerMem)
                          : undefined
                      }
                    />
                  )}
                </div>
              )}
              {history ? <ResourceChart history={history} metric={metric} /> : <Skeleton className="h-56 w-full" />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4 text-muted-foreground" /> {stats?.host.docker ? t('Container') : t('Host')}
              </CardTitle>
              <CardDescription>
                {stats
                  ? stats.host.docker
                    ? t('What the container can use · {cpus}', { cpus: plural(stats.host.cpus, '{n} CPU', '{n} CPUs') })
                    : `${stats.host.platform} · ${plural(stats.host.cpus, '{n} CPU', '{n} CPUs')}`
                  : '…'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              {stats ? (
                <>
                  <Meter
                    label={t('Load (1 min)')}
                    value={stats.host.loadAvg[0] ?? 0}
                    max={stats.host.cpus}
                    detail={`${(stats.host.loadAvg[0] ?? 0).toFixed(2)} / ${stats.host.cpus}`}
                  />
                  <Meter
                    label={stats.host.docker ? t('Memory (all containers)') : t('Memory')}
                    value={memUsed}
                    max={stats.host.memTotal}
                    detail={`${formatBytes(memUsed)} / ${formatBytes(stats.host.memTotal)}`}
                  />
                  {stats.containers.map(c => (
                    <Meter
                      key={`${c.id}-${c.name}`}
                      label={c.id === 'server' ? t('ColTex server container') : t('Compiler container')}
                      value={c.used}
                      max={c.limit ?? stats.host.memTotal}
                      detail={c.limit ? `${formatBytes(c.used)} / ${formatBytes(c.limit)}` : t('{used} (no limit)', { used: formatBytes(c.used) })}
                    />
                  ))}
                  {stats.disk && (
                    <Meter
                      label={t('Disk (data directory)')}
                      value={stats.disk.total - stats.disk.free}
                      max={stats.disk.total}
                      detail={t('{free} free of {total}', { free: formatBytes(stats.disk.free), total: formatBytes(stats.disk.total) })}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('ColTex {version} · started {date}', {
                      version: stats.server.version,
                      date: new Date(stats.server.startedAt).toLocaleString(intlLocale()),
                    })}
                  </p>
                </>
              ) : (
                <Skeleton className="h-40" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="xl:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4 text-muted-foreground" /> {t('Compile activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>{history ? <CompileChart history={history} /> : <Skeleton className="h-52 w-full" />}</CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-4 text-muted-foreground" /> {t('Compile queue')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-center">
              {(
                [
                  ['workers', t('Workers')],
                  ['active', t('Compiling')],
                  ['waiting', t('Waiting')],
                  ['failed', t('Failed jobs kept')],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="rounded-lg bg-muted/60 p-3">
                  <div className="text-2xl font-semibold tabular-nums">{stats ? stats.compiler[k] : '—'}</div>
                  <div className="truncate text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </>
  )
}

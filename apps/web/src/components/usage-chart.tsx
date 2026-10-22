import { motion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import type { AiUsageReport } from '@coltex/shared'
import { ProviderIcon } from '@/components/provider-icon'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber } from '@/lib/format'
import { intlLocale, plural, t } from '@/lib/i18n'

/** The periods usage is shown for, in days (AI usage & access, Settings → AI agent). */
export const PERIODS = [7, 30, 90] as const
export type Period = (typeof PERIODS)[number]

export const formatCost = (n: number) => (n > 0 && n < 0.01 ? '< $0.01' : `$${n.toFixed(2)}`)

/** The period switch in a usage page's header. */
export function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <Tabs value={String(value)} onValueChange={v => onChange(Number(v) as Period)}>
      <TabsList>
        {PERIODS.map(p => (
          <TabsTrigger key={p} value={String(p)}>
            {plural(p, '{n} day', '{n} days')}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** AI requests or tokens per day (the usage page, Settings → AI agent). */
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

/** Requests, tokens and cost per model in a usage report. */
export function ByModel({ report, providerName }: { report: AiUsageReport; providerName?: (id: string) => string }) {
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
              {providerName && `${providerName(m.provider)} · `}
              {t('{tokens} tokens', { tokens: formatNumber(m.inputTokens + m.outputTokens) })}
            </span>
            {m.cost > 0 && <span>{formatCost(m.cost)}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { AiAllowance, AiUsageLimits } from '@coltex/shared'
import { api } from './api.ts'
import { t, tk } from './i18n.ts'

export const PERIOD_LABEL: Record<AiUsageLimits['period'], string> = { day: tk('Per day'), week: tk('Per week'), month: tk('Per month') }
/** The current period, for the meter. */
export const CURRENT_PERIOD: Record<AiUsageLimits['period'], string> = { day: tk('Today'), week: tk('This week'), month: tk('This month') }

/** 1234 → 1.2k, 2500000 → 2.5M. */
export function compactTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export const dollars = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`

/** "100k tokens + $5 per month", or nothing without limits. */
export function limitSummary(limits: AiUsageLimits): string {
  const parts = [limits.tokens !== null ? t('{n} tokens', { n: compactTokens(limits.tokens) }) : '', limits.cost !== null ? dollars(limits.cost) : ''].filter(Boolean)
  if (!parts.length) return ''
  const amount = parts.join(' + ')
  return limits.period === 'day' ? t('{amount} a day', { amount }) : limits.period === 'week' ? t('{amount} a week', { amount }) : t('{amount} a month', { amount })
}

/** The share of the tighter limit used, 0–1. */
export function allowanceShare(a: AiAllowance): number {
  const shares = [a.tokens ? a.usedTokens / a.tokens : 0, a.cost ? a.usedCost / a.cost : 0]
  return Math.min(1, Math.max(...shares))
}

/**
 * The person's AI allowance (null: no limits), asked again whenever `refresh`
 * changes (the panel passes whether the agent is running, so it updates after
 * each answer).
 */
export function useAiAllowance(refresh?: unknown): AiAllowance | null | undefined {
  const [allowance, setAllowance] = useState<AiAllowance | null>()
  useEffect(() => {
    let live = true
    api.aiAllowance().then(
      a => live && setAllowance(a),
      () => live && setAllowance(null),
    )
    return () => {
      live = false
    }
  }, [refresh])
  return allowance
}

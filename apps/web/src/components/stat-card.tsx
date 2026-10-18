import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/** Counts up to `value` when it appears, and from the old value to the new one when it changes (live pages). */
export function CountUp({ value, format = n => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: v => {
        from.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value])
  return <>{format(shown)}</>
}

/**
 * A number with its label. Kept plain on purpose: a small muted icon, no
 * coloured tiles. Counts animate up; values whose unit changes as they grow
 * (bytes, money) or that update live pass `animate={false}` so they don't flicker.
 */
export function StatCard(props: {
  label: string
  value?: number
  format?: (n: number) => string
  icon?: LucideIcon
  /** Kept for callers; the card no longer tints by tone. */
  tone?: string
  hint?: ReactNode
  index?: number
  animate?: boolean
}) {
  const { icon: Icon, format = n => String(Math.round(n)) } = props
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (props.index ?? 0) * 0.04, duration: 0.25 }}
    >
      <Card className="h-full gap-0 py-0">
        <CardContent className="grid gap-1 p-4 sm:p-5">
          <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            {props.label}
            {Icon && <Icon className="size-4 opacity-60" />}
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {props.value === undefined ? '—' : props.animate === false ? format(props.value) : <CountUp value={props.value} format={format} />}
          </span>
          {props.hint && <span className="text-xs text-muted-foreground">{props.hint}</span>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

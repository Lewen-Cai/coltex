import { cn } from '@/lib/utils'

/** Tailscale's mark (its nine dots), drawn in the text colour; the logo set has no Tailscale. */
export function TailscaleLogo({ className }: { className?: string }) {
  const solid = new Set(['0,1', '1,1', '2,1', '1,2'])
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 shrink-0', className)} aria-hidden>
      {[0, 1, 2].flatMap(y =>
        [0, 1, 2].map(x => <circle key={`${x},${y}`} cx={4 + x * 8} cy={4 + y * 8} r={2.7} fill="currentColor" opacity={solid.has(`${x},${y}`) ? 1 : 0.2} />),
      )}
    </svg>
  )
}

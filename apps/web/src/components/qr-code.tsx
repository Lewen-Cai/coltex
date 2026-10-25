import { useMemo } from 'react'
import { encode } from 'uqr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** A QR code drawn as one SVG path (black on white in every theme, so phones read it). */
export function QrCode({ text, className }: { text: string; className?: string }) {
  const path = useMemo(() => {
    const { data } = encode(text, { border: 2 })
    const cells: string[] = []
    data.forEach((row, y) => row.forEach((on, x) => on && cells.push(`M${x} ${y}h1v1h-1z`)))
    return { d: cells.join(''), size: data.length }
  }, [text])
  return (
    <svg viewBox={`0 0 ${path.size} ${path.size}`} className={cn('rounded-md bg-white text-black', className)} shapeRendering="crispEdges" role="img" aria-label={t('QR code')}>
      <path d={path.d} fill="currentColor" />
    </svg>
  )
}

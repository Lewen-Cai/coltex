import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { t } from '@/lib/i18n'

const STORAGE = 'coltex:composer-height:'
/** About two lines. */
const MIN = 40
const STEP = 24

const growLimit = () => window.innerHeight * 0.4
const dragLimit = () => Math.max(MIN, window.innerHeight * 0.7)

function saved(id: string): number | null {
  try {
    const h = Number(localStorage.getItem(STORAGE + id))
    return h >= MIN ? h : null
  } catch {
    return null
  }
}

/**
 * A message box that grows with its text (up to 40% of the window, then it
 * scrolls) and whose height the person can drag from its top edge: what
 * they drag becomes its least height, kept in this browser per kind of box
 * (`id`); double-clicking the edge goes back to fitting the text. Sizing is
 * done here rather than with `field-sizing`, which Safari and Firefox lack.
 */
export function useComposerHeight(id: string, text: string, existing?: RefObject<HTMLTextAreaElement | null>) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = existing ?? own
  const [height, setHeight] = useState<number | null>(() => saved(id))

  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const least = height ?? 0
    const most = Math.max(least, growLimit())
    el.style.height = 'auto'
    const wanted = Math.min(most, Math.max(least, el.scrollHeight + el.offsetHeight - el.clientHeight))
    el.style.height = `${wanted}px`
    el.style.overflowY = el.scrollHeight > el.clientHeight + 1 ? 'auto' : 'hidden'
  }, [height])

  useLayoutEffect(fit, [fit, text])
  useLayoutEffect(() => {
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  const keep = (h: number | null) => {
    setHeight(h)
    try {
      if (h === null) localStorage.removeItem(STORAGE + id)
      else localStorage.setItem(STORAGE + id, String(Math.round(h)))
    } catch {
      // Not kept: it applies until the page is reloaded.
    }
  }
  const clamp = (h: number) => Math.min(dragLimit(), Math.max(MIN, h))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    const startY = e.clientY
    const start = el.offsetHeight
    handle.setPointerCapture(e.pointerId)
    // Dragging up makes the box taller.
    const at = (y: number) => clamp(start + startY - y)
    const move = (ev: globalThis.PointerEvent) => setHeight(at(ev.clientY))
    const up = (ev: globalThis.PointerEvent) => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
      keep(at(ev.clientY))
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const current = ref.current?.offsetHeight ?? MIN
    keep(clamp(current + (e.key === 'ArrowUp' ? STEP : -STEP)))
  }

  /** Put it inside the box's (relatively positioned) border, as its first child. */
  const handle = (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t('Resize the message box')}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => keep(null)}
      onKeyDown={onKeyDown}
      className="group absolute inset-x-0 -top-1.5 z-10 flex h-3 cursor-row-resize touch-none justify-center outline-none"
    >
      <span className="mt-1 h-1 w-10 rounded-full bg-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </div>
  )
  const style: CSSProperties = { resize: 'none' }
  return { ref, handle, style }
}

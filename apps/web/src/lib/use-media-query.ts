import { useCallback, useSyncExternalStore } from 'react'

/** Whether a CSS media query matches now, re-rendering when that changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Below this the editor shows the code or the PDF, one at a time (px). */
export const NARROW_QUERY = '(max-width: 959px)'
/** Phone-sized: side panels cover the editor instead of sitting beside it. */
export const COMPACT_QUERY = '(max-width: 767px)'

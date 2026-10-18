import { useEffect, useState } from 'react'

/**
 * Minimal hash router: `#/` dashboard (every project; `#/projects` too), `#/project/<id>` editor,
 * `#/admin/...` admin panel, `#/invite/<token>` redeems an invite.
 */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`
}

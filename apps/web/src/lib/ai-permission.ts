import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AiPermission } from '@coltex/shared'
import { api } from './api.ts'
import { tk } from './i18n.ts'

/** The three permissions, in order, with what each does (Settings → AI and the AI panel). */
export const PERMISSIONS: { value: AiPermission; title: string; description: string }[] = [
  { value: 'manual', title: tk('Manual'), description: tk('You review every change before it is applied. MCP agents’ edits become your suggestions.') },
  { value: 'auto', title: tk('Auto'), description: tk('Changes are applied when the agent finishes, and rolled back if the build gets worse.') },
  { value: 'full', title: tk('Full access'), description: tk('As Auto, and agents may also delete, move and rename files.') },
]

export const PERMISSION_TITLE: Record<AiPermission, string> = { manual: tk('Manual'), auto: tk('Auto'), full: tk('Full access') }

/** Sent when the permission changes, so the settings page and open AI panels agree. */
const CHANGED = 'coltex:ai-permission'

/** The person's AI permission (undefined while loading) and a setter that saves it. */
export function useAiPermission(): [AiPermission | undefined, (p: AiPermission) => Promise<void>] {
  const [permission, setPermission] = useState<AiPermission>()

  useEffect(() => {
    let live = true
    api.aiPermission().then(
      r => live && setPermission(r.permission),
      () => live && setPermission('manual'),
    )
    const changed = (e: Event) => setPermission((e as CustomEvent<AiPermission>).detail)
    window.addEventListener(CHANGED, changed)
    return () => {
      live = false
      window.removeEventListener(CHANGED, changed)
    }
  }, [])

  const choose = useCallback(async (next: AiPermission) => {
    try {
      const { permission: saved } = await api.setAiPermission(next)
      window.dispatchEvent(new CustomEvent(CHANGED, { detail: saved }))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [])

  return [permission, choose]
}

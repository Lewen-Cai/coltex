import { useCallback, useState } from 'react'

/**
 * How this browser compiles a project, as in Overleaf's compile menu: auto
 * compile, draft mode, and whether to stop at the first error. Kept per
 * project in this browser only; they don't change the project for others.
 */
export type CompileSettings = { autoCompile: boolean; draft: boolean; stopOnFirstError: boolean }

const DEFAULTS: CompileSettings = { autoCompile: false, draft: false, stopOnFirstError: false }
const key = (projectId: string) => `coltex:compile:${projectId}`

function load(projectId: string): CompileSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key(projectId)) ?? '{}') as Partial<CompileSettings>
    return {
      autoCompile: saved.autoCompile === true,
      draft: saved.draft === true,
      stopOnFirstError: saved.stopOnFirstError === true,
    }
  } catch {
    return DEFAULTS
  }
}

export function useCompileSettings(projectId: string) {
  const [settings, setSettings] = useState(() => load(projectId))
  const update = useCallback(
    (patch: Partial<CompileSettings>) => {
      setSettings(current => {
        const next = { ...current, ...patch }
        try {
          localStorage.setItem(key(projectId), JSON.stringify(next))
        } catch {}
        return next
      })
    },
    [projectId],
  )
  return [settings, update] as const
}

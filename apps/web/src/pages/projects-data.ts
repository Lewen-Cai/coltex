import { useCallback, useEffect, useState } from 'react'
import type { ProjectSummary } from '@coltex/shared'
import { PROJECTS_CHANGED } from '@/components/shell/project-dialogs'
import { api } from '@/lib/api'

/** The user's projects, reloaded when one is created, imported or deleted. */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>()
  const [error, setError] = useState<string>()

  const reload = useCallback(() => {
    api.listProjects().then(
      p => {
        setProjects(p)
        setError(undefined)
      },
      e => setError((e as Error).message),
    )
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener(PROJECTS_CHANGED, reload)
    return () => window.removeEventListener(PROJECTS_CHANGED, reload)
  }, [reload])

  return { projects, error, reload }
}

/** Which part of the user's list a page shows (Overleaf's sidebar filters). */
export type ListView = { kind: 'all' } | { kind: 'shared' } | { kind: 'archived' } | { kind: 'trash' } | { kind: 'tag'; tagId: string }

/** Whether a project belongs in a view (before search and the owner filter). As in Overleaf, archived and trashed projects only show in their own views. */
export function inView(p: ProjectSummary, view: ListView): boolean {
  switch (view.kind) {
    case 'archived':
      return p.archived
    case 'trash':
      return p.trashed
    case 'shared':
      return !p.archived && !p.trashed && p.role !== 'owner'
    case 'tag':
      return !p.archived && !p.trashed && p.tagIds.includes(view.tagId)
    default:
      return !p.archived && !p.trashed
  }
}

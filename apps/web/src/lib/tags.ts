import { useEffect, useSyncExternalStore } from 'react'
import type { Tag } from '@coltex/shared'
import { api } from './api.ts'

/**
 * The user's tags, shared by the sidebar, the project list and the menus.
 * Changes go through the helpers below, which refetch and notify everyone.
 */
let tags: Tag[] | undefined
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function reloadTags(): Promise<void> {
  loading = api.listTags().then(
    t => {
      tags = t
      emit()
    },
    () => {
      // Signed out or offline: keep what we had; the next change retries.
    },
  )
  return loading
}

export function useTags(): Tag[] | undefined {
  const value = useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => tags,
  )
  useEffect(() => {
    if (!tags && !loading) void reloadTags()
  }, [])
  return value
}

/** Run a change, then refresh the tags (also after a failure, so the UI matches the server). */
export async function changeTags(action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } finally {
    await reloadTags()
  }
}

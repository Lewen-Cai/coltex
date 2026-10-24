import { useSyncExternalStore } from 'react'
import type { AvatarHues } from '@coltex/shared'
import { api } from './api.ts'

/**
 * Avatar and cursor colours: a hue each person may choose in their profile
 * (`/api/me/preferences`), else one made from their id. Everyone's chosen
 * hues are loaded once after sign-in, so any avatar or cursor can be drawn.
 */
let hues: AvatarHues = {}
let version = 0
const listeners = new Set<() => void>()

function changed() {
  version++
  for (const l of listeners) l()
}

/** The hue made from a user id, for people who haven't chosen one. */
export function defaultHue(userId: string): number {
  let hash = 0
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 360
}

export function avatarHue(userId: string): number {
  return hues[userId] ?? defaultHue(userId)
}

/** The colour of a hue: dark enough for white initials in every theme. */
export function hueColor(hue: number): string {
  return `hsl(${hue} 70% 42%)`
}

/** The hues people chose, once signed in. */
export async function loadAvatarHues(): Promise<void> {
  try {
    hues = await api.avatarHues()
    changed()
  } catch {
    // Everyone keeps the colour made from their id.
  }
}

/** The person's own choice (null: back to the one made from their id), shown at once. */
export function showOwnAvatarHue(userId: string, hue: number | null): void {
  const next = { ...hues }
  if (hue === null) delete next[userId]
  else next[userId] = hue
  hues = next
  changed()
}

/** Re-render when someone's colour changes. */
export function useAvatarHues(): number {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version,
  )
}

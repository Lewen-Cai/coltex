import { useEffect, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'
import { learnedWords as editorWords, setLearnedWords } from './extensions/learned-words'

/**
 * The user's spelling dictionary, fetched once per page load and shared by the
 * editor and the settings page. Editors learn words through the spelling menu
 * (which also updates this list); the settings page removes them.
 */
let words: string[] | undefined
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()

function emit(next: string[]) {
  words = next
  setLearnedWords(next)
  for (const l of listeners) l()
}

export function loadLearnedWords(force = false): Promise<void> {
  if (!loading || force) {
    loading = api.learnedWords().then(
      r => emit(r.words),
      error => {
        // Spell checking still works without the user's words; try again next time.
        loading = undefined
        if (words === undefined) emit([])
        throw error
      },
    )
  }
  return loading
}

/** Record a change made elsewhere (the editor's spelling menu or the settings page). */
export function noteLearnedWord(word: string, learned: boolean) {
  const current = words ?? [...editorWords.global]
  emit(learned ? [...new Set([...current, word])] : current.filter(w => w !== word))
}

/** The learned words, or undefined while they load. */
export function useLearnedWords(): string[] | undefined {
  useEffect(() => {
    loadLearnedWords().catch(error => console.error(error))
  }, [])
  return useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => words,
  )
}

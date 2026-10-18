import { useSyncExternalStore } from 'react'
import { isEditorTheme, type EditorThemeId } from './editor-themes.ts'
import { cleanShortcuts, type CustomShortcuts } from './shortcuts.ts'

/**
 * How the code editor looks and behaves for this person, as in Overleaf's
 * editor settings. Kept in this browser (like the compile settings) and the
 * same for every project; open editors change as soon as a setting does.
 */
export type EditorSettings = {
  fontSize: number
  fontFamily: 'monospace' | 'sans'
  lineHeight: 'compact' | 'normal' | 'wide'
  keybindings: 'default' | 'vim' | 'emacs'
  /** Colours of the source (lib/editor-themes.ts). */
  editorTheme: EditorThemeId
  /** The LaTeX code check (unclosed environments, maths outside maths, …). */
  codeCheck: boolean
  mathPreview: boolean
  autoCloseBrackets: boolean
  autoComplete: boolean
  /** The file and section path above the editor. */
  breadcrumbs: boolean
  /** Keys the person chose for editor commands (lib/shortcuts.ts). */
  shortcuts: CustomShortcuts
}

export const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 24]

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 15,
  fontFamily: 'monospace',
  lineHeight: 'normal',
  keybindings: 'default',
  editorTheme: 'default',
  codeCheck: true,
  mathPreview: true,
  autoCloseBrackets: true,
  autoComplete: true,
  breadcrumbs: true,
  shortcuts: {},
}

const KEY = 'coltex:editor'

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function load(): EditorSettings {
  const d = DEFAULT_EDITOR_SETTINGS
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<keyof EditorSettings, unknown>>
    const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
    return {
      fontSize: FONT_SIZES.includes(saved.fontSize as number) ? (saved.fontSize as number) : d.fontSize,
      fontFamily: oneOf(saved.fontFamily, ['monospace', 'sans'] as const, d.fontFamily),
      lineHeight: oneOf(saved.lineHeight, ['compact', 'normal', 'wide'] as const, d.lineHeight),
      keybindings: oneOf(saved.keybindings, ['default', 'vim', 'emacs'] as const, d.keybindings),
      editorTheme: isEditorTheme(saved.editorTheme) ? saved.editorTheme : d.editorTheme,
      codeCheck: bool(saved.codeCheck, d.codeCheck),
      mathPreview: bool(saved.mathPreview, d.mathPreview),
      autoCloseBrackets: bool(saved.autoCloseBrackets, d.autoCloseBrackets),
      autoComplete: bool(saved.autoComplete, d.autoComplete),
      breadcrumbs: bool(saved.breadcrumbs, d.breadcrumbs),
      shortcuts: cleanShortcuts(saved.shortcuts),
    }
  } catch {
    return d
  }
}

let current = load()
const listeners = new Set<() => void>()

export function getEditorSettings() {
  return current
}

export function updateEditorSettings(patch: Partial<EditorSettings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {}
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useEditorSettings() {
  return useSyncExternalStore(subscribe, getEditorSettings)
}

export const LINE_HEIGHTS: Record<EditorSettings['lineHeight'], number> = { compact: 1.33, normal: 1.6, wide: 2 }

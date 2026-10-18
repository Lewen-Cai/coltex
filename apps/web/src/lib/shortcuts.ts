import { tk } from './i18n.ts'
import { isMac } from './platform.ts'

/**
 * The editor commands people can give their own keys (Settings → Keyboard
 * shortcuts, kept with the other editor settings in this browser). Bindings
 * use CodeMirror's notation: Mod is ⌘ on a Mac and Ctrl elsewhere.
 */
export const SHORTCUT_COMMANDS = [
  { id: 'compile', label: tk('Compile'), defaults: ['Mod-s', 'Mod-Enter'] },
  { id: 'search', label: tk('Search'), defaults: ['Mod-f', 'Mod-Shift-f'] },
  { id: 'bold', label: tk('Bold'), defaults: ['Mod-b'] },
  { id: 'italic', label: tk('Italic'), defaults: ['Mod-i'] },
  { id: 'toggleComment', label: tk('Comment or uncomment lines'), defaults: ['Mod-/'] },
  { id: 'deleteLine', label: tk('Delete line'), defaults: ['Mod-Shift-k'] },
  { id: 'selectNext', label: tk('Select the next occurrence'), defaults: ['Mod-d'] },
  { id: 'selectAll', label: tk('Select all occurrences'), defaults: ['Mod-Shift-l'] },
  { id: 'gotoLine', label: tk('Go to line'), defaults: ['Mod-Alt-g'] },
  { id: 'addComment', label: tk('Comment on the selection'), defaults: ['Mod-Alt-m'] },
] as const

export type ShortcutCommand = (typeof SHORTCUT_COMMANDS)[number]['id']

/** The person's own bindings: one key per command they changed. */
export type CustomShortcuts = Partial<Record<ShortcutCommand, string>>

/** The keys that run a command now. */
export function bindingsFor(id: ShortcutCommand, custom: CustomShortcuts): readonly string[] {
  return custom[id] ? [custom[id]!] : SHORTCUT_COMMANDS.find(c => c.id === id)!.defaults
}

/** The command a key is bound to (other than `except`), to warn before taking it. */
export function commandWithKey(key: string, custom: CustomShortcuts, except?: ShortcutCommand): ShortcutCommand | undefined {
  const norm = normalize(key)
  return SHORTCUT_COMMANDS.find(c => c.id !== except && bindingsFor(c.id, custom).some(b => normalize(b) === norm))?.id
}

const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Alt', 'Shift']

/** Modifiers in one order and the key in lower case, so equal bindings compare equal. */
function normalize(binding: string): string {
  const parts = binding.split(/-(?=.)/)
  const key = parts.pop()!
  const mods = MODIFIER_ORDER.filter(m => parts.includes(m))
  return [...mods, key.length === 1 ? key.toLowerCase() : key].join('-')
}

/**
 * A key press as a binding, or undefined while only modifiers are held. On a
 * Mac ⌘ is Mod; elsewhere Ctrl is Mod. A binding needs a modifier, or a
 * function key, so typing can't be taken over.
 */
export function bindingFromEvent(e: KeyboardEvent): string | undefined {
  if (['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'Dead'].includes(e.key)) return undefined
  const mod = isMac ? e.metaKey : e.ctrlKey
  const ctrl = isMac && e.ctrlKey
  const fn = /^F\d{1,2}$/.test(e.key)
  if (!mod && !ctrl && !e.altKey && !fn) return undefined
  // With Alt (Option on a Mac) e.key is the composed character; the physical key is what is meant.
  let key = e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.code.startsWith('Digit') ? e.code.slice(5) : e.key
  if (key === ' ') key = 'Space'
  if (key.length === 1) key = key.toLowerCase()
  return [mod && 'Mod', ctrl && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key].filter(Boolean).join('-')
}

/** Only known commands with a plausible binding survive reading from storage. */
export function cleanShortcuts(value: unknown): CustomShortcuts {
  if (!value || typeof value !== 'object') return {}
  const out: CustomShortcuts = {}
  for (const c of SHORTCUT_COMMANDS) {
    const v = (value as Record<string, unknown>)[c.id]
    if (typeof v === 'string' && v.length > 0 && v.length < 40) out[c.id] = v
  }
  return out
}

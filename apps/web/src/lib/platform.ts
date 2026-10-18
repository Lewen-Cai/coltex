/** Whether this browser runs on Apple's systems, where Mod is ⌘ and keys are written as symbols. */
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Enter: isMac ? '↩' : 'Enter',
  Space: 'Space',
  Backspace: isMac ? '⌫' : 'Backspace',
}

/**
 * A key binding in CodeMirror's notation ("Mod-Shift-f") or written with
 * "+" ("Mod+Shift+F") as the keys to press on this platform: Mod is ⌘ on a
 * Mac and Ctrl elsewhere, and Ctrl/Alt/Shift are ⌃/⌥/⇧ on a Mac.
 */
export function keyParts(binding: string): string[] {
  // "Mod-]" splits into Mod and ]; "Ctrl-Shift-[" into Ctrl, Shift and [; "Ctrl++" into Ctrl and +.
  const parts = binding.split(/[-+](?=.)/)
  return parts.map(part => {
    if (part === 'Mod') return isMac ? '⌘' : 'Ctrl'
    if (part === 'Cmd' || part === 'Meta') return isMac ? '⌘' : 'Win'
    if (part === 'Ctrl') return isMac ? '⌃' : 'Ctrl'
    if (part === 'Alt' || part === 'Option') return isMac ? '⌥' : 'Alt'
    if (part === 'Shift') return isMac ? '⇧' : 'Shift'
    return KEY_NAMES[part] ?? (part.length === 1 ? part.toUpperCase() : part)
  })
}

/** One string, as menus show shortcuts: "⇧⌘F" on a Mac, "Ctrl+Shift+F" elsewhere. */
export function formatKeys(binding: string): string {
  const parts = keyParts(binding)
  return isMac ? parts.join('') : parts.join('+')
}

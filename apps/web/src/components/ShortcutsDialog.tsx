import { Fragment } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { useEditorSettings } from '@/lib/editor-settings'
import { t, tk } from '@/lib/i18n'
import { isMac, keyParts } from '@/lib/platform'
import { bindingsFor, type ShortcutCommand } from '@/lib/shortcuts'

/**
 * The editor's keyboard shortcuts (after Overleaf's hotkeys modal). Every
 * entry is a binding the editor really has: CodeMirror's default, search,
 * fold and completion keymaps, Overleaf's LaTeX and visual-mode keymaps as
 * ported, and ColTex's own (compile, project search, comments). Keys use
 * CodeMirror's notation: Mod is Cmd on a Mac and Ctrl elsewhere. Entries with
 * a `command` show the person's own keys (lib/shortcuts.ts).
 */
type Shortcut = { keys: string[]; mac?: string[]; label: string; command?: ShortcutCommand }

const SECTIONS: { title: string; items: Shortcut[] }[] = [
  {
    title: tk('Common'),
    items: [
      { keys: [], label: tk('Compile'), command: 'compile' },
      { keys: ['Mod-z'], label: tk('Undo') },
      { keys: ['Mod-y'], mac: ['Mod-Shift-z'], label: tk('Redo') },
      { keys: [], label: tk('Search and replace (Search panel)'), command: 'search' },
    ],
  },
  {
    title: tk('Navigation'),
    items: [
      { keys: ['Mod-Home'], label: tk('Go to the beginning of the document') },
      { keys: ['Mod-End'], label: tk('Go to the end of the document') },
      { keys: [], label: tk('Go to line'), command: 'gotoLine' },
      { keys: ['F3', 'Mod-g'], label: tk('Next match') },
      { keys: ['Shift-F3', 'Mod-Shift-g'], label: tk('Previous match') },
    ],
  },
  {
    title: tk('Editing'),
    items: [
      { keys: [], label: tk('Bold'), command: 'bold' },
      { keys: [], label: tk('Italic'), command: 'italic' },
      { keys: [], label: tk('Comment or uncomment lines'), command: 'toggleComment' },
      { keys: [], label: tk('Delete line'), command: 'deleteLine' },
      { keys: ['Alt-ArrowUp', 'Alt-ArrowDown'], label: tk('Move line up or down') },
      { keys: ['Shift-Alt-ArrowUp', 'Shift-Alt-ArrowDown'], label: tk('Copy line up or down') },
      { keys: [], label: tk('Select the next occurrence'), command: 'selectNext' },
      { keys: [], label: tk('Select all occurrences'), command: 'selectAll' },
      { keys: ['Mod-Alt-ArrowUp', 'Mod-Alt-ArrowDown'], label: tk('Add a cursor above or below') },
      { keys: ['Tab', 'Shift-Tab'], label: tk('Indent or unindent') },
      { keys: ['Mod-]', 'Mod-['], label: tk('Indent or unindent the list item (visual editor)') },
    ],
  },
  {
    title: tk('Folding'),
    items: [
      { keys: ['Ctrl-Shift-[', 'Ctrl-Shift-]'], mac: ['Mod-Alt-[', 'Mod-Alt-]'], label: tk('Fold or unfold here') },
      { keys: ['Ctrl-Alt-[', 'Ctrl-Alt-]'], label: tk('Fold or unfold everything') },
    ],
  },
  {
    title: tk('Autocomplete'),
    items: [
      // On a Mac, Ctrl+Space often switches the input method; Option+` works too.
      { keys: ['Ctrl-Space'], mac: ['Ctrl-Space', 'Alt-`'], label: tk('Show suggestions (commands, \\ref and \\cite keys)') },
      { keys: ['ArrowUp', 'ArrowDown'], label: tk('Choose a suggestion') },
      { keys: ['Enter'], label: tk('Insert the suggestion') },
      { keys: ['Escape'], label: tk('Close the suggestions') },
    ],
  },
  {
    title: tk('Review'),
    items: [{ keys: [], label: tk('Comment on the selection'), command: 'addComment' }],
  },
  {
    title: tk('Table editor (visual editor)'),
    items: [
      { keys: ['Enter'], label: tk('Edit the cell, or finish editing') },
      { keys: ['Tab', 'Shift-Tab'], label: tk('Next or previous cell') },
      { keys: ['Escape'], label: tk('Cancel editing, or leave the table') },
      { keys: ['Delete'], label: tk('Clear the selected cells') },
    ],
  },
]

export function ShortcutsDialog({ open, onOpenChange, canComment }: { open: boolean; onOpenChange: (open: boolean) => void; canComment: boolean }) {
  const { shortcuts } = useEditorSettings()
  const keysOf = (item: Shortcut) => (item.command ? bindingsFor(item.command, shortcuts) : isMac && item.mac ? item.mac : item.keys)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Keyboard shortcuts')}</DialogTitle>
        </DialogHeader>
        <div className="columns-1 gap-8 sm:columns-2">
          {SECTIONS.filter(s => canComment || s.title !== 'Review').map(section => (
            <section key={section.title} className="mb-5 break-inside-avoid">
              <h3 className="mb-2 text-sm font-semibold">{t(section.title)}</h3>
              <ul className="grid gap-1.5">
                {section.items.map(item => (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t(item.label)}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {keysOf(item).map((binding, i) => (
                        <Fragment key={binding}>
                          {i > 0 && <span className="text-xs text-muted-foreground">/</span>}
                          <KbdGroup>
                            {keyParts(binding).map((key, j) => (
                              <Kbd key={j}>{key}</Kbd>
                            ))}
                          </KbdGroup>
                        </Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, Copy, Download, FileText, LayoutTemplate, RotateCcw, Share2, WholeWord } from 'lucide-react'
import type { EngineSetting, ProjectMeta, SpellCheckLanguage } from '@coltex/shared'
import { copyText } from '../lib/clipboard.ts'
import { EDITOR_THEMES } from '../lib/editor-themes.ts'
import { FONT_SIZES, updateEditorSettings, useEditorSettings, type EditorSettings } from '../lib/editor-settings.ts'
import { t, tk, tr } from '../lib/i18n.ts'
import { formatKeys, isMac, keyParts } from '../lib/platform.ts'
import { SHORTCUT_COMMANDS, bindingFromEvent, bindingsFor, commandWithKey, type ShortcutCommand } from '../lib/shortcuts.ts'
import { cn } from '../lib/utils.ts'
import { spellLanguageName } from '../spelling/index.ts'
import { openPublishTemplate } from './publish-template-dialog.tsx'
import { SkillLibrary } from './skills/skill-library.tsx'
import { Button } from './ui/button.tsx'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx'
import { Kbd, KbdGroup } from './ui/kbd.tsx'
import { Switch } from './ui/switch.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { DictionaryManager } from './dictionary-manager.tsx'
import { LinkList } from './link-list.tsx'
import { McpSettings } from './mcp-settings.tsx'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectMeta | undefined
  canEdit: boolean
  isOwner: boolean
  texFiles: string[]
  spellOptions: { code: string; name: string }[]
  onUpdate: (patch: Partial<Pick<ProjectMeta, 'engine' | 'rootFile' | 'spellCheckLanguage'>>) => void
  onWordCount: () => void
  onCopy: () => void
  onConvert: () => void
  /** The person has the AI agent: the project's skills are shown. */
  aiAvailable: boolean
}

/** The project's clone address (the Git bridge) for each address ColTex has, with how to sign in. */
function GitClone({ projectId }: { projectId: string }) {
  return (
    <div className="grid min-w-0 gap-1.5 px-2">
      <LinkList format={base => `git clone ${base}/api/git/${projectId}.git`} />
      <p className="text-xs text-muted-foreground">
        {tr('When git asks, use any user name and a Git token as the password ({settings}).', {
          settings: (
            <a href="#/settings/sync" className="text-primary underline-offset-4 hover:underline">
              {t('Settings → Sync services')}
            </a>
          ),
        })}
      </p>
    </div>
  )
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground'

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

/** A Select for one editor setting. */
function EditorChoice<K extends 'fontFamily' | 'lineHeight' | 'keybindings' | 'editorTheme'>({
  label,
  setting,
  options,
}: {
  label: string
  setting: K
  options: { value: EditorSettings[K]; label: string }[]
}) {
  const settings = useEditorSettings()
  return (
    <Setting label={label}>
      <Select value={settings[setting]} onValueChange={v => updateEditorSettings({ [setting]: v } as Partial<EditorSettings>)}>
        <SelectTrigger className="w-48" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Setting>
  )
}

function EditorSwitch({ label, setting }: { label: string; setting: 'codeCheck' | 'mathPreview' | 'autoCloseBrackets' | 'autoComplete' | 'breadcrumbs' }) {
  const settings = useEditorSettings()
  return (
    <Setting label={label}>
      <Switch checked={settings[setting]} onCheckedChange={on => updateEditorSettings({ [setting]: on })} aria-label={label} />
    </Setting>
  )
}

/** How the editor looks: the person's, in this browser, for every project (as Overleaf's settings menu). */
function AppearanceSettings() {
  const settings = useEditorSettings()
  return (
    <>
      <Setting label={t('Font size')}>
        <Select value={String(settings.fontSize)} onValueChange={v => updateEditorSettings({ fontSize: Number(v) })}>
          <SelectTrigger className="w-48" aria-label={t('Font size')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map(size => (
              <SelectItem key={size} value={String(size)}>
                {size} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>
      <EditorChoice
        label={t('Font')}
        setting="fontFamily"
        options={[
          { value: 'monospace', label: t('Monospace') },
          { value: 'sans', label: t('Sans-serif') },
        ]}
      />
      <EditorChoice
        label={t('Line height')}
        setting="lineHeight"
        options={[
          { value: 'compact', label: t('Compact') },
          { value: 'normal', label: t('Normal') },
          { value: 'wide', label: t('Wide') },
        ]}
      />
      <EditorChoice
        label={t('Code colours')}
        setting="editorTheme"
        options={EDITOR_THEMES.map(theme => ({ value: theme.id, label: theme.id === 'default' ? t('Default') : theme.name }))}
      />
      <EditorSwitch label={t('Breadcrumbs')} setting="breadcrumbs" />
    </>
  )
}

/** How the editor behaves while typing. */
function EditingSettings() {
  return (
    <>
      <EditorChoice
        label={t('Keybindings')}
        setting="keybindings"
        options={[
          { value: 'default', label: t('Default') },
          { value: 'vim', label: 'Vim' },
          { value: 'emacs', label: 'Emacs' },
        ]}
      />
      <EditorSwitch label={t('Code check')} setting="codeCheck" />
      <EditorSwitch label={t('Equation preview')} setting="mathPreview" />
      <EditorSwitch label={t('Auto-close brackets')} setting="autoCloseBrackets" />
      <EditorSwitch label={t('Autocomplete')} setting="autoComplete" />
    </>
  )
}

function Keys({ binding }: { binding: string }) {
  return (
    <KbdGroup>
      {keyParts(binding).map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </KbdGroup>
  )
}

/** Keys that stay with the browser and the editor's basics; they can't be given to a command. */
const RESERVED = ['Mod-z', 'Mod-y', 'Mod-Shift-z', 'Mod-c', 'Mod-v', 'Mod-x', 'Mod-a', 'Mod-w', 'Mod-t', 'Mod-q', 'Mod-r', 'Mod-n']

/** The person's keys for editor commands: click Change, press the new keys (Esc cancels). */
function ShortcutSettings() {
  const { shortcuts } = useEditorSettings()
  const [recording, setRecording] = useState<ShortcutCommand>()
  const [problem, setProblem] = useState<string>()

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      // While recording, keys belong here: not to the editor, and Esc doesn't close the dialog.
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(undefined)
        setProblem(undefined)
        return
      }
      const binding = bindingFromEvent(e)
      if (!binding) {
        if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) setProblem(t('Use {mod} or {alt} with the key.', { mod: isMac ? '⌘' : 'Ctrl', alt: isMac ? '⌥' : 'Alt' }))
        return
      }
      if (RESERVED.includes(binding)) return setProblem(t('{keys} is kept for the browser and basic editing.', { keys: formatKeys(binding) }))
      const taken = commandWithKey(binding, shortcuts, recording)
      if (taken) {
        const label = SHORTCUT_COMMANDS.find(c => c.id === taken)!.label
        return setProblem(t('{keys} is already used for “{command}”.', { keys: formatKeys(binding), command: t(label) }))
      }
      const defaults = SHORTCUT_COMMANDS.find(c => c.id === recording)!.defaults as readonly string[]
      const next = { ...shortcuts }
      if (defaults.length === 1 && defaults[0] === binding) delete next[recording]
      else next[recording] = binding
      updateEditorSettings({ shortcuts: next })
      setRecording(undefined)
      setProblem(undefined)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, shortcuts])

  const reset = (id?: ShortcutCommand) => {
    if (!id) return updateEditorSettings({ shortcuts: {} })
    const next = { ...shortcuts }
    delete next[id]
    updateEditorSettings({ shortcuts: next })
  }

  return (
    <div className="grid gap-1">
      {SHORTCUT_COMMANDS.map(c => (
        <div key={c.id} className="grid gap-1 px-2 py-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t(c.label)}</span>
            <div className="flex items-center gap-2">
              {recording === c.id ? (
                <span className="animate-pulse text-xs text-primary">{t('Press the new keys…')}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {bindingsFor(c.id, shortcuts).map((b, i) => (
                    <span key={b} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-xs text-muted-foreground">/</span>}
                      <Keys binding={b} />
                    </span>
                  ))}
                </span>
              )}
              {shortcuts[c.id] && recording !== c.id && (
                <Button variant="ghost" size="icon-xs" onClick={() => reset(c.id)} aria-label={t('Reset to default')}>
                  <RotateCcw />
                </Button>
              )}
              <Button
                variant={recording === c.id ? 'secondary' : 'outline'}
                size="xs"
                onClick={() => {
                  setProblem(undefined)
                  setRecording(r => (r === c.id ? undefined : c.id))
                }}
              >
                {recording === c.id ? t('Cancel') : t('Change')}
              </Button>
            </div>
          </div>
          {recording === c.id && problem && <p className="text-right text-xs text-destructive">{problem}</p>}
        </div>
      ))}
      {Object.keys(shortcuts).length > 0 && (
        <div className="flex justify-end px-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            <RotateCcw /> {t('Reset all to defaults')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Searchable, since there are more than 70 dictionaries. */
function SpellLanguagePicker({
  value,
  options,
  disabled,
  onChange,
}: {
  value: SpellCheckLanguage | undefined
  options: { code: string; name: string }[]
  disabled: boolean
  /** '' turns spell checking off. */
  onChange: (code: SpellCheckLanguage) => void
}) {
  const [open, setOpen] = useState(false)
  const pick = (code: string) => {
    onChange(code as SpellCheckLanguage)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-48 justify-between font-normal" disabled={disabled} aria-label={t('Spell check')}>
          <span className="truncate">{value ? spellLanguageName(value) : t('Off')}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <Command>
          <CommandInput placeholder={t('Search languages…')} />
          <CommandList className="max-h-72">
            <CommandEmpty>{t('No languages found.')}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="off" onSelect={() => pick('')}>
                {t('Off')}
                <Check className={cn('ml-auto', value ? 'opacity-0' : '')} />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {options.map(l => (
                <CommandItem key={l.code} value={`${l.name} ${l.code}`} onSelect={() => pick(l.code)}>
                  {l.name}
                  <Check className={cn('ml-auto', value === l.code ? '' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const SECTIONS = [
  { id: 'project', label: tk('Project') },
  { id: 'appearance', label: tk('Appearance') },
  { id: 'editing', label: tk('Editing') },
  { id: 'dictionary', label: tk('Dictionary') },
  { id: 'shortcuts', label: tk('Keyboard shortcuts') },
  { id: 'skills', label: tk('AI skills') },
  { id: 'mcp', label: tk('MCP') },
  { id: 'actions', label: tk('Actions') },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

/**
 * Project settings, opened from the bottom of the editor's rail as in
 * Overleaf: the project's own settings (compiler, main document, spell
 * checking, Git), the person's editor settings and keys, their AI agents'
 * access over MCP, and project
 * actions, one category at a time beside a list of categories.
 */
export function ProjectSettingsDialog(props: Props) {
  const { project, canEdit } = props
  const [section, setSection] = useState<SectionId>('project')
  const act = (fn: () => void) => () => {
    props.onOpenChange(false)
    fn()
  }
  const sections = SECTIONS.filter(s => s.id !== 'skills' || props.aiAvailable)
  const current = sections.find(s => s.id === section) ?? sections[0]!
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle>{t('Project settings')}</DialogTitle>
          <DialogDescription className="truncate">{project?.name}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 max-sm:flex-col">
          <nav className="grid shrink-0 content-start gap-0.5 border-r bg-muted/30 p-2 sm:w-48 max-sm:flex max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b">
            {sections.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={current.id === s.id ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-left text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground',
                  current.id === s.id ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                {t(s.label)}
              </button>
            ))}
          </nav>
          {/* The dictionary scrolls its own list (letter headings stick, the index stays beside it). */}
          <div className={cn('min-w-0 flex-1 p-5', current.id === 'dictionary' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto')}>
            <h3 className="mb-3 shrink-0 px-2 text-base font-semibold">{t(current.label)}</h3>
            {current.id === 'project' && (
              <div className="grid gap-1">
                <Setting label={t('Compiler')}>
                  <Select value={project?.engine ?? ''} onValueChange={v => props.onUpdate({ engine: v as EngineSetting })} disabled={!canEdit}>
                    <SelectTrigger className="w-48" aria-label={t('TeX engine')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('Automatic')}</SelectItem>
                      <SelectItem value="pdflatex">pdfLaTeX</SelectItem>
                      <SelectItem value="xelatex">XeLaTeX</SelectItem>
                      <SelectItem value="lualatex">LuaLaTeX</SelectItem>
                    </SelectContent>
                  </Select>
                </Setting>
                <Setting label={t('Main document')}>
                  <Select value={project?.rootFile ?? ''} onValueChange={rootFile => props.onUpdate({ rootFile })} disabled={!canEdit}>
                    <SelectTrigger className="w-48" aria-label={t('Main document')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {props.texFiles.map(path => (
                        <SelectItem key={path} value={path}>
                          {path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Setting>
                <Setting label={t('Spell check')}>
                  <SpellLanguagePicker
                    value={project?.spellCheckLanguage}
                    options={props.spellOptions}
                    disabled={!canEdit}
                    onChange={code => props.onUpdate({ spellCheckLanguage: code })}
                  />
                </Setting>
                {!canEdit && <p className="px-2 text-sm text-muted-foreground">{t('Only editors can change these settings.')}</p>}
                {project && (
                  <div className="mt-4 grid gap-1">
                    <span className="px-2 text-sm font-medium text-muted-foreground">{t('Git')}</span>
                    <GitClone projectId={project.id} />
                  </div>
                )}
              </div>
            )}
            {current.id === 'appearance' && <AppearanceSettings />}
            {current.id === 'editing' && <EditingSettings />}
            {current.id === 'dictionary' && (
              <div className="flex min-h-0 flex-1 flex-col px-2">
                <DictionaryManager />
              </div>
            )}
            {current.id === 'shortcuts' && <ShortcutSettings />}
            {current.id === 'skills' && project && (
              <div className="px-2">
                <SkillLibrary base={`/api/projects/${project.id}/ai/skills`} canEdit={canEdit} />
              </div>
            )}
            {current.id === 'mcp' && project && <McpSettings projectId={project.id} />}
            {current.id === 'actions' && (
              <div className="grid gap-1">
                <button type="button" className={itemClass} onClick={act(props.onWordCount)}>
                  <WholeWord /> {t('Word count')}
                </button>
                <button type="button" className={itemClass} onClick={act(props.onCopy)}>
                  <Copy /> {t('Make a copy')}
                </button>
                <button type="button" className={itemClass} onClick={act(props.onConvert)}>
                  <LayoutTemplate /> {t('Convert to a journal template')}
                </button>
                {props.isOwner && project && (
                  <button type="button" className={itemClass} onClick={act(() => openPublishTemplate(project.id, project.name))}>
                    <Share2 /> {t('Publish as template…')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

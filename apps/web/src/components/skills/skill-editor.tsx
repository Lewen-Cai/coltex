import { useEffect, useState } from 'react'
import type { AiSkillBody, SkillScope } from '@coltex/shared'
import { RESERVED_SKILL_NAMES } from '@coltex/shared'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/format'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** What's wrong with a skill name, if anything (the same rules as the server). */
function nameProblem(name: string): string | undefined {
  if (!name) return undefined
  if (!NAME.test(name)) return t('Use lowercase letters, digits and single hyphens')
  if ((RESERVED_SKILL_NAMES as readonly string[]).includes(name)) return t('This name is taken by a built-in command')
  return undefined
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial?: Partial<AiSkillBody>
  /** Reference files that came with an imported skill (kept as they are). */
  files?: { path: string; size: number }[]
  readOnly?: boolean
  /** One save button per place it can go (the agent's drafts); a single "Save" otherwise. */
  scopes?: SkillScope[]
  /** False keeps the dialog open (the person changed their mind, e.g. about replacing a skill). */
  onSave: (body: AiSkillBody, scope?: SkillScope) => Promise<void | false>
}

/** Create or edit a skill: its name, when to use it, and the instructions. */
export function SkillEditor({ open, onOpenChange, title, initial, files, readOnly, scopes, onSave }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState<SkillScope | 'save'>()

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setDescription(initial?.description ?? '')
    setBody(initial?.body ?? '')
  }, [open, initial])

  const problem = nameProblem(name.trim())
  const ready = !!name.trim() && !problem && !!description.trim() && !!body.trim()

  const save = async (scope?: SkillScope) => {
    setSaving(scope ?? 'save')
    try {
      const result = await onSave({ name: name.trim(), description: description.trim(), body: body.trim() }, scope)
      if (result !== false) onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-0.5 pb-0.5">
          <div className="grid gap-1.5">
            <Label htmlFor="skill-name">{t('Name')}</Label>
            <Input
              id="skill-name"
              value={name}
              onChange={e => setName(e.target.value)}
              readOnly={readOnly}
              placeholder="polish-abstract"
              className="font-mono"
              aria-invalid={!!problem}
              autoComplete="off"
            />
            {problem && <p className="text-xs text-destructive">{problem}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skill-description">{t('Description')}</Label>
            <Textarea
              id="skill-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              readOnly={readOnly}
              rows={2}
              maxLength={1024}
              className="min-h-0"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skill-body">{t('Instructions')}</Label>
            <Textarea
              id="skill-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              readOnly={readOnly}
              rows={14}
              className="field-sizing-fixed min-h-48 font-mono text-[13px] md:text-[13px]"
            />
          </div>
          {files && files.length > 0 && (
            <div className="grid gap-1.5">
              <Label>{t('Reference files')}</Label>
              <ul className="grid gap-0.5 rounded-lg border px-3 py-2 text-sm">
                {files.map(f => (
                  <li key={f.path} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-[13px]">{f.path}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? t('Close') : t('Cancel')}
          </Button>
          {!readOnly &&
            (scopes ?? [undefined]).map(scope => (
              <Button key={scope ?? 'save'} disabled={!ready || !!saving} onClick={() => void save(scope)}>
                {saving === (scope ?? 'save') && <Spinner />}
                {scope === 'personal' ? t('Save to my skills') : scope === 'project' ? t('Save to project skills') : t('Save')}
              </Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { TAG_COLORS, type Tag } from '@coltex/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { changeTags } from '@/lib/tags'
import { cn } from '@/lib/utils'
import { confirmDialog } from './confirm'
import { PROJECTS_CHANGED } from './shell/project-dialogs'

const OPEN_EVENT = 'coltex:tag-dialog'
type Target = { tag?: Tag; projectIds?: string[] }

/** Create a tag (optionally putting projects in it right away), or rename/recolour one. */
export const openTagDialog = (target: Target = {}) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: target }))

export async function deleteTag(tag: Tag) {
  const ok = await confirmDialog({
    title: t('Delete the tag “{name}”?', { name: tag.name }),
    description: t('The projects stay where they are; only the tag is removed.'),
    confirmLabel: t('Delete tag'),
    destructive: true,
  })
  if (!ok) return
  try {
    await changeTags(() => api.deleteTag(tag.id))
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
    if (window.location.hash === `#/tag/${tag.id}`) window.location.hash = '#/'
  } catch (err) {
    toast.error((err as Error).message)
  }
}

/** A tag's colour dot and name. */
export function TagBadge({ tag, className }: { tag: Pick<Tag, 'name' | 'color'>; className?: string }) {
  return (
    <span
      className={cn('inline-flex max-w-36 items-center gap-1 rounded-full border px-1.5 py-px text-[12px] font-medium text-muted-foreground', className)}
      style={{ borderColor: `color-mix(in oklch, ${tag.color} 45%, transparent)`, background: `color-mix(in oklch, ${tag.color} 12%, transparent)` }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: tag.color }} />
      <span className="truncate">{tag.name}</span>
    </span>
  )
}

/** Mounted once by the console shell. */
export function TagDialogHost() {
  const [target, setTarget] = useState<Target>()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<Target>).detail
      setTarget(detail)
      setName(detail.tag?.name ?? '')
      setColor(detail.tag?.color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]!)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const editing = target?.tag
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!target || !name.trim()) return
    setBusy(true)
    try {
      await changeTags(async () => {
        if (editing) await api.updateTag(editing.id, { name: name.trim(), color })
        else {
          const tag = await api.createTag(name.trim(), color)
          if (target.projectIds?.length) await api.tagProjects(tag.id, target.projectIds)
        }
      })
      if (!editing && target.projectIds?.length) window.dispatchEvent(new Event(PROJECTS_CHANGED))
      setTarget(undefined)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && setTarget(undefined)}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? t('Edit tag') : t('New tag')}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-5">
            <Field>
              <FieldLabel htmlFor="tag-name">{t('Tag name')}</FieldLabel>
              <Input id="tag-name" autoFocus maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. Thesis, Under review')} />
            </Field>
            <Field>
              <FieldLabel>{t('Colour')}</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('Colour')}>
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110',
                      color === c && 'ring-2 ring-ring',
                    )}
                    style={{ background: c }}
                  >
                    {color === c && <Check className="size-4 text-white" />}
                  </button>
                ))}
              </div>
            </Field>
            {name.trim() && (
              <div className="text-xs text-muted-foreground">
                <TagBadge tag={{ name: name.trim(), color }} />
              </div>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTarget(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              {busy && <Spinner />} {editing ? t('Save') : t('Create tag')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

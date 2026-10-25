import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { ProjectTemplateState, TemplateField } from '@coltex/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { AudienceEditor, audienceBody, FieldSelect, hasAudience, NO_AUDIENCE, type AudienceDraft } from './template-audience'

const EVENT = 'coltex:publish-template'
/** Fired after a template was published, changed or taken down, so open template lists reload. */
export const TEMPLATES_CHANGED = 'coltex:templates-changed'

/**
 * Publish a project as a template (its owner, an administrator): for groups
 * and people, or everyone on the server (the system administrator). New
 * projects made from it copy the project's files as they are then.
 */
export const openPublishTemplate = (projectId: string, projectName: string) =>
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { projectId, projectName } }))

/** Mounted once by the app. */
export function PublishTemplateDialogHost() {
  const [target, setTarget] = useState<{ projectId: string; projectName: string }>()
  const [current, setCurrent] = useState<ProjectTemplateState>()
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [field, setField] = useState<TemplateField>('general')
  const [audience, setAudience] = useState<AudienceDraft>(NO_AUDIENCE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string; projectName: string }>).detail
      setTarget(detail)
      setLoaded(false)
      setName(detail.projectName)
      setDescription('')
      setField('general')
      setAudience(NO_AUDIENCE)
      api.getProjectTemplate(detail.projectId).then(
        state => {
          setCurrent(state)
          if (state) {
            setName(state.name)
            setDescription(state.description)
            setField(state.field)
            setAudience({ everyone: state.audience.everyone, groups: state.audience.groups, users: state.audience.users })
          }
          setLoaded(true)
        },
        err => {
          toast.error((err as Error).message)
          setTarget(undefined)
        },
      )
    }
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await fn()
      setTarget(undefined)
      window.dispatchEvent(new Event(TEMPLATES_CHANGED))
      toast.success(done)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!target || !name.trim() || !hasAudience(audience)) return
    void run(
      () => api.publishTemplate(target.projectId, { name: name.trim(), description: description.trim(), field, audience: audienceBody(audience) }),
      current ? t('Template updated') : t('Published “{name}” as a template', { name: name.trim() }),
    )
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && setTarget(undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{current ? t('Template') : t('Publish as template')}</DialogTitle>
          </DialogHeader>
          {!loaded ? (
            <Spinner className="mx-auto my-8" />
          ) : (
            <FieldGroup className="py-5">
              <Field>
                <FieldLabel htmlFor="template-name">{t('Template name')}</FieldLabel>
                <Input id="template-name" autoFocus value={name} maxLength={100} onChange={e => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="template-description">{t('Description')}</FieldLabel>
                <Textarea
                  id="template-description"
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </Field>
              <FieldSelect value={field} onChange={setField} />
              <AudienceEditor value={audience} onChange={setAudience} />
            </FieldGroup>
          )}
          <DialogFooter>
            {current && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                disabled={busy}
                onClick={() => target && void run(() => api.unpublishTemplate(target.projectId), t('Removed from the templates'))}
              >
                {t('Unpublish')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setTarget(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !loaded || !name.trim() || !hasAudience(audience)}>
              {busy && <Spinner />} {current ? t('Save') : t('Publish')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { WordCitationStyle } from '@coltex/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

const EVENT = 'coltex:word-export'

/** Names of the citation styles that come with ColTex (proper names, not translated). */
const STYLES: { id: WordCitationStyle; name: string }[] = [
  { id: 'apa', name: 'APA' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'american-medical-association', name: 'AMA' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'nature', name: 'Nature' },
  { id: 'chicago-author-date', name: 'Chicago' },
]

const AUTO = 'auto'
const NONE = 'none'

/** Export a project to Word (.docx) through pandoc. */
export const openWordExport = (projectId: string, projectName: string) =>
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { projectId, projectName } }))

/** Mounted once by the app. */
export function WordExportDialogHost() {
  const [target, setTarget] = useState<{ projectId: string; projectName: string }>()
  const [files, setFiles] = useState<{ docx: string[]; csl: string[] }>()
  const [style, setStyle] = useState(AUTO)
  const [reference, setReference] = useState(NONE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string; projectName: string }>).detail
      setTarget(detail)
      setFiles(undefined)
      setStyle(AUTO)
      setReference(NONE)
      api.getProject(detail.projectId).then(
        tree => {
          const paths = tree.files.map(f => f.path)
          setFiles({ docx: paths.filter(p => /\.docx$/i.test(p)), csl: paths.filter(p => /\.csl$/i.test(p)) })
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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!target) return
    setBusy(true)
    try {
      const builtin = STYLES.some(s => s.id === style)
      const ready = await api.exportWord(target.projectId, {
        ...(builtin ? { citationStyle: style as WordCitationStyle } : style !== AUTO ? { csl: style } : {}),
        ...(reference !== NONE ? { reference } : {}),
      })
      const a = document.createElement('a')
      a.href = api.wordDownloadUrl(target.projectId, ready.id)
      a.download = `${target.projectName}.docx`
      a.click()
      setTarget(undefined)
      // pandoc's warnings (pictures it couldn't find, maths it couldn't convert) stay in English like other server messages.
      if (ready.warnings.length) toast.warning(t('Exported to Word'), { description: ready.warnings.slice(0, 5).join('\n') })
      else toast.success(t('Exported to Word'))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && !busy && setTarget(undefined)}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <form onSubmit={e => void submit(e)}>
          <DialogHeader>
            <DialogTitle>{t('Export to Word')}</DialogTitle>
          </DialogHeader>
          {!files ? (
            <Spinner className="mx-auto my-8" />
          ) : (
            <FieldGroup className="py-5">
              <Field>
                <FieldLabel htmlFor="word-style">{t('Citation style')}</FieldLabel>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger id="word-style" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO}>{t('Like the document')}</SelectItem>
                    <SelectSeparator />
                    {STYLES.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    {files.csl.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>{t('In this project')}</SelectLabel>
                          {files.csl.map(p => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              {files.docx.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="word-reference">{t('Word template')}</FieldLabel>
                  <Select value={reference} onValueChange={setReference}>
                    <SelectTrigger id="word-reference" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('None')}</SelectItem>
                      <SelectSeparator />
                      {files.docx.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setTarget(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !files}>
              {busy && <Spinner />} {t('Export')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

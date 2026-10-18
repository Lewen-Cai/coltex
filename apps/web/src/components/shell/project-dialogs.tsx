import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileArchive, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { TemplateInfo } from '@coltex/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { t, translateServerMessage } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'
import { confirmDialog } from '../confirm'

const NEW_EVENT = 'coltex:new-project'
const IMPORT_EVENT = 'coltex:import-project'
/** Fired after a project was created or imported, so lists can reload. */
export const PROJECTS_CHANGED = 'coltex:projects-changed'

export const openNewProject = () => window.dispatchEvent(new Event(NEW_EVENT))
export const openImportProject = () => window.dispatchEvent(new Event(IMPORT_EVENT))

function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('')
  const [templates, setTemplates] = useState<TemplateInfo[]>()
  const [template, setTemplate] = useState('article')
  const [busy, setBusy] = useState(false)

  const load = () =>
    api.listTemplates().then(setTemplates, err => {
      setTemplates([])
      toast.error((err as Error).message)
    })

  useEffect(() => {
    if (open) {
      setName('')
      setTemplate('article')
      void load()
    }
  }, [open])


  const remove = async (tpl: TemplateInfo) => {
    const ok = await confirmDialog({
      title: t('Remove “{name}” from the templates?', { name: tpl.name }),
      description: t('The project it comes from stays as it is.'),
      confirmLabel: t('Remove'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.removeTemplate(tpl.id)
      if (template === tpl.id) setTemplate('article')
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const project = await api.createProject(name.trim(), { template })
      onOpenChange(false)
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
      navigate(`/project/${project.id}`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const card = (tpl: TemplateInfo) => (
    <div key={tpl.id} className="group/template relative">
      <button
        type="button"
        onClick={() => setTemplate(tpl.id)}
        aria-pressed={template === tpl.id}
        className={cn(
          'grid h-full w-full content-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40',
          template === tpl.id && 'border-primary bg-accent/60 ring-3 ring-primary/15',
        )}
      >
        {/* Built-in names and descriptions are English on the server. */}
        <span className="pr-6 text-sm font-medium">{tpl.kind === 'builtin' ? translateServerMessage(tpl.name) : tpl.name}</span>
        {tpl.description && (
          <span className="text-xs text-muted-foreground">{tpl.kind === 'builtin' ? translateServerMessage(tpl.description) : tpl.description}</span>
        )}
        {tpl.publishedBy && <span className="text-xs text-muted-foreground">{t('by {name}', { name: tpl.publishedBy })}</span>}
      </button>
      {tpl.canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('Remove template')}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover/template:opacity-100 focus-visible:opacity-100"
          onClick={() => void remove(tpl)}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  )

  const builtins = templates?.filter(x => x.kind === 'builtin') ?? []
  const shared = templates?.filter(x => x.kind === 'shared') ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t('New project')}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-5">
            <Field>
              <FieldLabel htmlFor="project-name">{t('Project name')}</FieldLabel>
              <Input id="project-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. Thesis, NeurIPS submission')} />
            </Field>
            <Field>
              <FieldLabel>{t('Template')}</FieldLabel>
              <div className="grid max-h-[min(46vh,420px)] gap-4 overflow-y-auto pr-1">
                {!templates ? (
                  <Spinner className="m-6 justify-self-center" />
                ) : (
                  <>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">{builtins.map(card)}</div>
                    {shared.length > 0 && (
                      <div className="grid gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('Shared on this server')}</span>
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">{shared.map(card)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !name.trim() || !templates}>
              {busy && <Spinner />} {t('Create project')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [file, setFile] = useState<File>()
  const [name, setName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ id: string; warnings: string[] }>()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFile(undefined)
      setName('')
      setResult(undefined)
    }
  }, [open])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!/\.zip$/i.test(f.name)) return toast.error('Choose a .zip file')
    setFile(f)
    setName(f.name.replace(/\.zip$/i, ''))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      const { project, warnings } = await api.importProject(file, name.trim() || t('Imported project'))
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
      if (warnings.length === 0) {
        onOpenChange(false)
        toast.success(t('Imported “{name}”', { name: project.name }))
        navigate(`/project/${project.id}`)
      } else {
        setResult({ id: project.id, warnings })
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('Import a project')}</DialogTitle>
        </DialogHeader>
        {result ? (
          <>
            <Alert>
              <TriangleAlert />
              <AlertTitle>{t('Imported with notes')}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {result.warnings.map(w => (
                    <li key={w}>{translateServerMessage(w)}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  navigate(`/project/${result.id}`)
                }}
              >
                {t('Open project')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                dragging ? 'border-primary bg-accent/60' : 'border-border hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {file ? (
                  <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <FileArchive className="size-6" />
                    </span>
                    <span className="grid text-left">
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatBytes(file.size)} · {t('click to choose another')}</span>
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid justify-items-center gap-2">
                    <span className="rounded-full bg-primary/10 p-3 text-primary">
                      <Upload className="size-5" />
                    </span>
                    <span className="text-sm font-medium">{t('Drop a .zip here, or click to browse')}</span>
                    <span className="text-xs text-muted-foreground">{t('Up to {size}', { size: '200 MB' })}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={input}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={e => {
                  pick(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            {file && (
              <Field>
                <FieldLabel htmlFor="import-name">{t('Project name')}</FieldLabel>
                <Input id="import-name" value={name} onChange={e => setName(e.target.value)} />
              </Field>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={!file || busy}>
                {busy && <Spinner />} {t('Import')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Mounted once by the shell; opened from anywhere with openNewProject()/openImportProject(). */
export function ProjectDialogs() {
  const [which, setWhich] = useState<'new' | 'import'>()
  useEffect(() => {
    const onNew = () => setWhich('new')
    const onImport = () => setWhich('import')
    window.addEventListener(NEW_EVENT, onNew)
    window.addEventListener(IMPORT_EVENT, onImport)
    return () => {
      window.removeEventListener(NEW_EVENT, onNew)
      window.removeEventListener(IMPORT_EVENT, onImport)
    }
  }, [])
  const close = (open: boolean) => !open && setWhich(undefined)
  return (
    <>
      <NewProjectDialog open={which === 'new'} onOpenChange={close} />
      <ImportDialog open={which === 'import'} onOpenChange={close} />
    </>
  )
}

const COPY_EVENT = 'coltex:copy-project'

/** Ask for a name and copy a project; opens the copy. Works from the console and the editor. */
export const openCopyProject = (projectId: string, projectName: string) =>
  window.dispatchEvent(new CustomEvent(COPY_EVENT, { detail: { projectId, projectName } }))

/** Mounted once by the app (next to the convert dialog). */
export function CopyProjectDialogHost() {
  const [target, setTarget] = useState<{ projectId: string; projectName: string }>()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string; projectName: string }>).detail
      setTarget(detail)
      setName(t('{name} (copy)', { name: detail.projectName }))
    }
    window.addEventListener(COPY_EVENT, onOpen)
    return () => window.removeEventListener(COPY_EVENT, onOpen)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!target || !name.trim()) return
    setBusy(true)
    try {
      const copy = await api.copyProject(target.projectId, name.trim())
      setTarget(undefined)
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
      toast.success(t('Copied to “{name}”', { name: copy.name }))
      navigate(`/project/${copy.id}`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && setTarget(undefined)}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t('Make a copy')}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-5">
            <Field>
              <FieldLabel htmlFor="copy-name">{t('Project name')}</FieldLabel>
              <Input id="copy-name" autoFocus value={name} onChange={e => setName(e.target.value)} onFocus={e => e.target.select()} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTarget(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              {busy && <Spinner />} {t('Copy')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

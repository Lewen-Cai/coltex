import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ellipsis, FileArchive, FolderOpen, Pencil, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { TemplateField, TemplateInfo } from '@coltex/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { t, translateServerMessage } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { TEMPLATE_FIELDS } from '@/lib/template-fields'
import { cn } from '@/lib/utils'
import { confirmDialog } from '../confirm'
import { AudienceEditor, audienceBody, FieldSelect, hasAudience, NO_AUDIENCE, useCanShareTemplates, type AudienceDraft } from '../template-audience'
import { openPublishTemplate, TEMPLATES_CHANGED } from '../publish-template-dialog'

const NEW_EVENT = 'coltex:new-project'
const IMPORT_EVENT = 'coltex:import-project'
/** Fired after a project was created or imported, so lists can reload. */
export const PROJECTS_CHANGED = 'coltex:projects-changed'

export const openNewProject = () => window.dispatchEvent(new Event(NEW_EVENT))
export const openImportProject = () => window.dispatchEvent(new Event(IMPORT_EVENT))

/** The tag on a template card: built in, or whom it is shared with. */
export function sharingTag(tpl: TemplateInfo): string {
  switch (tpl.sharing) {
    case 'builtin':
      return t('Built-in')
    case 'server':
      return tpl.bySystemAdmin ? t('Shared by the system administrator') : t('Shared on this server')
    case 'groups':
      return t('Shared across {groups}', { groups: tpl.groups.join(', ') })
    case 'people':
      return tpl.publishedBy ? t('Shared by {name}', { name: tpl.publishedBy }) : t('Shared with you')
  }
}

function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('')
  const [templates, setTemplates] = useState<TemplateInfo[]>()
  const [template, setTemplate] = useState('article')
  const [field, setField] = useState<TemplateField | 'all'>('all')
  const [importing, setImporting] = useState(false)
  const [busy, setBusy] = useState(false)
  // Importing a template is for administrators (the server refuses everyone else).
  const { canShare: canImport } = useCanShareTemplates()

  const load = () =>
    api.listTemplates().then(setTemplates, err => {
      setTemplates([])
      toast.error((err as Error).message)
    })

  useEffect(() => {
    if (open) {
      setName('')
      setTemplate('article')
      setField('all')
      void load()
    }
  }, [open])

  // A shared template changed in the publish dialog opened from here.
  useEffect(() => {
    if (!open) return
    const reload = () => void load()
    window.addEventListener(TEMPLATES_CHANGED, reload)
    return () => window.removeEventListener(TEMPLATES_CHANGED, reload)
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

  const imported = async (tpl: TemplateInfo) => {
    await load()
    setField('all')
    setTemplate(tpl.id)
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

  const actions = (tpl: TemplateInfo) =>
    (tpl.canRemove || tpl.projectId) && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Actions for {name}', { name: tpl.name })}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover/template:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {tpl.projectId && (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  onOpenChange(false)
                  navigate(`/project/${tpl.projectId}`)
                }}
              >
                <FolderOpen /> {t('Open project')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openPublishTemplate(tpl.projectId!, tpl.name)}>
                <Pencil /> {t('Edit template…')}
              </DropdownMenuItem>
            </>
          )}
          {tpl.projectId && tpl.canRemove && <DropdownMenuSeparator />}
          {tpl.canRemove && (
            <DropdownMenuItem variant="destructive" onSelect={() => void remove(tpl)}>
              <Trash2 /> {t('Remove template')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )

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
        <span className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant={tpl.sharing === 'builtin' ? 'secondary' : 'outline'} className="max-w-full truncate font-normal">
            {sharingTag(tpl)}
          </Badge>
        </span>
      </button>
      {actions(tpl)}
    </div>
  )

  // One list: what the server shares first, then the built-in ones; the field filter covers both.
  const all = [...(templates?.filter(x => x.kind === 'shared') ?? []), ...(templates?.filter(x => x.kind === 'builtin') ?? [])]
  const fields = TEMPLATE_FIELDS.filter(f => all.some(x => x.field === f.id))
  const shown = all.filter(x => field === 'all' || x.field === field)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" aria-describedby={undefined}>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{t('Template')}</FieldLabel>
                {canImport && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setImporting(true)}>
                    <Upload /> {t('Import template')}
                  </Button>
                )}
              </div>
              {fields.length > 1 && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={field}
                  onValueChange={v => v && setField(v as TemplateField | 'all')}
                  className="flex-wrap"
                >
                  <ToggleGroupItem value="all">{t('All')}</ToggleGroupItem>
                  {fields.map(f => (
                    <ToggleGroupItem key={f.id} value={f.id}>
                      {t(f.label)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <div className="grid h-[min(46vh,420px)] content-start gap-2 overflow-y-auto pr-1">
                {!templates ? (
                  <Spinner className="m-6 justify-self-center" />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{shown.map(card)}</div>
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
      <ImportTemplateDialog open={importing} onOpenChange={setImporting} onImported={tpl => void imported(tpl)} />
    </Dialog>
  )
}

/** A journal's template zip (Springer Nature's, say) as a shared template. */
function ImportTemplateDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (template: TemplateInfo) => void
}) {
  const [file, setFile] = useState<File>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [field, setField] = useState<TemplateField>('general')
  const [audience, setAudience] = useState<AudienceDraft>(NO_AUDIENCE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setFile(undefined)
      setName('')
      setDescription('')
      setField('general')
      setAudience(NO_AUDIENCE)
    }
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !name.trim() || !hasAudience(audience)) return
    setBusy(true)
    try {
      const { template, warnings } = await api.importTemplate(file, { name: name.trim(), description: description.trim(), field, audience: audienceBody(audience) })
      onOpenChange(false)
      onImported(template)
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
      if (warnings.length === 0) toast.success(t('Imported “{name}”', { name: template.name }))
      else toast.warning(t('Imported with notes'), { description: warnings.map(w => translateServerMessage(w)).join('\n') })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('Import template')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <ZipDrop
            file={file}
            onFile={f => {
              setFile(f)
              setName(f.name.replace(/\.zip$/i, '').slice(0, 100))
            }}
          />
          {file && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="import-template-name">{t('Template name')}</FieldLabel>
                <Input id="import-template-name" value={name} maxLength={100} onChange={e => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="import-template-description">{t('Description')}</FieldLabel>
                <Textarea
                  id="import-template-description"
                  rows={2}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!file || !name.trim() || !hasAudience(audience) || busy}>
              {busy && <Spinner />} {t('Import')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Where a .zip is dropped or picked, showing the chosen file. */
function ZipDrop({ file, onFile }: { file: File | undefined; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!/\.zip$/i.test(f.name)) return toast.error('Choose a .zip file')
    onFile(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  return (
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
  )
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [file, setFile] = useState<File>()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ id: string; warnings: string[] }>()

  useEffect(() => {
    if (open) {
      setFile(undefined)
      setName('')
      setResult(undefined)
    }
  }, [open])

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
            <ZipDrop
              file={file}
              onFile={f => {
                setFile(f)
                setName(f.name.replace(/\.zip$/i, ''))
              }}
            />
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

const RENAME_EVENT = 'coltex:rename-project'

/** Ask for a new name for a project (the project list's menu). */
export const openRenameProject = (projectId: string, projectName: string) =>
  window.dispatchEvent(new CustomEvent(RENAME_EVENT, { detail: { projectId, projectName } }))

/** Mounted once by the app, next to the copy dialog. */
export function RenameProjectDialogHost() {
  const [target, setTarget] = useState<{ projectId: string; projectName: string }>()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string; projectName: string }>).detail
      setTarget(detail)
      setName(detail.projectName)
    }
    window.addEventListener(RENAME_EVENT, onOpen)
    return () => window.removeEventListener(RENAME_EVENT, onOpen)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = name.trim()
    if (!target || !next) return
    if (next === target.projectName) return setTarget(undefined)
    setBusy(true)
    try {
      await api.updateProject(target.projectId, { name: next })
      setTarget(undefined)
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
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
            <DialogTitle>{t('Rename project')}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-5">
            <Field>
              <FieldLabel htmlFor="rename-project">{t('Project name')}</FieldLabel>
              <Input
                id="rename-project"
                autoFocus
                maxLength={200}
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={e => e.target.select()}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTarget(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              {busy && <Spinner />} {t('Rename')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

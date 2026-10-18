import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { FileEntry, LinkedFileSource, ProjectSummary } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { t } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'
import { confirmDialog } from './confirm.tsx'
import { Button } from './ui/button.tsx'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command.tsx'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { Field, FieldGroup, FieldLabel } from './ui/field.tsx'
import { Input } from './ui/input.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx'
import { Spinner } from './ui/spinner.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx'

/** The output PDF of the other project, in the file list. */
const OUTPUT = '\u0000output.pdf'

const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1)

/** A file name from a URL's last path segment, if it has one. */
function nameFromUrl(raw: string): string {
  try {
    const last = decodeURIComponent(new URL(raw).pathname.split('/').filter(Boolean).pop() ?? '')
    return /^[^\\/:*?"<>|]+\.[A-Za-z0-9]{1,8}$/.test(last) ? last : ''
  } catch {
    return ''
  }
}

/**
 * Add a file from another project (one of its files, or its PDF) or from a
 * URL, as Overleaf's "Add files" does. It stays linked: Refresh in the file
 * tree fetches it again.
 */
export function LinkedFileDialog({
  projectId,
  dir,
  existing,
  onClose,
  onAdded,
}: {
  projectId: string
  /** The folder it goes into; undefined while closed. */
  dir: string | undefined
  existing: Set<string>
  onClose: () => void
  onAdded: (path: string) => void
}) {
  const [tab, setTab] = useState<'project' | 'url'>('project')
  const [projects, setProjects] = useState<ProjectSummary[]>()
  const [other, setOther] = useState('')
  const [otherFiles, setOtherFiles] = useState<FileEntry[]>()
  const [picked, setPicked] = useState('')
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (dir === undefined) return
    setTab('project')
    setOther('')
    setOtherFiles(undefined)
    setPicked('')
    setUrl('')
    setName('')
    api.listProjects().then(
      list => setProjects(list.filter(p => p.id !== projectId && !p.trashed)),
      err => toast.error((err as Error).message),
    )
  }, [dir, projectId])

  useEffect(() => {
    if (!other) return
    setOtherFiles(undefined)
    setPicked('')
    api.getProject(other).then(
      data => setOtherFiles(data.files),
      err => toast.error((err as Error).message),
    )
  }, [other])

  const otherName = projects?.find(p => p.id === other)?.name ?? ''
  const choose = (value: string) => {
    setPicked(value)
    setName(value === OUTPUT ? `${otherName}.pdf` : basename(value))
  }

  const source = useMemo<LinkedFileSource | undefined>(() => {
    if (tab === 'url') return url.trim() ? { kind: 'url', url: url.trim() } : undefined
    if (!other || !picked) return undefined
    return picked === OUTPUT ? { kind: 'project_output', projectId: other } : { kind: 'project_file', projectId: other, path: picked }
  }, [tab, url, other, picked])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!source || !name.trim() || dir === undefined) return
    const target = dir ? `${dir}/${name.trim()}` : name.trim()
    if (
      existing.has(target) &&
      !(await confirmDialog({ title: t('Replace “{path}”?', { path: target }), description: t('A file with this name already exists.'), confirmLabel: t('Replace') }))
    ) {
      return
    }
    setBusy(true)
    try {
      const linked = await api.addLinkedFile(projectId, target, source)
      onClose()
      onAdded(linked.path)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={dir !== undefined} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t('Add a linked file')}</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={v => setTab(v as 'project' | 'url')} className="pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="project">{t('From another project')}</TabsTrigger>
              <TabsTrigger value="url">{t('From a URL')}</TabsTrigger>
            </TabsList>
            <TabsContent value="project">
              <FieldGroup className="pt-3">
                <Field>
                  <FieldLabel>{t('Project')}</FieldLabel>
                  <Select value={other} onValueChange={setOther} disabled={!projects}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={projects ? t('Choose a project') : t('Loading…')} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {other && (
                  <Field>
                    <FieldLabel>{t('File')}</FieldLabel>
                    {!otherFiles ? (
                      <Spinner className="mx-auto my-4" />
                    ) : (
                      <Command className="rounded-md border">
                        <CommandInput placeholder={t('Search files')} />
                        <CommandList className="max-h-52">
                          <CommandEmpty>{t('No files found.')}</CommandEmpty>
                          {[OUTPUT, ...otherFiles.map(f => f.path)].map(value => (
                            <CommandItem
                              key={value}
                              value={value === OUTPUT ? t('PDF output') : value}
                              onSelect={() => choose(value)}
                              className={cn(picked === value && 'bg-accent text-accent-foreground')}
                            >
                              {value === OUTPUT ? <span className="font-medium">{t('PDF output')}</span> : value}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    )}
                  </Field>
                )}
              </FieldGroup>
            </TabsContent>
            <TabsContent value="url">
              <FieldGroup className="pt-3">
                <Field>
                  <FieldLabel htmlFor="linked-url">URL</FieldLabel>
                  <Input
                    id="linked-url"
                    type="url"
                    placeholder="https://"
                    value={url}
                    onChange={e => {
                      const next = e.target.value
                      // Suggest the name from the URL until the person types their own.
                      if (!name || name === nameFromUrl(url)) setName(nameFromUrl(next))
                      setUrl(next)
                    }}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>
          </Tabs>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="linked-name">{dir ? t('File name in {folder}', { folder: dir }) : t('File name')}</FieldLabel>
              <Input id="linked-name" value={name} onChange={e => setName(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !source || !name.trim()}>
              {busy && <Spinner />} {t('Add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

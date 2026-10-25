import { useCallback, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  FileDown,
  FileType,
  LayoutTemplate,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2, // i18n-ignore
  Trash2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { OUTPUT, type ProjectSummary } from '@coltex/shared'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth'
import { plural, t } from '@/lib/i18n'
import { changeTags, useTags } from '@/lib/tags'
import { cn } from '@/lib/utils'
import { confirmDialog } from './confirm'
import { openConvert } from './ConvertDialog'
import { PROJECTS_CHANGED, openCopyProject, openRenameProject } from './shell/project-dialogs'
import { openPublishTemplate } from './publish-template-dialog'
import { useCanShareTemplates } from './template-audience'
import { openWordExport } from './word-export-dialog'
import { TagBadge, openTagDialog } from './tag-dialog'

const changed = () => window.dispatchEvent(new Event(PROJECTS_CHANGED))

/**
 * Like Overleaf's "Download PDF" in the project list: build the project (a
 * build with nothing to redo is quick) and save its PDF.
 */
export async function downloadPdf(project: Pick<ProjectSummary, 'id' | 'name'>) {
  const id = toast.loading(t('Compiling “{name}”…', { name: project.name }))
  try {
    const build = await api.compile(project.id)
    if (!build.outputFiles.includes(OUTPUT.pdf)) {
      toast.error('The project did not produce a PDF. Open it to see the errors.', { id })
      return
    }
    const link = document.createElement('a')
    link.href = api.buildUrl(project.id, build.buildId, OUTPUT.pdf)
    link.download = `${project.name}.pdf`
    link.click()
    toast.dismiss(id)
  } catch (err) {
    toast.error((err as Error).message, { id })
  }
}

/** Archive or unarchive in my list, with an undo in the toast. */
export async function setArchived(projects: Pick<ProjectSummary, 'id' | 'name'>[], archived: boolean) {
  const ids = projects.map(p => p.id)
  try {
    await api.setProjectState(ids, { archived })
    changed()
    const what = projects.length === 1 ? `“${projects[0]!.name}”` : plural(projects.length, '{n} project', '{n} projects')
    toast.success(archived ? t('Archived {what}', { what }) : t('Moved {what} out of the archive', { what }), {
      action: {
        label: t('Undo'),
        onClick: () => void api.setProjectState(ids, { archived: !archived }).then(changed, e => toast.error((e as Error).message)),
      },
    })
  } catch (err) {
    toast.error((err as Error).message)
  }
}

/** Move to or restore from my trash, with an undo in the toast. */
export async function setTrashed(projects: Pick<ProjectSummary, 'id' | 'name'>[], trashed: boolean) {
  const ids = projects.map(p => p.id)
  try {
    await api.setProjectState(ids, { trashed })
    changed()
    const what = projects.length === 1 ? `“${projects[0]!.name}”` : plural(projects.length, '{n} project', '{n} projects')
    toast.success(trashed ? t('Moved {what} to the trash', { what }) : t('Restored {what}', { what }), {
      action: {
        label: t('Undo'),
        onClick: () => void api.setProjectState(ids, { trashed: !trashed }).then(changed, e => toast.error((e as Error).message)),
      },
    })
  } catch (err) {
    toast.error((err as Error).message)
  }
}

/**
 * From the trash: owners delete for good (for everyone), other members leave.
 * Asks once for the whole selection.
 */
export async function deleteOrLeave(projects: ProjectSummary[]) {
  const owned = projects.filter(p => p.role === 'owner')
  const shared = projects.filter(p => p.role !== 'owner')
  const single = projects.length === 1 ? projects[0]! : undefined
  const ok = await confirmDialog(
    single
      ? single.role === 'owner'
        ? {
            title: t('Delete “{name}” for good?', { name: single.name }),
            description: t('The project, its files and its history are deleted for everyone. This cannot be undone.'),
            confirmLabel: t('Delete forever'),
            destructive: true,
          }
        : {
            title: t('Leave “{name}”?', { name: single.name }),
            description: t('You lose access until the owner shares it again.'),
            confirmLabel: t('Leave'),
          }
      : {
          title: plural(projects.length, 'Delete or leave {n} project?', 'Delete or leave {n} projects?'),
          description: [
            owned.length ? plural(owned.length, '{n} project you own is deleted for everyone.', '{n} projects you own are deleted for everyone.') : '',
            shared.length ? plural(shared.length, 'You leave {n} shared project.', 'You leave {n} shared projects.') : '',
            t('This cannot be undone.'),
          ]
            .filter(Boolean)
            .join(' '),
          confirmLabel: owned.length ? t('Delete forever') : t('Leave'),
          destructive: owned.length > 0,
        },
  )
  if (!ok) return
  try {
    const me = shared.length ? (await authClient.getSession()).data!.user.id : ''
    for (const p of owned) await api.deleteProject(p.id)
    for (const p of shared) await api.removeMember(p.id, me)
    toast.success(single ? (single.role === 'owner' ? t('Deleted “{name}”', { name: single.name }) : t('Left “{name}”', { name: single.name })) : t('Done'))
  } catch (err) {
    toast.error((err as Error).message)
  } finally {
    changed()
  }
}

/** Add projects to a tag, or take them out of it. */
export async function setTagged(tagId: string, projectIds: string[], tagged: boolean) {
  try {
    await changeTags(() => (tagged ? api.tagProjects(tagId, projectIds) : api.untagProjects(tagId, projectIds)))
    changed()
  } catch (err) {
    toast.error((err as Error).message)
  }
}

/** Tick tags for projects; a tag ticked for only some of them shows as mixed. */
export function TagMenuItems({ projects }: { projects: ProjectSummary[] }) {
  const tags = useTags() ?? []
  const ids = projects.map(p => p.id)
  return (
    <>
      {tags.map(tag => {
        const n = projects.filter(p => p.tagIds.includes(tag.id)).length
        const checked = n === projects.length ? true : n > 0 ? 'indeterminate' : false
        return (
          <DropdownMenuCheckboxItem
            key={tag.id}
            checked={checked}
            onSelect={e => e.preventDefault()}
            onCheckedChange={() => void setTagged(tag.id, ids, checked !== true)}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: tag.color }} />
            <span className="truncate">{tag.name}</span>
          </DropdownMenuCheckboxItem>
        )
      })}
      {tags.length > 0 && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={() => openTagDialog({ projectIds: ids })}>
        <Plus /> {t('New tag…')}
      </DropdownMenuItem>
    </>
  )
}

/**
 * A project's tags, changed in place (the list's Tags column, the card):
 * click to tick tags or make one. With none, the "+ Tag" shows on hover.
 */
export function ProjectTags({ project, className }: { project: ProjectSummary; className?: string }) {
  const tags = useTags() ?? []
  const own = tags.filter(tag => project.tagIds.includes(tag.id))
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          aria-label={t('Tags')}
          className={cn(
            'flex min-h-7 max-w-full flex-wrap items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted data-[state=open]:bg-muted',
            !own.length && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
            className,
          )}
        >
          {own.length ? (
            own.map(tag => <TagBadge key={tag.id} tag={tag} />)
          ) : (
            <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
              <Plus className="size-3.5" /> {t('Tag')}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-52 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <TagMenuItems projects={[project]} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Closes the project menu that is open, so opening another never leaves two open. */
let closeOpenMenu: (() => void) | undefined

export function ProjectActions({ project }: { project: ProjectSummary }) {
  const owner = project.role === 'owner'
  // Publishing as a template is for administrators.
  const { canShare } = useCanShareTemplates()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const change = (next: boolean) => {
    if (next) {
      if (closeOpenMenu !== close) closeOpenMenu?.()
      closeOpenMenu = close
    } else if (closeOpenMenu === close) {
      closeOpenMenu = undefined
    }
    setOpen(next)
  }
  return (
    // Not modal: a click on another project's menu opens that one straight away (closing this one).
    <DropdownMenu open={open} onOpenChange={change} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('Project actions')} onClick={e => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={e => e.stopPropagation()}>
        {(owner || project.role === 'editor') && (
          <DropdownMenuItem onSelect={() => openRenameProject(project.id, project.name)}>
            <Pencil /> {t('Rename…')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => openCopyProject(project.id, project.name)}>
          <Copy /> {t('Make a copy')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={api.downloadUrl(project.id)}>
            <Download /> {t('Download .zip')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void downloadPdf(project)}>
          <FileDown /> {t('Download PDF')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openWordExport(project.id, project.name)}>
          <FileType /> {t('Export to Word…')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openConvert(project.id, project.name)}>
          <LayoutTemplate /> {t('Convert to template…')}
        </DropdownMenuItem>
        {owner && canShare && (
          <DropdownMenuItem onSelect={() => openPublishTemplate(project.id, project.name)}>
            <Share2 /> {t('Publish as template…')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {project.trashed ? (
          <>
            <DropdownMenuItem onSelect={() => void setTrashed([project], false)}>
              <Undo2 /> {t('Restore')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => void deleteOrLeave([project])}>
              {owner ? <Trash2 /> : <LogOut />}
              {owner ? t('Delete forever') : t('Leave project')}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => void setArchived([project], !project.archived)}>
              {project.archived ? <ArchiveRestore /> : <Archive />}
              {project.archived ? t('Unarchive') : t('Archive')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => void setTrashed([project], true)}>
              <Trash2 /> {t('Move to trash')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

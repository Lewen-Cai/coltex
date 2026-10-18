import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Archive,
  ArchiveRestore,
  FileArchive,
  FilePlus2,
  FileText,
  FolderKanban,
  LayoutGrid,
  List,
  Pencil,
  Search,
  Tag as TagIcon, // i18n-ignore
  Trash2,
  Undo2,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import type { ProjectSummary, Tag } from '@coltex/shared'
import { ProjectTags, ProjectActions, TagMenuItems, deleteOrLeave, setArchived, setTrashed } from '@/components/project-actions'
import { ProjectCard, ROLE_LABEL } from '@/components/project-card'
import { PageHeader } from '@/components/shell/app-shell'
import { COLUMN } from '@/lib/table'
import { cn } from '@/lib/utils'
import { openImportProject, openNewProject } from '@/components/shell/project-dialogs'
import { TagBadge, deleteTag, openTagDialog } from '@/components/tag-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { UserAvatar } from '@/components/user-avatar'
import { timeAgo } from '@/lib/format'
import { intlLocale, plural, t } from '@/lib/i18n'
import { navigate } from '@/lib/router'
import { useTags } from '@/lib/tags'
import { inView, useProjects, type ListView } from './projects-data'

type Filter = 'all' | 'owned' | 'shared'
type Layout = 'grid' | 'list'

const VIEW_KEY = 'coltex.projects.view'

function readLayout(): Layout {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}

export function ProjectsPage({ view }: { view: ListView }) {
  const { projects } = useProjects()
  const tags = useTags()
  const tag = view.kind === 'tag' ? tags?.find(x => x.id === view.tagId) : undefined
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [layout, setLayout] = useState<Layout>(readLayout)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const withFilter = view.kind === 'all' || view.kind === 'tag'

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (projects ?? []).filter(
      p =>
        inView(p, view) &&
        (!withFilter || filter === 'all' || (filter === 'owned' ? p.role === 'owner' : p.role !== 'owner')) &&
        (!q || p.name.toLowerCase().includes(q) || p.ownerName.toLowerCase().includes(q)),
    )
  }, [projects, query, filter, view, withFilter])

  // Keep only selected projects that are still on screen (after a reload, a search, or a move).
  useEffect(() => {
    setSelected(current => {
      const visible = new Set(shown.map(p => p.id))
      const next = new Set([...current].filter(id => visible.has(id)))
      return next.size === current.size ? current : next
    })
  }, [shown])

  const changeLayout = (v: Layout) => {
    setLayout(v)
    // Only the list has checkboxes; a selection you can't see would be confusing.
    setSelected(new Set())
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  const picked = shown.filter(p => selected.has(p.id))
  const { title, empty } = viewText(view, tag)

  return (
    <>
      <PageHeader
        title={
          tag ? (
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ) : (
            title
          )
        }
        actions={
          tag ? (
            <>
              <Button variant="outline" onClick={() => openTagDialog({ tag })}>
                <Pencil /> {t('Edit tag')}
              </Button>
              <Button variant="outline" onClick={() => void deleteTag(tag)}>
                <Trash2 /> {t('Delete tag')}
              </Button>
            </>
          ) : view.kind === 'all' ? (
            <>
              <Button variant="outline" onClick={openImportProject}>
                <FileArchive /> {t('Import')}
              </Button>
              <Button onClick={openNewProject}>
                <FilePlus2 /> {t('New project')}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-4 flex min-h-9 flex-wrap items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {picked.length > 0 ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-sm font-medium">{plural(picked.length, '{n} selected', '{n} selected')}</span>
              <BulkActions view={view} projects={picked} />
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                <X /> {t('Clear selection')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap items-center gap-3"
            >
              <InputGroup className="w-full max-w-xs bg-card">
                <InputGroupInput placeholder={t('Search by name or owner')} value={query} onChange={e => setQuery(e.target.value)} />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
              {withFilter && (
                <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
                  <TabsList>
                    <TabsTrigger value="all">{t('All')}</TabsTrigger>
                    <TabsTrigger value="owned">{t('Owned by me')}</TabsTrigger>
                    <TabsTrigger value="shared">{t('Shared')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <ToggleGroup
          type="single"
          variant="outline"
          value={layout}
          onValueChange={v => v && changeLayout(v as Layout)}
          className="ml-auto bg-card"
        >
          <ToggleGroupItem value="list" aria-label={t('List view')}>
            <List />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label={t('Grid view')}>
            <LayoutGrid />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {!projects ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">{empty.icon}</EmptyMedia>
              <EmptyTitle>{query ? t('No matching projects') : empty.title}</EmptyTitle>
            </EmptyHeader>
            {!query && view.kind === 'all' && (
              <EmptyContent className="flex-row justify-center">
                <Button onClick={openNewProject}>
                  <FilePlus2 /> {t('New project')}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </Card>
      ) : layout === 'grid' ? (
        <motion.div layout className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <ProjectTable projects={shown} tags={tags ?? []} selected={selected} onSelect={setSelected} />
      )}
    </>
  )
}

function viewText(view: ListView, tag: Tag | undefined): { title: string; empty: { icon: ReactNode; title: string } } {
  switch (view.kind) {
    case 'shared':
      return { title: t('Shared with me'), empty: { icon: <UsersRound />, title: t('Nothing shared with you yet') } }
    case 'archived':
      return { title: t('Archived'), empty: { icon: <Archive />, title: t('Nothing archived') } }
    case 'trash':
      return { title: t('Trash'), empty: { icon: <Trash2 />, title: t('The trash is empty') } }
    case 'tag':
      return { title: tag?.name ?? t('Tag'), empty: { icon: <TagIcon />, title: t('No projects with this tag') } }
    default:
      return { title: t('Workspace'), empty: { icon: <FolderKanban />, title: t('No projects yet') } }
  }
}

/** Actions for the selected projects; what's offered depends on where they are. */
function BulkActions({ view, projects }: { view: ListView; projects: ProjectSummary[] }) {
  const tagsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon /> {t('Tags')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-52 overflow-y-auto">
        <TagMenuItems projects={projects} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
  if (view.kind === 'trash') {
    const owned = projects.some(p => p.role === 'owner')
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => void setTrashed(projects, false)}>
          <Undo2 /> {t('Restore')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => void deleteOrLeave(projects)}>
          <Trash2 /> {owned ? t('Delete forever') : t('Leave')}
        </Button>
      </>
    )
  }
  const archived = view.kind === 'archived'
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void setArchived(projects, !archived)}>
        {archived ? <ArchiveRestore /> : <Archive />} {archived ? t('Unarchive') : t('Archive')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => void setTrashed(projects, true)}>
        <Trash2 /> {t('Move to trash')}
      </Button>
      {tagsMenu}
    </>
  )
}

function ProjectTable({
  projects,
  tags,
  selected,
  onSelect,
}: {
  projects: ProjectSummary[]
  tags: Tag[]
  selected: Set<string>
  onSelect: (next: Set<string>) => void
}) {
  const all = projects.length > 0 && projects.every(p => selected.has(p.id))
  const some = !all && projects.some(p => selected.has(p.id))
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    onSelect(next)
  }
  // Columns follow the card's width (container queries), not the window's: the sidebar takes a varying share.
  return (
    <Card className="@container gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 pl-4">
              <Checkbox
                checked={all ? true : some ? 'indeterminate' : false}
                onCheckedChange={v => onSelect(v === true ? new Set(projects.map(p => p.id)) : new Set())}
                aria-label={t('Select all')}
              />
            </TableHead>
            <TableHead className={COLUMN.first}>{t('Project name')}</TableHead>
            <TableHead className={cn(COLUMN.gap, COLUMN.person, '@max-2xl:hidden')}>{t('Owner')}</TableHead>
            <TableHead className={cn(COLUMN.gap, '@max-4xl:hidden')}>{t('Access')}</TableHead>
            <TableHead className={cn(COLUMN.gap, COLUMN.tags, '@max-3xl:hidden')}>{t('Tags')}</TableHead>
            <TableHead className={cn(COLUMN.gap, '@max-xl:hidden')}>{t('Last edited')}</TableHead>
            {/* Takes what is left, so the columns stay next to the name instead of spreading out. */}
            <TableHead className="w-full @max-xl:hidden" />
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {projects.map((p, i) => {
              const projectTags = tags.filter(tag => p.tagIds.includes(tag.id))
              const isSelected = selected.has(p.id)
              return (
                <motion.tr
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.025, duration: 0.2 }}
                  onClick={() => navigate(`/project/${p.id}`)}
                  data-state={isSelected ? 'selected' : undefined}
                  className="group cursor-pointer border-b transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent/60"
                >
                  <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={v => toggle(p.id, v === true)} aria-label={t('Select {name}', { name: p.name })} />
                  </TableCell>
                  {/* Takes the free width, so a long name truncates instead of pushing the actions out of view. */}
                  <TableCell className={cn('w-full max-w-0', COLUMN.first)}>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="max-w-full truncate font-medium">{p.name}</span>
                          {/* Without the Tags column (narrow), the tags sit by the name. */}
                          {projectTags.map(tag => (
                            <TagBadge key={tag.id} tag={tag} className="@3xl:hidden" />
                          ))}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.rootFile}
                          <span className="@xl:hidden"> · {timeAgo(p.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cn(COLUMN.gap, COLUMN.person, '@max-2xl:hidden')}>
                    <div className="flex items-center gap-2">
                      <UserAvatar id={p.ownerId} name={p.ownerName} className="size-6 text-[11px]" />
                      <span className="truncate text-sm">{p.role === 'owner' ? t('You') : p.ownerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn(COLUMN.gap, '@max-4xl:hidden')}>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.role === 'owner' ? 'default' : 'secondary'}>{t(ROLE_LABEL[p.role])}</Badge>
                      {p.memberCount > 1 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3.5" /> {p.memberCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn(COLUMN.gap, COLUMN.tags, '@max-3xl:hidden')} onClick={e => e.stopPropagation()}>
                    <ProjectTags project={p} />
                  </TableCell>
                  <TableCell className={cn(COLUMN.gap, 'text-sm whitespace-nowrap text-muted-foreground @max-xl:hidden')} title={new Date(p.updatedAt).toLocaleString(intlLocale())}>
                    {timeAgo(p.updatedAt)}
                  </TableCell>
                  <TableCell className="@max-xl:hidden" />
                  <TableCell onClick={e => e.stopPropagation()}>
                    <ProjectActions project={p} />
                  </TableCell>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Card>
  )
}

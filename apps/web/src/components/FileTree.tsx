import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Download,
  File,
  FileCode,
  FileCode2,
  FileCog,
  FileImage,
  FileJson,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  FolderPlus,
  Link2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import type { FileEntry, LinkedFile } from '@coltex/shared'
import type { Peer } from '../lib/collab.ts'
import { t, tk } from '../lib/i18n.ts'
import { Button } from './ui/button.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

type NodeType = 'file' | 'folder'

type TreeNode = {
  name: string
  path: string
  type: NodeType
  binary: boolean
  children: TreeNode[]
}

type Editing = { kind: 'rename'; path: string; type: NodeType } | { kind: 'create'; type: NodeType; dir: string } | null

type Menu = { x: number; y: number; node: TreeNode | null }

export type FileTreeProps = {
  /** The project's sources as a zip. */
  downloadUrl: string
  projectId: string
  files: FileEntry[]
  folders: string[]
  activePath?: string
  /** Other people in the project; files they have open get a coloured marker. */
  peers?: Peer[]
  canEdit: boolean
  onOpen: (path: string, binary: boolean) => void
  onCreate: (type: NodeType, path: string) => Promise<void>
  /** Rename or move a file/folder. */
  onMove: (from: string, to: string) => Promise<void>
  onDelete: (path: string, type: NodeType) => Promise<void>
  onUpload: (dir: string, files: File[]) => Promise<void>
  /** Files added from another project or a URL, by path. */
  linked?: Map<string, LinkedFile>
  onAddLinked?: (dir: string) => void
  onRefreshLinked?: (path: string) => void
}

const DRAG_MIME = 'application/x-coltex-path'

/** Where a linked file comes from, for its tooltip. */
function linkedFrom(link: LinkedFile): string {
  if (link.kind === 'url') return t('Linked from {source}', { source: link.url ?? '' })
  const project = link.sourceProjectName ?? t('a deleted project')
  return link.kind === 'project_output'
    ? t('Linked from the PDF of {project}', { project })
    : t('Linked from {source}', { source: `${project}: ${link.sourcePath ?? ''}` })
}
const INDENT_PX = 14

const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)
const dirname = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1)
const isInside = (p: string, dir: string) => p === dir || p.startsWith(`${dir}/`)

function buildTree(files: FileEntry[], folders: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'folder', binary: false, children: [] }
  const byPath = new Map<string, TreeNode>([['', root]])
  const ensureFolder = (path: string): TreeNode => {
    const existing = byPath.get(path)
    if (existing) return existing
    const node: TreeNode = { name: basename(path), path, type: 'folder', binary: false, children: [] }
    byPath.set(path, node)
    ensureFolder(dirname(path)).children.push(node)
    return node
  }
  for (const f of folders) ensureFolder(f)
  for (const f of files) {
    ensureFolder(dirname(f.path)).children.push({
      name: basename(f.path),
      path: f.path,
      type: 'file',
      binary: f.binary,
      children: [],
    })
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
    n.children.forEach(sort)
  }
  sort(root)
  return root.children
}

/** An icon and colour per file type, so the tree is scannable at a glance. */
function fileIcon(name: string): { icon: LucideIcon; color: string } {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (['tex', 'ltx', 'tikz'].includes(ext)) return { icon: FileCode2, color: 'text-blue-600 dark:text-blue-400' }
  if (['sty', 'cls', 'def', 'cfg', 'clo', 'dtx', 'ins'].includes(ext)) return { icon: FileCog, color: 'text-violet-600 dark:text-violet-400' }
  if (['bib', 'bst', 'bbx', 'cbx', 'lbx'].includes(ext)) return { icon: BookMarked, color: 'text-amber-600 dark:text-amber-400' }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'eps'].includes(ext)) return { icon: FileImage, color: 'text-emerald-600 dark:text-emerald-400' }
  if (ext === 'pdf') return { icon: FileType, color: 'text-red-600 dark:text-red-400' }
  if (['csv', 'tsv'].includes(ext)) return { icon: FileSpreadsheet, color: 'text-green-600 dark:text-green-400' }
  if (['json', 'yaml', 'yml'].includes(ext)) return { icon: FileJson, color: 'text-orange-600 dark:text-orange-400' }
  if (['py', 'lua', 'r', 'rnw'].includes(ext)) return { icon: FileCode, color: 'text-sky-600 dark:text-sky-400' }
  if (['txt', 'md'].includes(ext)) return { icon: FileText, color: 'text-muted-foreground' }
  return { icon: File, color: 'text-muted-foreground' }
}

/** Expanded folders are remembered per project in this browser. */
function useExpanded(projectId: string, activePath?: string) {
  const key = `coltex:tree-expanded:${projectId}`
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...expanded]))
    } catch {}
  }, [key, expanded])
  // Reveal the open document.
  useEffect(() => {
    if (!activePath) return
    setExpanded(prev => {
      const next = new Set(prev)
      for (let d = dirname(activePath); d; d = dirname(d)) next.add(d)
      return next.size === prev.size ? prev : next
    })
  }, [activePath])
  const toggle = (path: string, open?: boolean) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (open ?? !next.has(path)) next.add(path)
      else next.delete(path)
      return next
    })
  return { expanded, toggle }
}

function NameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const input = ref.current!
    input.focus()
    // Select the name without its extension, like most file managers.
    const dot = initial.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])
  const finish = (value: string | null) => {
    if (done.current) return
    done.current = true
    onDone(value)
  }
  return (
    <input
      ref={ref}
      defaultValue={initial}
      spellCheck={false}
      className="min-w-0 flex-1 rounded border border-primary bg-card px-1 text-[15px] outline-none ring-2 ring-primary/20"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Enter') finish(e.currentTarget.value.trim())
        if (e.key === 'Escape') finish(null)
      }}
      onBlur={e => finish(e.currentTarget.value.trim())}
    />
  )
}

export function FileTree(props: FileTreeProps) {
  const { projectId, files, folders, activePath, canEdit, peers = [] } = props
  const tree = useMemo(() => buildTree(files, folders), [files, folders])
  const viewers = useMemo(() => {
    const byPath = new Map<string, Peer['user'][]>()
    for (const p of peers) if (p.path) byPath.set(p.path, [...(byPath.get(p.path) ?? []), p.user])
    return byPath
  }, [peers])
  const { expanded, toggle } = useExpanded(projectId, activePath)
  const [selected, setSelected] = useState<{ path: string; type: NodeType } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
  const uploadDir = useRef('')

  /** Folder that new files/uploads go into: the selected folder, or the selected file's folder. */
  const targetDir = (node?: TreeNode | null): string => {
    const n = node ?? selected
    if (!n) return ''
    return n.type === 'folder' ? n.path : dirname(n.path)
  }

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const startCreate = (type: NodeType, dir: string) => {
    if (dir) toggle(dir, true)
    setEditing({ kind: 'create', type, dir })
  }

  const startUpload = (dir: string) => {
    uploadDir.current = dir
    uploadInput.current?.click()
  }

  const commitEdit = async (value: string | null) => {
    const edit = editing
    setEditing(null)
    if (!edit || !value) return
    if (edit.kind === 'create') {
      await props.onCreate(edit.type, join(edit.dir, value))
      if (edit.type === 'folder') toggle(join(edit.dir, value), true)
    } else if (value !== basename(edit.path)) {
      await props.onMove(edit.path, join(dirname(edit.path), value))
    }
  }

  // ---- Drag and drop ----

  const dropDirFor = (node: TreeNode | null) => (node ? (node.type === 'folder' ? node.path : dirname(node.path)) : '')

  const onDragOver = (e: DragEvent, node: TreeNode | null) => {
    if (!canEdit) return
    const types = e.dataTransfer.types
    if (!types.includes(DRAG_MIME) && !types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = types.includes('Files') ? 'copy' : 'move'
    setDropTarget(dropDirFor(node))
  }

  const onDrop = async (e: DragEvent, node: TreeNode | null) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setDropTarget(null)
    const dir = dropDirFor(node)
    const from = e.dataTransfer.getData(DRAG_MIME)
    if (from) {
      const to = join(dir, basename(from))
      if (to === from || isInside(dir, from)) return
      if (dir) toggle(dir, true)
      await props.onMove(from, to)
    } else if (e.dataTransfer.files.length) {
      if (dir) toggle(dir, true)
      await props.onUpload(dir, Array.from(e.dataTransfer.files))
    }
  }

  // ---- Rendering ----

  const renderCreateRow = (dir: string, depth: number) =>
    editing?.kind === 'create' && editing.dir === dir ? (
      <li className="flex items-center gap-1.5 py-0.5 pr-2" style={{ paddingLeft: 8 + depth * INDENT_PX + 16 }}>
        {editing.type === 'folder' ? (
          <Folder className="size-4 shrink-0 text-amber-500" />
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        )}
        <NameInput initial={editing.type === 'folder' ? 'new-folder' : 'untitled.tex'} onDone={v => void commitEdit(v)} />
      </li>
    ) : null

  const renderNodes = (nodes: TreeNode[], depth: number, dir: string) => (
    <>
      {renderCreateRow(dir, depth)}
      {nodes.map(node => renderNode(node, depth))}
    </>
  )

  const renderNode = (node: TreeNode, depth: number) => {
    const isFolder = node.type === 'folder'
    const open = isFolder && expanded.has(node.path)
    const isActive = node.path === activePath
    const isSelected = selected?.path === node.path
    const isDrop = isFolder && dropTarget === node.path
    const isRenaming = editing?.kind === 'rename' && editing.path === node.path
    const { icon: Icon, color } = isFolder ? { icon: open ? FolderOpen : Folder, color: 'text-amber-500' } : fileIcon(node.name)
    return (
      <li key={node.path}>
        <div
          role="treeitem"
          aria-expanded={isFolder ? open : undefined}
          aria-selected={isActive}
          title={props.linked?.has(node.path) ? `${node.path}\n${linkedFrom(props.linked.get(node.path)!)}` : node.path}
          draggable={canEdit && !isRenaming}
          onDragStart={e => {
            e.dataTransfer.setData(DRAG_MIME, node.path)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={e => onDragOver(e, node)}
          onDragLeave={() => setDropTarget(null)}
          onDrop={e => void onDrop(e, node)}
          onClick={() => {
            setSelected({ path: node.path, type: node.type })
            if (isFolder) toggle(node.path)
            else props.onOpen(node.path, node.binary)
          }}
          onDoubleClick={() => canEdit && !isFolder && setEditing({ kind: 'rename', path: node.path, type: node.type })}
          onContextMenu={(e: ReactMouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setSelected({ path: node.path, type: node.type })
            setMenu({ x: e.clientX, y: e.clientY, node })
          }}
          className={`mx-1 flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pr-2 text-[15px] transition-colors ${
            isDrop
              ? 'bg-accent ring-1 ring-primary/50 ring-inset'
              : isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : isSelected
                  ? 'bg-muted'
                  : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: 8 + depth * INDENT_PX }}
        >
          {isFolder ? (
            open ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <Icon className={`size-4 shrink-0 ${color}`} />
          {isRenaming ? (
            <NameInput initial={node.name} onDone={v => void commitEdit(v)} />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {props.linked?.has(node.path) && (
              <Link2 className="size-3.5 text-muted-foreground" aria-label={linkedFrom(props.linked.get(node.path)!)} />
            )}
            {(viewers.get(node.path) ?? []).map(u => (
              <span key={u.id} title={t('{name} has this open', { name: u.name })} className="size-2 rounded-full" style={{ background: u.color }} />
            ))}
          </span>
        </div>
        {isFolder && open && <ul role="group">{renderNodes(node.children, depth + 1, node.path)}</ul>}
      </li>
    )
  }

  const menuItems = (node: TreeNode | null) => {
    const dir = targetDir(node)
    const items: { label: string; icon: LucideIcon; run: () => void; danger?: boolean }[] = []
    if (canEdit) {
      items.push({ label: t('New file'), icon: FilePlus, run: () => startCreate('file', dir) })
      items.push({ label: t('New folder'), icon: FolderPlus, run: () => startCreate('folder', dir) })
      items.push({ label: t('Upload files…'), icon: Upload, run: () => startUpload(dir) })
      if (props.onAddLinked) items.push({ label: t('Add a linked file…'), icon: Link2, run: () => props.onAddLinked?.(dir) })
    }
    if (node && canEdit && props.linked?.has(node.path) && props.onRefreshLinked) {
      items.push({ label: t('Refresh linked file'), icon: RefreshCw, run: () => props.onRefreshLinked?.(node.path) })
    }
    if (node && canEdit) {
      items.push({ label: t('Rename'), icon: Pencil, run: () => setEditing({ kind: 'rename', path: node.path, type: node.type }) })
      items.push({ label: t('Delete'), icon: Trash2, danger: true, run: () => void props.onDelete(node.path, node.type) })
    }
    return items
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No title: the rail already says this is Files. */}
      <div className="flex h-11 shrink-0 items-center justify-center gap-1 border-b px-2">
        {canEdit &&
          (
            [
              [tk('New file'), FilePlus, () => startCreate('file', targetDir())],
              [tk('New folder'), FolderPlus, () => startCreate('folder', targetDir())],
              [tk('Upload files'), Upload, () => startUpload(targetDir())],
              ...(props.onAddLinked ? ([[tk('Add a linked file'), Link2, () => props.onAddLinked?.(targetDir())]] as const) : []),
            ] as const
          ).map(([label, Icon, run]) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={run} aria-label={t(label)}>
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t(label)}</TooltipContent>
            </Tooltip>
          ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={props.downloadUrl} download aria-label={t('Download source')}>
                <Download />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Download source')}</TooltipContent>
        </Tooltip>
      </div>
      <ul
        role="tree"
        className={`min-h-0 flex-1 overflow-auto py-1.5 ${dropTarget === '' ? 'bg-accent/60 ring-1 ring-primary/40 ring-inset' : ''}`}
        onDragOver={e => onDragOver(e, null)}
        onDragLeave={() => setDropTarget(null)}
        onDrop={e => void onDrop(e, null)}
        onClick={e => e.target === e.currentTarget && setSelected(null)}
        onContextMenu={e => {
          if (!canEdit) return
          e.preventDefault()
          setSelected(null)
          setMenu({ x: e.clientX, y: e.clientY, node: null })
        }}
      >
        {renderNodes(tree, 0, '')}
      </ul>
      <input
        ref={uploadInput}
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          const picked = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (picked.length) void props.onUpload(uploadDir.current, picked)
        }}
      />
      {menu && menuItems(menu.node).length > 0 && (
        <div
          role="menu"
          className="fixed z-50 min-w-48 animate-in fade-in-0 zoom-in-95 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          {menuItems(menu.node).map(item => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setMenu(null)
                item.run()
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent ${item.danger ? 'text-destructive hover:bg-destructive/10' : ''}`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

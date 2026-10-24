import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  CircleAlert,
  Code2,
  Columns2,
  CloudCheck,
  CloudOff,
  LocateFixed,
  Download,
  Eraser,
  ExternalLink,
  FileImage,
  FileText,
  FolderTree,
  PanelRightOpen,
  Keyboard,
  Library,
  Search,
  History as HistoryIcon, // i18n-ignore
  Settings2,
  MessageSquareText,
  MessagesSquare,
  Play,
  ScrollText,
  Sparkles,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  OUTPUT,
  type CompileResult,
  type Diagnostic,
  type FileEntry,
  type LinkedFile,
  type ProjectMember,
  type ProjectMeta,
  type ProjectRole,
} from '@coltex/shared'
import { relPos, type ResolvedReview } from '@coltex/review'
import { ADD_COMMENT_EVENT, type Annotation, type VisualOptions } from '@coltex/latex-language'
import { loadPdfFigure } from '../lib/pdf-figures.ts'
import type { ReviewState } from '@coltex/shared'
import { aiPick, useAiSession, useAiStatus } from '../lib/ai.ts'
import { api } from '../lib/api.ts'
import type { SessionUser } from '../lib/auth.ts'
import { collabUser, useCollabDoc, useCollabSocket, useProjectPresence, userColor, type Peer } from '../lib/collab.ts'
import type { ReviewFocus } from '../lib/review-extension.ts'
import { useChat } from '../lib/chat.ts'
import { useCompileSettings } from '../lib/compile-settings.ts'
import { setOnScreen } from '../lib/notifications.ts'
import { useProjectMetadata } from '../lib/use-project-metadata.ts'
import { PING_TIMEOUT_MS, openPdfWindow, pdfChannel, type EditorMessage, type PdfWindowMessage } from '../lib/pdf-window.ts'
import { AiPanel } from './AiPanel.tsx'
import { ChatPanel } from './ChatPanel.tsx'
import { EditorToolbar } from './EditorToolbar.tsx'
import { SymbolPalette } from './SymbolPalette.tsx'
import { CodeEditor, languageFor, type CodeEditorHandle, type EditorReview, type EditorSelection } from './CodeEditor.tsx'
import { FileTree } from './FileTree.tsx'
import { FigureModal } from '../figure-modal/figure-modal.tsx'
import { OutlinePane } from '../outline/outline-pane.tsx'
import { Breadcrumbs } from '../outline/breadcrumbs.tsx'
import { EditorContextMenu } from './EditorContextMenu.tsx'
import { LinkedFileDialog } from './LinkedFileDialog.tsx'
import { useEditorSettings } from '../lib/editor-settings.ts'
import { COMPACT_QUERY, NARROW_QUERY, useMediaQuery } from '../lib/use-media-query.ts'
import { SearchPanel } from '../search/search-panel.tsx'
import { ReferencesPanel } from '../references/references-panel.tsx'
import { ShortcutsDialog } from './ShortcutsDialog.tsx'
import { HistoryView } from './HistoryView.tsx'
import { AI_START_KEY, openConvert } from './ConvertDialog.tsx'
import { ReviewPanel, type CommentDraft } from './ReviewPanel.tsx'
import { ShareDialog } from './ShareDialog.tsx'
import { WordCountDialog } from './WordCountDialog.tsx'
import { openCopyProject } from './shell/project-dialogs.tsx'
import { spellLanguageOptions, useHunspell, useLearnedWords } from '../spelling/index.ts'
import { LogPanel } from './LogPanel.tsx'
import { ProjectSettingsDialog } from './ProjectSettingsDialog.tsx'
import { PdfViewer, type PdfViewerHandle } from './PdfViewer.tsx'
import { LogoMark } from './brand.tsx'
import { confirmDialog } from './confirm.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { ButtonGroup } from './ui/button-group.tsx'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'
import { usePanelRef, type PanelProps } from 'react-resizable-panels'
import { toast } from 'sonner'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable.tsx'
import { Spinner } from './ui/spinner.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'
import { initials } from '../lib/format.ts'
import { cn } from '../lib/utils.ts'
import { t, tk, translateServerMessage } from '../lib/i18n.ts'

/** The open text file; `docId` identifies its collaborative session and survives renames. */
type OpenDoc = { path: string; docId: string }

const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp)$/i
const EDITOR_MODE_KEY = 'coltex:editor-mode'
function readEditorMode(): boolean {
  try {
    return localStorage.getItem(EDITOR_MODE_KEY) === 'visual'
  } catch {
    return false
  }
}
/** Editor and PDF side by side, or one of them (Overleaf's layout menu); remembered in this browser. */
type PdfLayout = 'split' | 'editor' | 'pdf'
const PDF_LAYOUT_KEY = 'coltex:pdf-layout'
function readPdfLayout(): PdfLayout {
  try {
    const v = localStorage.getItem(PDF_LAYOUT_KEY)
    return v === 'editor' || v === 'pdf' ? v : 'split'
  } catch {
    return 'split'
  }
}
/** Graphics files the visual editor previews, tried in this order when \includegraphics omits the extension. */
const FIGURE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']

/** Auto compile: build this long after the last edit… */
const AUTO_COMPILE_DELAY_MS = 2000
/** …but no later than this after the first one, while typing goes on. */
const AUTO_COMPILE_MAX_WAIT_MS = 8000
/** Notifications open the editor at `#/project/<id>?chat` or `?thread=<id>`. */
type LinkTarget = { chat: true } | { thread: string } | null
function readLinkTarget(projectId: string): LinkTarget {
  const [path, query] = window.location.hash.slice(1).split('?')
  if (path !== `/project/${projectId}` || !query) return null
  const params = new URLSearchParams(query)
  const thread = params.get('thread')
  if (thread) return { thread }
  return params.has('chat') ? { chat: true } : null
}

const isInside = (p: string, dir: string) => p === dir || p.startsWith(`${dir}/`)
const joinPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

export function EditorPage({ projectId, user }: { projectId: string; user: SessionUser }) {
  const [project, setProject] = useState<ProjectMeta>()
  const [role, setRole] = useState<ProjectRole>('viewer')
  const [sharing, setSharing] = useState(false)
  const [wordCountOpen, setWordCountOpen] = useState(false)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [doc, setDoc] = useState<OpenDoc>()
  /** A binary file shown in the centre pane instead of the editor. */
  const [binaryPath, setBinaryPath] = useState<string>()
  const [compiling, setCompiling] = useState(false)
  const [result, setResult] = useState<CompileResult>()
  /** The latest build that produced a PDF: a failed build (e.g. stopped at the first error) keeps the last PDF on screen. */
  const [pdfBuild, setPdfBuild] = useState<CompileResult>()
  const [compileSettings, setCompileSettings] = useCompileSettings(projectId)
  const compileSettingsRef = useRef(compileSettings)
  compileSettingsRef.current = compileSettings
  const [showLogs, setShowLogs] = useState(false)
  const [error, setError] = useState<string>()
  const [selection, setSelection] = useState<EditorSelection>()
  const { status: aiStatus, choose: chooseAiModel } = useAiStatus()
  /** What the left side panel shows (Overleaf's rail); null collapses it. */
  const [side, setSide] = useState<SidePanel | null>(() => (window.matchMedia(COMPACT_QUERY).matches ? null : 'files'))
  const narrow = useMediaQuery(NARROW_QUERY)
  const compact = useMediaQuery(COMPACT_QUERY)
  /** What Ctrl/Cmd+F hands to the Search panel: the selected text (n makes each press a new request). */
  const [searchSeed, setSearchSeed] = useState<{ text: string; n: number }>()
  const openSearch = useCallback((text = '') => {
    setSearchSeed(s => ({ text, n: (s?.n ?? 0) + 1 }))
    setSide('search')
  }, [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const aiOpen = side === 'ai'
  /** Stay subscribed to the assistant once it has been opened, so work in progress keeps streaming. */
  const [aiStarted, setAiStarted] = useState(false)
  const [aiReviewing, setAiReviewing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const reviewOpen = side === 'review'
  const chatOpen = side === 'chat'
  const [review, setReview] = useState<ReviewState>()
  /** Live review positions in the open file; mirrored into state only while the panel shows them. */
  const liveRef = useRef<ResolvedReview>(undefined)
  const [live, setLive] = useState<ResolvedReview>()
  const [reviewFocus, setReviewFocus] = useState<ReviewFocus>({ threadIds: [], changeIds: [] })
  const [draft, setDraft] = useState<CommentDraft | null>(null)
  const reviewOpenRef = useRef(reviewOpen)
  reviewOpenRef.current = reviewOpen
  const sidePanel = usePanelRef()
  // Diffs need room: widen the panel while the assistant's changes are reviewed, then give the space back.
  const reviewWidth = useRef<number>(undefined)
  useEffect(() => {
    const panel = sidePanel.current
    if (!panel) return
    if (aiReviewing) {
      reviewWidth.current = panel.getSize().inPixels
      panel.resize('50%')
    } else if (reviewWidth.current) {
      panel.resize(reviewWidth.current)
      reviewWidth.current = undefined
    }
  }, [aiReviewing, sidePanel])

  const { metadata, updateContent, findLabel, bibSources } = useProjectMetadata(projectId, files)
  const learnedWords = useLearnedWords()
  const hunspell = useHunspell(project?.spellCheckLanguage, learnedWords)
  const editor = useRef<CodeEditorHandle>(null)
  /** The same handle as state, so the toolbar re-renders when the editor (re)mounts. */
  const [editorHandle, setEditorHandle] = useState<CodeEditorHandle | null>(null)
  const setEditorRef = useCallback((h: CodeEditorHandle | null) => {
    editor.current = h
    setEditorHandle(h)
  }, [])
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  /** Code or visual editor, remembered in this browser (like Overleaf's editor switch). */
  const [visualMode, setVisualMode] = useState(readEditorMode)
  const changeVisualMode = useCallback((visual: boolean) => {
    setVisualMode(visual)
    try {
      localStorage.setItem(EDITOR_MODE_KEY, visual ? 'visual' : 'code')
    } catch {}
  }, [])
  const pdf = useRef<PdfViewerHandle>(null)
  const pendingJump = useRef<number>(null)
  /** A range to select once the target document's editor is ready (project search). */
  const pendingRange = useRef<{ from: number; to: number }>(null)

  const me = useMemo(() => collabUser(user), [user])
  const socket = useCollabSocket()
  const { peers, treeVersion, reviewVersion, chatVersion, connected } = useProjectPresence(socket, projectId, me, doc?.path ?? binaryPath)
  const chat = useChat(projectId, chatVersion, user.id, chatOpen)
  const { doc: shared, unsynced, failed } = useCollabDoc(socket, projectId, doc?.docId, me)

  const refresh = useCallback(async () => {
    const data = await api.getProject(projectId)
    setProject(data.project)
    setRole(data.role)
    setFiles(data.files)
    setFolders(data.folders)
    // Follow the open document if someone renamed or moved it; drop it if it was deleted.
    setDoc(current => {
      if (!current) return current
      const now = data.docs.find(d => d.id === current.docId)
      if (!now) {
        setError(`“${current.path}” was deleted.`)
        return undefined
      }
      return now.path === current.path ? current : { ...current, path: now.path }
    })
    return data
  }, [projectId])

  const open = useCallback(
    async (path: string, line?: number, binary = false) => {
      if (binary) {
        setDoc(undefined)
        setBinaryPath(path)
        return
      }
      setBinaryPath(undefined)
      if (doc?.path === path) {
        if (line) editor.current?.goToLine(line)
        return
      }
      const { docId } = await api.resolveDoc(projectId, path)
      pendingJump.current = line ?? null
      setDoc({ path, docId })
    },
    [doc?.path, projectId],
  )

  /** Run a file-tree action, surfacing failures in the error banner. */
  const run = async (action: () => Promise<void>) => {
    setError(undefined)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    refresh()
      .then(data => {
        // Like Overleaf, build on open so the PDF is there straight away.
        void compileRef.current({ auto: true })
        return open(data.project.rootFile)
      })
      .catch(e => setError((e as Error).message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Someone changed the file tree (create, rename, move, delete, upload): reload it.
  useEffect(() => {
    if (treeVersion === 0) return
    refresh().catch(e => setError((e as Error).message))
    scheduleAutoCompile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeVersion, refresh])

  const reloadReview = useCallback(async () => {
    setReview(await api.review(projectId))
  }, [projectId])

  // The members, for names and @mentions in the chat and in comments.
  const [members, setMembers] = useState<ProjectMember[]>([])
  useEffect(() => {
    if (side === 'chat' || side === 'review') api.listMembers(projectId).then(setMembers, () => {})
  }, [projectId, side])

  // Comments or decisions changed somewhere (the server bumps the counter): refetch.
  useEffect(() => {
    reloadReview().catch(() => {})
  }, [reloadReview, reviewVersion])

  // Resolved threads aren't highlighted: re-run the editor's decorations when that set changes.
  const resolvedKey = review?.threads.filter(t => t.resolved).map(t => t.id).join() ?? ''
  useEffect(() => {
    editor.current?.refreshReview()
  }, [resolvedKey])

  // A comment draft and live positions belong to their file.
  useEffect(() => {
    setDraft(null)
    liveRef.current = undefined
    setLive(undefined)
  }, [doc?.docId])

  // Apply a jump requested before the target document's editor was ready.
  useEffect(() => {
    if (shared && pendingJump.current) {
      editor.current?.goToLine(pendingJump.current)
      pendingJump.current = null
    }
    if (shared && pendingRange.current) {
      const { from, to } = pendingRange.current
      editor.current?.selectRange(from, to)
      pendingRange.current = null
    }
  }, [shared])

  /** Open a text file with a range selected (a project search result). */
  const openRange = useCallback(
    async (path: string, from: number, to: number) => {
      setBinaryPath(undefined)
      if (doc?.path === path) {
        editor.current?.selectRange(from, to)
        return
      }
      const { docId } = await api.resolveDoc(projectId, path)
      pendingJump.current = null
      pendingRange.current = { from, to }
      setDoc({ path, docId })
    },
    [doc?.path, projectId],
  )

  // Ctrl/Cmd+Shift+F: search the project.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openSearch(window.getSelection()?.toString() ?? '')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Edits are sent continuously; only warn while some haven't reached the server.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (unsynced > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [unsynced])

  /** The last text seen per document, so opening a file doesn't count as an edit. */
  const lastText = useRef(new Map<string, string>())
  const onChange = (content: string) => {
    if (!doc) return
    updateContent(doc.path, content)
    const before = lastText.current.get(doc.docId)
    lastText.current.set(doc.docId, content)
    // Anyone's edit counts (remote changes arrive here too), so a viewer's PDF follows the authors.
    if (before !== undefined && before !== content) scheduleAutoCompile()
  }

  const showBuild = (r: CompileResult) => {
    setResult(r)
    if (r.outputFiles.includes(OUTPUT.pdf)) setPdfBuild(r)
  }

  const compilingRef = useRef(false)
  /** Auto compile asked for a build while one was running: build again when it ends. */
  const autoPending = useRef(false)
  const autoTimer = useRef<number>(undefined)
  const autoSince = useRef(0)

  /**
   * Builds when typing pauses, or at least every AUTO_COMPILE_MAX_WAIT_MS while
   * it goes on. The server folds concurrent requests into one build per project.
   */
  const scheduleAutoCompile = useCallback(() => {
    if (!compileSettingsRef.current.autoCompile) return
    const now = Date.now()
    if (!autoSince.current) autoSince.current = now
    window.clearTimeout(autoTimer.current)
    const delay = Math.max(0, Math.min(AUTO_COMPILE_DELAY_MS, autoSince.current + AUTO_COMPILE_MAX_WAIT_MS - now))
    autoTimer.current = window.setTimeout(() => {
      autoSince.current = 0
      void compileRef.current({ auto: true })
    }, delay)
  }, [])
  useEffect(() => () => window.clearTimeout(autoTimer.current), [])

  /** `auto` builds (auto compile, opening the project) don't pull the logs over the PDF. */
  const compile = useCallback(
    async ({ clean = false, auto = false }: { clean?: boolean; auto?: boolean } = {}): Promise<CompileResult | undefined> => {
      if (compilingRef.current) {
        if (auto) autoPending.current = true
        return
      }
      compilingRef.current = true
      setCompiling(true)
      if (!auto) setError(undefined)
      try {
        const { draft, stopOnFirstError } = compileSettingsRef.current
        const r = await api.compile(projectId, { clean, draft, stopOnFirstError })
        showBuild(r)
        if (r.status !== 'success' && !auto) setShowLogs(true)
        return r
      } catch (e) {
        setError((e as Error).message)
      } finally {
        compilingRef.current = false
        setCompiling(false)
        if (autoPending.current) {
          autoPending.current = false
          scheduleAutoCompile()
        }
      }
    },
    [projectId, scheduleAutoCompile],
  )
  const compileRef = useRef(compile)
  compileRef.current = compile

  /** SyncTeX: show the editor's cursor position in the PDF (here, or in the PDF window). */
  const syncToPdf = async () => {
    const cursor = editor.current?.getCursor()
    if (!pdfBuild || !doc || !cursor) return
    try {
      const { positions } = await api.synctexToPdf(projectId, pdfBuild.buildId, { file: doc.path, ...cursor })
      if (positions.length === 0) setError(`No PDF location found for ${doc.path}:${cursor.line}`)
      else if (pdfDetachedRef.current) {
        pdfWindowSend({ type: 'positions', positions })
      } else {
        setShowLogs(false)
        if (layoutRef.current === 'editor') {
          // The PDF is hidden: show it, and scroll once it has its size again.
          setLayoutPref('pdf')
          window.setTimeout(() => pdf.current?.showPositions(positions), 200)
        } else pdf.current?.showPositions(positions)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /** SyncTeX: jump from a point in the PDF to the source line. */
  const syncToCode = async (pos: { page: number; h: number; v: number }) => {
    if (!pdfBuild) return
    try {
      const { position } = await api.synctexToCode(projectId, pdfBuild.buildId, pos)
      if (position) await open(position.file, position.line)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // ---- Linked files (from another project or a URL) ----
  const [linked, setLinked] = useState<Map<string, LinkedFile>>(new Map())
  const [linkDir, setLinkDir] = useState<string>()
  const filePaths = files.map(f => f.path).join('\n')
  const loadLinked = useCallback(
    () =>
      api.listLinkedFiles(projectId).then(
        list => setLinked(new Map(list.map(l => [l.path, l]))),
        () => {},
      ),
    [projectId],
  )
  // Again whenever files come or go (renames, deletes, a new link).
  useEffect(() => void loadLinked(), [loadLinked, filePaths])
  const refreshLinked = (path: string) =>
    run(async () => {
      const id = toast.loading(t('Refreshing “{path}”…', { path }))
      try {
        await api.refreshLinkedFile(projectId, path)
        toast.success(t('Refreshed “{path}”', { path }), { id })
      } catch (e) {
        toast.dismiss(id)
        throw e
      }
      await refresh()
      await loadLinked()
    })

  // ---- The PDF in a window of its own (lib/pdf-window.ts) ----
  const [pdfDetached, setPdfDetached] = useState(false)
  const pdfDetachedRef = useRef(false)
  pdfDetachedRef.current = pdfDetached
  const [layoutPref, setLayoutPref] = useState<PdfLayout>(readPdfLayout)
  const changeLayout = (l: PdfLayout) => {
    setLayoutPref(l)
    try {
      localStorage.setItem(PDF_LAYOUT_KEY, l)
    } catch {
      // Private mode: the layout lasts for this page only.
    }
  }
  /** What is on screen: a narrow window has room for one of the two; a PDF window takes the PDF. */
  const layout: PdfLayout = pdfDetached ? 'editor' : narrow && layoutPref === 'split' ? 'editor' : layoutPref
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const editorPanel = usePanelRef()
  const previewPanel = usePanelRef()
  /** Layout changes made here, so the panes' resize events that follow aren't taken for dragging. */
  const layoutChangedAt = useRef(0)
  useEffect(() => {
    layoutChangedAt.current = Date.now()
    if (layout === 'split') {
      editorPanel.current?.expand()
      previewPanel.current?.expand()
      // A pane squeezed while the window was narrow comes back at half the room.
      requestAnimationFrame(() => {
        const e = editorPanel.current?.getSize().inPixels ?? 0
        const p = previewPanel.current?.getSize().inPixels ?? 0
        if (e < 280 || p < 280) previewPanel.current?.resize((e + p) / 2)
      })
    } else if (layout === 'editor') {
      editorPanel.current?.expand()
      previewPanel.current?.collapse()
    } else {
      previewPanel.current?.expand()
      editorPanel.current?.collapse()
    }
  }, [layout, pdfDetached, editorPanel, previewPanel])
  /** Dragging the divider all the way hides a pane; dragging it back out shows both. */
  const paneResized = (pane: 'editor' | 'pdf', px: number) => {
    if (narrow || pdfDetached || Date.now() - layoutChangedAt.current < 400) return
    const other = pane === 'editor' ? 'pdf' : 'editor'
    if (px === 0 && layoutRef.current === 'split') changeLayout(other)
    else if (px > 0 && layoutRef.current === other) changeLayout('split')
  }
  const pdfChannelRef = useRef<BroadcastChannel>(null)
  const pdfWindowSend = (message: EditorMessage) => pdfChannelRef.current?.postMessage(message)
  /** What the PDF window asks for, with this render's state. */
  const pdfWindowActions = useRef({ compile, syncToPdf, syncToCode, open })
  pdfWindowActions.current = { compile, syncToPdf, syncToCode, open }
  const pdfWindowState = useRef<EditorMessage>(undefined)
  pdfWindowState.current = { type: 'state', name: project?.name ?? '', result, pdfBuild, compiling, error }
  useEffect(() => {
    const ch = pdfChannel(projectId)
    pdfChannelRef.current = ch
    let lastPing = 0
    ch.onmessage = (e: MessageEvent<PdfWindowMessage>) => {
      const m = e.data
      const actions = pdfWindowActions.current
      if (m.type === 'bye') {
        lastPing = 0
        setPdfDetached(false)
        return
      }
      lastPing = Date.now()
      setPdfDetached(true)
      if (m.type === 'hello') ch.postMessage(pdfWindowState.current)
      else if (m.type === 'ping') ch.postMessage({ type: 'pong' } satisfies EditorMessage)
      else if (m.type === 'compile') void actions.compile()
      else if (m.type === 'sync-to-pdf') void actions.syncToPdf()
      else if (m.type === 'sync-to-code') void actions.syncToCode(m.pos)
      else if (m.type === 'open') void actions.open(m.file, m.line)
    }
    // A PDF window that closed without saying so (crash, killed) gives the pane back.
    const timer = window.setInterval(() => {
      if (lastPing && Date.now() - lastPing > PING_TIMEOUT_MS) {
        lastPing = 0
        setPdfDetached(false)
      }
    }, 1000)
    const closing = () => ch.postMessage({ type: 'closing' } satisfies EditorMessage)
    window.addEventListener('pagehide', closing)
    return () => {
      closing()
      window.removeEventListener('pagehide', closing)
      window.clearInterval(timer)
      ch.close()
      pdfChannelRef.current = null
    }
  }, [projectId])
  useEffect(() => {
    if (pdfDetached) pdfWindowSend(pdfWindowState.current!)
  }, [pdfDetached, project?.name, result, pdfBuild, compiling, error])

  const createEntry = (type: 'file' | 'folder', path: string) =>
    run(async () => {
      if (type === 'folder') await api.createFolder(projectId, path)
      else await api.writeFile(projectId, path, '', { createOnly: true })
      await refresh()
      if (type === 'file') await open(path)
    })

  const moveEntry = (from: string, to: string) =>
    run(async () => {
      await api.move(projectId, from, to)
      // The open text document follows via its docId in refresh(); binary previews by path.
      if (binaryPath && isInside(binaryPath, from)) setBinaryPath(to + binaryPath.slice(from.length))
      await refresh()
    })

  const deleteEntry = async (path: string, type: 'file' | 'folder') => {
    const ok = await confirmDialog({
      title: type === 'folder' ? t('Delete the folder “{path}”?', { path }) : t('Delete “{path}”?', { path }),
      description:
        type === 'folder'
          ? t('Everything in it is deleted for all collaborators. Earlier versions stay in the history.')
          : t('The file is deleted for all collaborators. Earlier versions stay in the history.'),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return
    return run(async () => {
      if (type === 'folder') await api.deleteFolder(projectId, path)
      else await api.deleteFile(projectId, path)
      if (doc && isInside(doc.path, path)) setDoc(undefined)
      if (binaryPath && isInside(binaryPath, path)) setBinaryPath(undefined)
      await refresh()
    })
  }

  const uploadFiles = (dir: string, picked: File[]) =>
    run(async () => {
      const existing = new Set(files.map(f => f.path))
      for (const file of picked) {
        const target = joinPath(dir, file.name)
        if (
          existing.has(target) &&
          !(await confirmDialog({
            title: t('Replace “{path}”?', { path: target }),
            description: t('A file with this name already exists.'),
            confirmLabel: t('Replace'),
          }))
        ) {
          continue
        }
        await api.writeFile(projectId, target, file)
      }
      await refresh()
    })

  const update = async (patch: Partial<Pick<ProjectMeta, 'rootFile' | 'engine' | 'spellCheckLanguage'>>) => {
    setProject(await api.updateProject(projectId, patch))
  }

  const pdfUrl = pdfBuild ? api.buildUrl(projectId, pdfBuild.buildId, OUTPUT.pdf) : undefined
  const logUrl =
    result && result.outputFiles.includes(OUTPUT.log) ? api.buildUrl(projectId, result.buildId, OUTPUT.log) : undefined
  const errorCount = result?.diagnostics.filter(d => d.level === 'error').length ?? 0
  /** The last build's log entries in the open file, for its editor's gutter (as in Overleaf). */
  const annotations = useMemo<Annotation[]>(() => {
    if (!result || !doc) return []
    const level = { error: 'error', warning: 'warning', typesetting: 'info' } as const
    return result.diagnostics.flatMap((d, entryIndex) =>
      d.line && d.file?.replace(/^\.\//, '') === doc.path
        ? [
            {
              row: d.line - 1,
              type: level[d.level],
              // The message stays English (it's LaTeX's); the plain-language hint is translated.
              text: d.hint ? `${d.message}\n\n${translateServerMessage(d.hint)}` : d.message,
              ruleId: d.ruleId,
              command: d.command,
              entryIndex,
            },
          ]
        : [],
    )
  }, [result, doc])
  const texFiles = files.filter(f => f.path.endsWith('.tex'))
  // Figures for the visual editor: paths as \includegraphics writes them, relative to the project root.
  const visualFiles = useMemo<VisualOptions>(() => {
    const paths = new Set(files.map(f => f.path))
    return {
      previewByPath: raw => {
        const path = raw.trim().replace(/^\.\//, '')
        // As written first, then with each graphics extension (\includegraphics may omit it).
        const candidates = [path, ...FIGURE_EXTENSIONS.map(ext => `${path}.${ext}`)]
        const found = candidates.find(c => paths.has(c))
        if (!found) return null
        return { url: api.fileUrl(projectId, found), extension: found.slice(found.lastIndexOf('.') + 1) }
      },
      loadPdf: loadPdfFigure,
      // From the visual editor's \input/\include and \ref tooltips.
      commandActions: {
        openFile: raw => {
          const path = raw.replace(/^\.\//, '')
          const found = [path, `${path}.tex`].find(c => paths.has(c))
          if (found) void run(() => open(found))
          else setError(`File not found: ${path}`)
        },
        openLabel: label => {
          const target = findLabel(label)
          if (target) void run(() => open(target.path, target.line))
        },
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, projectId, findLabel])
  // Names follow the interface language, which remounts the app when it changes.
  // The English variants come first: most papers here are written in English.
  const spellOptions = useMemo(() => {
    const all = spellLanguageOptions()
    return [...all.filter(l => l.code.startsWith('en_')), ...all.filter(l => !l.code.startsWith('en_'))]
  }, [])
  const canEdit = role === 'owner' || role === 'editor'
  /** Reviewers type too, but only as tracked suggestions (the server refuses anything else). */
  const canType = canEdit || role === 'reviewer'
  const tracking =
    role === 'reviewer' || (canEdit && !!review && (review.trackChanges.everyone || review.trackChanges.users.includes(user.id)))
  const trackingRef = useRef(tracking)
  trackingRef.current = tracking
  const resolvedIds = useMemo(() => new Set(review?.threads.filter(t => t.resolved).map(t => t.id)), [review])
  // Changes in the open file come live from its document; the server's list catches up on refetch.
  const reviewCount = review
    ? review.threads.filter(t => !t.resolved).length +
      review.changes.filter(c => c.docId !== doc?.docId).length +
      (live?.changes.length ?? 0)
    : 0

  const openReview = () => {
    setLive(liveRef.current)
    setSide('review')
  }

  // Opened from a notification: show the chat, or the comment thread in its file.
  const [linkTarget, setLinkTarget] = useState(() => readLinkTarget(projectId))
  useEffect(() => {
    const onHash = () => setLinkTarget(readLinkTarget(projectId))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [projectId])
  useEffect(() => {
    if (!linkTarget || (!('chat' in linkTarget) && !review)) return
    // Drop the query, so reloading the page doesn't jump again.
    window.history.replaceState(null, '', `#/project/${projectId}`)
    setLinkTarget(null)
    if ('chat' in linkTarget) {
      setSide('chat')
      return
    }
    const thread = review!.threads.find(th => th.id === linkTarget.thread)
    if (!thread) {
      toast.error('That comment has been deleted')
      return
    }
    void api.notificationsSeen(projectId, thread.id).catch(() => {})
    openReview()
    setReviewFocus({ threadIds: [thread.id], changeIds: [] })
    if (thread.path) void run(() => open(thread.path, thread.line ?? undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkTarget, review])

  // Opening the chat counts as reading its mentions.
  useEffect(() => {
    if (chatOpen) void api.notificationsSeen(projectId).catch(() => {})
  }, [chatOpen, projectId])

  // No toast for what is already on screen here: the open chat, or a comment in the open file with the review panel showing.
  const docPathRef = useRef(doc?.path)
  docPathRef.current = doc?.path
  const chatOpenRef = useRef(chatOpen)
  chatOpenRef.current = chatOpen
  useEffect(() => {
    setOnScreen(n => {
      if (n.project?.id !== projectId) return false
      const shown = n.source === 'chat' ? chatOpenRef.current : !!n.threadId && reviewOpenRef.current && n.path === docPathRef.current
      if (shown) void api.notificationsSeen(projectId, n.threadId ?? undefined).catch(() => {})
      return shown
    })
    return () => setOnScreen(null)
  }, [projectId])

  const editorReview: EditorReview = {
    userId: user.id,
    canComment: true,
    isTracking: () => trackingRef.current,
    colorOf: userColor,
    isHidden: id => resolvedIds.has(id),
    onAddComment: (from, to) => {
      if (!shared || !doc) return
      const quote = shared.ytext.toString().slice(from, Math.min(to, from + 500))
      setDraft({ docId: doc.docId, from, to, start: relPos(shared.ytext, from, 0), end: relPos(shared.ytext, to, -1), quote })
      editor.current?.setCommentDraft({ from, to })
      openReview()
    },
    onFocus: focus => {
      if (reviewOpenRef.current) setReviewFocus(focus)
    },
    onResolved: r => {
      const before = liveRef.current
      liveRef.current = r
      // Re-render per keystroke only while the panel shows positions; otherwise just keep the count right.
      if (reviewOpenRef.current || before?.changes.length !== r.changes.length) setLive(r)
    },
  }

  // The toolbar's "Add comment" (Overleaf's command fires a window event): comment on the selection.
  const addCommentRef = useRef(editorReview.onAddComment)
  addCommentRef.current = editorReview.onAddComment
  useEffect(() => {
    const onAdd = () => {
      const range = editor.current?.getView()?.state.selection.main
      if (range && !range.empty) addCommentRef.current(range.from, range.to)
    }
    window.addEventListener(ADD_COMMENT_EVENT, onAdd)
    return () => window.removeEventListener(ADD_COMMENT_EVENT, onAdd)
  }, [])

  const closeDraft = () => {
    setDraft(null)
    editor.current?.setCommentDraft(null)
  }
  // Every member can ask the assistant; only editors can apply what it proposes.
  const aiAvailable = !!aiStatus?.available
  const ai = useAiSession(projectId, aiAvailable && aiStarted, showBuild)

  const openAi = () => {
    setAiStarted(true)
    setSide('ai')
  }

  /** Send a message with the editor context the author chose to attach. */
  const sendToAi = (text: string, include: { errors: boolean; selection: boolean }, only?: Diagnostic, build = result, skill?: string) => {
    openAi()
    const cursor = editor.current?.getCursor()
    const selected = include.selection ? editor.current?.getSelection() : undefined
    void ai.send({
      text,
      skill,
      compile:
        build && (include.errors || only)
          ? { buildId: build.buildId, status: build.status, diagnostics: (only ? [only] : build.diagnostics).slice(0, 200) }
          : undefined,
      openFile: doc ? { path: doc.path, line: cursor?.line } : undefined,
      selection: selected && doc ? { path: doc.path, ...selected, text: selected.text.slice(0, 50_000) } : undefined,
      preference: aiPick(aiStatus),
    })
  }

  // Arriving from "Open and fix with AI" after a template conversion: build, then hand the problems over.
  const aiStart = useRef(false)
  useEffect(() => {
    if (aiStart.current || !aiAvailable || !canEdit || !project) return
    let prompt: string | null = null
    try {
      prompt = sessionStorage.getItem(AI_START_KEY(projectId))
      sessionStorage.removeItem(AI_START_KEY(projectId))
    } catch {}
    if (!prompt) return
    aiStart.current = true
    void compile().then(build => sendToAi(prompt!, { errors: true, selection: false }, undefined, build))
    // Runs once the project and the assistant are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiAvailable, canEdit, project, projectId])

  const askAiAbout = (d?: Diagnostic) => {
    // Non-editors can't apply fixes, so they ask for an explanation instead.
    // The request is written in the interface language, so the assistant answers in it too.
    if (d) {
      const error = `${d.message}${d.file ? ` (${d.file}${d.line ? `:${d.line}` : ''})` : ''}`
      return sendToAi(canEdit ? t('Fix this error: {error}', { error }) : t('Explain this error: {error}', { error }), { errors: false, selection: false }, d)
    }
    return sendToAi(canEdit ? t('Fix the compile errors.') : t('Explain the compile errors and how to fix them.'), { errors: true, selection: false })
  }

  const editorPrefs = useEditorSettings()
  const editorBody = (
    <>
      {doc && shared ? (
        <EditorContextMenu
          editor={editorHandle}
          canType={canType}
          canComment
          onGoToPdf={pdfUrl ? () => void syncToPdf() : undefined}
          onOpenFile={path => visualFiles.commandActions?.openFile?.(path)}
          onOpenLabel={label => visualFiles.commandActions?.openLabel?.(label)}
        >
          <div className="h-full">
            <CodeEditor
              ref={setEditorRef}
              docKey={`${doc.docId}:${languageFor(doc.path)}`}
              path={doc.path}
              collab={shared}
              readOnly={!canType}
              metadata={metadata}
              onChange={onChange}
              onSave={() => void compile()}
              onFind={openSearch}
              onSelectionChange={setSelection}
              review={editorReview}
              spelling={project ? { language: project.spellCheckLanguage, manager: hunspell } : undefined}
              visual={visualMode}
              visualFiles={visualFiles}
              annotations={annotations}
            />
          </div>
        </EditorContextMenu>
      ) : doc ? (
        <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
          {failed ? (
            `Cannot open: ${failed}`
          ) : (
            <>
              <Spinner /> {t('Connecting…')}
            </>
          )}
        </div>
      ) : binaryPath ? (
        <BinaryPreview url={api.fileUrl(projectId, binaryPath)} path={binaryPath} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-8 opacity-40" />
          {t('Select a file from the tree')}
        </div>
      )}
    </>
  )

  const latexDoc = !!doc && languageFor(doc.path) === 'latex'
  const recompileButton = (className: string) => (
    <Button
      size={compact ? 'icon-sm' : 'sm'}
      onClick={() => void compile()}
      disabled={compiling}
      className={compact ? className : `${className} min-w-24`}
      onMouseDown={e => e.preventDefault()}
      aria-label={t('Recompile')}
    >
      {compiling ? <Spinner /> : <Play className="fill-current" />}
      {!compact && (compiling ? t('Compiling…') : t('Recompile'))}
    </Button>
  )
  const viewSwitch = (
    <ViewSwitch layout={layout} narrow={narrow} compact={compact} onChange={changeLayout} onDetach={() => openPdfWindow(projectId)} />
  )
  /** Beside the editor while the PDF isn't: build, and the way to the PDF. */
  const editorTrailing: ReactNode = pdfDetached ? (
    <>
      {recompileButton('ml-1')}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('Show the PDF here')}
            onClick={() => {
              pdfWindowSend({ type: 'close' })
              setPdfDetached(false)
            }}
          >
            <PanelRightOpen />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('Show the PDF here')}</TooltipContent>
      </Tooltip>
    </>
  ) : layout === 'editor' ? (
    <>
      {recompileButton('ml-1 mr-1')}
      {viewSwitch}
    </>
  ) : undefined
  const editorPane = (
    <div className="flex h-full min-w-0 flex-col bg-card">
      {doc && shared && (
        <EditorToolbar
          editor={editorHandle}
          latex={latexDoc}
          editable={canType}
          visual={visualMode}
          onVisualChange={changeVisualMode}
          canComment
          symbolsOpen={symbolsOpen && latexDoc}
          onToggleSymbols={() => setSymbolsOpen(v => !v)}
          trailing={editorTrailing}
        />
      )}
      {!(doc && shared) && editorTrailing && <div className="flex h-11 shrink-0 items-center justify-end gap-0.5 border-b bg-card px-2">{editorTrailing}</div>}
      {doc && shared && editorPrefs.breadcrumbs && <Breadcrumbs editor={editorHandle} path={doc.path} isTexFile={latexDoc} />}
      <div className="min-h-0 flex-1">{editorBody}</div>
      {latexDoc && canType && (
        <FigureModal
          getView={() => editor.current?.getView()}
          files={files}
          folders={folders}
          canUpload={canEdit}
          fileUrl={path => api.fileUrl(projectId, path)}
          upload={async (path, data) => {
            await api.writeFile(projectId, path, data)
            await refresh()
          }}
        />
      )}
      {symbolsOpen && latexDoc && canType && shared && (
        <div className="h-52 shrink-0">
          <SymbolPalette onClose={() => setSymbolsOpen(false)} />
        </div>
      )}
    </div>
  )

  const previewPane = (
    <section className="flex h-full min-w-0 flex-col bg-muted/40">
      <div className="flex h-11 shrink-0 items-center gap-1 overflow-hidden border-b bg-card px-2">
        <ButtonGroup className="shrink-0">
          {recompileButton('')}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" aria-label={t('More compile options')} className="relative border-l border-l-primary-foreground/20">
                <ChevronDown />
                {(compileSettings.draft || compileSettings.stopOnFirstError) && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-300" aria-hidden />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem disabled={compiling} onSelect={() => void compile()}>
                <Play /> {t('Recompile')}
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={compiling} onSelect={() => void compile({ clean: true })}>
                <Eraser /> {t('Clean and recompile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={compileSettings.autoCompile}
                onCheckedChange={v => setCompileSettings({ autoCompile: v === true })}
                onSelect={e => e.preventDefault()}
              >
                {t('Auto compile')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-sm font-normal text-muted-foreground">{t('Compile mode')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={compileSettings.draft ? 'draft' : 'normal'} onValueChange={v => setCompileSettings({ draft: v === 'draft' })}>
                <DropdownMenuRadioItem value="normal" onSelect={e => e.preventDefault()}>
                  {t('Normal')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="draft" onSelect={e => e.preventDefault()}>
                  {t('Fast [draft]')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-sm font-normal text-muted-foreground">{t('Compile error handling')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={compileSettings.stopOnFirstError ? 'stop' : 'continue'}
                onValueChange={v => setCompileSettings({ stopOnFirstError: v === 'stop' })}
              >
                <DropdownMenuRadioItem value="stop" onSelect={e => e.preventDefault()}>
                  {t('Stop on first error')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="continue" onSelect={e => e.preventDefault()}>
                  {t('Try to compile despite errors')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <Button
          variant="ghost"
          size="sm"
          disabled={!result}
          onClick={() => setShowLogs(v => !v)}
          aria-pressed={showLogs && !!result}
          className={showLogs && result ? 'bg-accent text-accent-foreground hover:bg-accent' : ''}
        >
          <ScrollText /> {!compact && t('Logs')}
          {result && (
            <Badge variant={errorCount ? 'destructive' : 'secondary'} className="h-4 min-w-4 px-1 text-[11px] tabular-nums">
              {errorCount}
            </Badge>
          )}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size={compact ? 'icon-sm' : 'sm'} onClick={() => void syncToPdf()} disabled={!pdfUrl || !doc} aria-label={t('Go to PDF')}>
              <LocateFixed /> {!compact && t('Locate')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Go to PDF')}</TooltipContent>
        </Tooltip>
        <div className="ml-auto" />
        {layout !== 'editor' && viewSwitch}
        {pdfUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={pdfUrl} download={`${project?.name ?? 'output'}.pdf`} aria-label={t('Download PDF')}>
                  <Download />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('Download PDF')}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <PdfViewer ref={pdf} url={pdfUrl} compiling={compiling} onSyncToCode={pos => void syncToCode(pos)} />
        <AnimatePresence>
          {showLogs && result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-background"
            >
              <LogPanel
                result={result}
                rawLogUrl={logUrl}
                onJump={(file, line) => void open(file, line)}
                onAskAi={aiAvailable ? askAiAbout : undefined}
                canFix={canEdit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )

  /** The open side panel: beside the editor, or over it on a phone. */
  const sidePane: { id: string; props: Omit<PanelProps, 'children' | 'id'>; node: ReactNode } | null =
    side === 'files'
      ? {
          id: 'tree',
          props: { className: 'bg-sidebar' },
          node: (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <FileTree
                    projectId={projectId}
                    downloadUrl={api.downloadUrl(projectId)}
                    files={files}
                    folders={folders}
                    activePath={doc?.path ?? binaryPath}
                    peers={peers}
                    canEdit={canEdit}
                    onOpen={(path, binary) => {
                      if (compact) setSide(null)
                      void run(() => open(path, undefined, binary))
                    }}
                    onCreate={createEntry}
                    onMove={moveEntry}
                    onDelete={deleteEntry}
                    onUpload={uploadFiles}
                    linked={linked}
                    onAddLinked={setLinkDir}
                    onRefreshLinked={path => void refreshLinked(path)}
                  />
                </div>
                <OutlinePane editor={editorHandle} isTexFile={!!doc && doc.path.endsWith('.tex')} />
              </div>
          ),
        }
      :     side === 'references'
      ? {
          id: 'references',
          props: { className: undefined },
          node: (
              <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col bg-card">
                <ReferencesPanel
                  projectId={projectId}
                  canEdit={canEdit}
                  canType={canType}
                  bibPaths={files.filter(f => /\.bib$/i.test(f.path)).map(f => f.path)}
                  bibSources={bibSources}
                  version={metadata}
                  getView={() => editor.current?.getView()}
                  onClose={() => setSide('files')}
                />
              </motion.aside>
          ),
        }
      :     side === 'search'
      ? {
          id: 'search',
          props: { className: undefined },
          node: (
              <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col bg-card">
                <SearchPanel
                  projectId={projectId}
                  canReplace={canEdit}
                  seed={searchSeed}
                  currentPath={doc?.path}
                  onOpenMatch={(path, from, to) => {
                      if (compact) setSide(null)
                      void run(() => openRange(path, from, to))
                    }}
                  onClose={() => setSide('files')}
                />
              </motion.aside>
          ),
        }
      :     chatOpen
      ? {
          id: 'chat',
          props: { className: undefined },
          node: (
              <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col bg-card">
                <ChatPanel
                  projectId={projectId}
                  userId={user.id}
                  members={members}
                  messages={chat.messages}
                  hasMore={chat.hasMore}
                  error={chat.error}
                  onLoadOlder={chat.loadOlder}
                  onChanged={() => void chat.refresh()}
                  onClose={() => setSide('files')}
                />
              </motion.aside>
          ),
        }
      :     aiAvailable && aiOpen
      ? {
          id: 'ai',
          props: { className: undefined },
          node: (
              <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col bg-card">
                <AiPanel
                  session={ai}
                  status={aiStatus!}
                  onChoose={chooseAiModel}
                  context={{ errors: errorCount, selection: selection && doc ? { path: doc.path, ...selection } : undefined }}
                  onSend={(text, include, skill) => sendToAi(text, include, undefined, result, skill)}
                  onApplied={res => {
                    if (res?.compile) {
                      showBuild(res.compile)
                      if (res.compile.status !== 'success') setShowLogs(true)
                    }
                  }}
                  onUndone={res => res && showBuild(res.compile)}
                  onOpenFile={path => void run(() => open(path))}
                  onClose={() => setSide('files')}
                  canEdit={canEdit}
                  reviewing={aiReviewing}
                  setReviewing={setAiReviewing}
                />
              </motion.aside>
          ),
        }
      :     reviewOpen
      ? {
          id: 'review',
          props: { className: undefined },
          node: (
              <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col bg-card">
                <ReviewPanel
                  projectId={projectId}
                  userId={user.id}
                  canEdit={canEdit}
                  state={review}
                  members={members}
                  reload={reloadReview}
                  doc={doc}
                  live={live}
                  lineOf={pos => editor.current?.lineAt(pos) ?? 1}
                  focus={reviewFocus}
                  draft={draft}
                  onDraftDone={closeDraft}
                  tracking={tracking}
                  reviewer={role === 'reviewer'}
                  onSelect={(from, to, id) => {
                    editor.current?.selectRange(from, to)
                    editor.current?.setActiveReview(id)
                  }}
                  onOpenFile={(path, line) => void run(() => open(path, line))}
                  onHover={id => editor.current?.setActiveReview(id)}
                  onClose={() => {
                    closeDraft()
                    setSide('files')
                  }}
                />
              </motion.aside>
          ),
        }
      : null

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <a href="#/" aria-label={t('Back to workspace')} className="flex shrink-0 items-center gap-2 rounded-md pr-1">
              <LogoMark className="size-8" />
              <span className="text-base font-semibold tracking-tight max-sm:hidden">ColTex</span>
            </a>
          </TooltipTrigger>
          <TooltipContent>{t('Back to workspace')}</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-1 sm:justify-center sm:px-2">
          <span className="truncate font-semibold">{project?.name ?? ' '}</span>
          {role === 'viewer' && <Badge variant="secondary" className="shrink-0">{t('Read only')}</Badge>}
          {role === 'reviewer' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="shrink-0">{t('Reviewing')}</Badge>
              </TooltipTrigger>
              <TooltipContent>{t('You can comment and suggest edits; editors accept or reject them.')}</TooltipContent>
            </Tooltip>
          )}
          {tracking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="hidden shrink-0 gap-1.5 border-emerald-300 md:inline-flex bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> {t('Tracking changes')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {role === 'reviewer'
                  ? t('Your edits are recorded as suggestions for the editors.')
                  : t('Your edits are recorded as suggestions. Open Review to switch this.')}
              </TooltipContent>
            </Tooltip>
          )}
          <SyncStatus connected={connected} unsynced={unsynced} hasDoc={!!doc} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden sm:contents">
            <PresenceAvatars peers={peers} />
          </div>
          <Button
            variant="ghost"
            onClick={() => setHistoryOpen(v => !v)}
            aria-pressed={historyOpen}
            aria-label={t('History')}
            className={historyOpen ? 'bg-accent text-accent-foreground hover:bg-accent' : ''}
          >
            <HistoryIcon /> <span className="hidden sm:inline">{t('History')}</span>
          </Button>
          <Button onClick={() => setSharing(true)} aria-label={t('Share')}>
            <UserPlus /> <span className="hidden sm:inline">{t('Share')}</span>
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => setError(undefined)} aria-label={t('Dismiss')}>
                <X />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {historyOpen && (
        <HistoryView
          projectId={projectId}
          canEdit={canEdit}
          onClose={() => setHistoryOpen(false)}
          onRestored={async () => {
            await refresh()
          }}
        />
      )}

      <div className={`min-h-0 flex-1 ${historyOpen ? 'hidden' : 'flex'}`}>
        <EditorRail
          items={[
            { id: 'files', icon: FolderTree, label: t('Files'), active: side === 'files', onClick: () => setSide(v => (v === 'files' ? null : 'files')) },
            { id: 'search', icon: Search, label: t('Search'), active: side === 'search', onClick: () => setSide(v => (v === 'search' ? null : 'search')) },
            {
              id: 'references',
              icon: Library,
              label: t('References'),
              active: side === 'references',
              onClick: () => setSide(v => (v === 'references' ? null : 'references')),
            },
            {
              id: 'review',
              icon: MessageSquareText,
              label: t('Review'),
              active: reviewOpen,
              count: reviewCount,
              onClick: () => (reviewOpen ? setSide(null) : openReview()),
            },
            { id: 'chat', icon: MessagesSquare, label: t('Chat'), active: chatOpen, count: chat.unread, onClick: () => setSide(v => (v === 'chat' ? null : 'chat')) },
            ...(aiAvailable
              ? [{ id: 'ai', icon: Sparkles, label: t('AI'), active: aiOpen, onClick: () => (aiOpen ? setSide(null) : openAi()) }]
              : []),
          ]}
          bottom={[
            { id: 'shortcuts', icon: Keyboard, label: t('Shortcuts'), active: shortcutsOpen, onClick: () => setShortcutsOpen(true) },
            { id: 'settings', icon: Settings2, label: t('Settings'), active: settingsOpen, onClick: () => setSettingsOpen(true) },
          ]}
        />
        <div className="relative flex min-w-0 flex-1">
          <ResizablePanelGroup orientation="horizontal">
            {sidePane && !compact && (
              <>
                {/* One panel for every kind, so switching keeps the width the person set. */}
                <ResizablePanel id="side" panelRef={sidePanel} defaultSize={320} minSize={240} maxSize="50%" {...sidePane.props}>
                  {sidePane.node}
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}
            <ResizablePanel id="editor" panelRef={editorPanel} minSize={280} collapsible collapsedSize={0} onResize={size => paneResized('editor', size.inPixels)}>
              {/* A collapsed pane stays mounted (state kept) but out of reach of keyboard and screen readers. */}
              <div className="h-full" inert={layout === 'pdf'}>
                {editorPane}
              </div>
            </ResizablePanel>
            {!pdfDetached && (
              <>
                <ResizableHandle withHandle disabled={narrow} className={narrow ? 'hidden' : undefined} />
                <ResizablePanel id="preview" panelRef={previewPanel} minSize={280} collapsible collapsedSize={0} onResize={size => paneResized('pdf', size.inPixels)}>
                  <div className="h-full" inert={layout === 'editor'}>
                    {previewPane}
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
          {sidePane && compact && <div className={cn('absolute inset-0 z-20 flex flex-col bg-card', sidePane.props.className)}>{sidePane.node}</div>}
        </div>
      </div>
      <LinkedFileDialog
        projectId={projectId}
        dir={linkDir}
        existing={new Set(files.map(f => f.path))}
        onClose={() => setLinkDir(undefined)}
        onAdded={path =>
          void run(async () => {
            const tree = await refresh()
            await loadLinked()
            await open(path, undefined, tree.files.find(f => f.path === path)?.binary)
          })
        }
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} canComment />
      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
        canEdit={canEdit}
        isOwner={role === 'owner'}
        texFiles={texFiles.map(f => f.path)}
        spellOptions={spellOptions}
        onUpdate={patch => void run(() => update(patch))}
        onWordCount={() => setWordCountOpen(true)}
        onCopy={() => project && openCopyProject(projectId, project.name)}
        onConvert={() => project && openConvert(projectId, project.name)}
      />
      <WordCountDialog
        projectId={projectId}
        rootFile={project?.rootFile}
        openPath={doc?.path}
        language={project?.spellCheckLanguage}
        open={wordCountOpen}
        onOpenChange={setWordCountOpen}
      />
      <ShareDialog
        projectId={projectId}
        projectName={project?.name}
        userId={user.id}
        canManage={role === 'owner'}
        open={sharing}
        onOpenChange={setSharing}
        onChanged={() => void refresh()}
      />
    </div>
  )
}

type SidePanel = 'files' | 'search' | 'references' | 'review' | 'chat' | 'ai'

type RailItem = { id: string; icon: LucideIcon; label: string; active: boolean; count?: number; onClick: () => void }

/** Overleaf's rail: one labelled icon per side panel (the active one highlighted), and project settings at the bottom. */
function EditorRail({ items, bottom }: { items: RailItem[]; bottom: RailItem[] }) {
  const button = (item: RailItem) => (
    <button
      key={item.id}
      type="button"
      onClick={item.onClick}
      aria-pressed={item.active}
      className={`relative flex w-full flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[11px] leading-none whitespace-nowrap transition-colors [&_svg]:size-[18px] ${
        item.active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <item.icon />
      <span>{item.label}</span>
      {!!item.count && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-medium text-primary-foreground tabular-nums">
          {item.count > 99 ? '99+' : item.count}
        </span>
      )}
    </button>
  )
  return (
    <nav className="flex min-w-13 shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto border-r bg-card p-1" aria-label={t('Panels')}>
      {items.map(button)}
      <div className="mt-auto" />
      {bottom.map(button)}
    </nav>
  )
}

const VIEWS = [
  { id: 'editor', icon: Code2, label: tk('Editor only') },
  { id: 'split', icon: Columns2, label: tk('Editor & PDF') },
  { id: 'pdf', icon: FileText, label: tk('PDF only') },
] as const

/**
 * The one switch between the editor, the PDF or both (Overleaf's layouts),
 * and the PDF in a window of its own. Side by side needs room; a phone gets
 * the two single views only.
 */
function ViewSwitch({
  layout,
  narrow,
  compact,
  onChange,
  onDetach,
}: {
  layout: PdfLayout
  narrow: boolean
  compact: boolean
  onChange: (layout: PdfLayout) => void
  onDetach: () => void
}) {
  const item = (active: boolean) =>
    cn(
      'flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4',
      active && 'bg-background text-foreground shadow-sm',
    )
  return (
    <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5" role="radiogroup" aria-label={t('View')}>
      {VIEWS.filter(v => v.id !== 'split' || !narrow).map(v => (
        <Tooltip key={v.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={layout === v.id}
              aria-label={t(v.label)}
              className={item(layout === v.id)}
              onMouseDown={e => e.preventDefault()}
              onClick={() => onChange(v.id)}
            >
              <v.icon />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t(v.label)}</TooltipContent>
        </Tooltip>
      ))}
      {!compact && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={t('Open the PDF in a new window')} className={item(false)} onMouseDown={e => e.preventDefault()} onClick={onDetach}>
              <ExternalLink />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('Open the PDF in a new window')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function BinaryPreview({ url, path }: { url: string; path: string }) {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3 text-sm text-muted-foreground">
        <FileImage className="size-4" />
        <span className="truncate font-mono">{path}</span>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <a href={url} download={name}>
            <Download /> {t('Download')}
          </a>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[repeating-conic-gradient(var(--muted)_0_25%,var(--card)_0_50%)] bg-[length:16px_16px] p-6">
        {IMAGE_EXT.test(path) ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            src={url}
            alt={name}
            className="max-h-full max-w-full rounded-md object-contain shadow-lg"
          />
        ) : path.toLowerCase().endsWith('.pdf') ? (
          <div className="relative h-full w-full">
            <PdfViewer url={url} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('No preview for this file type.')}</p>
        )}
      </div>
    </div>
  )
}

function SyncStatus({ connected, unsynced, hasDoc }: { connected: boolean; unsynced: number; hasDoc: boolean }) {
  if (!connected) {
    return (
      <Badge variant="outline" className="shrink-0 gap-1 border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300">
        <CloudOff /> <span className="hidden sm:inline">{t('Offline · reconnecting')}</span>
      </Badge>
    )
  }
  if (!hasDoc) return null
  return (
    <span className="flex shrink-0 items-center gap-1 text-sm whitespace-nowrap text-muted-foreground">
      {unsynced > 0 ? <Spinner className="size-3" /> : <CloudCheck className="size-3.5" />}
      <span className="hidden sm:inline">{unsynced > 0 ? t('Saving…') : t('Saved')}</span>
    </span>
  )
}

/** Everyone else in the project, with the file they have open. */
function PresenceAvatars({ peers }: { peers: Peer[] }) {
  // One avatar per person even if they have several tabs open.
  const people = [...new Map(peers.map(p => [p.user.id, p])).values()]
  if (people.length === 0) return null
  return (
    <div className="mr-1 flex -space-x-1.5" aria-label={t('People in this project')}>
      <AnimatePresence initial={false}>
        {people.slice(0, 5).map(p => (
          <Tooltip key={p.user.id}>
            <TooltipTrigger asChild>
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex size-7 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-card"
                style={{ background: p.user.color }}
              >
                {initials(p.user.name)}
              </motion.span>
            </TooltipTrigger>
            <TooltipContent>
              {p.user.name}
              {p.path ? ` · ${p.path}` : ''}
            </TooltipContent>
          </Tooltip>
        ))}
      </AnimatePresence>
      {people.length > 5 && (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-sm ring-2 ring-card">+{people.length - 5}</span>
      )}
    </div>
  )
}

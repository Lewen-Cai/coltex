import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import type { EditorView } from '@codemirror/view'
import type { ReferenceLink, ZoteroCollection, ZoteroLibrary, ZoteroStatus } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { intlLocale, plural, t, tr } from '@/lib/i18n'
import { filterEntries, parseBib, type BibEntry } from './bib'

const NEW_FILE = 'references.bib'
const WHOLE_LIBRARY = '__all__'
const SHOWN = 300

type Tab = 'cite' | 'add' | 'zotero'

/**
 * Insert a citation at the cursor: the key alone when the cursor is in the
 * braces of a \cite-like command (after a comma if needed), else \cite{key}
 * with the cursor left before the closing brace, so the next pick adds to it.
 */
export function insertCitation(view: EditorView, key: string) {
  const { state } = view
  const pos = state.selection.main.head
  const before = state.sliceDoc(Math.max(0, pos - 300), pos)
  const open = /\\[A-Za-z]*cite[A-Za-z]*\*?(?:\[[^\]]*\])*\{([^{}]*)$/.exec(before)
  if (open) {
    const sep = open[1]!.trim() === '' || /,\s*$/.test(open[1]!) ? '' : ','
    view.dispatch({ changes: { from: pos, insert: sep + key }, selection: { anchor: pos + sep.length + key.length }, userEvent: 'input' })
  } else {
    const text = `\\cite{${key}}`
    view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length - 1 }, userEvent: 'input' })
  }
  view.focus()
}

export function ReferencesPanel({
  projectId,
  canEdit,
  canType,
  bibPaths,
  bibSources,
  version,
  getView,
  onClose,
}: {
  projectId: string
  /** May change files (DOI, Zotero). */
  canEdit: boolean
  /** May insert citations (editors, and reviewers as suggestions). */
  canType: boolean
  bibPaths: string[]
  bibSources: () => { path: string; content: string }[]
  /** Changes whenever the .bib contents were read again. */
  version: unknown
  getView: () => EditorView | null | undefined
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('cite')
  const [links, setLinks] = useState<ReferenceLink[]>()

  const loadLinks = useCallback(() => {
    api.referenceLinks(projectId).then(setLinks, () => setLinks([]))
  }, [projectId])
  useEffect(loadLinks, [loadLinks])
  const linked = useMemo(() => new Set(links?.map(l => l.path)), [links])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b p-2">
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="cite">{t('Cite')}</TabsTrigger>
            {canEdit && <TabsTrigger value="add">{t('Add by DOI')}</TabsTrigger>}
            {canEdit && <TabsTrigger value="zotero">{t('Zotero')}</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>
      {tab === 'cite' && <CiteTab bibSources={bibSources} version={version} canType={canType} getView={getView} />}
      {tab === 'add' && canEdit && <DoiTab projectId={projectId} bibPaths={bibPaths.filter(p => !linked.has(p))} />}
      {tab === 'zotero' && canEdit && <ZoteroTab projectId={projectId} links={links} onChanged={loadLinks} />}
    </div>
  )
}

function CiteTab({
  bibSources,
  version,
  canType,
  getView,
}: {
  bibSources: () => { path: string; content: string }[]
  version: unknown
  canType: boolean
  getView: () => EditorView | null | undefined
}) {
  const [query, setQuery] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => bibSources().flatMap(s => parseBib(s.path, s.content)), [bibSources, version])
  const shown = useMemo(() => filterEntries(entries, query), [entries, query])

  const pick = (entry: BibEntry) => {
    const view = getView()
    if (!view || !canType) return
    insertCitation(view, entry.key)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 gap-1.5 p-3 pb-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search by author, title, year or key')} className="h-8" autoFocus />
        <p className="text-xs text-muted-foreground">
          {entries.length
            ? t('{n} of {total} entries.', { n: shown.length, total: entries.length })
            : t('No .bib entries in this project yet.')}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-2">
        {shown.slice(0, SHOWN).map(e => (
          <li key={`${e.path}:${e.key}`}>
            <button
              type="button"
              className="grid w-full gap-0.5 px-3 py-1.5 text-left hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
              disabled={!canType}
              onMouseDown={ev => ev.preventDefault()}
              onClick={() => pick(e)}
              title={e.path}
            >
              <span className="line-clamp-2 text-sm">{e.title || e.key}</span>
              <span className="truncate text-xs text-muted-foreground">
                {[e.authors, e.year, e.venue].filter(Boolean).join(' · ')}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">{e.key}</span>
            </button>
          </li>
        ))}
        {shown.length > SHOWN && (
          <li className="px-3 py-1 text-xs text-muted-foreground">{t('Showing the first {n}; refine the search to see the rest.', { n: SHOWN })}</li>
        )}
      </ul>
    </div>
  )
}

function BibSelect({ value, onChange, paths }: { value: string; onChange: (path: string) => void; paths: string[] }) {
  const options = paths.includes(value) || !value ? paths : [...paths, value]
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(p => (
          <SelectItem key={p} value={p} className="font-mono text-xs">
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DoiTab({ projectId, bibPaths }: { projectId: string; bibPaths: string[] }) {
  const [doi, setDoi] = useState('')
  const [path, setPath] = useState(bibPaths[0] ?? NEW_FILE)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string>()

  const add = async () => {
    setBusy(true)
    setAdded(undefined)
    try {
      const res = await api.addDoi(projectId, doi.trim(), path)
      setAdded(res.entry)
      setDoi('')
      toast.success(t('Added {key} to {path}', { key: res.key, path: res.path }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3"
      onSubmit={e => {
        e.preventDefault()
        void add()
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="doi">{t('DOI or arXiv id')}</Label>
        <Input id="doi" value={doi} onChange={e => setDoi(e.target.value)} placeholder="10.1038/s41586-020-2649-2" className="h-8 font-mono text-xs" />
      </div>
      <div className="grid gap-1.5">
        <Label>{t('Add to')}</Label>
        <BibSelect value={path} onChange={setPath} paths={bibPaths.length ? bibPaths : [NEW_FILE]} />
        {!bibPaths.includes(path) && <p className="text-xs text-muted-foreground">{t('The file is created.')}</p>}
      </div>
      <Button type="submit" size="sm" disabled={busy || doi.trim().length < 3} className="justify-self-start">
        {busy && <Spinner />}
        {t('Look up and add')}
      </Button>
      {added && <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-[11px] whitespace-pre">{added}</pre>}
    </form>
  )
}

function ZoteroTab({ projectId, links, onChanged }: { projectId: string; links?: ReferenceLink[]; onChanged: () => void }) {
  const [status, setStatus] = useState<ZoteroStatus>()
  const [importing, setImporting] = useState(false)
  const [busyPath, setBusyPath] = useState<string>()

  useEffect(() => {
    api.zoteroStatus().then(setStatus, () => setStatus({ connected: false }))
  }, [])

  const refresh = async (path: string) => {
    setBusyPath(path)
    try {
      const res = await api.refreshReferences(projectId, path)
      toast.success(plural(res.items, 'Refreshed {path}: 1 entry', 'Refreshed {path}: {n} entries', { path: res.path }))
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyPath(undefined)
    }
  }

  const unlink = async (path: string) => {
    const ok = await confirmDialog({
      title: t('Stop syncing {path}?', { path }),
      description: t('The file stays as it is; it just won’t be refreshed from Zotero any more.'),
      confirmLabel: t('Stop syncing'),
    })
    if (!ok) return
    try {
      await api.unlinkReferences(projectId, path)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
      {!status ? (
        <Spinner className="size-4 text-muted-foreground" />
      ) : status.connected ? (
        <Button size="sm" className="justify-self-start" onClick={() => setImporting(true)}>
          {t('Import from Zotero…')}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {tr('Connect Zotero in {settings} to import your libraries here.', {
            settings: (
              <a href="#/settings/zotero" className="text-primary underline-offset-4 hover:underline">
                {t('Settings → Zotero')}
              </a>
            ),
          })}
        </p>
      )}
      <div className="grid gap-1">
        <div className="text-xs font-medium text-muted-foreground">{t('Synced files')}</div>
        {!links ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : links.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('None yet.')}</p>
        ) : (
          links.map(link => (
            <div key={link.path} className="grid gap-1 rounded-md border p-2">
              <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{link.path}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Refresh from Zotero')}
                  title={t('Refresh from Zotero')}
                  disabled={busyPath === link.path}
                  onClick={() => void refresh(link.path)}
                >
                  <RefreshCw className={busyPath === link.path ? 'animate-spin' : undefined} />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={t('Stop syncing')} title={t('Stop syncing')} onClick={() => void unlink(link.path)}>
                  <X />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {link.collectionName ? `${link.libraryName} / ${link.collectionName}` : link.libraryName} ·{' '}
                {plural(link.items, '1 entry', '{n} entries')} ·{' '}
                {new Date(link.updatedAt).toLocaleString(intlLocale(), { dateStyle: 'short', timeStyle: 'short' })}
                {link.linkedBy && ` · ${t('linked by {name}', { name: link.linkedBy })}`}
              </div>
            </div>
          ))
        )}
      </div>
      {importing && (
        <ZoteroImportDialog
          projectId={projectId}
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function ZoteroImportDialog({ projectId, onClose, onImported }: { projectId: string; onClose: () => void; onImported: () => void }) {
  const [libraries, setLibraries] = useState<ZoteroLibrary[]>()
  const [library, setLibrary] = useState<string>()
  const [collections, setCollections] = useState<ZoteroCollection[]>()
  const [collection, setCollection] = useState(WHOLE_LIBRARY)
  const [path, setPath] = useState('zotero.bib')
  const [format, setFormat] = useState<'bibtex' | 'biblatex'>('bibtex')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    api.zoteroLibraries().then(
      libs => {
        setLibraries(libs)
        setLibrary(libs[0]?.id)
      },
      e => setError((e as Error).message),
    )
  }, [])

  useEffect(() => {
    if (!library) return
    setCollections(undefined)
    setCollection(WHOLE_LIBRARY)
    api.zoteroCollections(library).then(setCollections, e => setError((e as Error).message))
  }, [library])

  const submit = async () => {
    if (!library) return
    setBusy(true)
    setError(undefined)
    try {
      const res = await api.importZotero(projectId, {
        library,
        collection: collection === WHOLE_LIBRARY ? undefined : collection,
        path: path.trim(),
        format,
      })
      toast.success(plural(res.items, 'Imported 1 entry into {path}', 'Imported {n} entries into {path}', { path: res.path }))
      onImported()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Import from Zotero')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t('Library')}</Label>
            <Select value={library} onValueChange={setLibrary} disabled={!libraries}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('Loading…')} />
              </SelectTrigger>
              <SelectContent>
                {libraries?.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id.startsWith('user:') ? t('My Library') : l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t('Collection')}</Label>
            <Select value={collection} onValueChange={setCollection} disabled={!collections}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WHOLE_LIBRARY}>{t('The whole library')}</SelectItem>
                {collections?.map(c => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="zotero-path">{t('Save as')}</Label>
              <Input id="zotero-path" value={path} onChange={e => setPath(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('Format')}</Label>
              <Select value={format} onValueChange={v => setFormat(v as 'bibtex' | 'biblatex')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bibtex">BibTeX</SelectItem>
                  <SelectItem value="biblatex">BibLaTeX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button disabled={busy || !library || !/\.bib$/i.test(path.trim())} onClick={() => void submit()}>
            {busy && <Spinner />}
            {t('Import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

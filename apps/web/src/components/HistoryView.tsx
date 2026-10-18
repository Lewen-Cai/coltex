import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Download, FileText, GitCommitHorizontal, Loader2, RotateCcw, Tag, Undo2, X } from 'lucide-react'
import type { HistoryFile, HistoryFileChange, HistoryVersion } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { userColor } from '../lib/collab.ts'
import { computeHunks } from '../lib/hunks.ts'
import { intlLocale, plural, t, tk, translateServerMessage } from '../lib/i18n.ts'
import { useMediaQuery } from '../lib/use-media-query.ts'
import { cn } from '../lib/utils.ts'
import { confirmDialog } from './confirm.tsx'
import { HunkList } from './DiffView.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Checkbox } from './ui/checkbox.tsx'
import { Input } from './ui/input.tsx'

const KIND_LABEL: Record<string, string> = {
  initial: tk('Initial version'),
  create: tk('Created the project'),
  import: tk('Imported'),
  convert: tk('Converted to a template'),
  edit: tk('Edited'),
  ai: tk('Applied AI changes'),
  review: tk('Reviewed changes'),
  restore: tk('Restored an earlier version'),
  revert: tk('Reverted a version'),
}

const STATUS_STYLE: Record<HistoryFileChange['status'], { letter: string; className: string }> = {
  added: { letter: 'A', className: 'text-emerald-700 dark:text-emerald-400' },
  modified: { letter: 'M', className: 'text-amber-700 dark:text-amber-400' },
  deleted: { letter: 'D', className: 'text-red-700 dark:text-red-400' },
  renamed: { letter: 'R', className: 'text-sky-700 dark:text-sky-400' },
}

const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i

const time = (iso: string) => new Date(iso).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
const fullDate = (iso: string) => new Date(iso).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })

/** What a version did: its kind, or the message given when it was saved by hand. */
function versionLabel(v: HistoryVersion): string {
  if (v.kind === 'commit') return v.message
  return KIND_LABEL[v.kind] ? t(KIND_LABEL[v.kind]!) : translateServerMessage(v.message)
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (d.toDateString() === today.toDateString()) return t('Today')
  if (d.toDateString() === yesterday.toDateString()) return t('Yesterday')
  return d.toLocaleDateString(intlLocale(), { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

type Mode = 'version' | 'current'

type Props = {
  projectId: string
  canEdit: boolean
  onClose: () => void
  /** The project changed (restore): reload the file tree and open documents. */
  onRestored: () => Promise<void>
}

/** Browse, compare, label and restore earlier versions of the project. */
export function HistoryView({ projectId, canEdit, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<HistoryVersion[]>([])
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>()
  const [mode, setMode] = useState<Mode>('version')
  const [changes, setChanges] = useState<HistoryFileChange[]>()
  const [path, setPath] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [labeling, setLabeling] = useState<string | 'current'>()

  const latest = versions[0]
  const selected = versions.find(v => v.id === selectedId) ?? latest
  // What is being compared: [from, to]. `from` undefined = the empty project.
  const range = useMemo((): [string | undefined, string] | undefined => {
    if (!selected || !latest) return undefined
    return mode === 'version' ? [selected.parent ?? undefined, selected.id] : [selected.id, latest.id]
  }, [mode, selected, latest])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await api.history(projectId)
      setVersions(page.versions)
      setMore(page.more)
      return page.versions
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load().catch(e => setError((e as Error).message))
  }, [load])

  const loadMore = async () => {
    const last = versions.at(-1)
    if (!last) return
    try {
      const page = await api.history(projectId, last.id)
      setVersions(v => [...v, ...page.versions])
      setMore(page.more)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Files changed in the current comparison.
  useEffect(() => {
    if (!range) return
    let stale = false
    setChanges(undefined)
    const [from, to] = range
    const request = from === to ? Promise.resolve({ changes: [] }) : mode === 'version' ? api.historyCompare(projectId, to) : api.historyCompare(projectId, to, from)
    request
      .then(r => {
        if (stale) return
        setChanges(r.changes)
        setPath(p => (p && r.changes.some(c => c.path === p) ? p : r.changes[0]?.path))
      })
      .catch(e => !stale && setError((e as Error).message))
    return () => {
      stale = true
    }
  }, [projectId, range, mode])

  const act = async (action: () => Promise<void>) => {
    setError(undefined)
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const short = (id: string) => id.slice(0, 7)

  const restore = async (version: HistoryVersion, paths?: string[]) => {
    const date = fullDate(version.at)
    const hash = short(version.id)
    const ok = await confirmDialog({
      title: paths
        ? t('Restore {files}?', { files: new Intl.ListFormat(intlLocale()).format(paths.map(p => `“${p}”`)) })
        : t('Restore the project to version {hash}?', { hash }),
      description: paths
        ? t('Back to how it was in version {hash} ({date}). The current state stays in the history, so this can be undone.', { hash, date })
        : t('Every file goes back to how it was in version {hash} ({date}), and files added since are removed. The current state stays in the history, so this can be undone.', { hash, date }),
      confirmLabel: t('Restore'),
    })
    if (!ok) return
    void act(async () => {
      await api.historyRestore(projectId, version.id, paths)
      await onRestored()
      const list = await load()
      setMode('version')
      setSelectedId(list[0]?.id)
    })
  }

  const revert = async (version: HistoryVersion) => {
    const hash = short(version.id)
    const ok = await confirmDialog({
      title: t('Revert version {hash}?', { hash }),
      description: t('Undoes only the changes made in this version ({date}) and keeps everything changed since. The revert is a new version, so it can be undone too.', {
        date: fullDate(version.at),
      }),
      confirmLabel: t('Revert'),
    })
    if (!ok) return
    void act(async () => {
      await api.historyRevert(projectId, version.id)
      await onRestored()
      const list = await load()
      setMode('version')
      setSelectedId(list[0]?.id)
    })
  }

  const commit = (message: string) =>
    act(async () => {
      await api.historyCommit(projectId, message)
      setLabeling(undefined)
      const list = await load()
      setSelectedId(list[0]?.id)
    })

  const saveLabel = (name: string, versionId: string) =>
    act(async () => {
      await api.historyLabel(projectId, name, versionId)
      setLabeling(undefined)
      await load()
    })

  const removeLabel = (id: number) =>
    act(async () => {
      await api.historyDeleteLabel(projectId, id)
      await load()
    })

  const change = changes?.find(c => c.path === path)
  // Narrow windows show the versions or one version's changes, not both.
  const narrow = useMediaQuery('(max-width: 1023px)')
  const [detail, setDetail] = useState(false)
  const showList = !narrow || !detail
  const showDetail = !narrow || detail

  const modeSwitch = (
    <div className="flex h-8 items-center rounded-md bg-muted p-0.5 text-sm" role="radiogroup" aria-label={t('Compare')}>
      {(
        [
          ['version', tk('This version')],
          ['current', tk('vs. current')],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            'h-7 rounded-[5px] px-2.5 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
            mode === m && 'bg-background font-medium text-foreground shadow-sm',
          )}
        >
          {t(label)}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 bg-card max-lg:flex-col">
      {showDetail && (
        <>
          {/* Changed files */}
          <aside className="flex shrink-0 flex-col border-border bg-card max-lg:max-h-56 max-lg:border-b lg:w-64 lg:border-r">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2">
              {narrow && (
                <Button variant="ghost" size="sm" onClick={() => setDetail(false)}>
                  <ArrowLeft /> {t('Versions')}
                </Button>
              )}
              {modeSwitch}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1 text-sm">
              {!changes && <p className="px-3 py-2 text-muted-foreground">{t('Loading…')}</p>}
              {changes && changes.length === 0 && (
                <p className="px-3 py-2 text-muted-foreground">{mode === 'current' ? t('Same as the current project.') : t('No file changes.')}</p>
              )}
              {changes?.map(c => (
                <button
                  key={c.path}
                  onClick={() => setPath(c.path)}
                  className={cn('flex w-full items-center gap-2 px-3 py-1 text-left', c.path === path ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')}
                  title={c.from ? `${c.from} → ${c.path}` : c.path}
                >
                  <span className={cn('w-3 font-mono font-semibold', STATUS_STYLE[c.status].className)}>{STATUS_STYLE[c.status].letter}</span>
                  <span className="min-w-0 flex-1 truncate font-mono">{c.path}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Diff */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3 text-sm">
              {change ? (
                <>
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-mono">{change.from ? `${change.from} → ${change.path}` : change.path}</span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {range && change.status !== 'deleted' && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={api.historyRawUrl(projectId, range[1], change.path)}>
                          <Download /> <span className="max-sm:hidden">{t('Download')}</span>
                        </a>
                      </Button>
                    )}
                    {canEdit && selected && !(mode === 'version' && selected.id === latest?.id) && (
                      <FileRestoreButton change={change} mode={mode} selected={selected} busy={busy} onRestore={(v, p) => restore(v, [p])} />
                    )}
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">{changes?.length ? t('Select a file') : ''}</span>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
                <span className="flex-1">{error}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => setError(undefined)} aria-label={t('Dismiss')}>
                  <X />
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">{range && change && <FileDiff projectId={projectId} range={range} change={change} />}</div>
          </section>
        </>
      )}

      {/* Timeline: one entry per version, newest first, like a git log. */}
      {showList && (
        <aside className="flex min-h-0 shrink-0 flex-col border-border bg-card max-lg:flex-1 lg:w-96 lg:border-l">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft /> {t('Back to editor')}
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setLabeling('current')} disabled={busy}>
                <GitCommitHorizontal /> {t('Save version')}
              </Button>
            )}
          </div>
          {labeling === 'current' && (
            <NameForm busy={busy} placeholder={t('What changed, e.g. Finished the introduction')} onCancel={() => setLabeling(undefined)} onSave={commit} />
          )}
          {narrow && error && (
            <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <span className="flex-1">{error}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => setError(undefined)} aria-label={t('Dismiss')}>
                <X />
              </Button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && !versions.length && (
              <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t('Loading history…')}
              </p>
            )}
            {versions.map((v, i) => {
              const day = dayLabel(v.at)
              const showDay = i === 0 || dayLabel(versions[i - 1]!.at) !== day
              const isSelected = v.id === selected?.id
              const source = v.restoredFrom ?? v.revertOf
              const named = v.kind === 'commit' || v.labels.length > 0
              return (
                <div key={v.id}>
                  {showDay && <div className="sticky top-0 z-10 border-b border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{day}</div>}
                  <div
                    onClick={() => setSelectedId(v.id)}
                    className={cn('relative flex cursor-pointer gap-3 py-2.5 pr-3 pl-3 text-sm', isSelected ? 'bg-accent/70' : 'hover:bg-muted/60')}
                  >
                    {/* The line through the versions, with a dot for this one. */}
                    <div className="relative flex w-3 shrink-0 justify-center">
                      <span className={cn('absolute w-px bg-border', i === 0 ? 'top-3 bottom-[-10px]' : i === versions.length - 1 && !more ? '-top-2.5 h-5' : '-top-2.5 bottom-[-10px]')} />
                      <span
                        className={cn(
                          'relative mt-1 size-3 rounded-full border-2 bg-card',
                          isSelected ? 'border-primary bg-primary' : named ? 'border-primary' : 'border-muted-foreground/50',
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className="block w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span className="flex items-start gap-2">
                          <span className={cn('min-w-0 flex-1 break-words', named ? 'font-semibold' : 'font-medium')}>{versionLabel(v)}</span>
                          {i === 0 && <Badge variant="secondary" className="shrink-0">{t('Current')}</Badge>}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                          <code className="font-mono text-xs text-foreground/70">{short(v.id)}</code>
                          <span>{time(v.at)}</span>
                          {v.authors.map(a => (
                            <span key={a.id} className="flex items-center gap-1">
                              <span className="size-2 rounded-full" style={{ background: userColor(a.id) }} />
                              {a.name}
                            </span>
                          ))}
                        </span>
                      </button>
                      {source && (
                        <button
                          type="button"
                          className="mt-0.5 font-mono text-xs text-primary underline-offset-4 hover:underline"
                          onClick={e => {
                            e.stopPropagation()
                            if (versions.some(x => x.id === source)) setSelectedId(source)
                          }}
                        >
                          {v.revertOf ? t('Reverts {hash}', { hash: short(source) }) : t('Back to {hash}', { hash: short(source) })}
                        </button>
                      )}
                      <div className="mt-0.5 truncate text-muted-foreground">
                        {v.changes.length === 0
                          ? t('No file changes')
                          : `${plural(v.changes.length, '{n} file', '{n} files')} · ${v.changes
                              .slice(0, 2)
                              .map(c => c.path.slice(c.path.lastIndexOf('/') + 1))
                              .join(', ')}${v.changes.length > 2 ? ` ${t('+{n} more', { n: v.changes.length - 2 })}` : ''}`}
                      </div>
                      {v.labels.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {v.labels.map(l => (
                            <span key={l.id} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              <Tag className="size-3" />
                              {l.name}
                              {canEdit && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    void confirmDialog({ title: t('Remove the label “{name}”?', { name: l.name }), confirmLabel: t('Remove') }).then(ok => {
                                      if (ok) void removeLabel(l.id)
                                    })
                                  }}
                                  className="hover:text-foreground"
                                  aria-label={t('Remove label {name}', { name: l.name })}
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {isSelected && (
                        <div className="mt-2 flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                          {narrow && (
                            <Button size="xs" variant="outline" onClick={() => setDetail(true)}>
                              <FileText /> {t('View changes')}
                            </Button>
                          )}
                          {canEdit && v.parent && (
                            <Button size="xs" variant="outline" onClick={() => void revert(v)} disabled={busy}>
                              <Undo2 /> {t('Revert these changes')}
                            </Button>
                          )}
                          {canEdit && i > 0 && (
                            <Button size="xs" variant="outline" onClick={() => void restore(v)} disabled={busy}>
                              <RotateCcw /> {t('Restore project')}
                            </Button>
                          )}
                          {canEdit && (
                            <Button size="xs" variant="outline" onClick={() => setLabeling(v.id)}>
                              <Tag /> {t('Add label')}
                            </Button>
                          )}
                          <Button size="xs" variant="outline" asChild>
                            <a href={api.historyZipUrl(projectId, v.id)}>
                              <Download /> .zip
                            </a>
                          </Button>
                        </div>
                      )}
                      {labeling === v.id && (
                        <div className="mt-2" onClick={e => e.stopPropagation()}>
                          <NameForm busy={busy} placeholder={t('Label, e.g. Submitted')} onCancel={() => setLabeling(undefined)} onSave={name => saveLabel(name, v.id)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {more && (
              <button onClick={() => void loadMore()} className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                {t('Load older versions')}
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

/**
 * Restore one file. In "this version" mode the selected version's copy is
 * restored; in "vs. current" mode too (the comparison starts from it).
 */
function FileRestoreButton(props: {
  change: HistoryFileChange
  mode: Mode
  selected: HistoryVersion
  busy: boolean
  onRestore: (version: HistoryVersion, path: string) => void
}) {
  const { change, mode, selected } = props
  // The selected version's copy of the file: gone if it was deleted in "this version" mode,
  // or if it was added after the selected version in "vs. current" mode.
  const existsInSelected = mode === 'version' ? change.status !== 'deleted' : change.status !== 'added'
  const path = mode === 'current' && change.status === 'renamed' ? change.from! : change.path
  if (!existsInSelected) return null
  return (
    <Button variant="outline" size="sm" onClick={() => props.onRestore(selected, path)} disabled={props.busy}>
      <RotateCcw /> <span className="max-sm:hidden">{t('Restore this file')}</span>
    </Button>
  )
}

/** A one-line name: the message of a saved version, or a label. */
function NameForm({ busy, placeholder, onSave, onCancel }: { busy: boolean; placeholder: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }
  return (
    <form onSubmit={submit} className="flex gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
      <Input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        placeholder={placeholder}
        maxLength={200}
        className="h-8 min-w-0 flex-1"
      />
      <Button type="submit" size="sm" disabled={busy || !name.trim()}>
        {t('Save')}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        {t('Cancel')}
      </Button>
    </form>
  )
}

/** A file's diff between two versions. */
function FileDiff({ projectId, range, change }: { projectId: string; range: [string | undefined, string]; change: HistoryFileChange }) {
  const [from, to] = range
  const [files, setFiles] = useState<{ before?: HistoryFile; after?: HistoryFile }>()
  const [whole, setWhole] = useState(false)
  const basePath = change.from ?? change.path

  useEffect(() => {
    let stale = false
    setFiles(undefined)
    const missing = (path: string): HistoryFile => ({ path, exists: false, binary: false, size: 0 })
    Promise.all([
      from && change.status !== 'added' ? api.historyFile(projectId, from, basePath) : Promise.resolve(missing(basePath)),
      change.status !== 'deleted' ? api.historyFile(projectId, to, change.path) : Promise.resolve(missing(change.path)),
    ])
      .then(([before, after]) => !stale && setFiles({ before, after }))
      .catch(() => !stale && setFiles({}))
    return () => {
      stale = true
    }
  }, [projectId, from, to, basePath, change.path, change.status])

  const hunks = useMemo(() => {
    if (!files?.before || !files.after || files.before.binary || files.after.binary) return undefined
    return computeHunks(files.before.text ?? '', files.after.text ?? '', whole ? Infinity : 3).hunks
  }, [files, whole])

  if (!files) return <p className="p-4 text-sm text-muted-foreground">{t('Loading…')}</p>
  const binary = files.before?.binary || files.after?.binary
  if (binary) {
    return (
      <div className="grid gap-4 p-4 text-sm text-foreground/80 sm:grid-cols-2">
        {[
          [tk('Before'), from, basePath, files.before] as const,
          [tk('After'), to, change.path, files.after] as const,
        ].map(([label, version, p, f]) => (
          <div key={label} className="rounded border border-border p-3">
            <div className="mb-2 font-medium">{t(label)}</div>
            {!f?.exists || !version ? (
              <p className="text-muted-foreground">{t('Not present')}</p>
            ) : IMAGE.test(p) ? (
              <img src={api.historyRawUrl(projectId, version, p, true)} alt={`${p} (${t(label)})`} className="max-h-96 max-w-full object-contain" />
            ) : (
              <p>{t('Binary file, {size} bytes', { size: f.size.toLocaleString(intlLocale()) })}</p>
            )}
          </div>
        ))}
      </div>
    )
  }
  if (!hunks?.length) {
    return <p className="p-4 text-sm text-muted-foreground">{change.status === 'renamed' ? t('Renamed without content changes.') : t('No text changes.')}</p>
  }
  return (
    <div>
      <div className="flex justify-end border-b border-border px-3 py-1 text-[13px]">
        <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
          <Checkbox checked={whole} onCheckedChange={v => setWhole(v === true)} /> {t('Show whole file')}
        </label>
      </div>
      <HunkList hunks={hunks} />
    </div>
  )
}

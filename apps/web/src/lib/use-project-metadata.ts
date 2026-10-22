import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileEntry } from '@coltex/shared'
import { METADATA_OUTDATED_EVENT, buildProjectMetadata, loadPackageCommands, type Metadata, type PackageCommands } from '@coltex/latex-language'
import { api } from './api.ts'

/** Files whose contents feed completions: labels and packages (.tex & co.) and citation keys (.bib). */
const SCANNED = /\.(tex|sty|cls|ltx|bib)$/i
const REBUILD_DELAY_MS = 300

/**
 * Project-wide completion metadata, built on the client from the project's
 * sources. Contents are fetched once per file and kept current with the open
 * document; the metadata is rebuilt when files change or an edit touches
 * \label, \usepackage, … (signalled by the editor's metadata extension).
 */
export function useProjectMetadata(projectId: string, files: FileEntry[]) {
  const contents = useRef(new Map<string, string>())
  const [metadata, setMetadata] = useState<Metadata>()
  const timer = useRef<number>(undefined)
  const filesRef = useRef(files)
  filesRef.current = files
  /** Commands of the packages the project uses (Overleaf's package mapping, loaded once). */
  const packageCommands = useRef<PackageCommands>(undefined)

  const rebuild = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setMetadata(buildProjectMetadata(filesRef.current, contents.current, packageCommands.current))
    }, REBUILD_DELAY_MS)
  }, [])

  /** Size and modification time of each file as last read, to notice changes made elsewhere. */
  const signatures = useRef(new Map<string, string>())

  // Fetch new and changed files (e.g. a .bib a DOI was added to) and forget deleted ones.
  useEffect(() => {
    let cancelled = false
    const wanted = new Map(
      files.filter(f => !f.binary && SCANNED.test(f.path)).map(f => [f.path, `${f.size}:${f.modifiedAt ?? ''}:${f.version ?? ''}`]),
    )
    for (const path of contents.current.keys()) {
      if (!wanted.has(path)) {
        contents.current.delete(path)
        signatures.current.delete(path)
      }
    }
    const stale = [...wanted].filter(([p, sig]) => !contents.current.has(p) || signatures.current.get(p) !== sig)
    Promise.all(
      stale.map(([p, sig]) =>
        api.readText(projectId, p).then(
          text => {
            if (cancelled) return
            contents.current.set(p, text)
            signatures.current.set(p, sig)
          },
          () => {},
        ),
      ),
    ).then(() => !cancelled && rebuild())
    return () => {
      cancelled = true
    }
  }, [projectId, files, rebuild])

  useEffect(() => {
    let cancelled = false
    loadPackageCommands().then(
      mapping => {
        if (cancelled) return
        packageCommands.current = mapping
        rebuild()
      },
      () => {
        // Completions still work without package commands.
      },
    )
    return () => {
      cancelled = true
    }
  }, [rebuild])

  useEffect(() => {
    window.addEventListener(METADATA_OUTDATED_EVENT, rebuild)
    return () => window.removeEventListener(METADATA_OUTDATED_EVENT, rebuild)
  }, [rebuild])

  /** Report the open document's latest text (no rebuild unless metadata-relevant lines changed). */
  const updateContent = useCallback((path: string, text: string) => {
    if (SCANNED.test(path)) contents.current.set(path, text)
  }, [])

  /** The file and 1-based line of \label{label}, from the contents read for completions. */
  const findLabel = useCallback((label: string): { path: string; line: number } | undefined => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`^[^%\\n]*?\\\\label\\s*\\{\\s*${escaped}\\s*\\}`, 'm')
    for (const [path, text] of contents.current) {
      if (!/\.(tex|ltx)$/i.test(path)) continue
      const m = re.exec(text)
      if (m) return { path, line: text.slice(0, m.index + m[0].length).split('\n').length }
    }
    return undefined
  }, [])

  /** The project's .bib files as last read (current as of the latest `metadata`). */
  const bibSources = useCallback(
    () => [...contents.current].filter(([path]) => /\.bib$/i.test(path)).map(([path, content]) => ({ path, content })),
    [],
  )

  return { metadata, updateContent, findLabel, bibSources }
}

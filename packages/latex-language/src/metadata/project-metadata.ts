// ColTex: build project-wide completion metadata from the project's source
// files on the client (Overleaf computes this on its servers).

import type { Folder } from '../types/folder'
import type { Metadata, PackageCommand } from '../extensions/language'

/** Drop `%` comments (but not `\%`) so commented-out labels and packages are ignored. */
function stripComments(tex: string): string {
  return tex.replace(/(^|[^\\])%.*$/gm, '$1')
}

const LABEL = /\\label\s*\{([^{}]+)\}/g
/** `label=` key in optional arguments, e.g. listings or cleveref-style options. */
const LABEL_OPTION = /\blabel\s*=\s*\{?([^,{}\]\s]+)\}?/g
const USEPACKAGE = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g
const BIB_ENTRY = /@([a-zA-Z]+)\s*[{(]\s*([^,\s{}()]+)\s*,/g
const NON_ENTRIES = new Set(['string', 'comment', 'preamble'])

export function extractTexMetadata(tex: string): { labels: string[]; packages: string[] } {
  const src = stripComments(tex)
  const labels = [...src.matchAll(LABEL), ...src.matchAll(LABEL_OPTION)].map(m => m[1]!.trim())
  const packages = [...src.matchAll(USEPACKAGE)].flatMap(m =>
    m[1]!
      .split(',')
      .map(p => p.trim())
      .filter(Boolean),
  )
  return { labels, packages }
}

export function extractBibKeys(bib: string): string[] {
  return [...bib.matchAll(BIB_ENTRY)].filter(m => !NON_ENTRIES.has(m[1]!.toLowerCase())).map(m => m[2]!)
}

/** Shape a flat list of project paths into Overleaf's folder structure (docs = text files). */
export function buildFolder(files: { path: string; binary: boolean }[]): Folder {
  const root: Folder = { name: '', docs: [], fileRefs: [], folders: [] }
  for (const file of files) {
    const parts = file.path.split('/')
    let folder = root
    for (const name of parts.slice(0, -1)) {
      let next = folder.folders.find(f => f.name === name)
      if (!next) {
        next = { name, docs: [], fileRefs: [], folders: [] }
        folder.folders.push(next)
      }
      folder = next
    }
    ;(file.binary ? folder.fileRefs : folder.docs).push({ name: parts.at(-1)! })
  }
  return root
}

export function buildProjectMetadata(
  files: { path: string; binary: boolean }[],
  contents: Map<string, string>,
  /** Overleaf's package → commands mapping (`loadPackageCommands`), once loaded. */
  packageCommands?: Record<string, PackageCommand[]>,
): Metadata {
  const labels = new Set<string>()
  const packageNames = new Set<string>()
  const referenceKeys = new Set<string>()
  for (const [path, text] of contents) {
    const lower = path.toLowerCase()
    if (lower.endsWith('.bib')) {
      for (const key of extractBibKeys(text)) referenceKeys.add(key)
    } else if (/\.(tex|sty|cls|ltx)$/.test(lower)) {
      const meta = extractTexMetadata(text)
      meta.labels.forEach(l => labels.add(l))
      meta.packages.forEach(p => packageNames.add(p))
    }
  }
  // As in Overleaf: the commands of every package the project loads.
  const commands = packageCommands ? [...packageNames].flatMap(name => packageCommands[name] ?? []) : []
  return { labels, packageNames, referenceKeys, commands, fileTreeData: buildFolder(files) }
}

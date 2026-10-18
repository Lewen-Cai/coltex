import yauzl, { type Entry, type ZipFile } from 'yauzl'
import yazl from 'yazl'
import { BadRequestError } from '../errors.ts'
import { cleanPath } from '../storage/paths.ts'

export type ZipLimits = {
  maxEntries: number
  maxFileBytes: number
  maxTotalBytes: number
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxEntries: 10_000,
  maxFileBytes: 100 * 1024 * 1024,
  maxTotalBytes: 500 * 1024 * 1024,
}

export type ProjectArchive = {
  files: Map<string, Buffer>
  folders: Set<string>
  /** Entries that were skipped, for showing to the user. */
  warnings: string[]
}

/** OS and VCS clutter that never belongs in a LaTeX project. */
const JUNK = [/^__MACOSX(\/|$)/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /(^|\/)\.git(\/|$)/]

const S_IFMT = 0o170000
const S_IFLNK = 0o120000

function nextEntry(zip: ZipFile): Promise<Entry | null> {
  return new Promise((resolve, reject) => {
    const onEntry = (entry: Entry) => done(() => resolve(entry))
    const onEnd = () => done(() => resolve(null))
    const onError = (err: Error) => done(() => reject(err))
    const done = (fn: () => void) => {
      zip.off('entry', onEntry).off('end', onEnd).off('error', onError)
      fn()
    }
    zip.on('entry', onEntry).on('end', onEnd).on('error', onError)
    zip.readEntry()
  })
}

async function readEntry(zip: ZipFile, entry: Entry, budget: { remaining: number }, limits: ZipLimits): Promise<Buffer> {
  const stream = await zip.openReadStreamPromise(entry)
  const chunks: Buffer[] = []
  let size = 0
  // Count real bytes: header sizes are attacker-controlled (yauzl also validates them).
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    size += chunk.length
    budget.remaining -= chunk.length
    if (size > limits.maxFileBytes) throw new BadRequestError(`${entry.fileName} is larger than ${limits.maxFileBytes / 1048576} MB`)
    if (budget.remaining < 0) throw new BadRequestError(`The archive expands to more than ${limits.maxTotalBytes / 1048576} MB`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** If everything sits in one top-level folder (e.g. a GitHub download), drop that folder. */
function stripCommonRoot(archive: ProjectArchive): void {
  const paths = [...archive.files.keys(), ...archive.folders]
  if (archive.files.size === 0 || [...archive.files.keys()].some(p => !p.includes('/'))) return
  const top = paths[0]!.split('/')[0]!
  if (!paths.every(p => p === top || p.startsWith(`${top}/`))) return
  const strip = (p: string) => p.slice(top.length + 1)
  archive.files = new Map([...archive.files].map(([p, data]) => [strip(p), data]))
  archive.folders = new Set([...archive.folders].filter(p => p !== top).map(strip))
}

/**
 * Read a project archive (an Overleaf "Download Source" zip or any zip of a
 * LaTeX project) into memory, enforcing size limits. Unsafe paths reject the
 * whole archive; symlinks and OS clutter are skipped.
 */
export async function readProjectZip(buffer: Buffer, limits: ZipLimits = DEFAULT_ZIP_LIMITS): Promise<ProjectArchive> {
  let zip: ZipFile
  try {
    zip = await yauzl.fromBufferPromise(buffer, { lazyEntries: true, validateEntrySizes: true })
  } catch (err) {
    throw new BadRequestError(`Not a valid zip file: ${(err as Error).message}`)
  }
  const archive: ProjectArchive = { files: new Map(), folders: new Set(), warnings: [] }
  const budget = { remaining: limits.maxTotalBytes }
  let count = 0
  try {
    for (let entry = await nextEntry(zip); entry; entry = await nextEntry(zip)) {
      if (++count > limits.maxEntries) throw new BadRequestError(`The archive has more than ${limits.maxEntries} entries`)
      const name = entry.fileName.replace(/\/+$/, '')
      if (!name || JUNK.some(re => re.test(name))) continue
      if (entry.isEncrypted()) throw new BadRequestError('Encrypted zip files are not supported')
      if (((entry.externalFileAttributes >>> 16) & S_IFMT) === S_IFLNK) {
        archive.warnings.push(`Skipped symbolic link ${name}`)
        continue
      }
      const path = cleanPath(name)
      if (entry.fileName.endsWith('/')) {
        archive.folders.add(path)
        continue
      }
      if (archive.files.has(path)) archive.warnings.push(`Duplicate entry ${path}; kept the last one`)
      archive.files.set(path, await readEntry(zip, entry, budget, limits))
    }
  } catch (err) {
    if (err instanceof BadRequestError) throw err
    // yauzl rejects absolute and `..` paths ("zip slip") and malformed archives.
    throw new BadRequestError(`Invalid zip file: ${(err as Error).message}`)
  } finally {
    zip.close()
  }
  stripCommonRoot(archive)
  return archive
}

const DOCUMENTCLASS = /^[^%\n]*\\documentclass\b/m

/**
 * Pick the main document: a .tex file with an uncommented \documentclass,
 * preferring main.tex, then the shallowest path, then names containing "main".
 */
export function detectMainFile(files: Map<string, Buffer>): string | undefined {
  const tex = [...files.keys()].filter(p => p.toLowerCase().endsWith('.tex'))
  const candidates = tex.filter(p => DOCUMENTCLASS.test(files.get(p)!.subarray(0, 64 * 1024).toString('utf8')))
  const pool = candidates.length ? candidates : tex
  const depth = (p: string) => p.split('/').length
  const score = (p: string) => [
    p === 'main.tex' ? 0 : 1,
    depth(p),
    /main/i.test(p.slice(p.lastIndexOf('/') + 1)) ? 0 : 1,
    p,
  ] as const
  return pool.sort((a, b) => {
    const [x, y] = [score(a), score(b)]
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! < y[i]! ? -1 : 1
    return 0
  })[0]
}

/** Build a zip of a project's files (and empty folders). */
export function buildProjectZip(files: { path: string; data: Buffer }[], folders: string[]): NodeJS.ReadableStream {
  const zip = new yazl.ZipFile()
  const nonEmpty = new Set(files.flatMap(f => f.path.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))))
  for (const folder of folders) if (!nonEmpty.has(folder)) zip.addEmptyDirectory(folder)
  for (const f of files) zip.addBuffer(f.data, f.path)
  zip.end()
  return zip.outputStream
}

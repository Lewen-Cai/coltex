import fs from 'node:fs/promises'
import path from 'node:path'
import { ProjectId, type FileEntry, type ProjectTree } from '@coltex/shared'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import { cleanPath, isTextPath } from './paths.ts'
import type { S3Client, S3Object } from './s3-client.ts'
import type { ProjectStore } from './types.ts'

const TMP_SUFFIX = '.coltex-tmp'
/** Marks a folder. A `path/` object would be the usual way, but S3 servers built on a filesystem (SeaweedFS, rclone…) don't list those. */
export const FOLDER_MARKER = '.coltex-folder'

/** Run `fn` over `items`, at most `limit` at a time. */
async function eachLimit<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < items.length) await fn(items[next++]!)
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function parentOf(p: string): string {
  const dir = path.posix.dirname(p)
  return dir === '.' ? '' : dir
}

/** `a/b/c` → [`a`, `a/b`] */
function ancestors(p: string): string[] {
  const parts = p.split('/')
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
}

type Manifest = Record<string, string>

/**
 * Project files in an S3-compatible bucket: `<prefix>projects/<id>/<path>`.
 * Folders are marked by an empty `<folder>/.coltex-folder` object (and the
 * project itself has one, so an empty project still exists). S3 has no real
 * folders, so anything that removes objects first makes sure the parent
 * folder keeps a marker, the way a directory stays after its last file is
 * deleted.
 *
 * The compiler has no network access and reads sources from
 * DATA_DIR/projects, so `syncForCompile` keeps a local copy of each compiled
 * project there. It only ever replaces or removes files it wrote itself
 * (tracked by ETag in a manifest), never anything else in that directory.
 */
export class S3ProjectStore implements ProjectStore {
  private readonly s3: S3Client
  private readonly prefix: string
  private readonly mirrorRoot: string
  private readonly manifestDir: string
  private readonly mirrorLocks = new Map<string, Promise<unknown>>()

  constructor(opts: { client: S3Client; prefix?: string; mirrorDir: string; manifestDir: string }) {
    this.s3 = opts.client
    this.prefix = opts.prefix ? `${opts.prefix.replace(/^\/+|\/+$/g, '')}/` : ''
    this.mirrorRoot = opts.mirrorDir
    this.manifestDir = opts.manifestDir
  }

  private base(id: string): string {
    return `${this.prefix}projects/${ProjectId.parse(id)}/`
  }

  private key(id: string, p: string): string {
    return this.base(id) + cleanPath(p)
  }

  /** The prefix of everything inside a folder ('' = the project). */
  private folderKey(id: string, p: string): string {
    return p ? `${this.key(id, p)}/` : this.base(id)
  }

  private markerKey(id: string, p: string): string {
    return this.folderKey(id, p) + FOLDER_MARKER
  }

  private async isFile(id: string, p: string): Promise<boolean> {
    return (await this.s3.head(this.key(id, p))) !== null
  }

  private async isFolder(id: string, p: string): Promise<boolean> {
    return (await this.s3.list(this.folderKey(id, p), { max: 1 })).length > 0
  }

  /** Like mkdir -p failing on a file in the way. */
  private async checkAncestors(id: string, p: string): Promise<void> {
    const found = await Promise.all(ancestors(p).map(a => this.isFile(id, a)))
    if (found.some(Boolean)) throw new ConflictError(`A file is in the way of ${p}`)
  }

  /** Keep `p`'s folder in existence after objects in it are removed. */
  private async keepParent(id: string, p: string): Promise<void> {
    await this.s3.put(this.markerKey(id, parentOf(p)), '')
  }

  async createProject(id: string, files: Map<string, string | Buffer>, folders: Iterable<string> = []): Promise<void> {
    await this.s3.put(this.markerKey(id, ''), '')
    await eachLimit([...folders].map(f => cleanPath(f)), 8, f => this.s3.put(this.markerKey(id, f), ''))
    await eachLimit([...files], 8, ([p, content]) => this.s3.put(this.key(id, p), content))
  }

  async deleteProject(id: string): Promise<void> {
    await this.s3.deleteMany((await this.s3.list(this.base(id))).map(o => o.key))
    await fs.rm(path.join(this.mirrorRoot, ProjectId.parse(id)), { recursive: true, force: true })
    await fs.rm(this.manifestPath(id), { force: true })
  }

  /** Files (with ETags) and folders, as paths relative to the project. */
  private async objects(id: string): Promise<{ files: Map<string, S3Object>; folders: Set<string> } | null> {
    const base = this.base(id)
    const objects = await this.s3.list(base)
    if (!objects.length) return null
    const files = new Map<string, S3Object>()
    const folders = new Set<string>()
    for (const o of objects) {
      const rel = o.key.slice(base.length)
      if (rel === FOLDER_MARKER) continue
      if (rel.endsWith(`/${FOLDER_MARKER}`)) {
        const folder = rel.slice(0, -FOLDER_MARKER.length - 1)
        folders.add(folder)
        for (const a of ancestors(folder)) folders.add(a)
      } else {
        files.set(rel, o)
        for (const a of ancestors(rel)) folders.add(a)
      }
    }
    return { files, folders }
  }

  async listTree(id: string): Promise<ProjectTree> {
    const found = await this.objects(id)
    if (!found) throw new NotFoundError(`Project ${id} has no files`)
    const files: FileEntry[] = [...found.files].map(([p, o]) => ({ path: p, size: o.size, binary: !isTextPath(p), modifiedAt: o.modified }))
    return { files: files.sort((a, b) => a.path.localeCompare(b.path)), folders: [...found.folders].sort() }
  }

  async readFile(id: string, p: string): Promise<Buffer> {
    const content = await this.s3.get(this.key(id, p))
    if (content) return content
    if (await this.isFolder(id, cleanPath(p))) throw new BadRequestError(`${p} is a folder`)
    throw new NotFoundError(`File ${p} not found`)
  }

  async writeFile(id: string, p: string, content: Buffer | string, opts: { createOnly?: boolean } = {}): Promise<void> {
    const clean = cleanPath(p)
    if (await this.isFile(id, clean)) {
      if (opts.createOnly) throw new ConflictError(`${p} already exists`)
    } else {
      if (await this.isFolder(id, clean)) throw new ConflictError(`${p} is a folder`)
      await this.checkAncestors(id, clean)
    }
    await this.s3.put(this.key(id, clean), content)
  }

  async deleteFile(id: string, p: string): Promise<void> {
    const clean = cleanPath(p)
    if (!(await this.isFile(id, clean))) {
      if (await this.isFolder(id, clean)) throw new BadRequestError(`${p} is a folder`)
      return
    }
    await this.keepParent(id, clean)
    await this.s3.delete(this.key(id, clean))
  }

  async createFolder(id: string, p: string): Promise<void> {
    const clean = cleanPath(p)
    if ((await this.isFile(id, clean)) || (await this.isFolder(id, clean))) throw new ConflictError(`${p} already exists`)
    await this.checkAncestors(id, clean)
    await this.s3.put(this.markerKey(id, clean), '')
  }

  async deleteFolder(id: string, p: string): Promise<void> {
    const clean = cleanPath(p)
    const inside = await this.s3.list(this.folderKey(id, clean))
    if (!inside.length) {
      if (await this.isFile(id, clean)) throw new BadRequestError(`${p} is not a folder`)
      throw new NotFoundError(`Folder ${p} not found`)
    }
    await this.keepParent(id, clean)
    await this.s3.deleteMany(inside.map(o => o.key))
  }

  async move(id: string, from: string, to: string): Promise<void> {
    const src = cleanPath(from)
    const dest = cleanPath(to)
    if (src === dest) return
    if (dest.startsWith(`${src}/`)) throw new BadRequestError('Cannot move a folder into itself')
    const srcIsFile = await this.isFile(id, src)
    const inside = srcIsFile ? [] : await this.s3.list(this.folderKey(id, src))
    if (!srcIsFile && !inside.length) throw new NotFoundError(`${src} not found`)
    if ((await this.isFile(id, dest)) || (await this.isFolder(id, dest))) throw new ConflictError(`${dest} already exists`)
    await this.checkAncestors(id, dest)
    // S3 has no rename: copy, then delete the originals.
    if (srcIsFile) {
      await this.s3.copy(this.key(id, src), this.key(id, dest))
      await this.keepParent(id, src)
      await this.s3.delete(this.key(id, src))
      return
    }
    const from_ = this.folderKey(id, src)
    const to_ = this.folderKey(id, dest)
    await eachLimit(inside, 8, o => this.s3.copy(o.key, to_ + o.key.slice(from_.length)))
    await this.keepParent(id, src)
    await this.s3.deleteMany(inside.map(o => o.key))
  }

  private manifestPath(id: string): string {
    return path.join(this.manifestDir, `${ProjectId.parse(id)}.json`)
  }

  syncForCompile(id: string): Promise<void> {
    const next = (this.mirrorLocks.get(id) ?? Promise.resolve()).catch(() => {}).then(() => this.mirror(id))
    this.mirrorLocks.set(id, next)
    void next.finally(() => {
      if (this.mirrorLocks.get(id) === next) this.mirrorLocks.delete(id)
    }).catch(() => {})
    return next
  }

  private async mirror(id: string): Promise<void> {
    const found = await this.objects(id)
    if (!found) throw new NotFoundError(`Project ${id} has no files`)
    const dir = path.join(this.mirrorRoot, ProjectId.parse(id))
    const previous: Manifest = await fs.readFile(this.manifestPath(id), 'utf8').then(s => JSON.parse(s) as Manifest, () => ({}))
    const next: Manifest = {}

    await eachLimit([...found.files], 8, async ([p, o]) => {
      const full = path.join(dir, p)
      if (previous[p] === o.etag && (await fs.stat(full).catch(() => undefined))?.isFile()) {
        next[p] = o.etag
        return
      }
      const content = await this.s3.get(o.key)
      if (!content) return // deleted meanwhile
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full + TMP_SUFFIX, content)
      await fs.rename(full + TMP_SUFFIX, full)
      next[p] = o.etag
    })
    for (const folder of found.folders) await fs.mkdir(path.join(dir, folder), { recursive: true })

    // Remove what this mirror wrote earlier and the bucket no longer has, then
    // folders left empty that the bucket doesn't have either.
    for (const p of Object.keys(previous)) {
      if (!found.files.has(p)) await fs.rm(path.join(dir, p), { force: true })
    }
    const removed = Object.keys(previous).filter(p => !found.files.has(p))
    const emptied = new Set(removed.flatMap(p => ancestors(p)))
    for (const folder of [...emptied].sort((a, b) => b.length - a.length)) {
      if (!found.folders.has(folder)) await fs.rmdir(path.join(dir, folder)).catch(() => {})
    }

    await fs.mkdir(this.manifestDir, { recursive: true })
    await fs.writeFile(this.manifestPath(id), JSON.stringify(next))
  }
}

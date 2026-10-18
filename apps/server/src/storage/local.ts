import fs from 'node:fs/promises'
import path from 'node:path'
import { ProjectId, type FileEntry, type ProjectTree } from '@coltex/shared'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import { cleanPath, isTextPath } from './paths.ts'
import type { ProjectStore } from './types.ts'

const TMP_SUFFIX = '.coltex-tmp'

function errCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException)?.code
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.lstat(p)
    return true
  } catch {
    return false
  }
}

export class LocalProjectStore implements ProjectStore {
  readonly root: string

  constructor(root: string) {
    this.root = root
  }

  private projectDir(id: string): string {
    ProjectId.parse(id)
    return path.join(this.root, id)
  }

  private resolve(id: string, p: string): string {
    return path.join(this.projectDir(id), cleanPath(p))
  }

  async createProject(id: string, files: Map<string, string | Buffer>, folders: Iterable<string> = []): Promise<void> {
    await fs.mkdir(this.projectDir(id), { recursive: true })
    for (const folder of folders) await fs.mkdir(this.resolve(id, folder), { recursive: true })
    for (const [p, content] of files) {
      const full = this.resolve(id, p)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, content)
    }
  }

  async deleteProject(id: string): Promise<void> {
    await fs.rm(this.projectDir(id), { recursive: true, force: true })
  }

  async listTree(id: string): Promise<ProjectTree> {
    const base = this.projectDir(id)
    const files: FileEntry[] = []
    const folders: string[] = []
    const rel = (full: string) => path.relative(base, full).split(path.sep).join('/')
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          folders.push(rel(full))
          await walk(full)
        } else if (entry.isFile() && !entry.name.endsWith(TMP_SUFFIX)) {
          const p = rel(full)
          const stat = await fs.stat(full)
          files.push({ path: p, size: stat.size, binary: !isTextPath(p), modifiedAt: stat.mtimeMs })
        }
      }
    }
    try {
      await walk(base)
    } catch (err) {
      if (errCode(err) === 'ENOENT') throw new NotFoundError(`Project ${id} has no files`)
      throw err
    }
    return { files: files.sort((a, b) => a.path.localeCompare(b.path)), folders: folders.sort() }
  }

  async readFile(id: string, p: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolve(id, p))
    } catch (err) {
      if (errCode(err) === 'ENOENT') throw new NotFoundError(`File ${p} not found`)
      if (errCode(err) === 'EISDIR') throw new BadRequestError(`${p} is a folder`)
      throw err
    }
  }

  /** mkdir -p for a file's parent, reporting a clash with an existing file as a conflict. */
  private async ensureParent(full: string, p: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(full), { recursive: true })
    } catch (err) {
      if (errCode(err) === 'EEXIST' || errCode(err) === 'ENOTDIR') {
        throw new ConflictError(`A file is in the way of ${p}`)
      }
      throw err
    }
  }

  async writeFile(id: string, p: string, content: Buffer | string, opts: { createOnly?: boolean } = {}): Promise<void> {
    const full = this.resolve(id, p)
    await this.ensureParent(full, p)
    const stat = await fs.stat(full).catch(() => undefined)
    if (stat?.isDirectory()) throw new ConflictError(`${p} is a folder`)
    if (stat && opts.createOnly) throw new ConflictError(`${p} already exists`)
    const tmp = `${full}${TMP_SUFFIX}`
    await fs.writeFile(tmp, content)
    await fs.rename(tmp, full)
  }

  async deleteFile(id: string, p: string): Promise<void> {
    const full = this.resolve(id, p)
    const stat = await fs.stat(full).catch(() => undefined)
    if (stat?.isDirectory()) throw new BadRequestError(`${p} is a folder`)
    await fs.rm(full, { force: true })
  }

  async createFolder(id: string, p: string): Promise<void> {
    const full = this.resolve(id, p)
    if (await exists(full)) throw new ConflictError(`${p} already exists`)
    await this.ensureParent(full, p)
    await fs.mkdir(full)
  }

  async deleteFolder(id: string, p: string): Promise<void> {
    const full = this.resolve(id, p)
    const stat = await fs.stat(full).catch(() => undefined)
    if (!stat) throw new NotFoundError(`Folder ${p} not found`)
    if (!stat.isDirectory()) throw new BadRequestError(`${p} is not a folder`)
    await fs.rm(full, { recursive: true, force: true })
  }

  async move(id: string, from: string, to: string): Promise<void> {
    const src = cleanPath(from)
    const dest = cleanPath(to)
    if (src === dest) return
    if (dest.startsWith(`${src}/`)) throw new BadRequestError('Cannot move a folder into itself')
    const srcFull = this.resolve(id, src)
    const destFull = this.resolve(id, dest)
    if (!(await exists(srcFull))) throw new NotFoundError(`${src} not found`)
    // rename(2) silently replaces files, so check first. A concurrent create could
    // still race us; acceptable for a single-writer-per-project editor.
    const destStat = await fs.lstat(destFull).catch(() => undefined)
    // On case-insensitive filesystems (macOS) `Main.tex` → `main.tex` finds itself.
    const sameEntry = destStat && destStat.ino === (await fs.lstat(srcFull)).ino
    if (destStat && !sameEntry) throw new ConflictError(`${dest} already exists`)
    await this.ensureParent(destFull, dest)
    await fs.rename(srcFull, destFull)
  }

  async syncForCompile(): Promise<void> {}
}

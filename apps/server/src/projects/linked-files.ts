import fs from 'node:fs/promises'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import { OUTPUT, type CompileResult, type LinkedFile, type LinkedFileSource } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { linkedFiles, user } from '../db/schema.ts'
import { BadRequestError, NotFoundError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import type { ProjectService } from './service.ts'
import { fetchPublicUrl, MAX_LINKED_BYTES, type FetchedFile } from './url-fetch.ts'

type Row = typeof linkedFiles.$inferSelect

/**
 * Files added from elsewhere, as Overleaf's linked files: a URL, a file of
 * another project, or another project's compiled PDF. The person adding or
 * refreshing one needs access to the source themselves; refreshing fetches it
 * again and overwrites the file (a normal write: collab, history).
 */
export class LinkedFileService {
  private readonly db: Db
  private readonly store: ProjectStore
  private readonly collab: CollabHooks
  private readonly history: HistoryService
  private readonly projects: ProjectService
  private readonly outputsDir: string
  /** Builds a project the way the editor does (shared one-build-per-project queue). */
  private readonly compile: (projectId: string, userId: string) => Promise<CompileResult>
  private readonly fetchUrl: (url: string) => Promise<FetchedFile>

  constructor(deps: {
    db: Db
    store: ProjectStore
    collab: CollabHooks
    history: HistoryService
    projects: ProjectService
    outputsDir: string
    compile: (projectId: string, userId: string) => Promise<CompileResult>
    fetchUrl?: (url: string) => Promise<FetchedFile>
  }) {
    this.db = deps.db
    this.store = deps.store
    this.collab = deps.collab
    this.history = deps.history
    this.projects = deps.projects
    this.outputsDir = deps.outputsDir
    this.compile = deps.compile
    this.fetchUrl = deps.fetchUrl ?? (url => fetchPublicUrl(url))
  }

  async list(projectId: string): Promise<LinkedFile[]> {
    const rows = await this.db
      .select({ link: linkedFiles, name: user.name })
      .from(linkedFiles)
      .leftJoin(user, eq(user.id, linkedFiles.userId))
      .where(eq(linkedFiles.projectId, projectId))
    return rows.map(({ link, name }) => toLinkedFile(link, name)).sort((a, b) => a.path.localeCompare(b.path))
  }

  /** Add a file (or replace one) from a source, and remember where it came from. */
  async link(projectId: string, userId: string, rawPath: string, source: LinkedFileSource): Promise<LinkedFile> {
    const target = cleanPath(rawPath)
    if (source.kind !== 'url' && source.projectId === projectId) throw new BadRequestError('Choose a file from a different project')
    const { data, sourceProjectName } = await this.fetchSource(userId, source)
    await this.write(projectId, userId, target, data)
    const values = {
      projectId,
      path: target,
      kind: source.kind,
      url: source.kind === 'url' ? source.url : null,
      sourceProjectId: source.kind === 'url' ? null : source.projectId,
      sourceProjectName,
      sourcePath: source.kind === 'project_file' ? cleanPath(source.path) : null,
      userId,
      updatedAt: new Date(),
    }
    const [row] = await this.db
      .insert(linkedFiles)
      .values(values)
      .onConflictDoUpdate({ target: [linkedFiles.projectId, linkedFiles.path], set: values })
      .returning()
    return toLinkedFile(row!, await this.userName(userId))
  }

  async refresh(projectId: string, userId: string, rawPath: string): Promise<LinkedFile> {
    const target = cleanPath(rawPath)
    const [row] = await this.db.select().from(linkedFiles).where(and(eq(linkedFiles.projectId, projectId), eq(linkedFiles.path, target)))
    if (!row) throw new NotFoundError(`${target} is not a linked file`)
    let source: LinkedFileSource
    if (row.kind === 'url') source = { kind: 'url', url: row.url! }
    else if (!row.sourceProjectId) throw new BadRequestError(`The project ${target} came from no longer exists`)
    else if (row.kind === 'project_file') source = { kind: 'project_file', projectId: row.sourceProjectId, path: row.sourcePath! }
    else source = { kind: 'project_output', projectId: row.sourceProjectId }
    const { data, sourceProjectName } = await this.fetchSource(userId, source)
    await this.write(projectId, userId, target, data)
    const [updated] = await this.db
      .update(linkedFiles)
      .set({ updatedAt: new Date(), sourceProjectName: sourceProjectName ?? row.sourceProjectName })
      .where(and(eq(linkedFiles.projectId, projectId), eq(linkedFiles.path, target)))
      .returning()
    const [owner] = row.userId ? await this.db.select({ name: user.name }).from(user).where(eq(user.id, row.userId)) : []
    return toLinkedFile(updated!, owner?.name ?? null)
  }

  /** A file or folder was renamed or moved: links inside follow. Call inside `collab.mutate`. */
  async followMove(projectId: string, from: string, to: string): Promise<void> {
    const rows = await this.db.select().from(linkedFiles).where(eq(linkedFiles.projectId, projectId))
    for (const row of rows) {
      const moved = row.path === from ? to : row.path.startsWith(`${from}/`) ? to + row.path.slice(from.length) : null
      if (moved) {
        await this.db
          .update(linkedFiles)
          .set({ path: moved })
          .where(and(eq(linkedFiles.projectId, projectId), eq(linkedFiles.path, row.path)))
      }
    }
  }

  /** A file or folder was deleted: forget the links in it. */
  async forget(projectId: string, removed: string): Promise<void> {
    const rows = await this.db.select().from(linkedFiles).where(eq(linkedFiles.projectId, projectId))
    for (const row of rows) {
      if (row.path === removed || row.path.startsWith(`${removed}/`)) {
        await this.db.delete(linkedFiles).where(and(eq(linkedFiles.projectId, projectId), eq(linkedFiles.path, row.path)))
      }
    }
  }

  private async fetchSource(userId: string, source: LinkedFileSource): Promise<{ data: Buffer; sourceProjectName: string | null }> {
    if (source.kind === 'url') return { data: (await this.fetchUrl(source.url)).data, sourceProjectName: null }
    // The person needs to be able to read the source project (non-members get 404).
    const { project } = await this.projects.requireAccess(source.projectId, userId, 'viewer')
    if (source.kind === 'project_file') {
      const from = cleanPath(source.path)
      await this.collab.flushProject(project.id)
      const data = await this.store.readFile(project.id, from)
      if (data.length > MAX_LINKED_BYTES) throw new BadRequestError('The file is larger than 50 MB')
      return { data, sourceProjectName: project.name }
    }
    const build = await this.compile(project.id, userId)
    if (!build.outputFiles.includes(OUTPUT.pdf)) throw new BadRequestError(`“${project.name}” did not produce a PDF`)
    const data = await fs.readFile(path.join(this.outputsDir, project.id, build.buildId, OUTPUT.pdf))
    return { data, sourceProjectName: project.name }
  }

  private async write(projectId: string, userId: string, target: string, data: Buffer): Promise<void> {
    await this.collab.mutate(projectId, async () => {
      await this.store.writeFile(projectId, target, data)
      // Someone may have this file open: carry the new content into the live document.
      await this.collab.afterWrite(projectId, target, data.toString())
    })
    await this.projects.touch(projectId)
    await this.collab.treeChanged(projectId)
    this.history.noteChange(projectId, userId)
  }

  private async userName(userId: string): Promise<string | null> {
    const [row] = await this.db.select({ name: user.name }).from(user).where(eq(user.id, userId))
    return row?.name ?? null
  }
}

function toLinkedFile(row: Row, linkedBy: string | null): LinkedFile {
  return {
    path: row.path,
    kind: row.kind,
    url: row.url,
    sourceProjectId: row.sourceProjectId,
    sourceProjectName: row.sourceProjectName,
    sourcePath: row.sourcePath,
    linkedBy,
    updatedAt: row.updatedAt.toISOString(),
  }
}

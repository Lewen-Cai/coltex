import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { asc, eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { EngineSetting, type TemplateInfo } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { projectTemplates, projects, user } from '../db/schema.ts'
import { ForbiddenError, NotFoundError } from '../errors.ts'
import type { ProjectStore } from '../storage/types.ts'
import type { ProjectContent } from './service.ts'

const newTemplateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

/** Built-in templates: one folder each, with a template.json beside the files. */
export const BUILTIN_TEMPLATES_DIR = fileURLToPath(new URL('../../templates/', import.meta.url))

type Builtin = { id: string; name: string; description: string; engine: EngineSetting; rootFile: string; order: number; dir: string }

async function walk(dir: string, prefix = ''): Promise<{ files: string[]; folders: string[] }> {
  const files: string[] = []
  const folders: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      folders.push(rel)
      const inner = await walk(path.join(dir, entry.name), rel)
      files.push(...inner.files)
      folders.push(...inner.folders)
    } else if (entry.isFile() && rel !== 'template.json') {
      files.push(rel)
    }
  }
  return { files, folders }
}

/**
 * Templates for new projects, as on Overleaf's "New project" menu: the
 * built-in ones, and projects that their owners published for everyone on
 * this server (say, a school's thesis template). A shared template follows its
 * project: new projects get the project's files as they are at that moment.
 */
export class TemplateService {
  private builtins?: Promise<Builtin[]>
  private readonly db: Db
  private readonly store: ProjectStore
  private readonly collab: Pick<CollabHooks, 'flushProject'>
  private readonly builtinDir: string

  constructor(db: Db, store: ProjectStore, collab: Pick<CollabHooks, 'flushProject'>, builtinDir = BUILTIN_TEMPLATES_DIR) {
    this.db = db
    this.store = store
    this.collab = collab
    this.builtinDir = builtinDir
  }

  private loadBuiltins(): Promise<Builtin[]> {
    this.builtins ??= (async () => {
      const out: Builtin[] = []
      for (const entry of await fs.readdir(this.builtinDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const dir = path.join(this.builtinDir, entry.name)
        const meta = JSON.parse(await fs.readFile(path.join(dir, 'template.json'), 'utf8'))
        out.push({
          id: entry.name,
          name: String(meta.name),
          description: String(meta.description ?? ''),
          engine: EngineSetting.parse(meta.engine ?? 'auto'),
          rootFile: String(meta.rootFile ?? 'main.tex'),
          order: Number(meta.order ?? 100),
          dir,
        })
      }
      return out.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    })()
    return this.builtins
  }

  async list(viewer: { id: string; role?: string | null }): Promise<TemplateInfo[]> {
    const builtins = (await this.loadBuiltins()).map(
      (b): TemplateInfo => ({ id: b.id, kind: 'builtin', name: b.name, description: b.description, publishedBy: null, canRemove: false }),
    )
    const rows = await this.db
      .select({ template: projectTemplates, ownerId: projects.ownerId, publisher: user.name })
      .from(projectTemplates)
      .innerJoin(projects, eq(projects.id, projectTemplates.projectId))
      .leftJoin(user, eq(user.id, projectTemplates.publishedBy))
      .orderBy(asc(projectTemplates.name))
    const shared = rows.map(
      (r): TemplateInfo => ({
        id: r.template.id,
        kind: 'shared',
        name: r.template.name,
        description: r.template.description,
        publishedBy: r.publisher,
        canRemove: viewer.role === 'admin' || r.ownerId === viewer.id,
      }),
    )
    return [...builtins, ...shared]
  }

  /** The files, main document and compiler of a new project made from a template. */
  async contents(templateId: string): Promise<ProjectContent & { engine: EngineSetting; spellCheckLanguage?: string }> {
    const builtin = (await this.loadBuiltins()).find(b => b.id === templateId)
    if (builtin) {
      const tree = await walk(builtin.dir)
      const files = new Map<string, Buffer>()
      for (const f of tree.files) files.set(f, await fs.readFile(path.join(builtin.dir, f)))
      return { files, folders: tree.folders, rootFile: builtin.rootFile, engine: builtin.engine }
    }
    const [row] = await this.db
      .select({ project: projects })
      .from(projectTemplates)
      .innerJoin(projects, eq(projects.id, projectTemplates.projectId))
      .where(eq(projectTemplates.id, templateId))
    if (!row) throw new NotFoundError('Template not found')
    const { project } = row
    // What people see in the template's editor, not what was last saved.
    await this.collab.flushProject(project.id)
    const tree = await this.store.listTree(project.id)
    const files = new Map<string, Buffer>()
    for (const f of tree.files) files.set(f.path, await this.store.readFile(project.id, f.path))
    return { files, folders: tree.folders, rootFile: project.rootFile, engine: project.engine, spellCheckLanguage: project.spellCheckLanguage }
  }

  /** A project's own entry, if it is published. Callers check the project access. */
  async forProject(projectId: string) {
    const [row] = await this.db.select().from(projectTemplates).where(eq(projectTemplates.projectId, projectId))
    return row ? { id: row.id, name: row.name, description: row.description } : null
  }

  /** Publish (or rename) a project as a shared template. Callers check that the user owns it. */
  async publish(projectId: string, userId: string, body: { name: string; description: string }) {
    const [row] = await this.db
      .insert(projectTemplates)
      .values({ id: newTemplateId(), projectId, publishedBy: userId, ...body })
      .onConflictDoUpdate({ target: projectTemplates.projectId, set: { ...body, updatedAt: new Date() } })
      .returning()
    return { id: row!.id, name: row!.name, description: row!.description }
  }

  async unpublishProject(projectId: string) {
    await this.db.delete(projectTemplates).where(eq(projectTemplates.projectId, projectId))
  }

  /** Take a shared template down from the list: its project's owner or an admin. */
  async remove(templateId: string, viewer: { id: string; role?: string | null }) {
    const [row] = await this.db
      .select({ ownerId: projects.ownerId })
      .from(projectTemplates)
      .innerJoin(projects, eq(projects.id, projectTemplates.projectId))
      .where(eq(projectTemplates.id, templateId))
    if (!row) throw new NotFoundError('Template not found')
    if (viewer.role !== 'admin' && row.ownerId !== viewer.id) throw new ForbiddenError('Only the project owner or an admin can remove this template')
    await this.db.delete(projectTemplates).where(eq(projectTemplates.id, templateId))
  }
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { and, asc, eq, exists, inArray, or, sql } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type { z } from 'zod'
import { EngineSetting, TemplateField, type ProjectTemplateState, type TemplateAudience, type TemplateBody, type TemplateInfo } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { projectTemplates, projects, templateGroups, templateUsers, user, userGroupMembers, userGroups } from '../db/schema.ts'
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.ts'
import type { ProjectStore } from '../storage/types.ts'
import type { ProjectContent } from './service.ts'

const newTemplateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

type Viewer = { id: string; role?: string | null }

/** Built-in templates: one folder each, with a template.json beside the files. */
export const BUILTIN_TEMPLATES_DIR = fileURLToPath(new URL('../../templates/', import.meta.url))

type Builtin = {
  id: string
  name: string
  description: string
  field: TemplateField
  engine: EngineSetting
  rootFile: string
  order: number
  dir: string
}

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
          field: TemplateField.parse(meta.field ?? 'general'),
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

  /** Shared templates this person may see: everyone's, their groups', their own, the ones given to them; all for the system administrator. */
  private visibleTo(viewer: Viewer) {
    if (viewer.role === 'admin') return undefined
    return or(
      eq(projectTemplates.everyone, true),
      eq(projectTemplates.publishedBy, viewer.id),
      exists(this.db.select({ x: sql`1` }).from(templateUsers).where(and(eq(templateUsers.templateId, projectTemplates.id), eq(templateUsers.userId, viewer.id)))),
      exists(
        this.db
          .select({ x: sql`1` })
          .from(templateGroups)
          .innerJoin(
            userGroupMembers,
            and(eq(userGroupMembers.groupId, templateGroups.groupId), eq(userGroupMembers.userId, viewer.id), eq(userGroupMembers.status, 'joined')),
          )
          .where(eq(templateGroups.templateId, projectTemplates.id)),
      ),
    )
  }

  async list(viewer: Viewer): Promise<TemplateInfo[]> {
    const builtins = (await this.loadBuiltins()).map(
      (b): TemplateInfo => ({
        id: b.id,
        kind: 'builtin',
        name: b.name,
        description: b.description,
        field: b.field,
        sharing: 'builtin',
        groups: [],
        bySystemAdmin: false,
        publishedBy: null,
        canRemove: false,
        projectId: null,
      }),
    )
    const rows = await this.db
      .select({ template: projectTemplates, ownerId: projects.ownerId, publisher: user.name, publisherRole: user.role })
      .from(projectTemplates)
      .innerJoin(projects, eq(projects.id, projectTemplates.projectId))
      .leftJoin(user, eq(user.id, projectTemplates.publishedBy))
      .where(this.visibleTo(viewer))
      .orderBy(asc(projectTemplates.name))
    const ids = rows.map(r => r.template.id)
    const groupRows = ids.length
      ? await this.db
          .select({ templateId: templateGroups.templateId, name: userGroups.name, joined: sql<boolean>`exists (select 1 from ${userGroupMembers} m where m.group_id = ${userGroups.id} and m.user_id = ${viewer.id} and m.status = 'joined')` })
          .from(templateGroups)
          .innerJoin(userGroups, eq(userGroups.id, templateGroups.groupId))
          .where(inArray(templateGroups.templateId, ids))
          .orderBy(userGroups.name)
      : []
    const shared = rows.map((r): TemplateInfo => {
      const own = r.template.publishedBy === viewer.id || viewer.role === 'admin'
      // People see the groups they share it through; its publisher sees them all.
      const groups = groupRows.filter(g => g.templateId === r.template.id && (own || g.joined)).map(g => g.name)
      return {
        id: r.template.id,
        kind: 'shared',
        name: r.template.name,
        description: r.template.description,
        field: TemplateField.catch('general').parse(r.template.field),
        sharing: r.template.everyone ? 'server' : groups.length ? 'groups' : 'people',
        groups,
        bySystemAdmin: r.publisherRole === 'admin',
        publishedBy: r.publisher,
        canRemove: viewer.role === 'admin' || r.ownerId === viewer.id,
        projectId: r.ownerId === viewer.id ? r.template.projectId : null,
      }
    })
    return [...builtins, ...shared]
  }

  /** The files, main document and compiler of a new project made from a template. */
  async contents(templateId: string, viewer: Viewer): Promise<ProjectContent & { engine: EngineSetting; spellCheckLanguage?: string }> {
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
      .where(and(eq(projectTemplates.id, templateId), this.visibleTo(viewer)))
    if (!row) throw new NotFoundError('Template not found')
    const { project } = row
    // What people see in the template's editor, not what was last saved.
    await this.collab.flushProject(project.id)
    const tree = await this.store.listTree(project.id)
    const files = new Map<string, Buffer>()
    for (const f of tree.files) files.set(f.path, await this.store.readFile(project.id, f.path))
    return { files, folders: tree.folders, rootFile: project.rootFile, engine: project.engine, spellCheckLanguage: project.spellCheckLanguage }
  }

  /** A project's own entry, if it is published, with whom it is shared. Callers check the project access. */
  async forProject(projectId: string): Promise<ProjectTemplateState> {
    const [row] = await this.db.select().from(projectTemplates).where(eq(projectTemplates.projectId, projectId))
    if (!row) return null
    const groups = await this.db
      .select({ id: userGroups.id, name: userGroups.name })
      .from(templateGroups)
      .innerJoin(userGroups, eq(userGroups.id, templateGroups.groupId))
      .where(eq(templateGroups.templateId, row.id))
      .orderBy(userGroups.name)
    const users = await this.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(templateUsers)
      .innerJoin(user, eq(user.id, templateUsers.userId))
      .where(eq(templateUsers.templateId, row.id))
      .orderBy(user.name)
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      field: TemplateField.catch('general').parse(row.field),
      audience: { everyone: row.everyone, groups, users },
    }
  }

  /**
   * Publish (or change) a project as a shared template. Callers check that
   * the person owns the project. Administrators only (user's decision
   * 2026-10-25): admins share with their groups and with people they pick,
   * the system administrator also with everyone on the server.
   */
  /** Whether this person may share a template with this audience; the groups and people, deduplicated. */
  async checkAudience(viewer: Viewer, audience: z.output<typeof TemplateAudience>): Promise<{ everyone: boolean; groups: string[]; people: string[] }> {
    if (viewer.role !== 'admin' && viewer.role !== 'manager') throw new ForbiddenError('Only admins can share templates')
    const { everyone, groupIds, userIds } = audience
    if (everyone && viewer.role !== 'admin') throw new ForbiddenError('Only the system administrator can share a template with everyone')
    const groups = [...new Set(groupIds)]
    const people = [...new Set(userIds)].filter(id => id !== viewer.id)
    if (!everyone && groups.length === 0 && people.length === 0) throw new BadRequestError('Choose who the template is for')
    if (groups.length) {
      // Admins share with groups they are in; the system administrator with any.
      const found = await this.db
        .select({ id: userGroups.id })
        .from(userGroups)
        .where(
          and(
            inArray(userGroups.id, groups),
            viewer.role === 'admin'
              ? undefined
              : exists(
                  this.db
                    .select({ x: sql`1` })
                    .from(userGroupMembers)
                    .where(and(eq(userGroupMembers.groupId, userGroups.id), eq(userGroupMembers.userId, viewer.id), eq(userGroupMembers.status, 'joined'))),
                ),
          ),
        )
      if (found.length !== groups.length) throw new NotFoundError('Group not found')
    }
    if (people.length) {
      const found = await this.db.select({ id: user.id }).from(user).where(inArray(user.id, people))
      if (found.length !== people.length) throw new NotFoundError('No such user')
    }
    return { everyone, groups, people }
  }

  async publish(projectId: string, viewer: Viewer, body: z.output<typeof TemplateBody>): Promise<ProjectTemplateState> {
    const { everyone, groups, people } = await this.checkAudience(viewer, body.audience)
    const values = { name: body.name, description: body.description, field: body.field, everyone }
    await this.db.transaction(async tx => {
      const [row] = await tx
        .insert(projectTemplates)
        .values({ id: newTemplateId(), projectId, publishedBy: viewer.id, ...values })
        .onConflictDoUpdate({ target: projectTemplates.projectId, set: { ...values, updatedAt: new Date() } })
        .returning()
      await tx.delete(templateGroups).where(eq(templateGroups.templateId, row!.id))
      await tx.delete(templateUsers).where(eq(templateUsers.templateId, row!.id))
      if (!everyone && groups.length) await tx.insert(templateGroups).values(groups.map(groupId => ({ templateId: row!.id, groupId })))
      if (!everyone && people.length) await tx.insert(templateUsers).values(people.map(userId => ({ templateId: row!.id, userId })))
    })
    return this.forProject(projectId)
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
    if (viewer.role !== 'admin' && row.ownerId !== viewer.id) throw new ForbiddenError('Only the project owner or the system administrator can remove this template')
    await this.db.delete(projectTemplates).where(eq(projectTemplates.id, templateId))
  }
}

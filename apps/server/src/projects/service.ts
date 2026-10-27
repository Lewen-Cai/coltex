import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type { EngineSetting, ProjectMember, ProjectMeta, ProjectRole, ProjectSummary } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { projectMembers, projectTags, projects, tags, user, userGroups } from '../db/schema.ts'
import { ConflictError, ForbiddenError, NotFoundError } from '../errors.ts'
import type { ProjectStore } from '../storage/types.ts'

const newProjectId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

const RANK: Record<ProjectRole, number> = { viewer: 0, reviewer: 1, editor: 2, owner: 3 }

type ProjectRow = typeof projects.$inferSelect

/** The files a new project starts with. */
export type ProjectContent = { files: Map<string, Buffer>; folders: Iterable<string>; rootFile: string }

function toMeta(row: ProjectRow): ProjectMeta {
  return {
    id: row.id,
    name: row.name,
    rootFile: row.rootFile,
    engine: row.engine,
    spellCheckLanguage: row.spellCheckLanguage as ProjectMeta['spellCheckLanguage'],
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class ProjectService {
  private readonly db: Db
  private readonly store: ProjectStore

  private readonly cleanup?: (projectId: string) => Promise<void>

  /**
   * `cleanup` removes everything else a deleted project leaves outside the
   * database (whose rows cascade) and its files: history, the Git bridge,
   * build outputs, in-memory sessions.
   */
  constructor(db: Db, store: ProjectStore, cleanup?: (projectId: string) => Promise<void>) {
    this.db = db
    this.store = store
    this.cleanup = cleanup
  }

  async listForUser(userId: string): Promise<ProjectSummary[]> {
    const rows = await this.db
      .select({
        project: projects,
        role: projectMembers.role,
        ownerName: user.name,
        memberCount: sql<number>`(select count(*)::int from ${projectMembers} m where m.project_id = ${projects.id})`,
        archivedAt: projectMembers.archivedAt,
        trashedAt: projectMembers.trashedAt,
        // Only this user's tags.
        tagIds: sql<string[]>`coalesce((select array_agg(pt.tag_id order by pt.tag_id) from ${projectTags} pt join ${tags} tg on tg.id = pt.tag_id where pt.project_id = ${projects.id} and tg.user_id = ${userId}), '{}')`,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .innerJoin(user, eq(user.id, projects.ownerId))
      // A project that only holds an imported template's files is listed as the template.
      .where(and(eq(projectMembers.userId, userId), eq(projects.templateOnly, false)))
      .orderBy(desc(projects.updatedAt))
    return rows.map(r => ({
      ...toMeta(r.project),
      role: r.role,
      ownerName: r.ownerName,
      memberCount: r.memberCount,
      archived: !!r.archivedAt,
      trashed: !!r.trashedAt,
      tagIds: r.tagIds,
    }))
  }

  /**
   * Archive or trash projects (or bring them back) in one user's list only, as
   * in Overleaf. A project is never both: archiving takes it out of the trash
   * and the other way round. Every project must be one the user is a member of.
   */
  async setListState(userId: string, projectIds: string[], state: { archived?: boolean; trashed?: boolean }): Promise<void> {
    const ids = [...new Set(projectIds)]
    const now = new Date()
    const set =
      state.archived !== undefined
        ? { archivedAt: state.archived ? now : null, ...(state.archived ? { trashedAt: null } : {}) }
        : { trashedAt: state.trashed ? now : null, ...(state.trashed ? { archivedAt: null } : {}) }
    await this.db.transaction(async tx => {
      const rows = await tx
        .update(projectMembers)
        .set(set)
        .where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, ids)))
        .returning({ id: projectMembers.projectId })
      // All or nothing, and non-members learn nothing about the others.
      if (rows.length !== ids.length) throw new NotFoundError('Project not found')
    })
  }

  /** Create a project; without `content` it starts from a one-file template. */
  async create(
    ownerId: string,
    name: string,
    engine: EngineSetting,
    content: ProjectContent,
  ): Promise<ProjectMeta> {
    const id = newProjectId()
    const { rootFile } = content
    await this.store.createProject(id, content.files, content.folders)
    try {
      const row = await this.db.transaction(async tx => {
        const [p] = await tx.insert(projects).values({ id, name, ownerId, engine, rootFile }).returning()
        await tx.insert(projectMembers).values({ projectId: id, userId: ownerId, role: 'owner' })
        return p!
      })
      return toMeta(row)
    } catch (err) {
      await this.store.deleteProject(id)
      throw err
    }
  }

  /**
   * Resolve the caller's access to a project. Projects the user is not a
   * member of are reported as missing, so their existence is not leaked.
   */
  async requireAccess(projectId: string, userId: string, minRole: ProjectRole): Promise<{ project: ProjectMeta; role: ProjectRole }> {
    const [row] = await this.db
      .select({ project: projects, role: projectMembers.role })
      .from(projects)
      .innerJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)))
      .where(eq(projects.id, projectId))
    if (!row) throw new NotFoundError('Project not found')
    if (RANK[row.role] < RANK[minRole]) throw new ForbiddenError(`Requires ${minRole} access`)
    return { project: toMeta(row.project), role: row.role }
  }

  async update(projectId: string, patch: Partial<Pick<ProjectMeta, 'name' | 'rootFile' | 'engine' | 'spellCheckLanguage'>>): Promise<ProjectMeta> {
    const [row] = await this.db.update(projects).set(patch).where(eq(projects.id, projectId)).returning()
    if (!row) throw new NotFoundError('Project not found')
    return toMeta(row)
  }

  /**
   * Keep the main document pointing at the right file after a move/rename of
   * the file itself or of a folder that contains it.
   */
  async followMove(projectId: string, from: string, to: string): Promise<void> {
    const [row] = await this.db.select({ rootFile: projects.rootFile }).from(projects).where(eq(projects.id, projectId))
    if (!row) return
    let rootFile: string | undefined
    if (row.rootFile === from) rootFile = to
    else if (row.rootFile.startsWith(`${from}/`)) rootFile = to + row.rootFile.slice(from.length)
    await this.db
      .update(projects)
      .set(rootFile ? { rootFile, updatedAt: new Date() } : { updatedAt: new Date() })
      .where(eq(projects.id, projectId))
  }

  /** Bump updatedAt after file changes so project lists sort by recent activity. */
  async touch(projectId: string): Promise<void> {
    await this.db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId))
  }

  /** Whether a project only holds an imported template's files (see `projects.templateOnly`). */
  async setTemplateOnly(projectId: string, templateOnly: boolean): Promise<void> {
    await this.db.update(projects).set({ templateOnly }).where(eq(projects.id, projectId))
  }

  async delete(projectId: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, projectId))
    await this.store.deleteProject(projectId)
    await this.cleanup?.(projectId)
  }

  async ownedProjectIds(userId: string): Promise<string[]> {
    const rows = await this.db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, userId))
    return rows.map(r => r.id)
  }

  async deleteProjectFiles(projectIds: string[]): Promise<void> {
    for (const id of projectIds) {
      await this.store.deleteProject(id)
      await this.cleanup?.(id)
    }
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const rows = await this.db
      .select({ userId: user.id, name: user.name, email: user.email, role: projectMembers.role, groupId: projectMembers.groupId, groupName: userGroups.name })
      .from(projectMembers)
      .innerJoin(user, eq(user.id, projectMembers.userId))
      .leftJoin(userGroups, eq(userGroups.id, projectMembers.groupId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(sql`case ${projectMembers.role} when 'owner' then 0 when 'editor' then 1 when 'reviewer' then 2 else 3 end`, user.name)
    return rows.map(({ groupId, groupName, ...m }) => ({ ...m, viaGroup: groupId && groupName !== null ? { id: groupId, name: groupName } : null }))
  }

  /** The group a member has the project through, if not on their own. */
  private async viaGroup(projectId: string, userId: string): Promise<string | null | undefined> {
    const [row] = await this.db
      .select({ name: userGroups.name, groupId: projectMembers.groupId })
      .from(projectMembers)
      .leftJoin(userGroups, eq(userGroups.id, projectMembers.groupId))
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    if (!row) return undefined
    return row.groupId ? (row.name ?? '') : null
  }

  async addMember(projectId: string, email: string, role: Exclude<ProjectRole, 'owner'>): Promise<ProjectMember> {
    const [target] = await this.db.select().from(user).where(eq(user.email, email.toLowerCase()))
    if (!target) throw new NotFoundError(`No ColTex user with email ${email}`)
    // Someone who has the project through a group is added on their own: group changes no longer touch them.
    const converted = await this.db
      .update(projectMembers)
      .set({ role, groupId: null })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, target.id), isNotNull(projectMembers.groupId)))
      .returning()
    if (converted.length) return { userId: target.id, name: target.name, email: target.email, role, viaGroup: null }
    const inserted = await this.db
      .insert(projectMembers)
      .values({ projectId, userId: target.id, role })
      .onConflictDoNothing()
      .returning()
    if (inserted.length === 0) throw new ConflictError(`${email} is already a member`)
    return { userId: target.id, name: target.name, email: target.email, role, viaGroup: null }
  }

  async setMemberRole(projectId: string, userId: string, role: Exclude<ProjectRole, 'owner'>): Promise<void> {
    const group = await this.viaGroup(projectId, userId)
    if (group) throw new ConflictError(`They have this project through the group “${group}”, which sets their role`)
    const [row] = await this.db
      .update(projectMembers)
      .set({ role })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId), sql`${projectMembers.role} <> 'owner'`))
      .returning()
    if (!row) throw new NotFoundError('Member not found')
  }

  /** Make another member the owner; the previous owner stays on as an editor. */
  async transferOwnership(projectId: string, fromUserId: string, toUserId: string): Promise<void> {
    await this.db.transaction(async tx => {
      const [target] = await tx
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, toUserId)))
      if (!target) throw new NotFoundError('Member not found')
      if (target.role === 'owner') return
      await tx.update(projects).set({ ownerId: toUserId }).where(eq(projects.id, projectId))
      await tx
        .update(projectMembers)
        .set({ role: 'editor' })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, fromUserId)))
      await tx
        .update(projectMembers)
        .set({ role: 'owner', groupId: null })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, toUserId)))
    })
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const group = await this.viaGroup(projectId, userId)
    if (group) throw new ConflictError(`This project is shared with the group “${group}”: leave the group, or stop sharing the project with it`)
    const [row] = await this.db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId), sql`${projectMembers.role} <> 'owner'`))
      .returning()
    if (!row) throw new NotFoundError('Member not found')
    // Their tags no longer apply to a project they can't see.
    await this.db
      .delete(projectTags)
      .where(
        and(
          eq(projectTags.projectId, projectId),
          inArray(projectTags.tagId, this.db.select({ id: tags.id }).from(tags).where(eq(tags.userId, userId))),
        ),
      )
  }
}

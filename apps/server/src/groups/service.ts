import { customAlphabet } from 'nanoid'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { Group, GroupMember, ProjectGroupShare, ProjectRole } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { projectGroupShares, projectMembers, projectTags, tags, user, userGroupMembers, userGroups } from '../db/schema.ts'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors.ts'
import type { NotificationService } from '../notifications/service.ts'

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)

type SharedRole = Exclude<ProjectRole, 'owner'>
const RANK: Record<SharedRole, number> = { editor: 3, reviewer: 2, viewer: 1 }

/** What happens to a person's open editors when their access changes. */
export type GroupAccessHooks = { closeUser: (projectId: string, userId: string) => void }

/**
 * Named groups (Settings → Groups) and projects shared with them. Anyone may
 * make a group and invite anyone on the server; people are in a group once
 * they accept. A project shared with a group gives each joined member a
 * `project_members` row with `group_id` set, so every access check reads one
 * table as before. Those rows follow the groups (`sync`); rows of people
 * added on their own (no `group_id`) are never touched by group changes.
 */
export class GroupService {
  private readonly db: Db
  private readonly notifications: Pick<NotificationService, 'groupInvite' | 'forgetGroupInvite' | 'membership' | 'forgetProject'>
  private readonly hooks: GroupAccessHooks

  constructor(db: Db, notifications: GroupService['notifications'], hooks: GroupAccessHooks) {
    this.db = db
    this.notifications = notifications
    this.hooks = hooks
  }

  // ---- Groups ----

  /** The groups this person is in or invited to. */
  async listForUser(userId: string): Promise<Group[]> {
    const mine = await this.db
      .select({ id: userGroups.id, name: userGroups.name, createdAt: userGroups.createdAt, role: userGroupMembers.role, status: userGroupMembers.status, invitedBy: userGroupMembers.invitedBy })
      .from(userGroupMembers)
      .innerJoin(userGroups, eq(userGroups.id, userGroupMembers.groupId))
      .where(eq(userGroupMembers.userId, userId))
      .orderBy(userGroups.name)
    if (mine.length === 0) return []
    const members = await this.members(mine.map(g => g.id))
    const inviterIds = [...new Set(mine.map(g => g.invitedBy).filter((x): x is string => !!x))]
    const inviters = inviterIds.length ? await this.db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, inviterIds)) : []
    const inviterName = new Map(inviters.map(u => [u.id, u.name]))
    return mine.map(g => ({
      id: g.id,
      name: g.name,
      role: g.role,
      status: g.status,
      invitedBy: g.status === 'invited' ? { id: g.invitedBy, name: (g.invitedBy && inviterName.get(g.invitedBy)) || 'Deleted user' } : null,
      // Someone only invited sees who else is there once they join.
      members: g.status === 'joined' ? (members.get(g.id) ?? []) : [],
      createdAt: g.createdAt.toISOString(),
    }))
  }

  private async members(groupIds: string[]): Promise<Map<string, GroupMember[]>> {
    const rows = await this.db
      .select({ groupId: userGroupMembers.groupId, userId: user.id, name: user.name, email: user.email, role: userGroupMembers.role, status: userGroupMembers.status })
      .from(userGroupMembers)
      .innerJoin(user, eq(user.id, userGroupMembers.userId))
      .where(inArray(userGroupMembers.groupId, groupIds))
      .orderBy(sql`case ${userGroupMembers.role} when 'owner' then 0 else 1 end`, user.name)
    const out = new Map<string, GroupMember[]>()
    for (const { groupId, ...m } of rows) out.set(groupId, [...(out.get(groupId) ?? []), m])
    return out
  }

  async create(userId: string, name: string): Promise<Group> {
    const id = newId()
    await this.db.transaction(async tx => {
      await tx.insert(userGroups).values({ id, name, createdBy: userId })
      await tx.insert(userGroupMembers).values({ groupId: id, userId, role: 'owner', status: 'joined' })
    })
    return (await this.listForUser(userId)).find(g => g.id === id)!
  }

  /** The person's place in a group; 404 for groups they aren't in (or invited to). */
  private async place(groupId: string, userId: string) {
    const [row] = await this.db
      .select({ role: userGroupMembers.role, status: userGroupMembers.status, name: userGroups.name })
      .from(userGroupMembers)
      .innerJoin(userGroups, eq(userGroups.id, userGroupMembers.groupId))
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId)))
    if (!row) throw new NotFoundError('Group not found')
    return row
  }

  async requireOwner(groupId: string, userId: string): Promise<void> {
    const p = await this.place(groupId, userId)
    if (p.status !== 'joined' || p.role !== 'owner') throw new ForbiddenError('Only the group’s owners can do this')
  }

  /** Joined members only: what a group gives (projects, templates) is theirs. */
  async requireJoined(groupId: string, userId: string): Promise<{ name: string }> {
    const p = await this.place(groupId, userId)
    if (p.status !== 'joined') throw new NotFoundError('Group not found')
    return { name: p.name }
  }

  async rename(groupId: string, userId: string, name: string): Promise<void> {
    await this.requireOwner(groupId, userId)
    await this.db.update(userGroups).set({ name, updatedAt: new Date() }).where(eq(userGroups.id, groupId))
  }

  async delete(groupId: string, userId: string): Promise<void> {
    await this.requireOwner(groupId, userId)
    const pairs = await this.pairsOfGroup(groupId)
    // Cascades: memberships, shares, and the project access they gave.
    await this.db.delete(userGroups).where(eq(userGroups.id, groupId))
    await this.sync(pairs, userId)
  }

  async invite(groupId: string, actorId: string, targetId: string): Promise<void> {
    await this.requireOwner(groupId, actorId)
    const [target] = await this.db.select({ id: user.id }).from(user).where(eq(user.id, targetId))
    if (!target) throw new NotFoundError('No such user')
    const inserted = await this.db
      .insert(userGroupMembers)
      .values({ groupId, userId: targetId, role: 'member', status: 'invited', invitedBy: actorId })
      .onConflictDoNothing()
      .returning()
    if (inserted.length === 0) throw new ConflictError('They are already in this group or invited')
    await this.notifications.groupInvite(groupId, actorId, targetId)
  }

  async accept(groupId: string, userId: string): Promise<void> {
    const p = await this.place(groupId, userId)
    if (p.status === 'joined') return
    await this.db
      .update(userGroupMembers)
      .set({ status: 'joined', updatedAt: new Date() })
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId)))
    await this.notifications.forgetGroupInvite(groupId, userId)
    await this.sync(await this.pairsOfMember(groupId, userId), null)
  }

  /** Decline an invitation, leave a group, or (owners) remove someone or take back an invitation. */
  async remove(groupId: string, actorId: string, targetId: string): Promise<void> {
    if (actorId !== targetId) await this.requireOwner(groupId, actorId)
    const p = await this.place(groupId, targetId)
    if (p.role === 'owner' && p.status === 'joined') {
      const [owners] = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(userGroupMembers)
        .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.role, 'owner'), eq(userGroupMembers.status, 'joined')))
      if ((owners?.n ?? 0) <= 1) throw new BadRequestError('A group needs an owner: make someone else an owner first, or delete the group')
    }
    const pairs = await this.pairsOfMember(groupId, targetId)
    await this.db.delete(userGroupMembers).where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, targetId)))
    await this.notifications.forgetGroupInvite(groupId, targetId)
    await this.sync(pairs, actorId)
  }

  async setRole(groupId: string, actorId: string, targetId: string, role: 'owner' | 'member'): Promise<void> {
    await this.requireOwner(groupId, actorId)
    const p = await this.place(groupId, targetId)
    if (p.status !== 'joined') throw new BadRequestError('They haven’t accepted the invitation yet')
    if (role === 'member' && targetId === actorId) {
      const [owners] = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(userGroupMembers)
        .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.role, 'owner'), eq(userGroupMembers.status, 'joined')))
      if ((owners?.n ?? 0) <= 1) throw new BadRequestError('A group needs an owner')
    }
    await this.db
      .update(userGroupMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, targetId)))
  }

  /** Ids of the groups this person has joined. */
  async joinedGroupIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: userGroupMembers.groupId })
      .from(userGroupMembers)
      .where(and(eq(userGroupMembers.userId, userId), eq(userGroupMembers.status, 'joined')))
    return rows.map(r => r.id)
  }

  // ---- Projects shared with groups ----

  async listProjectShares(projectId: string): Promise<ProjectGroupShare[]> {
    const rows = await this.db
      .select({
        groupId: projectGroupShares.groupId,
        name: userGroups.name,
        role: projectGroupShares.role,
        members: sql<number>`(select count(*)::int from ${userGroupMembers} m where m.group_id = ${projectGroupShares.groupId} and m.status = 'joined')`,
      })
      .from(projectGroupShares)
      .innerJoin(userGroups, eq(userGroups.id, projectGroupShares.groupId))
      .where(eq(projectGroupShares.projectId, projectId))
      .orderBy(userGroups.name)
    return rows
  }

  /** Share a project with a group (or change the role it gives). The owner sharing it must be in the group. */
  async shareProject(projectId: string, groupId: string, role: SharedRole, actorId: string): Promise<void> {
    await this.requireJoined(groupId, actorId)
    await this.db
      .insert(projectGroupShares)
      .values({ projectId, groupId, role, sharedBy: actorId })
      .onConflictDoUpdate({ target: [projectGroupShares.projectId, projectGroupShares.groupId], set: { role } })
    await this.sync(await this.pairsOfShare(projectId, groupId), actorId)
  }

  async unshareProject(projectId: string, groupId: string, actorId: string): Promise<void> {
    const pairs = await this.pairsOfShare(projectId, groupId)
    const removed = await this.db
      .delete(projectGroupShares)
      .where(and(eq(projectGroupShares.projectId, projectId), eq(projectGroupShares.groupId, groupId)))
      .returning()
    if (removed.length === 0) throw new NotFoundError('The project isn’t shared with this group')
    await this.sync(pairs, actorId)
  }

  // ---- Keeping project_members in step ----

  private async pairsOfShare(projectId: string, groupId: string): Promise<[string, string][]> {
    const rows = await this.db
      .select({ userId: userGroupMembers.userId })
      .from(userGroupMembers)
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.status, 'joined')))
    return rows.map(r => [projectId, r.userId])
  }

  private async pairsOfMember(groupId: string, userId: string): Promise<[string, string][]> {
    const rows = await this.db.select({ projectId: projectGroupShares.projectId }).from(projectGroupShares).where(eq(projectGroupShares.groupId, groupId))
    return rows.map(r => [r.projectId, userId])
  }

  private async pairsOfGroup(groupId: string): Promise<[string, string][]> {
    const rows = await this.db
      .select({ projectId: projectGroupShares.projectId, userId: userGroupMembers.userId })
      .from(projectGroupShares)
      .innerJoin(userGroupMembers, and(eq(userGroupMembers.groupId, projectGroupShares.groupId), eq(userGroupMembers.status, 'joined')))
      .where(eq(projectGroupShares.groupId, groupId))
    return rows.map(r => [r.projectId, r.userId])
  }

  /**
   * Bring each person's access to each project in line with the groups: the
   * best role any of their groups gives, through that group, or none. Their
   * own membership (no group) is left as it is. `actorId` is named in the
   * notification of someone who gains a project (null: they joined themselves).
   */
  async sync(pairs: [string, string][], actorId: string | null): Promise<void> {
    for (const [projectId, userId] of pairs) {
      const grants = await this.db
        .select({ groupId: projectGroupShares.groupId, role: projectGroupShares.role, sharedBy: projectGroupShares.sharedBy })
        .from(projectGroupShares)
        .innerJoin(
          userGroupMembers,
          and(eq(userGroupMembers.groupId, projectGroupShares.groupId), eq(userGroupMembers.userId, userId), eq(userGroupMembers.status, 'joined')),
        )
        .where(eq(projectGroupShares.projectId, projectId))
      const best = grants.sort((a, b) => RANK[b.role] - RANK[a.role] || a.groupId.localeCompare(b.groupId))[0]
      const [row] = await this.db
        .select({ role: projectMembers.role, groupId: projectMembers.groupId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      if (row && row.groupId === null) continue
      const where = and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
      if (!best) {
        if (!row) continue
        await this.db.delete(projectMembers).where(and(where, isNotNull(projectMembers.groupId)))
        await this.db
          .delete(projectTags)
          .where(and(eq(projectTags.projectId, projectId), inArray(projectTags.tagId, this.db.select({ id: tags.id }).from(tags).where(eq(tags.userId, userId)))))
        this.hooks.closeUser(projectId, userId)
        await this.notifications.forgetProject(projectId, userId)
      } else if (!row) {
        await this.db.insert(projectMembers).values({ projectId, userId, role: best.role, groupId: best.groupId }).onConflictDoNothing()
        const actor = actorId ?? best.sharedBy
        if (actor && actor !== userId) await this.notifications.membership(projectId, actor, userId, { kind: 'added', role: best.role })
      } else if (row.role !== best.role || row.groupId !== best.groupId) {
        await this.db.update(projectMembers).set({ role: best.role, groupId: best.groupId }).where(where)
        if (row.role !== best.role) this.hooks.closeUser(projectId, userId)
      }
    }
  }
}

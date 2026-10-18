import type { SecretBox } from '../ai/credentials.ts'
import crypto from 'node:crypto'
import { and, asc, count, desc, eq, gt, ilike, isNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { customAlphabet } from 'nanoid'
import { passwordProblem, type InviteRole, type Invite, type InviteInfo, type ManagedUser, type UserMatch, type UserRole } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { aiUserGroups, invites, teamMembers, user } from '../db/schema.ts'
import { BadRequestError, ConflictError, ForbiddenError, GoneError, NotFoundError } from '../errors.ts'
import type { Auth } from './auth.ts'

const newInviteId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
/** Arbitrary constant identifying the first-run setup advisory lock. */
const SETUP_LOCK_KEY = 4_217_001

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export type NewAccount = { name: string; email: string; password: string }

type Viewer = { id: string; role?: string | null }
const leader = alias(user, 'leader')

/** Account lifecycle that sits outside better-auth: first-run setup and invites. */
export class AccountService {
  private readonly db: Db
  private readonly auth: Auth

  /** Seals invitation tokens, so pending links can be shown again (never stored in the clear). */
  private readonly box: SecretBox

  constructor(db: Db, auth: Auth, box: SecretBox) {
    this.db = db
    this.auth = auth
    this.box = box
  }

  async needsSetup(): Promise<boolean> {
    const [row] = await this.db.select({ n: count() }).from(user)
    return row!.n === 0
  }

  /** Create the first administrator. Only possible while there are no users. */
  async setup(account: NewAccount): Promise<void> {
    const client = await this.db.$client.connect()
    try {
      const { rows } = await client.query<{ locked: boolean }>('select pg_try_advisory_lock($1) as locked', [SETUP_LOCK_KEY])
      if (!rows[0]?.locked) throw new ConflictError('Setup is already in progress')
      try {
        if (!(await this.needsSetup())) throw new ConflictError('ColTex is already set up')
        await this.createUser(account, 'admin')
      } finally {
        await client.query('select pg_advisory_unlock($1)', [SETUP_LOCK_KEY])
      }
    } finally {
      client.release()
    }
  }

  /** Admins invite members into their own team; the system administrator also invites admins. */
  async createInvite(
    creator: Viewer,
    opts: { email?: string; role: InviteRole; expiresInDays: number; aiGroupId?: string | null },
  ): Promise<{ invite: Invite; token: string }> {
    if (creator.role !== 'admin' && opts.role !== 'user') throw new ForbiddenError('Only the system administrator can invite admins')
    // AI access is the system administrator's to give (an admin's members get the admin's group).
    if (creator.role !== 'admin' && opts.aiGroupId) throw new ForbiddenError('Only the system administrator can choose an AI group')
    const createdBy = creator.id
    const token = crypto.randomBytes(32).toString('base64url')
    const [row] = await this.db
      .insert(invites)
      .values({
        id: newInviteId(),
        tokenHash: hashToken(token),
        tokenSealed: this.box.seal(token),
        email: opts.email?.toLowerCase() ?? null,
        role: opts.role,
        aiGroupId: opts.aiGroupId ?? null,
        createdBy,
        expiresAt: new Date(Date.now() + opts.expiresInDays * 86_400_000),
      })
      .returning()
    return { invite: this.toInvite(row!, null), token }
  }

  /**
   * Accounts whose name or email contains `query`, for picking someone to
   * share with. Suspended accounts are left out.
   */
  async searchUsers(query: string, limit = 8): Promise<UserMatch[]> {
    const q = `%${query.trim().replace(/[\\%_]/g, c => `\\${c}`)}%`
    return this.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(and(or(ilike(user.name, q), ilike(user.email, q)), or(isNull(user.banned), eq(user.banned, false))))
      .orderBy(asc(user.name))
      .limit(limit)
  }

  /** All invitations for the system administrator; an admin's own for admins. */
  async listInvites(viewer: Viewer): Promise<Invite[]> {
    const rows = await this.db
      .select({ invite: invites, usedByEmail: user.email })
      .from(invites)
      .leftJoin(user, eq(user.id, invites.usedBy))
      .where(viewer.role === 'admin' ? undefined : eq(invites.createdBy, viewer.id))
      .orderBy(desc(invites.createdAt))
    return rows.map(r => this.toInvite(r.invite, r.usedByEmail))
  }

  async revokeInvite(id: string, viewer: Viewer): Promise<void> {
    const own = viewer.role === 'admin' ? undefined : eq(invites.createdBy, viewer.id)
    const deleted = await this.db.delete(invites).where(and(eq(invites.id, id), isNull(invites.usedAt), own)).returning()
    if (deleted.length === 0) throw new NotFoundError('Invite not found or already used')
  }

  async inviteInfo(token: string): Promise<InviteInfo> {
    const row = await this.findUsableInvite(token)
    return { email: row.email, role: row.role, expiresAt: row.expiresAt.toISOString() }
  }

  /** Redeem an invite: claim it atomically, then create the account. */
  async acceptInvite(token: string, account: NewAccount): Promise<void> {
    const invite = await this.findUsableInvite(token)
    if (invite.email && invite.email !== account.email.toLowerCase()) {
      throw new BadRequestError('This invite is for a different email address')
    }
    const [claimed] = await this.db
      .update(invites)
      .set({ usedAt: new Date() })
      .where(and(eq(invites.id, invite.id), isNull(invites.usedAt)))
      .returning()
    if (!claimed) throw new GoneError('This invite has already been used')
    try {
      const userId = await this.createUser(account, invite.role)
      await this.db.update(invites).set({ usedBy: userId }).where(eq(invites.id, invite.id))
      // A member an admin invited joins that admin's team, and their AI group unless the invitation chose one.
      const [creator] = invite.createdBy ? await this.db.select({ role: user.role }).from(user).where(eq(user.id, invite.createdBy)) : []
      const team = creator?.role === 'manager' && invite.role === 'user' ? invite.createdBy : null
      if (team) await this.db.insert(teamMembers).values({ userId, managerId: team }).onConflictDoNothing()
      const [teamGroup] = team && !invite.aiGroupId ? await this.db.select({ groupId: aiUserGroups.groupId }).from(aiUserGroups).where(eq(aiUserGroups.userId, team)) : []
      const groupId = invite.aiGroupId ?? teamGroup?.groupId
      if (groupId) await this.db.insert(aiUserGroups).values({ userId, groupId }).onConflictDoNothing()
    } catch (err) {
      await this.db.update(invites).set({ usedAt: null }).where(eq(invites.id, invite.id))
      throw err
    }
  }

  // ---- Managing accounts: the system administrator everyone, an admin their own team ----

  /** The users page: everyone for the system administrator; an admin and their team for an admin. */
  async listUsers(viewer: Viewer): Promise<ManagedUser[]> {
    const rows = await this.db
      .select({ u: user, managerId: teamMembers.managerId, leaderRole: leader.role })
      .from(user)
      .leftJoin(teamMembers, eq(teamMembers.userId, user.id))
      .leftJoin(leader, eq(leader.id, teamMembers.managerId))
      .where(viewer.role === 'admin' ? undefined : or(eq(user.id, viewer.id), and(eq(teamMembers.managerId, viewer.id), eq(user.role, 'user'))))
      .orderBy(asc(user.createdAt))
    return rows.map(r => ({
      id: r.u.id,
      name: r.u.name,
      email: r.u.email,
      role: (r.u.role ?? 'user') as UserRole,
      banned: !!r.u.banned,
      createdAt: r.u.createdAt.toISOString(),
      managerId: r.u.role === 'user' && r.leaderRole === 'manager' ? r.managerId : null,
    }))
  }

  async setPassword(viewer: Viewer, userId: string, password: string): Promise<void> {
    await this.managed(viewer, userId)
    const problem = passwordProblem(password)
    if (problem) throw new BadRequestError(problem)
    const ctx = await this.auth.$context
    await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password))
  }

  /** Suspend (signed out, can't sign in) or reactivate. */
  async suspend(viewer: Viewer, userId: string, suspended: boolean): Promise<void> {
    await this.managed(viewer, userId)
    const ctx = await this.auth.$context
    await ctx.internalAdapter.updateUser(userId, { banned: suspended, banReason: null, banExpires: null })
    if (suspended) await ctx.internalAdapter.deleteUserSessions(userId)
  }

  /** Delete the account; better-auth's delete hooks remove the projects they own with their files. */
  async deleteUser(viewer: Viewer, userId: string): Promise<void> {
    await this.managed(viewer, userId)
    const ctx = await this.auth.$context
    await ctx.internalAdapter.deleteUserSessions(userId)
    await ctx.internalAdapter.deleteUser(userId)
  }

  /** Member or admin (system administrator only; that role itself is never given). */
  async setRole(viewer: Viewer, userId: string, role: InviteRole): Promise<void> {
    if (viewer.role !== 'admin') throw new ForbiddenError('Only the system administrator can change roles')
    await this.managed(viewer, userId)
    const ctx = await this.auth.$context
    await ctx.internalAdapter.updateUser(userId, { role })
  }

  /** Put a member in an admin's team, or in none (system administrator only). */
  async setTeam(viewer: Viewer, userId: string, managerId: string | null): Promise<void> {
    if (viewer.role !== 'admin') throw new ForbiddenError('Only the system administrator can move people between teams')
    const target = await this.managed(viewer, userId)
    if (target.role !== 'user') throw new BadRequestError('Only members are in a team')
    if (!managerId) {
      await this.db.delete(teamMembers).where(eq(teamMembers.userId, userId))
      return
    }
    const [lead] = await this.db.select({ role: user.role }).from(user).where(eq(user.id, managerId))
    if (lead?.role !== 'manager') throw new BadRequestError('A team is led by an admin')
    await this.db.insert(teamMembers).values({ userId, managerId }).onConflictDoUpdate({ target: teamMembers.userId, set: { managerId } })
  }

  /**
   * Someone the viewer may manage: anyone but themselves and the system
   * administrator for the system administrator; their own team's members for
   * an admin. Others are "not found", so an admin learns nothing about them.
   */
  private async managed(viewer: Viewer, userId: string): Promise<{ role: string }> {
    if (userId === viewer.id) throw new ForbiddenError('Change your own account in Settings → Account')
    const [row] = await this.db
      .select({ role: user.role, managerId: teamMembers.managerId })
      .from(user)
      .leftJoin(teamMembers, eq(teamMembers.userId, user.id))
      .where(eq(user.id, userId))
    const role = row?.role ?? 'user'
    const mine = viewer.role === 'admin' || (viewer.role === 'manager' && role === 'user' && row?.managerId === viewer.id)
    if (!row || !mine) throw new NotFoundError('User not found')
    if (role === 'admin') throw new ForbiddenError('The system administrator changes their own account in Settings → Account')
    return { role }
  }

  /** Sign in with email/password and return better-auth's response (carries the session cookie). */
  signIn(email: string, password: string): Promise<Response> {
    return this.auth.api.signInEmail({ body: { email: email.toLowerCase(), password }, asResponse: true })
  }

  private async findUsableInvite(token: string) {
    const [row] = await this.db
      .select()
      .from(invites)
      .where(and(eq(invites.tokenHash, hashToken(token)), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    if (!row) throw new GoneError('This invite link is invalid, expired, or already used')
    return row
  }

  private async createUser(account: NewAccount, role: UserRole): Promise<string> {
    const email = account.email.toLowerCase()
    const [existing] = await this.db.select({ id: user.id }).from(user).where(eq(user.email, email))
    if (existing) throw new ConflictError('An account with this email already exists')
    const created = await this.auth.api.createUser({
      body: { email, password: account.password, name: account.name.trim(), role },
    })
    return created.user.id
  }

  private toInvite(row: typeof invites.$inferSelect, usedByEmail: string | null): Invite {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      usedAt: row.usedAt?.toISOString() ?? null,
      usedByEmail,
      aiGroupId: row.aiGroupId,
      token: this.pendingToken(row),
    }
  }

  /** The token of an invitation that can still be used; older ones (hash only) have none. */
  private pendingToken(row: typeof invites.$inferSelect): string | null {
    if (row.usedAt || row.expiresAt <= new Date() || !row.tokenSealed) return null
    try {
      return this.box.open(row.tokenSealed)
    } catch {
      return null // sealed with another instance secret (restored without it)
    }
  }
}

import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => 'bytea',
  toDriver: value => Buffer.from(value),
  fromDriver: value => new Uint8Array(value),
})

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

// ---------------------------------------------------------------------------
// better-auth tables (core + admin plugin). Field names are dictated by
// better-auth; it validates this schema at runtime and fails loudly on drift.
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // admin plugin
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  // two-factor plugin
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  ...timestamps,
}, t => [
  // There is one system administrator: the index refuses a second, whatever path tries.
  uniqueIndex('user_one_system_admin_idx').on(sql`(true)`).where(sql`${t.role} = 'admin'`),
])

/**
 * Teams: each admin (role `manager`) leads the members they invited, and
 * manages only them. A link counts while the member is a member and the
 * leader an admin, so changing a role never needs these rows rewritten.
 */
export const teamMembers = pgTable(
  'team_members',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    managerId: text('manager_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  t => [index('team_members_manager_idx').on(t.managerId)],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // admin plugin
    impersonatedBy: text('impersonated_by'),
    ...timestamps,
  },
  t => [index('session_user_id_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  t => [index('account_user_id_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  t => [index('verification_identifier_idx').on(t.identifier)],
)

/** two-factor plugin: the authenticator secret and recovery codes, both encrypted with the instance secret. */
export const twoFactor = pgTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true),
    failedVerificationCount: integer('failed_verification_count').default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
  },
  t => [index('two_factor_user_id_idx').on(t.userId), index('two_factor_secret_idx').on(t.secret)],
)

// ---------------------------------------------------------------------------
// ColTex tables
// ---------------------------------------------------------------------------

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rootFile: text('root_file').notNull().default('main.tex'),
    engine: text('engine', { enum: ['auto', 'pdflatex', 'xelatex', 'lualatex'] }).notNull().default('auto'),
    /** A SPELL_CHECK_LANGUAGES code, or '' for no spell checking. */
    spellCheckLanguage: text('spell_check_language').notNull().default('en_US'),
    /** Who has track changes on (see TrackChangesState). */
    trackChanges: jsonb('track_changes').$type<{ everyone: boolean; users: string[] }>().notNull().default({ everyone: false, users: [] }),
    /** Holds an imported template's files: not in the project list (user's decision 2026-10-27). */
    templateOnly: boolean('template_only').notNull().default(false),
    ...timestamps,
  },
  t => [index('projects_owner_id_idx').on(t.ownerId)],
)

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'editor', 'reviewer', 'viewer'] }).notNull(),
    createdAt: timestamps.createdAt,
    /** Archived or in the trash, for this member only (like Overleaf); at most one is set. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    trashedAt: timestamp('trashed_at', { withTimezone: true }),
    /**
     * Set when the membership comes from the project being shared with a
     * group (groups/service.ts keeps these rows in step with the groups);
     * null when the person was added on their own, which group changes never touch.
     */
    groupId: text('group_id').references(() => userGroups.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.projectId, t.userId] }), index('project_members_user_id_idx').on(t.userId)],
)

/**
 * Named groups of people (user's decision 2026-10-25): anyone may make one in
 * Settings → Groups and invite anyone on the server; an invitation counts once
 * accepted. Projects (and templates) can be shared with a group.
 */
export const userGroups = pgTable('user_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  ...timestamps,
})

export const userGroupMembers = pgTable(
  'user_group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => userGroups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Owners rename the group, invite, remove people and delete it. */
    role: text('role', { enum: ['owner', 'member'] }).notNull(),
    /** Invited until they accept. */
    status: text('status', { enum: ['invited', 'joined'] }).notNull(),
    invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  t => [primaryKey({ columns: [t.groupId, t.userId] }), index('user_group_members_user_idx').on(t.userId)],
)

/** A project shared with a group: its joined members get the role (project_members rows with group_id). */
export const projectGroupShares = pgTable(
  'project_group_shares',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => userGroups.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['editor', 'reviewer', 'viewer'] }).notNull(),
    sharedBy: text('shared_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamps.createdAt,
  },
  t => [primaryKey({ columns: [t.projectId, t.groupId] }), index('project_group_shares_group_idx').on(t.groupId)],
)

/**
 * A text file's identity for real-time collaboration. The id is stable across
 * renames/moves; `state` is the Yjs document (CRDT) so reconnecting clients
 * merge instead of duplicating text. The file on disk stays the canonical
 * content that compiles and exports read.
 */
export const projectDocs = pgTable(
  'project_docs',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    state: bytea('state'),
    ...timestamps,
  },
  t => [uniqueIndex('project_docs_project_path_idx').on(t.projectId, t.path)],
)

/** Single-use registration links created by admins. Only a hash of the token is stored. */
export const invites = pgTable(
  'invites',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    /** The token sealed with the instance secret, so its link can be shown again while pending. */
    tokenSealed: text('token_sealed'),
    /** When set, the invite can only be redeemed with this email address. */
    email: text('email'),
    role: text('role', { enum: ['user', 'manager', 'admin'] }).notNull().default('user'),
    /** The AI group the new account joins. */
    aiGroupId: text('ai_group_id').references(() => aiGroups.id, { onDelete: 'set null' }),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedBy: text('used_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamps.createdAt,
  },
  t => [uniqueIndex('invites_token_hash_idx').on(t.tokenHash)],
)

/** Instance-wide settings as JSON documents, e.g. `ai` (validated by the owning service). */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamps.updatedAt,
})

/**
 * Credentials for AI providers (API keys, OAuth tokens), one per provider and
 * shared by the whole instance. `secret` is AES-256-GCM encrypted with a key
 * derived from the instance secret.
 */
export const aiCredentials = pgTable('ai_credentials', {
  providerId: text('provider_id').primaryKey(),
  type: text('type', { enum: ['api_key', 'oauth'] }).notNull(),
  secret: text('secret').notNull(),
  updatedAt: timestamps.updatedAt,
})

/** One row per model response, for the admin's usage overview. */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    cost: doublePrecision('cost').notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  t => [index('ai_usage_created_at_idx').on(t.createdAt), index('ai_usage_user_idx').on(t.userId, t.createdAt)],
)

/** Which models a person may use, when an admin set it for them (otherwise the instance default applies). */
/** AI groups: which providers and models their members may use (admins always have every model). */
export const aiGroups = pgTable('ai_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** An `AiAccessPolicy`, validated by `AiService`. */
  policy: jsonb('policy').notNull(),
  /** `AiUsageLimits` for each member. */
  limits: jsonb('limits').notNull().default({ period: 'month', tokens: null, cost: null }),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
})

/** A person's AI group; without one (and not an admin) they can't use the assistant. */
export const aiUserGroups = pgTable(
  'ai_user_groups',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => aiGroups.id, { onDelete: 'cascade' }),
  },
  t => [index('ai_user_groups_group_idx').on(t.groupId)],
)

/** A person's interface settings (UserPreferences), so they follow the account rather than the browser. */
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: text('theme'),
  avatarHue: integer('avatar_hue'),
  updatedAt: timestamps.updatedAt,
})

/** The model and thinking level a person last picked in the assistant panel. */
export const aiPreferences = pgTable('ai_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  thinkingLevel: text('thinking_level').notNull(),
  auto: boolean('auto').notNull().default(false),
  updatedAt: timestamps.updatedAt,
})

/** A person's own model access and usage limit (AiUserCustom), each replacing their group's when not null. */
export const aiUserSettings = pgTable('ai_user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  policy: jsonb('policy'),
  limits: jsonb('limits'),
  updatedAt: timestamps.updatedAt,
})

/** What AI agents may change for a person (AiPermission); no row: manual. */
export const aiPermissions = pgTable('ai_permissions', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  permission: text('permission', { enum: ['manual', 'auto', 'full'] }).notNull(),
  updatedAt: timestamps.updatedAt,
})

/**
 * Assistant conversations, one person's about one project, so they can be
 * reopened (and survive restarts). `items` is what the panel shows, `messages`
 * the agent's transcript (pi's AgentMessage[], system messages included); the
 * draft is not kept, it lives only in the open session.
 */
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    items: jsonb('items').notNull(),
    messages: jsonb('messages').notNull(),
    /** Tokens in the context after the last reply (an estimate right after compacting). */
    contextTokens: integer('context_tokens'),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  },
  t => [index('ai_conversations_user_project_idx').on(t.userId, t.projectId, t.updatedAt)],
)

/**
 * AI skills (Agent Skills: a name, a description and instructions, plus the
 * reference files an imported skill came with, as text). Each person's own,
 * for all their projects; names are unique per person.
 */
export const aiSkills = pgTable(
  'ai_skills',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    body: text('body').notNull(),
    /** Reference files: path → text. */
    files: jsonb('files').$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  },
  t => [uniqueIndex('ai_skills_user_name_idx').on(t.userId, t.name)],
)

/**
 * Each person's conversation in the skills chat (Settings → AI skills): one
 * per person, kept until they start a new one.
 */
export const aiSkillChats = pgTable('ai_skill_chats', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  items: jsonb('items').notNull(),
  messages: jsonb('messages').notNull(),
  contextTokens: integer('context_tokens'),
  updatedAt: timestamps.updatedAt,
})

/** Named versions ("Submitted to journal"); the version id is a commit in the project's history repo. */
export const historyLabels = pgTable(
  'history_labels',
  {
    id: serial('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    versionId: text('version_id').notNull(),
    name: text('name').notNull(),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamps.createdAt,
  },
  t => [index('history_labels_project_idx').on(t.projectId)],
)

/**
 * Comment threads. The anchor (which text they refer to) lives in the file's
 * Yjs document, so it moves with edits; the conversation lives here.
 */
export const commentThreads = pgTable(
  'comment_threads',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Deleting the file deletes its threads.
    docId: text('doc_id')
      .notNull()
      .references(() => projectDocs.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamps.createdAt,
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
  },
  t => [index('comment_threads_project_idx').on(t.projectId)],
)

export const commentMessages = pgTable(
  'comment_messages',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => commentThreads.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    createdAt: timestamps.createdAt,
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  t => [index('comment_messages_thread_idx').on(t.threadId)],
)

/** Words a user added to their spelling dictionary; they apply in all of their projects. */
export const learnedWords = pgTable(
  'learned_words',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    word: text('word').notNull(),
    createdAt: timestamps.createdAt,
  },
  t => [primaryKey({ columns: [t.userId, t.word] })],
)

/** The project's chat (like Overleaf's chat panel). Messages outlive their author. */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    createdAt: timestamps.createdAt,
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  t => [index('chat_messages_project_created_idx').on(t.projectId, t.createdAt)],
)

/**
 * In-app notifications (see `NotificationKind`). Deleting the message,
 * thread or project they are about deletes them too.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Null for notifications about the account itself.
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['mention', 'reply', 'added', 'owner', 'password_reset', 'two_factor_reset', 'account_locked', 'group_invite'] }).notNull(),
    source: text('source', { enum: ['chat', 'comment'] }),
    threadId: text('thread_id').references(() => commentThreads.id, { onDelete: 'cascade' }),
    commentMessageId: text('comment_message_id').references(() => commentMessages.id, { onDelete: 'cascade' }),
    chatMessageId: text('chat_message_id').references(() => chatMessages.id, { onDelete: 'cascade' }),
    excerpt: text('excerpt').notNull().default(''),
    role: text('role', { enum: ['owner', 'editor', 'reviewer', 'viewer'] }),
    /** The group someone was invited to (`group_invite`); goes with the group. */
    groupId: text('group_id').references(() => userGroups.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  t => [
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    index('notifications_thread_idx').on(t.threadId),
    index('notifications_comment_message_idx').on(t.commentMessageId),
    index('notifications_chat_message_idx').on(t.chatMessageId),
  ],
)

/**
 * Sign-in attempts and what came of them (`SignInOutcome`), kept 90 days: each person sees
 * their own, the system administrator everyone's. A success also makes its address familiar
 * for that account (see auth/sign-in-guard.ts). `email` is what was typed, so attempts at
 * addresses without an account are kept too (with no user).
 */
export const signInEvents = pgTable(
  'sign_in_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    outcome: text('outcome', { enum: ['success', 'failure', 'two_factor_failure', 'refused', 'locked', 'unlocked', 'ip_blocked'] }).notNull(),
    method: text('method', { enum: ['password', 'totp', 'recovery_code'] }),
    reason: text('reason', { enum: ['cooldown', 'locked', 'ip_blocked', 'challenge'] }),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamps.createdAt,
  },
  t => [
    index('sign_in_events_user_created_idx').on(t.userId, t.createdAt),
    index('sign_in_events_created_idx').on(t.createdAt),
  ],
)

/**
 * Accounts locked after too many failed sign-ins from unfamiliar addresses: closed to those until
 * the system administrator unlocks them (Manage users, or `cli.ts unlock`). Familiar addresses
 * still sign in.
 */
export const signInLocks = pgTable('sign_in_locks', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  lockedAt: timestamps.createdAt,
})

/**
 * The admin overview's resource history: one row per minute, written by the
 * server whether or not anyone is watching, kept for 30 days (`ResourceSample`
 * for the units). `boot` is when the server process that wrote it started.
 */
export const monitorSamples = pgTable('monitor_samples', {
  at: timestamp('at', { withTimezone: true }).primaryKey(),
  boot: timestamp('boot', { withTimezone: true }).notNull(),
  serverCpu: real('server_cpu').notNull(),
  serverMem: bigint('server_mem', { mode: 'number' }).notNull(),
  serverMemLimit: bigint('server_mem_limit', { mode: 'number' }).notNull(),
  compilerCpu: real('compiler_cpu'),
  compilerMem: bigint('compiler_mem', { mode: 'number' }),
  compilerMemLimit: bigint('compiler_mem_limit', { mode: 'number' }),
})

/** Finished builds, for the overview's build counts (kept for 30 days). */
export const compileRuns = pgTable(
  'compile_runs',
  {
    id: serial('id').primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    ms: integer('ms').notNull(),
    status: text('status').notNull(),
  },
  t => [index('compile_runs_at_idx').on(t.at)],
)

/** A user's own labels for sorting their project list; other members never see them. */
export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: timestamps.createdAt,
  },
  t => [uniqueIndex('tags_user_name_idx').on(t.userId, t.name)],
)

export const projectTags = pgTable(
  'project_tags',
  {
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.tagId, t.projectId] }), index('project_tags_project_idx').on(t.projectId)],
)

export const projectRelations = relations(projects, ({ many, one }) => ({
  members: many(projectMembers),
  owner: one(user, { fields: [projects.ownerId], references: [user.id] }),
}))

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectMembers.userId], references: [user.id] }),
}))

/** WebDAV backups, attempted or done (the admin page lists the latest). */
export const backupRuns = pgTable(
  'backup_runs',
  {
    id: serial('id').primaryKey(),
    trigger: text('trigger', { enum: ['manual', 'schedule'] }).notNull(),
    status: text('status', { enum: ['running', 'success', 'failed'] }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    file: text('file'),
    bytes: bigint('bytes', { mode: 'number' }),
    projects: integer('projects'),
    error: text('error'),
  },
  t => [index('backup_runs_started_idx').on(t.startedAt)],
)

/** A person's Zotero connection (their API key, sealed with the instance secret). */
export const zoteroAccounts = pgTable('zotero_accounts', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  zoteroUserId: text('zotero_user_id').notNull(),
  username: text('username').notNull(),
  apiKey: text('api_key').notNull(),
  ...timestamps,
})

/**
 * A .bib file in a project made from a Zotero library or collection, so it
 * can be refreshed. Refreshing uses the Zotero connection of whoever linked it.
 */
export const referenceLinks = pgTable(
  'reference_links',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    /** user:<id> or group:<id> */
    library: text('library').notNull(),
    libraryName: text('library_name').notNull(),
    collectionKey: text('collection_key'),
    collectionName: text('collection_name'),
    format: text('format', { enum: ['bibtex', 'biblatex'] }).notNull(),
    items: integer('items').notNull().default(0),
    ...timestamps,
  },
  t => [primaryKey({ columns: [t.projectId, t.path] })],
)

/**
 * Personal access tokens for the Git bridge (git clone/pull/push over HTTP)
 * and AI tools over MCP. Only a SHA-256 of the token is kept; it is shown once when created.
 */
export const gitTokens = pgTable(
  'git_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    /** What it is for: the Git bridge, MCP, or both (tokens made before these existed: both). */
    uses: jsonb('uses').$type<('git' | 'mcp')[]>().notNull().default(['git', 'mcp']),
    /** Clone and pull only; MCP tools that change nothing (not even comments). */
    readOnly: boolean('read_only').notNull().default(false),
    /** null: every project of the person's. */
    projectIds: jsonb('project_ids').$type<string[]>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  t => [uniqueIndex('git_tokens_hash_idx').on(t.tokenHash), index('git_tokens_user_idx').on(t.userId)],
)

/**
 * Projects published as templates for everyone on this server. New projects
 * copy the project's files at the time; the entry goes with its project.
 */
export const projectTemplates = pgTable(
  'project_templates',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    publishedBy: text('published_by').references(() => user.id, { onDelete: 'set null' }),
    /** The field it is listed under in the new-project dialog (TemplateField). */
    field: text('field').notNull().default('general'),
    /**
     * Everyone on the server sees it (only the system administrator shares so;
     * templates published before groups existed kept it). Otherwise the
     * groups and people in template_groups and template_users, and its publisher.
     */
    everyone: boolean('everyone').notNull().default(true),
    ...timestamps,
  },
  t => [uniqueIndex('project_templates_project_idx').on(t.projectId)],
)

export const templateGroups = pgTable(
  'template_groups',
  {
    templateId: text('template_id')
      .notNull()
      .references(() => projectTemplates.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => userGroups.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.templateId, t.groupId] })],
)

export const templateUsers = pgTable(
  'template_users',
  {
    templateId: text('template_id')
      .notNull()
      .references(() => projectTemplates.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.templateId, t.userId] })],
)

/**
 * Files added from elsewhere (Overleaf's linked files): a URL, a file of
 * another project, or another project's PDF. Refreshing fetches the source
 * again; the row follows renames and goes when the file is deleted.
 */
export const linkedFiles = pgTable(
  'linked_files',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    kind: text('kind', { enum: ['url', 'project_file', 'project_output'] }).notNull(),
    url: text('url'),
    sourceProjectId: text('source_project_id').references(() => projects.id, { onDelete: 'set null' }),
    /** Kept for display after the source project is gone. */
    sourceProjectName: text('source_project_name'),
    sourcePath: text('source_path'),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  t => [primaryKey({ columns: [t.projectId, t.path] })],
)

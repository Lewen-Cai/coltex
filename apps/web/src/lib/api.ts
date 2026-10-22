import type {
  AiConversation,
  AiSaveProposedSkill,
  AiSkill,
  AiSkillBody,
  AiSkillImportResult,
  AiSkillSummary,
  InviteRole,
  ManagedUser,
  AiAdminState,
  AiApplyBody,
  AiApplyResult,
  AiLoginState,
  AiMessageBody,
  AiModelInfo,
  AiModelRef,
  AiSessionState,
  AiSettings,
  AiSettingsPatch,
  AiGroup,
  AiGroupBody,
  AiPreference,
  AiStatus,
  AiUsageReport,
  AiUserRow,
  CodePosition,
  InstanceInfo,
  NetworkInfo,
  CloudflareBody,
  CloudflareState,
  TailscaleState,
  ProjectTemplateState,
  LinkedFile,
  LinkedFileSource,
  TemplateInfo,
  AdminStats,
  HistoryFile,
  HistoryFileChange,
  HistoryLabel,
  ConvertAnalysis,
  ConvertReport,
  ConvertMetadata,
  ConvertOptions,
  ConvertTargetId,
  ShareRole,
  UserMatch,
  ReviewState,
  TrackChangesState,
  HistoryPage,
  ChatMessage,
  ChatPage,
  NotificationPage,
  MonitorHistory,
  MonitorRange,
  BackupConfig,
  BackupConfigPatch,
  BackupRun,
  BackupState,
  CompileRequest,
  CompileResult,
  LearnedWords,
  LearnedWordsImported,
  ProjectSources,
  ReplaceBody,
  ReplaceResult,
  DoiResult,
  ReferenceImportResult,
  ReferenceLink,
  ZoteroCollection,
  ZoteroLibrary,
  ZoteroStatus,
  CreatedGitToken,
  GitToken,
  PdfPosition,
  Invite,
  InviteInfo,
  ProjectMember,
  ProjectMeta,
  ProjectRole,
  ProjectSummary,
  Tag,
  ProjectTree,
} from '@coltex/shared'

/** Fired when the session has expired so the app can return to the sign-in screen. */
export const UNAUTHORIZED_EVENT = 'coltex:unauthorized'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** A file's bytes as base64, for JSON uploads. */
async function base64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    // Error messages are shown as the server sent them (English), in every interface language.
    throw new ApiError(res.status, (body as { error?: string }).error ?? `${res.status} ${res.statusText}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')
const filesUrl = (id: string, path: string) => `/api/projects/${id}/files/${encodePath(path)}`

export const api = {
  // ---- Accounts ----
  setupStatus: () => request<{ needsSetup: boolean }>('/api/setup'),
  setup: (body: { name: string; email: string; password: string }) => request<unknown>('/api/setup', json('POST', body)),
  inviteInfo: (token: string) => request<InviteInfo>(`/api/invites/${encodeURIComponent(token)}`),
  acceptInvite: (token: string, body: { name: string; email: string; password: string }) =>
    request<unknown>(`/api/invites/${encodeURIComponent(token)}/accept`, json('POST', body)),
  instance: () => request<InstanceInfo>('/api/instance'),
  listInvites: () => request<Invite[]>('/api/admin/invites'),
  createInvite: (body: { email?: string; role: InviteRole; expiresInDays: number; aiGroupId?: string | null }) =>
    request<{ invite: Invite; token: string }>('/api/admin/invites', json('POST', body)),
  revokeInvite: (id: string) => request<void>(`/api/admin/invites/${id}`, { method: 'DELETE' }),
  // Everyone for the system administrator; an admin's own team for them.
  managedUsers: () => request<ManagedUser[]>('/api/admin/users'),
  setUserPassword: (id: string, password: string) => request<void>(`/api/admin/users/${id}/password`, json('POST', { password })),
  suspendUser: (id: string, suspended: boolean) => request<void>(`/api/admin/users/${id}/suspended`, json('PUT', { suspended })),
  deleteUser: (id: string) => request<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  setUserRole: (id: string, role: InviteRole) => request<void>(`/api/admin/users/${id}/role`, json('PUT', { role })),
  setUserTeam: (id: string, managerId: string | null) => request<void>(`/api/admin/users/${id}/team`, json('PUT', { managerId })),

  // ---- Projects ----
  listProjects: () => request<ProjectSummary[]>('/api/projects'),

  createProject: (name: string, opts: { template?: string } = {}) =>
    request<ProjectMeta>('/api/projects', json('POST', { name, ...opts })),

  // ---- Linked files ----
  listLinkedFiles: (id: string) => request<LinkedFile[]>(`/api/projects/${id}/linked-files`),
  addLinkedFile: (id: string, path: string, source: LinkedFileSource) =>
    request<LinkedFile>(`/api/projects/${id}/linked-files`, json('POST', { path, source })),
  refreshLinkedFile: (id: string, path: string) => request<LinkedFile>(`/api/projects/${id}/linked-files/refresh`, json('POST', { path })),

  // ---- Templates ----
  listTemplates: () => request<TemplateInfo[]>('/api/templates'),
  removeTemplate: (id: string) => request<void>(`/api/templates/${id}`, { method: 'DELETE' }),
  getProjectTemplate: (id: string) => request<ProjectTemplateState>(`/api/projects/${id}/template`),
  publishTemplate: (id: string, body: { name: string; description: string }) =>
    request<ProjectTemplateState>(`/api/projects/${id}/template`, json('PUT', body)),
  unpublishTemplate: (id: string) => request<void>(`/api/projects/${id}/template`, { method: 'DELETE' }),

  /** Import a zip (e.g. Overleaf "Download Source") as a new project. */
  importProject: (file: File, name: string) =>
    request<{ project: ProjectMeta; warnings: string[] }>(`/api/projects/import?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/zip' },
      body: file,
    }),

  downloadUrl: (id: string) => `/api/projects/${id}/download.zip`,

  getProject: (id: string) =>
    request<ProjectTree & { project: ProjectMeta; role: ProjectRole; docs: { id: string; path: string }[] }>(
      `/api/projects/${id}`,
    ),

  updateProject: (id: string, patch: Partial<Pick<ProjectMeta, 'name' | 'rootFile' | 'engine' | 'spellCheckLanguage'>>) =>
    request<ProjectMeta>(`/api/projects/${id}`, json('PATCH', patch)),

  listMembers: (id: string) => request<ProjectMember[]>(`/api/projects/${id}/members`),
  addMember: (id: string, email: string, role: Exclude<ProjectRole, 'owner'>) =>
    request<ProjectMember>(`/api/projects/${id}/members`, json('POST', { email, role })),
  setMemberRole: (id: string, userId: string, role: Exclude<ProjectRole, 'owner'>) =>
    request<void>(`/api/projects/${id}/members/${encodeURIComponent(userId)}`, json('PATCH', { role })),
  removeMember: (id: string, userId: string) =>
    request<void>(`/api/projects/${id}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  /** Archive or trash projects in my list (or bring them back); set exactly one. */
  setProjectState: (projectIds: string[], state: { archived: boolean } | { trashed: boolean }) =>
    request<void>('/api/me/projects', json('PATCH', { projectIds, ...state })),

  // ---- Tags (per user) ----
  listTags: () => request<Tag[]>('/api/me/tags'),
  createTag: (name: string, color: string) => request<Tag>('/api/me/tags', json('POST', { name, color })),
  updateTag: (id: string, patch: { name?: string; color?: string }) => request<void>(`/api/me/tags/${id}`, json('PATCH', patch)),
  deleteTag: (id: string) => request<void>(`/api/me/tags/${id}`, { method: 'DELETE' }),
  tagProjects: (id: string, projectIds: string[]) => request<void>(`/api/me/tags/${id}/projects`, json('POST', { projectIds })),
  untagProjects: (id: string, projectIds: string[]) => request<void>(`/api/me/tags/${id}/projects`, json('DELETE', { projectIds })),

  /** A copy of the project (files and settings) owned by the caller. */
  copyProject: (id: string, name: string) => request<ProjectMeta>(`/api/projects/${id}/copy`, json('POST', { name })),

  deleteProject: (id: string) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  readText: async (id: string, path: string) => {
    const res = await fetch(filesUrl(id, path))
    if (!res.ok) throw new ApiError(res.status, `Failed to read ${path}`)
    return res.text()
  },

  /** With `createOnly`, the server answers 409 instead of overwriting an existing file. */
  writeFile: (id: string, path: string, content: string | Blob, opts: { createOnly?: boolean } = {}) =>
    request<void>(`${filesUrl(id, path)}${opts.createOnly ? '?create=true' : ''}`, {
      method: 'PUT',
      headers: { 'content-type': typeof content === 'string' ? 'text/plain; charset=utf-8' : 'application/octet-stream' },
      body: content,
    }),

  deleteFile: (id: string, path: string) => request<void>(filesUrl(id, path), { method: 'DELETE' }),

  createFolder: (id: string, path: string) => request<void>(`/api/projects/${id}/folders`, json('POST', { path })),

  deleteFolder: (id: string, path: string) =>
    request<void>(`/api/projects/${id}/folders/${encodePath(path)}`, { method: 'DELETE' }),

  /** Move or rename a file or folder; 409 if the target exists. */
  move: (id: string, from: string, to: string) => request<void>(`/api/projects/${id}/move`, json('POST', { from, to })),

  fileUrl: (id: string, path: string) => filesUrl(id, path),

  /** The collaborative document id for a text file (stable across renames). */
  resolveDoc: (id: string, path: string) =>
    request<{ docId: string }>(`/api/projects/${id}/docs/resolve?path=${encodeURIComponent(path)}`),

  compile: (id: string, options: Partial<CompileRequest> = {}) =>
    request<CompileResult>(`/api/projects/${id}/compile`, json('POST', options)),

  /** Current text of the project's .tex files, after flushing live edits (for the word count). */
  projectSources: (id: string, include: 'tex' | 'text' = 'tex') =>
    request<ProjectSources>(`/api/projects/${id}/sources${include === 'text' ? '?include=text' : ''}`),
  // Git bridge tokens (the token itself only comes back when created).
  gitTokens: () => request<GitToken[]>('/api/me/git-tokens'),
  createGitToken: (name: string) => request<CreatedGitToken>('/api/me/git-tokens', json('POST', { name })),
  revokeGitToken: (id: string) => request<void>(`/api/me/git-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // References: the person's Zotero connection, and a project's .bib files from Zotero or DOIs.
  zoteroStatus: () => request<ZoteroStatus>('/api/me/zotero'),
  connectZotero: (apiKey: string) => request<ZoteroStatus>('/api/me/zotero', json('PUT', { apiKey })),
  disconnectZotero: () => request<void>('/api/me/zotero', { method: 'DELETE' }),
  zoteroLibraries: () => request<ZoteroLibrary[]>('/api/me/zotero/libraries'),
  zoteroCollections: (library: string) =>
    request<ZoteroCollection[]>(`/api/me/zotero/collections?library=${encodeURIComponent(library)}`),
  referenceLinks: (id: string) => request<ReferenceLink[]>(`/api/projects/${id}/references`),
  importZotero: (id: string, body: { library: string; collection?: string; path: string; format: 'bibtex' | 'biblatex' }) =>
    request<ReferenceImportResult>(`/api/projects/${id}/references/zotero`, json('POST', body)),
  refreshReferences: (id: string, path: string) =>
    request<ReferenceImportResult>(`/api/projects/${id}/references/refresh`, json('POST', { path })),
  unlinkReferences: (id: string, path: string) => request<void>(`/api/projects/${id}/references/unlink`, json('POST', { path })),
  addDoi: (id: string, doi: string, path: string) => request<DoiResult>(`/api/projects/${id}/references/doi`, json('POST', { id: doi, path })),
  /** Project-wide replace; files whose text changed since the search are skipped. */
  replaceInProject: (id: string, body: ReplaceBody) => request<ReplaceResult>(`/api/projects/${id}/replace`, json('POST', body)),

  // ---- Notifications ----
  notifications: (opts: { before?: string; unread?: boolean } = {}) => {
    const q = new URLSearchParams()
    if (opts.before) q.set('before', opts.before)
    if (opts.unread) q.set('unread', 'true')
    return request<NotificationPage>(`/api/me/notifications${q.size ? `?${q}` : ''}`)
  },
  markNotificationsRead: (ids?: string[], read = true) => request<{ unread: number }>('/api/me/notifications/read', json('POST', { ids, read })),
  notificationsSeen: (projectId: string, threadId?: string) => request<void>('/api/me/notifications/seen', json('POST', { projectId, threadId })),
  notificationEventsUrl: () => '/api/me/notifications/events',

  // ---- Project chat ----
  chat: (id: string, before?: string) =>
    request<ChatPage>(`/api/projects/${id}/chat${before ? `?before=${encodeURIComponent(before)}` : ''}`),
  sendChat: (id: string, content: string) => request<ChatMessage>(`/api/projects/${id}/chat`, json('POST', { content })),
  editChat: (id: string, messageId: string, content: string) =>
    request<void>(`/api/projects/${id}/chat/${messageId}`, json('PATCH', { content })),
  deleteChat: (id: string, messageId: string) => request<void>(`/api/projects/${id}/chat/${messageId}`, { method: 'DELETE' }),

  // ---- Spelling dictionary (per user) ----
  learnedWords: () => request<LearnedWords>('/api/me/dictionary'),
  learnWord: (word: string) => request<void>('/api/me/dictionary', json('POST', { word })),
  unlearnWord: (word: string) => request<void>('/api/me/dictionary', json('DELETE', { word })),
  importWords: (words: string[]) => request<LearnedWordsImported>('/api/me/dictionary/import', json('POST', { words })),
  clearDictionary: () => request<void>('/api/me/dictionary/all', { method: 'DELETE' }),

  synctexToPdf: (id: string, buildId: string, pos: { file: string; line: number; column: number }) =>
    request<{ positions: PdfPosition[] }>(
      `/api/projects/${id}/builds/${buildId}/synctex/pdf?${new URLSearchParams({
        file: pos.file,
        line: String(pos.line),
        column: String(pos.column),
      })}`,
    ),

  synctexToCode: (id: string, buildId: string, pos: { page: number; h: number; v: number }) =>
    request<{ position: CodePosition | null }>(
      `/api/projects/${id}/builds/${buildId}/synctex/code?${new URLSearchParams({
        page: String(pos.page),
        h: pos.h.toFixed(2),
        v: pos.v.toFixed(2),
      })}`,
    ),

  buildUrl: (id: string, buildId: string, name: string) => `/api/projects/${id}/builds/${buildId}/${name}`,

  adminStats: () => request<AdminStats>('/api/admin/stats'),
  adminNetwork: () => request<NetworkInfo>('/api/admin/network'),
  cloudflare: (body: CloudflareBody) => request<CloudflareState>('/api/admin/network/cloudflare', json('PUT', body)),
  tailscaleEnable: (enabled: boolean) => request<TailscaleState>('/api/admin/network/tailscale', json('PUT', { enabled })),
  tailscaleLogin: () => request<TailscaleState>('/api/admin/network/tailscale/login', json('POST', {})),
  tailscaleLogout: () => request<void>('/api/admin/network/tailscale/logout', json('POST', {})),
  tailscaleServe: (enabled: boolean) => request<TailscaleState>('/api/admin/network/tailscale/serve', json('PUT', { enabled })),
  adminHistory: (range: MonitorRange) => request<MonitorHistory>(`/api/admin/stats/history?range=${range}`),
  backup: () => request<BackupState>('/api/admin/backup'),
  saveBackup: (patch: BackupConfigPatch) => request<BackupConfig>('/api/admin/backup', json('PUT', patch)),
  testBackup: (patch: BackupConfigPatch) => request<{ ok: true }>('/api/admin/backup/test', json('POST', patch)),
  runBackup: () => request<BackupRun>('/api/admin/backup/run', json('POST', {})),

  // ---- AI assistant ----
  aiStatus: () => request<AiStatus>('/api/ai/status'),
  aiSetPreference: (pick: AiPreference) => request<AiStatus>('/api/ai/preference', json('PUT', pick)),
  aiSession: (id: string) => request<AiSessionState>(`/api/projects/${id}/ai/session`),
  aiEventsUrl: (id: string) => `/api/projects/${id}/ai/session/events`,
  aiSend: (id: string, body: AiMessageBody) => request<{ ok: true }>(`/api/projects/${id}/ai/session/messages`, json('POST', body)),
  aiAbort: (id: string) => request<{ ok: true }>(`/api/projects/${id}/ai/session/abort`, json('POST', {})),
  aiReset: (id: string) => request<AiSessionState>(`/api/projects/${id}/ai/session/reset`, json('POST', {})),
  aiDiscard: (id: string) => request<{ ok: true }>(`/api/projects/${id}/ai/session/discard`, json('POST', {})),
  aiCompact: (id: string, preference?: AiPreference) => request<{ ok: true }>(`/api/projects/${id}/ai/session/compact`, json('POST', { preference })),
  aiConversations: (id: string) => request<AiConversation[]>(`/api/projects/${id}/ai/conversations`),
  aiOpenConversation: (id: string, conversation: string) => request<AiSessionState>(`/api/projects/${id}/ai/conversations/${conversation}/open`, json('POST', {})),
  aiRenameConversation: (id: string, conversation: string, title: string) => request<void>(`/api/projects/${id}/ai/conversations/${conversation}`, json('PUT', { title })),
  aiDeleteConversation: (id: string, conversation: string) => request<void>(`/api/projects/${id}/ai/conversations/${conversation}`, { method: 'DELETE' }),
  aiApply: (id: string, body: AiApplyBody) => request<AiApplyResult>(`/api/projects/${id}/ai/session/apply`, json('POST', body)),
  aiUndo: (id: string) =>
    request<{ message: string; compile: CompileResult }>(`/api/projects/${id}/ai/session/undo`, json('POST', {})),
  aiSaveProposedSkill: (id: string, item: string, body: AiSaveProposedSkill) =>
    request<AiSkill>(`/api/projects/${id}/ai/session/skills/${item}`, json('POST', body)),

  // ---- AI skills: `base` is /api/me/ai/skills (personal) or /api/projects/:id/ai/skills ----
  skillMenu: (id: string) => request<AiSkillSummary[]>(`/api/projects/${id}/ai/skill-menu`),

  // ---- The skills chat (Settings → AI skills) ----
  skillChatEventsUrl: '/api/me/ai/skill-chat/events',
  skillChatSend: (body: AiMessageBody) => request<{ ok: true }>('/api/me/ai/skill-chat/messages', json('POST', body)),
  skillChatAbort: () => request<{ ok: true }>('/api/me/ai/skill-chat/abort', json('POST', {})),
  skillChatReset: () => request<AiSessionState>('/api/me/ai/skill-chat/reset', json('POST', {})),
  skillChatSave: (item: string, body: AiSaveProposedSkill) => request<AiSkill>(`/api/me/ai/skill-chat/skills/${item}`, json('POST', body)),
  skills: (base: string) => request<AiSkill[]>(base),
  createSkill: (base: string, body: AiSkillBody) => request<AiSkill>(base, json('POST', body)),
  updateSkill: (base: string, name: string, body: AiSkillBody) => request<AiSkill>(`${base}/${name}`, json('PUT', body)),
  deleteSkill: (base: string, name: string) => request<{ ok: true }>(`${base}/${name}`, { method: 'DELETE' }),
  skillDownloadUrl: (base: string, name: string) => `${base}/${name}/download`,
  skillFile: async (base: string, name: string, path: string) => {
    const res = await fetch(`${base}/${name}/files/${path.split('/').map(encodeURIComponent).join('/')}`)
    if (!res.ok) throw new ApiError(res.status, `Failed to read ${path}`)
    return res.text()
  },
  /** A SKILL.md goes as text, a zip as the file itself. */
  /** One zip, or the files of one or more skills (picked one by one or as a folder, paths kept). */
  importSkills: async (base: string, picked: File[], replace: boolean) => {
    const relative = (f: File) => f.webkitRelativePath || f.name
    // A folder can hold a whole .git; the server skips the same clutter.
    const files = picked.filter(f => !/(^|\/)(\.git|__MACOSX)(\/|$)|(^|\/)(\.DS_Store|Thumbs\.db)$/.test(relative(f)))
    if (!files.length) throw new Error('No SKILL.md found')
    const zip = files.length === 1 && /\.zip$/i.test(files[0]!.name)
    if (!zip && files.some(f => /\.zip$/i.test(f.name))) throw new Error('Upload a zip on its own')
    const filename = zip ? files[0]!.name : (relative(files[0]!).split('/').length > 1 ? relative(files[0]!).split('/')[0]! : files[0]!.name)
    const query = `?filename=${encodeURIComponent(filename)}&replace=${replace ? 1 : 0}`
    if (zip) {
      return request<AiSkillImportResult>(`${base}/import${query}`, { method: 'POST', headers: { 'content-type': 'application/zip' }, body: files[0] })
    }
    const encoded = await Promise.all(files.map(async f => ({ path: relative(f), data: await base64(f) })))
    return request<AiSkillImportResult>(`${base}/import${query}`, json('POST', { files: encoded }))
  },

  // ---- AI administration ----
  aiAdmin: () => request<AiAdminState>('/api/admin/ai'),
  aiUpdateSettings: (patch: AiSettingsPatch) => request<AiSettings>('/api/admin/ai/settings', json('PUT', patch)),
  aiModels: () => request<AiModelInfo[]>('/api/admin/ai/models'),
  aiLogin: (provider: string, type: 'api_key' | 'oauth') =>
    request<AiLoginState>(`/api/admin/ai/providers/${encodeURIComponent(provider)}/login`, json('POST', { type })),
  aiLoginState: (login: string) => request<AiLoginState>(`/api/admin/ai/logins/${login}`),
  aiLoginAnswer: (login: string, promptId: string, value: string) =>
    request<AiLoginState>(`/api/admin/ai/logins/${login}/answer`, json('POST', { promptId, value })),
  aiLoginCancel: (login: string) => request<AiLoginState>(`/api/admin/ai/logins/${login}/cancel`, json('POST', {})),
  aiLogout: (provider: string) =>
    request<void>(`/api/admin/ai/providers/${encodeURIComponent(provider)}/credential`, { method: 'DELETE' }),
  aiTest: (model: AiModelRef) => request<{ ok: boolean; message: string; ms: number }>('/api/admin/ai/test', json('POST', model)),
  aiUsage: (days = 30, userId?: string) =>
    request<AiUsageReport>(`/api/admin/ai/usage?days=${days}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`),
  aiUsers: (days = 30) => request<AiUserRow[]>(`/api/admin/ai/users?days=${days}`),
  aiGroups: () => request<AiGroup[]>('/api/admin/ai/groups'),
  aiCreateGroup: (body: AiGroupBody) => request<AiGroup>('/api/admin/ai/groups', json('POST', body)),
  aiUpdateGroup: (id: string, body: AiGroupBody) => request<AiGroup>(`/api/admin/ai/groups/${id}`, json('PUT', body)),
  aiDeleteGroup: (id: string) => request<void>(`/api/admin/ai/groups/${id}`, { method: 'DELETE' }),
  aiSetUserGroup: (userId: string, groupId: string | null) =>
    request<{ ok: true }>(`/api/admin/ai/users/${encodeURIComponent(userId)}/group`, json('PUT', { groupId })),

  // ---- Version history ----
  history: (id: string, before?: string) =>
    request<HistoryPage>(`/api/projects/${id}/history?limit=50${before ? `&before=${before}` : ''}`),
  historyCompare: (id: string, version: string, from?: string) =>
    request<{ changes: HistoryFileChange[] }>(`/api/projects/${id}/history/${version}/compare${from ? `?from=${from}` : ''}`),
  historyFiles: (id: string, version: string) =>
    request<{ files: { path: string; size: number }[] }>(`/api/projects/${id}/history/${version}/files`),
  historyFile: (id: string, version: string, path: string) =>
    request<HistoryFile>(`/api/projects/${id}/history/${version}/file?path=${encodeURIComponent(path)}`),
  historyRawUrl: (id: string, version: string, path: string, inline = false) =>
    `/api/projects/${id}/history/${version}/raw?path=${encodeURIComponent(path)}${inline ? '&inline=true' : ''}`,
  historyZipUrl: (id: string, version: string) => `/api/projects/${id}/history/${version}/download.zip`,
  historyRestore: (id: string, version: string, paths?: string[]) =>
    request<{ versionId: string }>(`/api/projects/${id}/history/${version}/restore`, json('POST', paths ? { paths } : {})),
  historyRevert: (id: string, version: string) =>
    request<{ versionId: string }>(`/api/projects/${id}/history/${version}/revert`, json('POST', {})),
  historyCommit: (id: string, message: string) =>
    request<{ versionId: string; created: boolean }>(`/api/projects/${id}/history/commit`, json('POST', { message })),
  historyLabel: (id: string, name: string, versionId?: string) =>
    request<HistoryLabel>(`/api/projects/${id}/history/labels`, json('POST', { name, versionId })),
  historyDeleteLabel: (id: string, label: number) =>
    request<void>(`/api/projects/${id}/history/labels/${label}`, { method: 'DELETE' }),

  // ---- Sharing and ownership ----
  searchUsers: (q: string) => request<UserMatch[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
  transferOwnership: (id: string, userId: string) => request<void>(`/api/projects/${id}/transfer`, json('POST', { userId })),

  // ---- Journal template conversion ----
  analyzeConvert: (id: string) => request<ConvertAnalysis>(`/api/projects/${id}/convert`),
  convert: (id: string, body: { target: ConvertTargetId; name: string; metadata: ConvertMetadata; options: ConvertOptions }) =>
    request<ConvertReport>(`/api/projects/${id}/convert`, json('POST', body)),

  // ---- Review: comments and tracked changes ----
  review: (id: string) => request<ReviewState>(`/api/projects/${id}/review`),
  setTrackChanges: (id: string, state: TrackChangesState) =>
    request<TrackChangesState>(`/api/projects/${id}/review/track-changes`, json('PUT', state)),
  createThread: (id: string, body: { docId: string; start: object; end: object; content: string }) =>
    request<{ id: string }>(`/api/projects/${id}/review/threads`, json('POST', body)),
  replyThread: (id: string, thread: string, content: string) =>
    request<void>(`/api/projects/${id}/review/threads/${thread}/messages`, json('POST', { content })),
  editMessage: (id: string, thread: string, message: string, content: string) =>
    request<void>(`/api/projects/${id}/review/threads/${thread}/messages/${message}`, json('PATCH', { content })),
  deleteMessage: (id: string, thread: string, message: string) =>
    request<void>(`/api/projects/${id}/review/threads/${thread}/messages/${message}`, { method: 'DELETE' }),
  resolveThread: (id: string, thread: string, resolved: boolean) =>
    request<void>(`/api/projects/${id}/review/threads/${thread}/resolve`, json('POST', { resolved })),
  deleteThread: (id: string, thread: string) =>
    request<void>(`/api/projects/${id}/review/threads/${thread}`, { method: 'DELETE' }),
  decideChanges: (id: string, decision: 'accept' | 'reject', target: { docId?: string; ids?: string[] } = {}) =>
    request<{ count: number; undoId: string | null }>(`/api/projects/${id}/review/changes/${decision}`, json('POST', target)),
  undoDecision: (id: string, undoId: string) => request<{ count: number }>(`/api/projects/${id}/review/changes/undo`, json('POST', { undoId })),
}

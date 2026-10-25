import { z } from 'zod'

export const COMPILE_QUEUE = 'compile'
/** Valkey hash where each compiler worker reports its container's memory (field: hostname). */
export const COMPILER_RESOURCES_KEY = 'coltex:compiler:resources'

export const Engine = z.enum(['pdflatex', 'xelatex', 'lualatex'])
export type Engine = z.infer<typeof Engine>
/** A project's compiler setting: an engine, or 'auto' (picked at each build from the preamble). */
export const EngineSetting = z.enum(['auto', ...Engine.options])
export type EngineSetting = z.infer<typeof EngineSetting>

export const ProjectId = z.string().regex(/^[A-Za-z0-9_-]{8,32}$/)

/**
 * owner > editor > reviewer > viewer. Reviewers comment and suggest changes
 * (their edits are always tracked, enforced by the server); viewers read and comment.
 */
export const ProjectRole = z.enum(['owner', 'editor', 'reviewer', 'viewer'])
export type ProjectRole = z.infer<typeof ProjectRole>

/**
 * Spell-check languages: Overleaf's list of Hunspell dictionaries that run in
 * the browser (`dic` names the files in @overleaf/dictionaries). `name` is
 * the English fallback; the web app shows names in the interface language.
 */
export const SPELL_CHECK_LANGUAGES = [
  { code: 'en_US', dic: 'en_US', name: 'English (American)' },
  { code: 'en_GB', dic: 'en_GB', name: 'English (British)' },
  { code: 'en_CA', dic: 'en_CA', name: 'English (Canadian)' },
  { code: 'en_AU', dic: 'en_AU', name: 'English (Australian)' },
  { code: 'en_ZA', dic: 'en_ZA', name: 'English (South African)' },
  { code: 'af', dic: 'af_ZA', name: 'Afrikaans' },
  { code: 'an', dic: 'an_ES', name: 'Aragonese' },
  { code: 'ar', dic: 'ar', name: 'Arabic' },
  { code: 'be_BY', dic: 'be_BY', name: 'Belarusian' },
  { code: 'eu', dic: 'eu', name: 'Basque' },
  { code: 'bn_BD', dic: 'bn_BD', name: 'Bengali' },
  { code: 'bs_BA', dic: 'bs_BA', name: 'Bosnian' },
  { code: 'br', dic: 'br_FR', name: 'Breton' },
  { code: 'bg', dic: 'bg_BG', name: 'Bulgarian' },
  { code: 'ca', dic: 'ca', name: 'Catalan' },
  { code: 'hr', dic: 'hr_HR', name: 'Croatian' },
  { code: 'cs', dic: 'cs_CZ', name: 'Czech' },
  { code: 'da', dic: 'da_DK', name: 'Danish' },
  { code: 'nl', dic: 'nl', name: 'Dutch' },
  { code: 'dz', dic: 'dz', name: 'Dzongkha' },
  { code: 'eo', dic: 'eo', name: 'Esperanto' },
  { code: 'et', dic: 'et_EE', name: 'Estonian' },
  { code: 'fo', dic: 'fo', name: 'Faroese' },
  { code: 'fr', dic: 'fr', name: 'French' },
  { code: 'gl', dic: 'gl_ES', name: 'Galician' },
  { code: 'de', dic: 'de_DE', name: 'German' },
  { code: 'de_AT', dic: 'de_AT', name: 'German (Austria)' },
  { code: 'de_CH', dic: 'de_CH', name: 'German (Switzerland)' },
  { code: 'el', dic: 'el_GR', name: 'Greek' },
  { code: 'gug_PY', dic: 'gug_PY', name: 'Guarani' },
  { code: 'gu_IN', dic: 'gu_IN', name: 'Gujarati' },
  { code: 'he_IL', dic: 'he_IL', name: 'Hebrew' },
  { code: 'hi_IN', dic: 'hi_IN', name: 'Hindi' },
  { code: 'hu_HU', dic: 'hu_HU', name: 'Hungarian' },
  { code: 'is_IS', dic: 'is_IS', name: 'Icelandic' },
  { code: 'id', dic: 'id_ID', name: 'Indonesian' },
  { code: 'ga', dic: 'ga_IE', name: 'Irish' },
  { code: 'it', dic: 'it_IT', name: 'Italian' },
  { code: 'kk', dic: 'kk_KZ', name: 'Kazakh' },
  { code: 'ko', dic: 'ko', name: 'Korean' },
  { code: 'kmr', dic: 'kmr_Latn', name: 'Kurmanji' },
  { code: 'lv', dic: 'lv_LV', name: 'Latvian' },
  { code: 'lt', dic: 'lt_LT', name: 'Lithuanian' },
  { code: 'lo_LA', dic: 'lo_LA', name: 'Laotian' },
  { code: 'ml_IN', dic: 'ml_IN', name: 'Malayalam' },
  { code: 'mn_MN', dic: 'mn_MN', name: 'Mongolian' },
  { code: 'ne_NP', dic: 'ne_NP', name: 'Nepali' },
  { code: 'nb_NO', dic: 'nb_NO', name: 'Norwegian (Bokmål)' },
  { code: 'nn_NO', dic: 'nn_NO', name: 'Norwegian (Nynorsk)' },
  { code: 'oc_FR', dic: 'oc_FR', name: 'Occitan' },
  { code: 'fa', dic: 'fa_IR', name: 'Persian' },
  { code: 'pl', dic: 'pl_PL', name: 'Polish' },
  { code: 'pt_BR', dic: 'pt_BR', name: 'Portuguese (Brazilian)' },
  { code: 'pt_PT', dic: 'pt_PT', name: 'Portuguese (European)' },
  { code: 'ro', dic: 'ro_RO', name: 'Romanian' },
  { code: 'ru', dic: 'ru_RU', name: 'Russian' },
  { code: 'gd_GB', dic: 'gd_GB', name: 'Scottish Gaelic' },
  { code: 'sr_RS', dic: 'sr_RS', name: 'Serbian' },
  { code: 'si_LK', dic: 'si_LK', name: 'Sinhala' },
  { code: 'sk', dic: 'sk_SK', name: 'Slovak' },
  { code: 'sl', dic: 'sl_SI', name: 'Slovenian' },
  { code: 'es', dic: 'es_ES', name: 'Spanish' },
  { code: 'sw_TZ', dic: 'sw_TZ', name: 'Swahili' },
  { code: 'sv', dic: 'sv_SE', name: 'Swedish' },
  { code: 'tl', dic: 'tl', name: 'Tagalog' },
  { code: 'te_IN', dic: 'te_IN', name: 'Telugu' },
  { code: 'th_TH', dic: 'th_TH', name: 'Thai' },
  { code: 'bo', dic: 'bo', name: 'Tibetan' },
  { code: 'tr_TR', dic: 'tr_TR', name: 'Turkish' },
  { code: 'uk_UA', dic: 'uk_UA', name: 'Ukrainian' },
  { code: 'uz_UZ', dic: 'uz_UZ', name: 'Uzbek' },
  { code: 'vi_VN', dic: 'vi_VN', name: 'Vietnamese' },
] as const
export type SpellCheckLanguageCode = (typeof SPELL_CHECK_LANGUAGES)[number]['code']
const spellCodes = SPELL_CHECK_LANGUAGES.map(l => l.code) as [SpellCheckLanguageCode, ...SpellCheckLanguageCode[]]
/** A project's spell-check language; '' turns spell checking off. */
export const SpellCheckLanguage = z.union([z.enum(spellCodes), z.literal('')])
export type SpellCheckLanguage = z.infer<typeof SpellCheckLanguage>

export const ProjectMeta = z.object({
  id: ProjectId,
  name: z.string().min(1).max(200),
  rootFile: z.string().min(1),
  engine: EngineSetting,
  spellCheckLanguage: SpellCheckLanguage,
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ProjectMeta = z.infer<typeof ProjectMeta>

/** A project as seen by the current user. */
export const ProjectSummary = ProjectMeta.extend({
  role: ProjectRole,
  ownerName: z.string(),
  /** Everyone with access, including the owner. */
  memberCount: z.number(),
  /** The current user's own organisation of their list (other members don't see it). */
  archived: z.boolean(),
  trashed: z.boolean(),
  tagIds: z.array(z.string()),
})
export type ProjectSummary = z.infer<typeof ProjectSummary>

export const ProjectMember = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: ProjectRole,
  /** Set when they have the project through a group it is shared with, not on their own. */
  viaGroup: z.object({ id: z.string(), name: z.string() }).nullable(),
})
export type ProjectMember = z.infer<typeof ProjectMember>

// ---------------------------------------------------------------------------
// Groups (Settings → Groups): named groups of people, joined by accepting an
// invitation; projects and templates can be shared with them
// ---------------------------------------------------------------------------

export const GroupName = z.string().trim().min(1).max(80)

export const GroupMember = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['owner', 'member']),
  status: z.enum(['invited', 'joined']),
})
export type GroupMember = z.infer<typeof GroupMember>

/** A group as one of its people sees it (members listed for those who joined). */
export const Group = z.object({
  id: z.string(),
  name: z.string(),
  /** This person's place in it. */
  role: z.enum(['owner', 'member']),
  status: z.enum(['invited', 'joined']),
  invitedBy: z.object({ id: z.string().nullable(), name: z.string() }).nullable(),
  members: z.array(GroupMember),
  createdAt: z.string(),
})
export type Group = z.infer<typeof Group>

export const GroupInviteBody = z.object({ userId: z.string().min(1) })

/** A group a project is shared with, and the role its members get. */
export const ProjectGroupShare = z.object({
  groupId: z.string(),
  name: z.string(),
  role: ProjectRole.exclude(['owner']),
  members: z.number(),
})
export type ProjectGroupShare = z.infer<typeof ProjectGroupShare>

export const AddMemberBody = z.object({
  email: z.email(),
  role: ProjectRole.exclude(['owner']),
})

/**
 * Accounts: members (`user`); admins (`manager`), who each lead a team of the
 * members they invite and manage only them; and the one system administrator
 * (`admin`), who runs the whole instance.
 */
export const UserRole = z.enum(['user', 'manager', 'admin'])
export type UserRole = z.infer<typeof UserRole>

/** What an invitation can make someone: never the system administrator (there is only one). */
export const InviteRole = z.enum(['user', 'manager'])
export type InviteRole = z.infer<typeof InviteRole>

/** An account as the users page shows it: everyone for the system administrator, an admin's own team for them. */
export const ManagedUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: UserRole,
  banned: z.boolean(),
  createdAt: z.string(),
  /** The admin whose team they are in. */
  managerId: z.string().nullable(),
  /** Closed to unfamiliar addresses after failed sign-ins, until the system administrator unlocks it. */
  locked: z.boolean(),
  /** Two-step verification is on. */
  twoFactor: z.boolean(),
})
export type ManagedUser = z.infer<typeof ManagedUser>

export const SetPasswordBody = z.object({ password: z.string().min(1).max(256) })
export const SuspendBody = z.object({ suspended: z.boolean() })
export const SetRoleBody = z.object({ role: InviteRole })
export const SetTeamBody = z.object({ managerId: z.string().min(1).nullable() })

// ---- Sign-ins ----

/**
 * Where an address is: this machine, the local network, the tailnet, or a public address with
 * its place from the server's offline database (ip2region), when it has one: the country's ISO
 * code, and the region, city and network operator as the database writes them (in Chinese for
 * places in China). The web app names and translates them (lib/ip-places.ts).
 */
export const IpPlace = z.object({
  kind: z.enum(['loopback', 'lan', 'tailscale', 'public', 'unknown']),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  isp: z.string().optional(),
})
export type IpPlace = z.infer<typeof IpPlace>

/**
 * What happened: `success` (signed in, with `method`), `failure` (wrong password, or no such
 * account), `two_factor_failure` (wrong code), `refused` (not even checked: `reason` says why),
 * `locked` (too many failures from unfamiliar addresses), `unlocked` (by the system
 * administrator) and `ip_blocked` (an address that failed too often, blocked for a day).
 */
export const SignInOutcome = z.enum(['success', 'failure', 'two_factor_failure', 'refused', 'locked', 'unlocked', 'ip_blocked'])
export type SignInOutcome = z.infer<typeof SignInOutcome>
export const SignInMethod = z.enum(['password', 'totp', 'recovery_code'])
export type SignInMethod = z.infer<typeof SignInMethod>
/** Why an attempt was refused: waiting after failures, a locked account, a blocked address, no proof of work. */
export const SignInRefusal = z.enum(['cooldown', 'locked', 'ip_blocked', 'challenge'])
export type SignInRefusal = z.infer<typeof SignInRefusal>

export const SignInEvent = z.object({
  id: z.string(),
  at: z.string(),
  outcome: SignInOutcome,
  method: SignInMethod.nullable(),
  reason: SignInRefusal.nullable(),
  /** The account, when the email belongs to one (null also once it is deleted). */
  user: z.object({ id: z.string(), name: z.string() }).nullable(),
  /** The email typed in. */
  email: z.string(),
  ip: z.string().nullable(),
  place: IpPlace,
  /** The browser's user agent. */
  device: z.string().nullable(),
})
export type SignInEvent = z.infer<typeof SignInEvent>

/** Newest first; `before` (an event's `at`) pages back. */
export const SignInEventPage = z.object({ events: z.array(SignInEvent), hasMore: z.boolean() })
export type SignInEventPage = z.infer<typeof SignInEventPage>
export const SignInEventQuery = z.object({
  user: z.string().max(64).optional(),
  failed: z.stringbool().optional(),
  before: z.iso.datetime().optional(),
})

/** A device someone is signed in on (a session), as the system administrator sees it. */
export const AccountSession = z.object({
  id: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  ip: z.string().nullable(),
  place: IpPlace,
  device: z.string().nullable(),
  /** The session of whoever is looking. */
  current: z.boolean(),
})
export type AccountSession = z.infer<typeof AccountSession>

/** Accounts locked after failed sign-ins, and addresses blocked for a day. */
export const UnblockBody = z.object({ ip: z.string().min(2).max(64) })

export const SignInBlocks = z.object({
  accounts: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), lockedAt: z.string() })),
  addresses: z.array(z.object({ ip: z.string(), place: IpPlace, until: z.string() })),
})
export type SignInBlocks = z.infer<typeof SignInBlocks>

/** A proof-of-work challenge for the sign-in form (ALTCHA), asked for after a few failures. */
export const SignInChallenge = z.object({
  algorithm: z.string(),
  challenge: z.string(),
  maxnumber: z.number(),
  salt: z.string(),
  signature: z.string(),
})
export type SignInChallenge = z.infer<typeof SignInChallenge>

/**
 * Account password rules, the same in the browser (a checklist while typing)
 * and on the server (every password that gets hashed). Symbols are optional;
 * they only raise the strength rating.
 */
export const PASSWORD_RULES = {
  length: (p: string) => p.length >= 8,
  lower: (p: string) => /[a-z]/.test(p),
  upper: (p: string) => /[A-Z]/.test(p),
  digit: (p: string) => /\d/.test(p),
} as const
export type PasswordRule = keyof typeof PASSWORD_RULES

export const PASSWORD_PROBLEM = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number'

/** The error for a password that breaks a rule (English, as all errors), else undefined. */
export function passwordProblem(p: string): string | undefined {
  if (p.length > 128) return 'Password must be at most 128 characters'
  return Object.values(PASSWORD_RULES).every(rule => rule(p)) ? undefined : PASSWORD_PROBLEM
}

// Runs of one character, keyboard rows and counting sequences, or the usual words.
const WEAK_PATTERN = /(.)\1\1|0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|zxcv|password|passwort|letmein|welcome|admin|coltex/i

/**
 * Points for the strength bar, one per thing the password has, so the bar
 * fills step by step while typing: each of the four rules, 12 or more
 * characters, and a symbol or 16 or more characters. Once every rule is met,
 * a predictable pattern costs a point (never below 4).
 */
export function passwordScore(p: string): number {
  if (!p) return 0
  const met = Object.values(PASSWORD_RULES).filter(rule => rule(p)).length
  if (met < 4 || p.length > 128) return Math.min(met, 3)
  const points = 4 + Number(p.length >= 12) + Number(/[^A-Za-z0-9]/.test(p) || p.length >= 16) - Number(WEAK_PATTERN.test(p))
  return Math.max(4, points)
}
export const PASSWORD_SCORE_MAX = 6

/** 0 empty, 1 weak (breaks a rule), 2 fair (meets them all), 3 good, 4 strong. */
export function passwordStrength(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0
  if (passwordProblem(p)) return 1
  return (passwordScore(p) - 2) as 2 | 3 | 4
}

export const Password = z.string().superRefine((p, ctx) => {
  const problem = passwordProblem(p)
  if (problem) ctx.addIssue({ code: 'custom', message: problem })
})

/** Where this server is reached (COLTEX_URL). Links people pass on (invitations, share links, git) are built from it. */
/**
 * An address ColTex can be reached at, for links people pass on. env:
 * COLTEX_URL; tailnet: the built-in
 * Tailscale while it serves ColTex; cloudflare: the built-in Cloudflare
 * Tunnel's public addresses while connected. The browser adds the address it
 * is using.
 */
export const LinkAddress = z.object({ kind: z.enum(['env', 'tailnet', 'cloudflare']), url: z.string(), label: z.string() })
export type LinkAddress = z.infer<typeof LinkAddress>

export const InstanceInfo = z.object({ addresses: z.array(LinkAddress) })
export type InstanceInfo = z.infer<typeof InstanceInfo>

/**
 * The server's built-in Tailscale (tailscaled run by the server), as its
 * LocalAPI reports it. unavailable: tailscaled isn't installed here; off:
 * not turned on.
 */
export const TailscaleState = z.object({
  state: z.enum(['unavailable', 'off', 'starting', 'needs-login', 'needs-approval', 'stopped', 'running', 'error']),
  /** Turned on in Settings → Network (it runs whenever the server does). */
  enabled: z.boolean(),
  /** Where to sign this device in to a tailnet, while it needs that. */
  authUrl: z.string().nullable(),
  /** The device's MagicDNS name, e.g. coltex.tail1234.ts.net. */
  name: z.string().nullable(),
  addresses: z.array(z.string()),
  tailnet: z.string().nullable(),
  /** The tailnet issues HTTPS certificates (MagicDNS and HTTPS enabled). */
  https: z.boolean(),
  /** The address ColTex is served at on the tailnet, while it is. */
  servingUrl: z.string().nullable(),
  error: z.string().nullable(),
})
export type TailscaleState = z.infer<typeof TailscaleState>

/**
 * The server's built-in Cloudflare Tunnel (cloudflared run by the server, as
 * a tunnel only: ColTex's own accounts sign people in). quick: a random
 * trycloudflare.com address; token: a tunnel made in the Cloudflare
 * dashboard with its own hostnames.
 */
export const CloudflareState = z.object({
  state: z.enum(['unavailable', 'off', 'starting', 'connected', 'error']),
  enabled: z.boolean(),
  mode: z.enum(['quick', 'token']).nullable(),
  /** The first public address, and all of them (a token tunnel may route several hostnames). */
  url: z.string().nullable(),
  urls: z.array(z.string()),
  /** A token is saved (it is never sent back), and the tunnel it is for (an ID, not a secret). */
  hasToken: z.boolean(),
  tunnelId: z.string().nullable(),
  error: z.string().nullable(),
})
export type CloudflareState = z.infer<typeof CloudflareState>

/** How the server sees the network, for Settings → Network. */
export const NetworkInfo = z.object({
  /** COLTEX_URL, when set. */
  envUrl: z.string().nullable(),
  /** Other addresses sign-in accepts (TRUSTED_ORIGINS). The address a request is made to is always accepted. */
  trustedOrigins: z.array(z.string()),
  /** TRUST_PROXY, or null when proxies aren't trusted (clients connect directly). */
  trustProxy: z.string().nullable(),
  /** The address this request came from, as the server resolved it. */
  clientIp: z.string(),
  /** The request came through a proxy whose X-Forwarded-For isn't trusted (TRUST_PROXY unset). */
  forwarded: z.boolean(),
  tailscale: TailscaleState,
  cloudflare: CloudflareState,
})
export type NetworkInfo = z.infer<typeof NetworkInfo>

export const TailscaleServeBody = z.object({ enabled: z.boolean() })
export const TailscaleEnableBody = z.object({ enabled: z.boolean() })

/** Turn the built-in Cloudflare Tunnel on or off; the token is kept sealed and never sent back. */
export const CloudflareBody = z.object({
  enabled: z.boolean(),
  mode: z.enum(['quick', 'token']).optional(),
  /** The token, or the dashboard's whole install command (the token is taken out of it). */
  token: z.string().trim().min(1).max(8192).optional(),
})
export type CloudflareBody = z.infer<typeof CloudflareBody>

export const SetupBody = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: Password,
})

export const CreateInviteBody = z.object({
  email: z.email().optional(),
  role: InviteRole.default('user'),
  expiresInDays: z.number().int().min(1).max(90).default(7),
  /** The AI group the new account joins (system administrator only); none means no AI, or the team admin's group for an admin's invitation. */
  aiGroupId: z.string().min(1).nullable().default(null),
})

export const Invite = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: UserRole,
  createdAt: z.string(),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  usedByEmail: z.string().nullable(),
  aiGroupId: z.string().nullable(),
  /** For links to a pending invitation (shown to whoever may see it); null once used or expired. */
  token: z.string().nullable(),
})
export type Invite = z.infer<typeof Invite>

/** Public information shown on the accept-invite page. */
export const InviteInfo = z.object({
  email: z.string().nullable(),
  role: UserRole,
  expiresAt: z.string(),
})
export type InviteInfo = z.infer<typeof InviteInfo>

export const AcceptInviteBody = SetupBody

// ---------------------------------------------------------------------------
// Sharing: owners add people who have an account on this server (no links).
// ---------------------------------------------------------------------------

/** The roles an owner can give. */
export const ShareRole = z.enum(['editor', 'reviewer', 'viewer'])
export type ShareRole = z.infer<typeof ShareRole>

/** An account found while typing a name or email to share with. */
export const UserMatch = z.object({ id: z.string(), name: z.string(), email: z.string() })
export type UserMatch = z.infer<typeof UserMatch>

export const FileEntry = z.object({
  path: z.string(),
  size: z.number(),
  binary: z.boolean(),
  /** Last modification (ms since epoch), when the storage driver knows it. */
  modifiedAt: z.number().optional(),
  /**
   * Changes whenever the content does (S3's ETag), when the driver knows it.
   * S3 times are whole seconds, so two same-size writes within one look alike.
   */
  version: z.string().optional(),
})
export type FileEntry = z.infer<typeof FileEntry>

export const ProjectTree = z.object({
  files: z.array(FileEntry),
  /** Every folder path, including empty folders and parents of files. */
  folders: z.array(z.string()),
})
export type ProjectTree = z.infer<typeof ProjectTree>

/**
 * Starting point for a new project: a built-in template (`apps/server/templates/<id>`)
 * or a project someone published as a template on this server.
 */
export const TemplateField = z.enum(['general', 'cs', 'engineering', 'physics', 'astronomy', 'chemistry', 'biology', 'medicine', 'math', 'economics', 'social', 'earth'])
export type TemplateField = z.infer<typeof TemplateField>

export const TemplateInfo = z.object({
  id: z.string(),
  kind: z.enum(['builtin', 'shared']),
  name: z.string(),
  description: z.string(),
  /** Built-in templates: the field they are for (the new-project dialog filters by it). */
  field: TemplateField.nullable(),
  /** Shared templates: who published it (null once their account is gone). */
  publishedBy: z.string().nullable(),
  /** Shared templates: the publisher's project owner or an admin may take it down. */
  canRemove: z.boolean(),
  /** Shared templates whose project the viewer owns: the project, to change the template. */
  projectId: z.string().nullable(),
})
export type TemplateInfo = z.infer<typeof TemplateInfo>

export const TemplateBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).default(''),
})

/** A zip imported as a new shared template: the project made for it, and what was skipped. */
export const ImportedTemplate = z.object({ template: TemplateInfo, project: ProjectMeta, warnings: z.array(z.string()) })
export type ImportedTemplate = z.infer<typeof ImportedTemplate>

/** A project's own entry in the shared templates, if it is published. */
export const ProjectTemplateState = z.object({ id: z.string(), name: z.string(), description: z.string() }).nullable()
export type ProjectTemplateState = z.infer<typeof ProjectTemplateState>

export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
  /** Defaults to the template's setting (built-in templates: 'auto'). */
  engine: EngineSetting.optional(),
  /** A template id from GET /templates. */
  template: z.string().min(1).max(64).default('article'),
})

/** A message in a project's chat. `userId` is null once the author's account is deleted. */
export const ChatMessage = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  userName: z.string(),
  content: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
})
export type ChatMessage = z.infer<typeof ChatMessage>
/** Newest last. `hasMore`: older messages exist (ask again with `before`). */
export const ChatPage = z.object({ messages: z.array(ChatMessage), hasMore: z.boolean() })
export type ChatPage = z.infer<typeof ChatPage>
export const ChatBody = z.object({ content: z.string().trim().min(1).max(10_000) })

/**
 * Mentions are stored in chat and comment text as `<@userId>`; the web app
 * shows them as @Name and turns a typed @Name back into this form.
 */
export const MENTION_PATTERN = /<@([A-Za-z0-9_-]{1,64})>/g

/** The user ids mentioned in a message, each once. */
export function mentionedIds(content: string): string[] {
  return [...new Set([...content.matchAll(MENTION_PATTERN)].map(m => m[1]!))]
}

/**
 * In-app notifications:
 * - `mention`: someone mentioned you in the chat or in a comment;
 * - `reply`: someone replied to a comment thread you started or took part in;
 * - `added`: someone added you to a project (by email);
 * - `owner`: someone made you a project's owner.
 */
/**
 * About the account (no project): `password_reset` (their password was set with `cli.ts
 * reset-password`), `two_factor_reset` (their two-step verification was turned off with `cli.ts
 * reset-2fa`), and for the system administrator `account_locked` (the actor's account was locked
 * after failed sign-ins).
 */
export const NotificationKind = z.enum(['mention', 'reply', 'added', 'owner', 'password_reset', 'two_factor_reset', 'account_locked', 'group_invite'])
export type NotificationKind = z.infer<typeof NotificationKind>

export const Notification = z.object({
  id: z.string(),
  kind: NotificationKind,
  read: z.boolean(),
  createdAt: z.string(),
  /** Null for notifications about an account (`password_reset`, `two_factor_reset`, `account_locked`). */
  project: z.object({ id: z.string(), name: z.string() }).nullable(),
  /** Who caused it; `id` is null once their account is deleted. */
  actor: z.object({ id: z.string().nullable(), name: z.string() }),
  /** Where a mention was made. */
  source: z.enum(['chat', 'comment']).nullable(),
  threadId: z.string().nullable(),
  /** The commented file, for mentions in comments and replies. */
  path: z.string().nullable(),
  /** The start of the message, mentions still as `<@userId>` (names are in `users`). */
  excerpt: z.string(),
  /** The role given, for `added`. */
  role: ProjectRole.nullable(),
  /** The group someone was invited to, for `group_invite`. */
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
})
export type Notification = z.infer<typeof Notification>

/** Newest first. `users`: names for the mentions in the excerpts. */
export const NotificationPage = z.object({
  notifications: z.array(Notification),
  unread: z.number(),
  hasMore: z.boolean(),
  users: z.record(z.string(), z.string()),
})
export type NotificationPage = z.infer<typeof NotificationPage>

/** Mark these notifications read (or unread), or all of them when `ids` is left out. */
export const NotificationReadBody = z.object({ ids: z.array(z.string().max(32)).max(200).optional(), read: z.boolean().default(true) })

/** Pushed on `/me/notifications/events`: the unread count, plus the notification that changed it. */
export const NotificationEvent = z.object({ unread: z.number(), notification: Notification.optional(), users: z.record(z.string(), z.string()).optional() })
export type NotificationEvent = z.infer<typeof NotificationEvent>

/** Archive or trash (or bring back) projects in the current user's list. Set exactly one of the two. */
export const ProjectStateBody = z
  .object({
    projectIds: z.array(ProjectId).min(1).max(500),
    archived: z.boolean().optional(),
    trashed: z.boolean().optional(),
  })
  .refine(b => (b.archived === undefined) !== (b.trashed === undefined), { message: 'Set either archived or trashed' })
export type ProjectStateBody = z.infer<typeof ProjectStateBody>

/** Tag colours offered by the web app; any #rrggbb is accepted. */
export const TAG_COLORS = ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#64748b'] as const
export const Tag = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  projectIds: z.array(z.string()),
})
export type Tag = z.infer<typeof Tag>
export const TagBody = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
export const TagPatch = z.object({ name: TagBody.shape.name.optional(), color: TagBody.shape.color.optional() })
export const TagProjectsBody = z.object({ projectIds: z.array(ProjectId).min(1).max(500) })

/** Copy a project into a new one owned by the caller (files only; no members, history or comments). */
export const CopyProjectBody = z.object({ name: z.string().min(1).max(200) })

/** Where a linked file comes from (Overleaf's "From another project" / "From external URL"). */
export const LinkedFileSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('url'), url: z.string().trim().min(1).max(2000) }),
  z.object({ kind: z.literal('project_file'), projectId: ProjectId, path: z.string().min(1) }),
  z.object({ kind: z.literal('project_output'), projectId: ProjectId }),
])
export type LinkedFileSource = z.infer<typeof LinkedFileSource>

export const LinkedFileBody = z.object({ path: z.string().min(1), source: LinkedFileSource })

export const LinkedFile = z.object({
  path: z.string(),
  kind: z.enum(['url', 'project_file', 'project_output']),
  url: z.string().nullable(),
  sourceProjectId: z.string().nullable(),
  sourceProjectName: z.string().nullable(),
  sourcePath: z.string().nullable(),
  linkedBy: z.string().nullable(),
  updatedAt: z.string(),
})
export type LinkedFile = z.infer<typeof LinkedFile>

export const UpdateProjectBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  rootFile: z.string().min(1).optional(),
  engine: EngineSetting.optional(),
  spellCheckLanguage: SpellCheckLanguage.optional(),
})

export const Diagnostic = z.object({
  level: z.enum(['error', 'warning', 'typesetting']),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  content: z.string().optional(),
  raw: z.string(),
  source: z.enum(['latex', 'bib']),
  /** Plain-language explanation for common errors (Overleaf's human-readable log rules). */
  hint: z.string().optional(),
  hintUrl: z.string().optional(),
  ruleId: z.string().optional(),
  /** The command the error is about, e.g. `\\foo` for an undefined control sequence. */
  command: z.string().optional(),
})
export type Diagnostic = z.infer<typeof Diagnostic>

/** Payload placed on the compile queue by the server. */
export const CompileJob = z.object({
  projectId: ProjectId,
  buildId: z.string(),
  rootFile: z.string(),
  engine: Engine,
  /** When true, wipe cached intermediate files before compiling. */
  clean: z.boolean().default(false),
  /**
   * Trial build: these text files replace (or add to) the project's sources in
   * a scratch copy. The project itself is never modified. Used to check the AI
   * assistant's proposed changes before the author applies them.
   */
  overlay: z.record(z.string(), z.string()).optional(),
  /** Draft mode: graphics are drawn as boxes, which makes builds faster. */
  draft: z.boolean().default(false),
  /** Stop at the first error instead of carrying on (TeX's -halt-on-error). */
  stopOnFirstError: z.boolean().default(false),
})
export type CompileJob = z.infer<typeof CompileJob>
/** A compile job before defaults are applied (what producers enqueue). */
export type CompileJobInput = z.input<typeof CompileJob>

/** What the editor asks for when it compiles (POST /projects/:id/compile). */
export const CompileRequest = z.object({
  clean: z.boolean().default(false),
  draft: z.boolean().default(false),
  stopOnFirstError: z.boolean().default(false),
})
export type CompileRequest = z.infer<typeof CompileRequest>

/** The project's LaTeX sources as collaborators currently see them (for the word count). */
export const ProjectSources = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
})
export type ProjectSources = z.infer<typeof ProjectSources>

/** Which files `GET /projects/:id/sources` returns: LaTeX sources, or every searchable text file. */
export const SourcesQuery = z.object({ include: z.enum(['tex', 'text']).default('tex') })

/** Project-wide replace: edits per file, each checked against the text it replaces. */
export const ReplaceEdit = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  /** The text at from..to when the search ran; the edit is refused if it changed. */
  expected: z.string().max(100_000),
  insert: z.string().max(100_000),
})
export const ReplaceBody = z.object({
  files: z
    .array(z.object({ path: z.string().min(1), edits: z.array(ReplaceEdit).min(1).max(10_000) }))
    .min(1)
    .max(1_000),
})
export type ReplaceBody = z.infer<typeof ReplaceBody>
/** How many edits were made, and the files left alone because they changed since the search. */
export const ReplaceResult = z.object({ replaced: z.number(), skipped: z.array(z.string()) })
export type ReplaceResult = z.infer<typeof ReplaceResult>

/** Words the user added to their spelling dictionary (shared by all their projects). */
export const LearnedWords = z.object({ words: z.array(z.string()) })
export type LearnedWords = z.infer<typeof LearnedWords>
/** One word: letters, digits, apostrophes and hyphens as Hunspell sees them; no spaces. */
export const LearnedWord = z.object({ word: z.string().min(1).max(100).regex(/^\S+$/) })
/** Words added together (an imported list); ones that are not single words are skipped. */
export const LearnedWordsImport = z.object({ words: z.array(z.string()).max(10_000) })
export const LearnedWordsImported = z.object({ added: z.number(), skipped: z.number() })
export type LearnedWordsImported = z.infer<typeof LearnedWordsImported>

/** The interface's colour themes (the web app's lib/theme.ts): blue, green and violet, each light and dark. */
export const ThemeChoice = z.enum(['light', 'dark', 'forest', 'moss', 'lavender', 'plum'])
export type ThemeChoice = z.infer<typeof ThemeChoice>
/** The hue of a person's avatar and cursor colour (hsl(hue 70% 42%)), chosen in their profile. */
export const AvatarHue = z.number().int().min(0).max(359)
/** A person's settings kept with their account; null: never chosen (the default: Light, a hue made from their id). */
export const UserPreferences = z.object({ theme: ThemeChoice.nullable(), avatarHue: AvatarHue.nullable() })
export type UserPreferences = z.infer<typeof UserPreferences>
/** Change some of them; what is left out stays. */
export const UserPreferencesPatch = z.object({ theme: ThemeChoice.nullable().optional(), avatarHue: AvatarHue.nullable().optional() })
export type UserPreferencesPatch = z.infer<typeof UserPreferencesPatch>
/** The avatar hues people chose, by user id (everyone else has the one made from their id). */
export const AvatarHues = z.record(z.string(), AvatarHue)
export type AvatarHues = z.infer<typeof AvatarHues>

export const CompileStatus = z.enum(['success', 'failure', 'timeout', 'error'])
export type CompileStatus = z.infer<typeof CompileStatus>

/** Result returned by the compiler worker. */
export const CompileResult = z.object({
  buildId: z.string(),
  status: CompileStatus,
  /** Output files copied to the build directory, e.g. output.pdf, output.log */
  outputFiles: z.array(z.string()),
  diagnostics: z.array(Diagnostic),
  durationMs: z.number(),
  /** Short human-readable message for status other than success/failure */
  message: z.string().optional(),
})
export type CompileResult = z.infer<typeof CompileResult>

/** Fixed names of build artifacts, independent of the root file name. */
export const OUTPUT = {
  pdf: 'output.pdf',
  log: 'output.log',
  synctex: 'output.synctex.gz',
  blg: 'output.blg',
} as const

// ---------------------------------------------------------------------------
// SyncTeX (handled by the compiler worker on its own queue)
// ---------------------------------------------------------------------------

export const SYNCTEX_QUEUE = 'synctex'

/** A box in PDF space: page is 1-based; h/v/width/height are in big points from the page's top-left. */
export const PdfPosition = z.object({
  page: z.number().int().min(1),
  h: z.number(),
  v: z.number(),
  width: z.number(),
  height: z.number(),
})
export type PdfPosition = z.infer<typeof PdfPosition>

export const CodePosition = z.object({
  file: z.string(),
  line: z.number().int().min(1),
  column: z.number().int().min(0),
})
export type CodePosition = z.infer<typeof CodePosition>

const BuildRef = z.object({ projectId: ProjectId, buildId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/) })

export const SynctexJob = z.discriminatedUnion('kind', [
  /** Source position → PDF boxes ("go to PDF"). */
  BuildRef.extend({ kind: z.literal('code'), file: z.string().min(1), line: z.number().int().min(1), column: z.number().int().min(0) }),
  /** PDF point → source position ("go to code"). */
  BuildRef.extend({ kind: z.literal('pdf'), page: z.number().int().min(1), h: z.number(), v: z.number() }),
])
export type SynctexJob = z.infer<typeof SynctexJob>

export const SynctexResult = z.object({
  pdf: z.array(PdfPosition).optional(),
  code: CodePosition.nullable().optional(),
})
export type SynctexResult = z.infer<typeof SynctexResult>

// ---------------------------------------------------------------------------
// Cleanup: a deleted project's compile directory and build outputs, removed by
// the compiler worker (only it sees its compile directories)
// ---------------------------------------------------------------------------

export const CLEANUP_QUEUE = 'cleanup'

export const CleanupJob = z.object({ projectId: ProjectId })
export type CleanupJob = z.infer<typeof CleanupJob>

// ---------------------------------------------------------------------------
// TeX Live lookups: installed package sources and documentation, read inside
// the compiler container (the assistant's reference library)
// ---------------------------------------------------------------------------

export const TEXLIVE_QUEUE = 'texlive'

/** A TeX Live file or package name, e.g. "booktabs", "booktabs.sty", "IEEEtran.cls". */
export const TexName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._+-]{0,99}$/, 'Not a TeX Live file or package name')

export const TexLookupJob = z.object({
  /** source: the .sty/.cls/.bst/.def/.tex file itself; doc: the package documentation (texdoc). */
  kind: z.enum(['source', 'doc']),
  name: TexName,
  /** Case-insensitive text to find (returns matching lines with context). */
  query: z.string().min(1).max(200).optional(),
  /** Without a query: the first line to return (1-based). */
  fromLine: z.number().int().min(1).optional(),
})
export type TexLookupJob = z.infer<typeof TexLookupJob>

export const TexLookupResult = z.object({
  found: z.boolean(),
  /** Path inside TeX Live, e.g. tex/latex/booktabs/booktabs.sty. */
  file: z.string().optional(),
  totalLines: z.number().optional(),
  text: z.string(),
})
export type TexLookupResult = z.infer<typeof TexLookupResult>

// ---------------------------------------------------------------------------
// Word export: pandoc turns the LaTeX sources into a .docx inside the
// compiler container (it runs on untrusted sources too)
// ---------------------------------------------------------------------------

export const WORD_QUEUE = 'word'

/** Citation styles that come with ColTex (CSL files in the compiler image). */
export const WORD_CITATION_STYLES = ['apa', 'vancouver', 'american-medical-association', 'ieee', 'nature', 'chicago-author-date'] as const
export const WordCitationStyle = z.enum(WORD_CITATION_STYLES)
export type WordCitationStyle = z.infer<typeof WordCitationStyle>

/** What people choose when exporting (POST /projects/:id/export/word). */
export const WordExportRequest = z.object({
  /** A .docx in the project whose styles the document takes (a journal's Word template). */
  reference: z.string().max(1024).optional(),
  /** A built-in citation style, or a .csl file in the project; without either, one that suits the document's bibliography style. */
  citationStyle: WordCitationStyle.optional(),
  csl: z.string().max(1024).optional(),
})
export type WordExportRequest = z.infer<typeof WordExportRequest>

/** An export that is ready: download it from …/export/word/:id (once). */
export const WordExportReady = z.object({ id: z.string(), warnings: z.array(z.string()) })
export type WordExportReady = z.infer<typeof WordExportReady>

export const WordJob = z.object({
  projectId: ProjectId,
  exportId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/),
  /** The file pandoc reads, relative to the project (usually the overlay's wrapper). */
  entry: z.string(),
  /** Text files written into the scratch copy first (the wrapper with the front matter). */
  overlay: z.record(z.string(), z.string()),
  reference: z.string().optional(),
  /** Either a built-in style's id or a project path ending in .csl. */
  csl: z.string().optional(),
})
export type WordJob = z.infer<typeof WordJob>

export const WordResult = z.object({
  exportId: z.string(),
  /** Where the worker wrote the file, relative to the outputs directory. */
  file: z.string(),
  /** pandoc's warnings (things it skipped). */
  warnings: z.array(z.string()),
})
export type WordResult = z.infer<typeof WordResult>

// ---------------------------------------------------------------------------
// Instance-wide AI configuration (admin)
// ---------------------------------------------------------------------------

/** Reasoning effort, in pi-ai's terms. Each model supports a subset (see `AiModelInfo.thinkingLevels`). */
export const ThinkingLevel = z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
export type ThinkingLevel = z.infer<typeof ThinkingLevel>

export const CustomAiModel = z.object({
  id: z.string().min(1).max(200),
  contextWindow: z.number().int().min(1024).default(128_000),
  maxTokens: z.number().int().min(256).default(16_384),
  reasoning: z.boolean().default(false),
})
export type CustomAiModel = z.infer<typeof CustomAiModel>

/** An OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, a LiteLLM proxy, ...). */
export const CustomAiProvider = z.object({
  id: z.string().regex(/^custom-[a-z0-9-]{1,40}$/, 'Use custom- followed by lowercase letters, digits or dashes'),
  name: z.string().min(1).max(100),
  baseUrl: z.url(),
  models: z.array(CustomAiModel).min(1).max(50),
})
export type CustomAiProvider = z.infer<typeof CustomAiProvider>

export const AiModelRef = z.object({ provider: z.string().min(1), id: z.string().min(1) })
export type AiModelRef = z.infer<typeof AiModelRef>

/**
 * Which models someone may use: all of them, none, or the selected providers
 * (every model of each) and single models. Credentials stay shared and
 * admin-managed either way; admins can always use every model.
 */
export const AiAccessPolicy = z.object({
  mode: z.enum(['all', 'selected', 'none']),
  providers: z.array(z.string().min(1)).max(500).default([]),
  models: z.array(AiModelRef).max(2000).default([]),
})
export type AiAccessPolicy = z.infer<typeof AiAccessPolicy>

/**
 * A group of people with the same AI access. Everyone outside a group (other
 * than admins, who have every model) can't use the assistant.
 */
/**
 * How much each member of an AI group may use per day, week or month
 * (calendar periods in the server's time zone): tokens (input, cached and
 * output together) and/or cost in US dollars. Null: no limit.
 */
export const AiUsageLimits = z.object({
  period: z.enum(['day', 'week', 'month']).default('month'),
  tokens: z.number().int().min(1).max(1e12).nullable().default(null),
  cost: z.number().min(0.01).max(1e6).nullable().default(null),
})
export type AiUsageLimits = z.infer<typeof AiUsageLimits>
export const NO_AI_LIMITS: AiUsageLimits = { period: 'month', tokens: null, cost: null }

export const AiGroup = z.object({ id: z.string(), name: z.string(), policy: AiAccessPolicy, limits: AiUsageLimits, members: z.number() })
export type AiGroup = z.infer<typeof AiGroup>

/** What someone has used of their group's limits this period. */
export const AiAllowance = z.object({
  period: AiUsageLimits.shape.period,
  tokens: z.number().nullable(),
  cost: z.number().nullable(),
  usedTokens: z.number(),
  usedCost: z.number(),
  /** When the next period starts. */
  resetsAt: z.string(),
  exceeded: z.boolean(),
})
export type AiAllowance = z.infer<typeof AiAllowance>

/**
 * One person's own AI settings, set by the system admin in the usage page:
 * each replaces their group's when set (null: the group's). Custom access
 * gives someone AI even without a group.
 */
export const AiUserCustom = z.object({ policy: AiAccessPolicy.nullable(), limits: AiUsageLimits.nullable() })
export type AiUserCustom = z.infer<typeof AiUserCustom>

export const AiGroupBody = z.object({ name: z.string().trim().min(1).max(60), policy: AiAccessPolicy, limits: AiUsageLimits.default(NO_AI_LIMITS) })
export type AiGroupBody = z.infer<typeof AiGroupBody>

/**
 * "Auto": a cheap judge model reads each message and sends it to the light
 * or the strong model. Offered once all three are set.
 */
export const AiAutoRouting = z.object({
  judge: AiModelRef.nullable().default(null),
  light: AiModelRef.nullable().default(null),
  strong: AiModelRef.nullable().default(null),
})
export type AiAutoRouting = z.infer<typeof AiAutoRouting>

/**
 * There is no default model: people start on "Auto" when it is set up, and
 * on the first model they may use otherwise.
 */
export const AiSettings = z.object({
  auto: AiAutoRouting.default({ judge: null, light: null, strong: null }),
  customProviders: z.array(CustomAiProvider).default([]),
})
export type AiSettings = z.infer<typeof AiSettings>

/** A partial update. (`AiSettings.partial()` would still fill in defaults for omitted fields.) */
export const AiSettingsPatch = z
  .object({
    auto: AiAutoRouting,
    customProviders: z.array(CustomAiProvider),
  })
  .partial()
export type AiSettingsPatch = z.infer<typeof AiSettingsPatch>

export const AiProviderStatus = z.object({
  id: z.string(),
  name: z.string(),
  custom: z.boolean(),
  /** Display name of the API-key method, when the provider supports one. */
  apiKey: z.string().nullable(),
  /** OAuth sign-in (subscriptions such as Claude Pro/Max or ChatGPT), when supported. */
  oauth: z.object({ name: z.string(), subscription: z.boolean() }).nullable(),
  /** How the provider is configured right now, if at all. */
  configured: z.object({ type: z.enum(['api_key', 'oauth']), source: z.string().optional() }).nullable(),
  /** A credential is stored in ColTex (as opposed to an environment variable) and can be removed. */
  stored: z.boolean(),
  modelCount: z.number(),
  /**
   * Recent requests: `degraded` after repeated failures, `open` while requests
   * go elsewhere, `half_open` while one is let through to try again.
   */
  health: z.object({
    state: z.enum(['healthy', 'degraded', 'open', 'half_open']),
    failures: z.number(),
    lastError: z.string().nullable(),
    lastErrorAt: z.string().nullable(),
  }),
})
export type AiProviderStatus = z.infer<typeof AiProviderStatus>

export const AiModelInfo = z.object({
  provider: z.string(),
  id: z.string(),
  name: z.string(),
  contextWindow: z.number(),
  reasoning: z.boolean(),
  /** The thinking levels this model accepts, weakest first (just `off` for models that don't reason). */
  thinkingLevels: z.array(ThinkingLevel),
})
export type AiModelInfo = z.infer<typeof AiModelInfo>

export const AiAdminState = z.object({
  settings: AiSettings,
  providers: z.array(AiProviderStatus),
})
export type AiAdminState = z.infer<typeof AiAdminState>

/** A provider login (API key or OAuth) driven step by step from the admin page. */
export const AiLoginState = z.object({
  id: z.string(),
  providerId: z.string(),
  type: z.enum(['api_key', 'oauth']),
  status: z.enum(['running', 'done', 'error', 'cancelled']),
  /** Things to show the admin: links to open, device codes, progress. */
  events: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('info'), message: z.string(), links: z.array(z.object({ url: z.string(), label: z.string().optional() })).optional() }),
      z.object({ type: z.literal('auth_url'), url: z.string(), instructions: z.string().optional() }),
      z.object({ type: z.literal('device_code'), userCode: z.string(), verificationUri: z.string() }),
      z.object({ type: z.literal('progress'), message: z.string() }),
    ]),
  ),
  /** The question the flow is waiting on, if any. */
  prompt: z
    .object({
      id: z.string(),
      type: z.enum(['text', 'secret', 'select', 'manual_code']),
      message: z.string(),
      placeholder: z.string().optional(),
      options: z.array(z.object({ id: z.string(), label: z.string(), description: z.string().optional() })).optional(),
    })
    .nullable(),
  error: z.string().optional(),
})
export type AiLoginState = z.infer<typeof AiLoginState>

export const AiUsageTotals = z.object({
  requests: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cost: z.number(),
})
export type AiUsageTotals = z.infer<typeof AiUsageTotals>

/** Usage over the last `days` days, for everyone or one person. */
export const AiUsageReport = z.object({
  days: z.number(),
  totals: AiUsageTotals,
  byDay: z.array(z.object({ date: z.string(), requests: z.number(), tokens: z.number(), cost: z.number() })),
  byModel: z.array(AiUsageTotals.extend({ provider: z.string(), model: z.string() })),
})
export type AiUsageReport = z.infer<typeof AiUsageReport>

/** A person on the usage and access page, with their AI group (null: none, so no AI unless an admin). */
export const AiUserRow = AiUsageTotals.extend({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  banned: z.boolean(),
  lastUsedAt: z.string().nullable(),
  groupId: z.string().nullable(),
  custom: AiUserCustom,
})
export type AiUserRow = z.infer<typeof AiUserRow>

/** The model and thinking level someone picked in the editor. */
export const AiPreference = z.object({
  model: AiModelRef,
  thinkingLevel: ThinkingLevel,
  /** Let auto routing pick the model per message (`model` is kept for when it is turned off). */
  auto: z.boolean().default(false),
})
export type AiPreference = z.infer<typeof AiPreference>

/** What the editor needs to know to offer the assistant. */
export const AiStatus = z.object({
  available: z.boolean(),
  /** The model messages go to: the person's pick, else the default, else the first they may use. */
  model: AiModelInfo.nullable(),
  /** The thinking level for `model` (the person's pick, clamped to what the model supports). */
  thinkingLevel: ThinkingLevel,
  /** Models this person may pick. */
  models: z.array(AiModelInfo),
  /** Auto routing: offered when the admin set it up and this person may use both models. */
  auto: z.object({ available: z.boolean(), on: z.boolean(), light: AiModelInfo.nullable(), strong: AiModelInfo.nullable() }),
  /** Why the assistant is unavailable, for the UI. */
  reason: z.string().optional(),
})
export type AiStatus = z.infer<typeof AiStatus>

// ---------------------------------------------------------------------------
// Assistant sessions (per user and project)
// ---------------------------------------------------------------------------

export const AiItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('user'),
    id: z.string(),
    text: z.string(),
    /** Short labels for context that was attached, e.g. "3 compile errors", "main.tex L10–14". */
    attachments: z.array(z.string()).default([]),
    /** The skill the person invoked with `/name`, if any. */
    skill: z.string().optional(),
  }),
  z.object({ kind: z.literal('assistant'), id: z.string(), text: z.string() }),
  z.object({
    kind: z.literal('tool'),
    id: z.string(),
    name: z.string(),
    /** e.g. "Read sec/intro.tex" */
    label: z.string(),
    status: z.enum(['running', 'ok', 'error']),
    result: z.string().optional(),
  }),
  z.object({ kind: z.literal('notice'), id: z.string(), level: z.enum(['info', 'success', 'error']), text: z.string() }),
  /** What one turn changed in the draft, shown after the assistant's reply. */
  z.object({
    kind: z.literal('changes'),
    id: z.string(),
    files: z.array(
      z.object({
        path: z.string(),
        /** deleted and moved: done at once (full access), never part of the draft. */
        kind: z.enum(['modified', 'created', 'reverted', 'deleted', 'moved']),
        /** Where a moved file or folder went. */
        to: z.string().optional(),
        added: z.number(),
        removed: z.number(),
      }),
    ),
  }),
  /** The conversation was summarised to free its context (`/compact`): tokens before and after. */
  z.object({ kind: z.literal('compacted'), id: z.string(), before: z.number().nullable(), after: z.number().nullable() }),
  /** A skill the agent drafted (propose_skill), until the person saves it (`saved`: where to). */
  z.object({
    kind: z.literal('skill'),
    id: z.string(),
    name: z.string(),
    description: z.string(),
    body: z.string(),
    /** Reference files drafted with it (path → text); older drafts have none. */
    files: z.record(z.string(), z.string()).optional(),
    /** Saved to the person's skills ("personal", the one place skills go). */
    saved: z.enum(['personal']).nullable(),
  }),
])
export type AiItem = z.infer<typeof AiItem>

export const AiTrialCompile = z.object({
  buildId: z.string(),
  status: CompileStatus,
  errors: z.number(),
  warnings: z.number(),
})
export type AiTrialCompile = z.infer<typeof AiTrialCompile>

/** One file the assistant proposes to change. `base` is the content it started from. */
export const AiChangeFile = z.object({
  path: z.string(),
  kind: z.enum(['modified', 'created']),
  base: z.string(),
  proposed: z.string(),
})
export type AiChangeFile = z.infer<typeof AiChangeFile>

export const AiChanges = z.object({
  files: z.array(AiChangeFile),
  /** Latest compile of the project with these changes applied (in a scratch copy). */
  trial: AiTrialCompile.nullable(),
  /**
   * The latest turn that changed the draft: each file it touched as it was
   * before that turn (null: the turn created it), for the "this turn" diff.
   */
  turn: z.object({ base: z.record(z.string(), z.string().nullable()) }).nullable().default(null),
})
export type AiChanges = z.infer<typeof AiChanges>

export const AiSessionState = z.object({
  id: z.string(),
  running: z.boolean(),
  items: z.array(AiItem),
  changes: AiChanges,
  /** Set after changes were applied, until they are undone or new changes are applied. */
  lastApplied: z.object({ snapshot: z.string(), files: z.array(z.string()), at: z.string() }).nullable(),
  model: AiModelInfo.nullable(),
  /** Tokens the conversation takes in the model's context (after the last reply; estimated right after compacting). */
  contextTokens: z.number().nullable(),
})
export type AiSessionState = z.infer<typeof AiSessionState>

/** A saved conversation, as the list of previous chats shows it. */
export const AiConversation = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  /** Messages the person sent. */
  messages: z.number(),
  /** The one open in the panel. */
  current: z.boolean(),
})
export type AiConversation = z.infer<typeof AiConversation>

export const AiCompactBody = z.object({ preference: AiPreference.optional() })
export const AiRenameBody = z.object({ title: z.string().trim().min(1).max(120) })

/** Server-sent events on a session stream. */
export const AiStreamEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('snapshot'), state: AiSessionState }),
  /** Add or replace an item (matched by id). */
  z.object({ type: z.literal('item'), item: AiItem }),
  /** Append streamed text to an assistant item. */
  z.object({ type: z.literal('delta'), id: z.string(), text: z.string() }),
  z.object({ type: z.literal('changes'), changes: AiChanges }),
  z.object({ type: z.literal('running'), running: z.boolean() }),
  /** The project was built after the draft was applied automatically, for the PDF viewer. */
  z.object({ type: z.literal('built'), compile: CompileResult }),
])
export type AiStreamEvent = z.infer<typeof AiStreamEvent>

export const AiSelection = z.object({
  path: z.string(),
  fromLine: z.number().int().min(1),
  toLine: z.number().int().min(1),
  text: z.string().max(50_000),
})
export type AiSelection = z.infer<typeof AiSelection>

export const AiMessageBody = z.object({
  /** May be empty when a skill is invoked on its own. */
  text: z.string().max(20_000),
  /** A skill invoked with `/name`: its instructions go with this message. */
  skill: z.string().max(64).optional(),
  /** The compile the author is looking at, so the assistant can read its errors and log. */
  compile: z.object({ buildId: z.string().regex(/^[a-z0-9]+-[a-z0-9]+$/), status: CompileStatus, diagnostics: z.array(Diagnostic).max(200) }).optional(),
  /** The open file and cursor line. */
  openFile: z.object({ path: z.string(), line: z.number().int().min(1).optional() }).optional(),
  selection: AiSelection.optional(),
  /** The model and thinking level picked in the panel; the saved preference otherwise. */
  preference: AiPreference.optional(),
}).refine(b => b.text.trim() !== '' || b.skill, { message: 'Type a message', path: ['text'] })
export type AiMessageBody = z.infer<typeof AiMessageBody>

// ---------------------------------------------------------------------------
// AI skills (Agent Skills format: a SKILL.md with a name, a description and
// instructions, plus reference files). Personal or per project.
// ---------------------------------------------------------------------------

/** The "/" commands built into the panel; skills can't take their names. */
export const RESERVED_SKILL_NAMES = ['compact', 'new', 'chats'] as const

export const SkillName = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens')
  .refine(n => !(RESERVED_SKILL_NAMES as readonly string[]).includes(n), 'This name is taken by a built-in command')

/** Where a skill comes from: someone's own, or shipped with ColTex (read-only). */
export const SkillSource = z.enum(['personal', 'builtin'])
export type SkillSource = z.infer<typeof SkillSource>

/** What creating or editing a skill sends. */
export const AiSkillBody = z.object({
  name: SkillName,
  description: z.string().trim().min(1).max(1024),
  body: z.string().trim().min(1).max(100_000),
})
export type AiSkillBody = z.infer<typeof AiSkillBody>

export const AiSkill = z.object({
  id: z.string(),
  scope: SkillSource,
  name: z.string(),
  description: z.string(),
  body: z.string(),
  /** Reference files that came with an imported skill (read by the agent, never run). */
  files: z.array(z.object({ path: z.string(), size: z.number() })),
  updatedAt: z.string(),
})
export type AiSkill = z.infer<typeof AiSkill>

/** A skill in the panel's "/" menu (someone's own win over built-in ones of the same name). */
export const AiSkillSummary = z.object({ name: z.string(), description: z.string(), scope: SkillSource })
export type AiSkillSummary = z.infer<typeof AiSkillSummary>

export const AiSkillImportResult = z.object({ skills: z.array(AiSkill), warnings: z.array(z.string()) })
export type AiSkillImportResult = z.infer<typeof AiSkillImportResult>

/** Saving a skill the agent proposed (possibly edited first). */
export const AiSaveProposedSkill = AiSkillBody.extend({
  /** Overwrite a skill of the same name (otherwise that is a conflict). */
  replace: z.boolean().default(false),
})
export type AiSaveProposedSkill = z.infer<typeof AiSaveProposedSkill>

/** Files the author accepted, with the content they accepted (all or some hunks). */
export const AiApplyBody = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })).min(1),
})
export type AiApplyBody = z.infer<typeof AiApplyBody>

export const AiCompileSummary = z.object({ buildId: z.string().nullable(), status: CompileStatus, errors: z.number() })
export type AiCompileSummary = z.infer<typeof AiCompileSummary>

export const AiApplyResult = z.object({
  outcome: z.enum(['applied', 'reverted']),
  before: AiCompileSummary,
  after: AiCompileSummary,
  /** The compile after applying (or after reverting), for the PDF viewer. */
  compile: CompileResult.optional(),
  message: z.string(),
})
export type AiApplyResult = z.infer<typeof AiApplyResult>

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

export const VersionId = z.string().regex(/^[0-9a-f]{40,64}$/)

export const HistoryFileChange = z.object({
  status: z.enum(['added', 'modified', 'deleted', 'renamed']),
  path: z.string(),
  /** Previous path of a renamed file. */
  from: z.string().optional(),
})
export type HistoryFileChange = z.infer<typeof HistoryFileChange>

export const HistoryLabel = z.object({
  id: z.number(),
  name: z.string(),
  versionId: VersionId,
  createdBy: z.string().nullable(),
  createdAt: z.string(),
})
export type HistoryLabel = z.infer<typeof HistoryLabel>

/**
 * A point in a project's history. Kinds: initial, create, import, edit, ai
 * (changes applied from the AI assistant), restore, revert, commit (recorded
 * by hand with the person's message).
 */
export const HistoryVersion = z.object({
  id: VersionId,
  parent: VersionId.nullable(),
  at: z.string(),
  kind: z.string(),
  message: z.string(),
  authors: z.array(z.object({ id: z.string(), name: z.string() })),
  changes: z.array(HistoryFileChange),
  labels: z.array(HistoryLabel),
  /** For restores: the version that was restored. */
  restoredFrom: VersionId.optional(),
  /** For reverts: the version whose changes were undone. */
  revertOf: VersionId.optional(),
})
export type HistoryVersion = z.infer<typeof HistoryVersion>

export const HistoryPage = z.object({
  versions: z.array(HistoryVersion),
  /** Older versions exist; fetch them with `before` = the last id. */
  more: z.boolean(),
})
export type HistoryPage = z.infer<typeof HistoryPage>

export const HistoryFile = z.object({
  path: z.string(),
  exists: z.boolean(),
  binary: z.boolean(),
  size: z.number(),
  /** Text content (absent for binary or missing files). */
  text: z.string().optional(),
})
export type HistoryFile = z.infer<typeof HistoryFile>

/** A version recorded now with the person's own message (like git commit -m). */
export const CommitBody = z.object({ message: z.string().trim().min(1).max(200) })
export type CommitBody = z.infer<typeof CommitBody>

export const RestoreBody = z.object({
  /** Restore only these files; omit to restore the whole project to the version. */
  paths: z.array(z.string()).min(1).optional(),
})

// ---------------------------------------------------------------------------
// Admin overview
// ---------------------------------------------------------------------------

export const ServiceHealth = z.object({
  id: z.enum(['api', 'database', 'valkey', 'compiler']),
  status: z.enum(['ok', 'degraded', 'down']),
  /** Round trip of a ping, when the service has one. */
  latencyMs: z.number().nullable(),
})
export type ServiceHealth = z.infer<typeof ServiceHealth>

/** A finished build, for the compile activity chart. */
/**
 * Resource use as the server samples it, whether or not anyone watches:
 * CPU as a percentage of the CPUs each side may use (its container's quota,
 * else the machine's cores), memory in bytes against its limit (the
 * container's, else the machine's). The compiler side sums all workers and
 * is null while none reports.
 */
export const ResourceSample = z.object({
  serverCpu: z.number(),
  serverMem: z.number(),
  serverMemLimit: z.number(),
  compilerCpu: z.number().nullable(),
  compilerMem: z.number().nullable(),
  compilerMemLimit: z.number().nullable(),
})
export type ResourceSample = z.infer<typeof ResourceSample>

export const MonitorRange = z.enum(['1h', '6h', '24h', '7d', '30d'])
export type MonitorRange = z.infer<typeof MonitorRange>

/** One bucket of the monitoring history: averages for CPU, peaks for memory; null where nothing was recorded (the server was down). */
export const MonitorPoint = z.object({
  at: z.string(),
  serverCpu: z.number().nullable(),
  serverMem: z.number().nullable(),
  serverMemPct: z.number().nullable(),
  compilerCpu: z.number().nullable(),
  compilerMem: z.number().nullable(),
  compilerMemPct: z.number().nullable(),
  builds: z.number(),
  failedBuilds: z.number(),
})
export type MonitorPoint = z.infer<typeof MonitorPoint>

/** Resource use and builds over a period, kept across server restarts (`restarts`: when a new server process started). */
export const MonitorHistory = z.object({
  range: MonitorRange,
  bucketSeconds: z.number(),
  points: z.array(MonitorPoint),
  restarts: z.array(z.string()),
})
export type MonitorHistory = z.infer<typeof MonitorHistory>

/** The admin monitoring overview. Polled every few seconds; storage is cached. */
export const AdminStats = z.object({
  users: z.object({ total: z.number(), admins: z.number(), suspended: z.number(), newLast30d: z.number() }),
  projects: z.object({ total: z.number(), activeLast7d: z.number(), storageBytes: z.number(), files: z.number() }),
  services: z.array(ServiceHealth),
  compiler: z.object({ workers: z.number(), slots: z.number(), waiting: z.number(), active: z.number(), failed: z.number() }),
  /** Builds finished in the last 24 hours. */
  compiles: z.object({ total: z.number(), failed: z.number(), avgMs: z.number().nullable() }),
  /** The machine as this server sees it: inside Docker, the Docker host (Docker Desktop's VM on macOS/Windows). */
  host: z.object({
    cpus: z.number(),
    loadAvg: z.array(z.number()),
    memTotal: z.number(),
    memAvailable: z.number(),
    platform: z.string(),
    docker: z.boolean(),
  }),
  /** Memory of the ColTex containers (from their cgroups); the server only when it runs in one. */
  containers: z.array(z.object({ id: z.enum(['server', 'compiler']), name: z.string(), used: z.number(), limit: z.number().nullable() })),
  process: z.object({ rss: z.number(), heapUsed: z.number(), heapTotal: z.number() }),
  /** The latest resource sample (taken every few seconds), null until the first one. */
  live: ResourceSample.nullable(),
  /** The filesystem holding the data directory. */
  disk: z.object({ total: z.number(), free: z.number() }).nullable(),
  server: z.object({ version: z.string(), uptimeSeconds: z.number(), startedAt: z.string() }),
})
export type AdminStats = z.infer<typeof AdminStats>

// ---------------------------------------------------------------------------
// Review: comments and tracked changes
// ---------------------------------------------------------------------------

/** Who has track changes on: everyone, or the listed users. */
export const TrackChangesState = z.object({
  everyone: z.boolean(),
  users: z.array(z.string()),
})
export type TrackChangesState = z.infer<typeof TrackChangesState>

/** A Yjs relative position in its JSON form (validated against the document on the server). */
export const RelPosJson = z.record(z.string(), z.unknown())

export const CommentMessage = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  /** "Deleted user" once the author's account is gone. */
  name: z.string(),
  content: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
})
export type CommentMessage = z.infer<typeof CommentMessage>

export const CommentThread = z.object({
  id: z.string(),
  docId: z.string(),
  path: z.string(),
  /** Current position in the file, if the anchor still exists. */
  line: z.number().nullable(),
  /** The commented text as it reads now (empty if it was deleted). */
  quote: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  resolved: z.object({ by: z.string().nullable(), name: z.string(), at: z.string() }).nullable(),
  messages: z.array(CommentMessage),
})
export type CommentThread = z.infer<typeof CommentThread>

export const TrackedChange = z.object({
  id: z.string(),
  docId: z.string(),
  path: z.string(),
  type: z.enum(['insert', 'delete']),
  line: z.number(),
  text: z.string(),
  userId: z.string(),
  name: z.string(),
  at: z.string(),
})
export type TrackedChange = z.infer<typeof TrackedChange>

export const ReviewState = z.object({
  trackChanges: TrackChangesState,
  threads: z.array(CommentThread),
  changes: z.array(TrackedChange),
  /** Display names for everyone who appears in the review (members and past authors). */
  users: z.record(z.string(), z.string()),
})
export type ReviewState = z.infer<typeof ReviewState>

export const CreateThreadBody = z.object({
  docId: z.string().min(1).max(64),
  start: RelPosJson,
  end: RelPosJson,
  content: z.string().trim().min(1).max(10_000),
})

export const MessageBody = z.object({ content: z.string().trim().min(1).max(10_000) })

/** Accept or reject tracked changes: listed ids, everything in one file, or everything. */
export const ChangeDecisionBody = z.object({
  docId: z.string().min(1).max(64).optional(),
  ids: z.array(z.string().min(1).max(64)).min(1).max(5000).optional(),
})
/** `undoId` takes the decision back for a while (POST …/review/changes/undo). */
export const ChangeDecisionResult = z.object({ count: z.number(), undoId: z.string().nullable() })

// ---------------------------------------------------------------------------
// Journal template conversion
// ---------------------------------------------------------------------------

export const ConvertTargetId = z.enum([
  'ieee-journal', 'ieee-conference', 'acm-sigconf', 'acm-journal', 'elsevier', 'elsevier-cas', 'elsevier-cas-dc', 'oup', 'lncs', 'revtex',
  'amsart', 'apa7', 'aastex', 'mnras', 'achemso', 'article',
])
export type ConvertTargetId = z.infer<typeof ConvertTargetId>

const Text = (max: number) => z.string().max(max)

export const ConvertAffiliation = z.object({
  id: z.string().min(1).max(20),
  raw: Text(500),
  department: Text(200).optional(),
  institution: Text(200).optional(),
  city: Text(100).optional(),
  country: Text(100).optional(),
})
export type ConvertAffiliation = z.infer<typeof ConvertAffiliation>

export const ConvertAuthor = z.object({
  name: Text(200).min(1),
  affiliations: z.array(z.string().max(20)).max(20),
  email: Text(200).optional(),
  orcid: Text(50).optional(),
  corresponding: z.boolean().optional(),
  note: Text(1000).optional(),
})
export type ConvertAuthor = z.infer<typeof ConvertAuthor>

/** The parts of the paper the author can review and correct before converting. */
export const ConvertMetadata = z.object({
  title: Text(1000),
  shortTitle: Text(300).optional(),
  authors: z.array(ConvertAuthor).max(200),
  affiliations: z.array(ConvertAffiliation).max(200),
  abstract: Text(20_000),
  keywords: z.array(Text(200)).max(50),
  acknowledgments: Text(10_000).optional(),
})
export type ConvertMetadata = z.infer<typeof ConvertMetadata>

export const ConvertOptions = z.object({
  review: z.boolean().optional(),
  journal: Text(200).optional(),
  venue: z.object({ name: Text(300).optional(), short: Text(100).optional(), date: Text(100).optional(), location: Text(200).optional() }).optional(),
})
export type ConvertOptions = z.infer<typeof ConvertOptions>

export const ConvertTarget = z.object({
  id: ConvertTargetId,
  label: z.string(),
  publisher: z.string(),
  description: z.string(),
  documentClass: z.string(),
  twoColumn: z.boolean(),
  review: z.boolean(),
  fields: z.array(z.object({ key: z.string(), label: z.string(), required: z.boolean(), placeholder: z.string().optional() })),
})
export type ConvertTarget = z.infer<typeof ConvertTarget>

export const ConvertAnalysis = z.object({
  rootFile: z.string(),
  sourceClass: z.string(),
  metadata: ConvertMetadata,
  hints: ConvertOptions,
  bibliography: z.enum(['bibtex', 'biblatex', 'inline', 'none']),
  notes: z.array(z.string()),
  targets: z.array(ConvertTarget),
})
export type ConvertAnalysis = z.infer<typeof ConvertAnalysis>

export const ConvertBody = z.object({
  target: ConvertTargetId,
  name: z.string().trim().min(1).max(200),
  metadata: ConvertMetadata,
  options: ConvertOptions.default({}),
})

/** What a build looks like, for comparing before and after a conversion. */
export const BuildSummary = z.object({
  buildId: z.string(),
  status: CompileStatus,
  errors: z.number(),
  warnings: z.number(),
  undefinedReferences: z.number(),
  undefinedCitations: z.number(),
  overfull: z.number(),
})
export type BuildSummary = z.infer<typeof BuildSummary>

export const ConvertReport = z.object({
  projectId: ProjectId,
  name: z.string(),
  target: ConvertTargetId,
  notes: z.array(z.object({ level: z.enum(['info', 'warning']), text: z.string() })),
  changedFiles: z.array(z.string()),
  build: BuildSummary.nullable(),
  /** The original project's build, for comparison. */
  baseline: BuildSummary.nullable(),
})
export type ConvertReport = z.infer<typeof ConvertReport>

// ---- Storage and backups (admin) ----

export const BackupSchedule = z.enum(['off', 'daily', 'weekly'])
export type BackupSchedule = z.infer<typeof BackupSchedule>

/** The WebDAV backup settings as admins see them; passwords are never sent back. */
export const BackupConfig = z.object({
  /** The WebDAV folder backups go to, e.g. https://cloud.example.org/remote.php/dav/files/me/ColTex/ */
  url: z.string(),
  username: z.string(),
  hasPassword: z.boolean(),
  /** Whether archives are encrypted (an encryption password is set). */
  encrypted: z.boolean(),
  schedule: BackupSchedule,
  /** Hour of day (0–23) in `timeZone`. */
  hour: z.number().int().min(0).max(23),
  /** Day of week for weekly backups, 0 = Sunday. */
  weekday: z.number().int().min(0).max(6),
  /** IANA time zone the schedule is in (the admin's browser zone when saved). */
  timeZone: z.string(),
  /** Backups kept on the server; older ones are deleted after a successful backup. */
  keep: z.number().int().min(1).max(365),
})
export type BackupConfig = z.infer<typeof BackupConfig>

/** Fields to change. Passwords: a string sets, null clears, absent keeps. */
export const BackupConfigPatch = z.object({
  url: z.union([z.url({ protocol: /^https?$/ }), z.literal('')]).optional(),
  username: z.string().max(200).optional(),
  password: z.string().max(500).nullable().optional(),
  encryptionPassword: z.string().min(8).max(500).nullable().optional(),
  schedule: BackupSchedule.optional(),
  hour: z.number().int().min(0).max(23).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  timeZone: z.string().max(64).optional(),
  keep: z.number().int().min(1).max(365).optional(),
})
export type BackupConfigPatch = z.infer<typeof BackupConfigPatch>

export const BackupRun = z.object({
  id: z.number(),
  trigger: z.enum(['manual', 'schedule']),
  status: z.enum(['running', 'success', 'failed']),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  /** File name on the WebDAV server. */
  file: z.string().nullable(),
  bytes: z.number().nullable(),
  projects: z.number().nullable(),
  error: z.string().nullable(),
})
export type BackupRun = z.infer<typeof BackupRun>

export const StorageInfo = z.object({
  driver: z.enum(['local', 's3']),
  /** A directory, or s3://bucket/prefix (endpoint). */
  location: z.string(),
})
export type StorageInfo = z.infer<typeof StorageInfo>

export const BackupState = z.object({
  config: BackupConfig,
  /** Newest first. */
  runs: z.array(BackupRun),
  nextRun: z.string().nullable(),
  storage: StorageInfo,
})
export type BackupState = z.infer<typeof BackupState>

// --- References: Zotero and DOI -------------------------------------------

/** The signed-in person's Zotero connection (the API key never comes back). */
export const ZoteroStatus = z.object({
  connected: z.boolean(),
  username: z.string().optional(),
})
export type ZoteroStatus = z.infer<typeof ZoteroStatus>

export const ZoteroConnectBody = z.object({ apiKey: z.string().trim().min(10).max(100) })

/** A Zotero library: user:<id> (the person's own) or group:<id>. */
export const ZoteroLibrary = z.object({ id: z.string(), name: z.string() })
export type ZoteroLibrary = z.infer<typeof ZoteroLibrary>

export const ZoteroCollection = z.object({
  key: z.string(),
  /** With its parents, e.g. "Thesis / Chapter 2". */
  name: z.string(),
})
export type ZoteroCollection = z.infer<typeof ZoteroCollection>

export const BibFormat = z.enum(['bibtex', 'biblatex'])

export const ZoteroImportBody = z.object({
  library: z.string().regex(/^(user|group):\d+$/),
  collection: z.string().regex(/^[A-Z0-9]{8}$/).optional(),
  path: z.string().min(1).max(500),
  format: BibFormat.default('bibtex'),
})
export type ZoteroImportBody = z.infer<typeof ZoteroImportBody>

/** A .bib file made from Zotero, which can be refreshed. */
export const ReferenceLink = z.object({
  path: z.string(),
  libraryName: z.string(),
  collectionName: z.string().nullable(),
  format: BibFormat,
  items: z.number(),
  linkedBy: z.string().nullable(),
  updatedAt: z.string(),
})
export type ReferenceLink = z.infer<typeof ReferenceLink>

export const ReferenceImportResult = z.object({ path: z.string(), items: z.number() })
export type ReferenceImportResult = z.infer<typeof ReferenceImportResult>

export const DoiBody = z.object({
  /** A DOI (10.xxx/…, also as a doi.org link) or an arXiv id. */
  id: z.string().trim().min(3).max(300),
  path: z.string().min(1).max(500),
})
export type DoiBody = z.infer<typeof DoiBody>

export const DoiResult = z.object({ path: z.string(), key: z.string(), entry: z.string() })
export type DoiResult = z.infer<typeof DoiResult>

/** A paper found by searching Crossref or arXiv; `id` is what DoiBody takes to add it. */
export const LiteratureHit = z.object({
  source: z.enum(['crossref', 'arxiv']),
  id: z.string(),
  doi: z.string().nullable(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  venue: z.string().nullable(),
})
export type LiteratureHit = z.infer<typeof LiteratureHit>

export const LiteratureSearchResult = z.object({
  hits: z.array(LiteratureHit),
  /** Sources that didn't answer this time. */
  unavailable: z.array(z.enum(['crossref', 'arxiv'])),
})
export type LiteratureSearchResult = z.infer<typeof LiteratureSearchResult>

// --- Git bridge --------------------------------------------------------------

/**
 * Personal access tokens, for the Git bridge and for AI tools over MCP.
 * Each says what it is for (`uses`), whether it may only read, which
 * projects it reaches (null: all of the person's) and when it expires.
 */
export const TokenUse = z.enum(['git', 'mcp'])
export type TokenUse = z.infer<typeof TokenUse>

export const GitToken = z.object({
  id: z.string(),
  name: z.string(),
  uses: z.array(TokenUse),
  readOnly: z.boolean(),
  /** null: every project of the person's; otherwise these (deleted ones left out). */
  projects: z.array(z.object({ id: z.string(), name: z.string() })).nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
})
export type GitToken = z.infer<typeof GitToken>

export const CreateGitTokenBody = z.object({
  name: z.string().trim().min(1).max(100),
  uses: z
    .array(TokenUse)
    .min(1)
    .default(['git', 'mcp'])
    .transform(u => [...new Set(u)]),
  readOnly: z.boolean().default(false),
  projectIds: z.array(ProjectId).min(1).max(200).nullable().default(null),
  expiresInDays: z.number().int().min(1).max(366).nullable().default(null),
})
export type CreateGitTokenBody = z.input<typeof CreateGitTokenBody>
/** The token itself is only in this response. */
export const CreatedGitToken = GitToken.extend({ token: z.string() })
export type CreatedGitToken = z.infer<typeof CreatedGitToken>

// --- AI permissions --------------------------------------------------------

/**
 * What AI agents may change for someone, the built-in AI agent and agents
 * connected over MCP alike (one setting per person, user's decision
 * 2026-10-23). `manual`: the built-in agent's edits wait in its draft until
 * the person applies them, an MCP agent's become the person's tracked
 * suggestions. `auto`: applied directly (the built-in agent's draft when its
 * turn ends). `full`: like auto, and files can be deleted and moved. The
 * person's role in each project caps it (see `permissionInProject`).
 */
export const AiPermission = z.enum(['manual', 'auto', 'full'])
export type AiPermission = z.infer<typeof AiPermission>

export const AiPermissionBody = z.object({ permission: AiPermission })
export type AiPermissionBody = z.infer<typeof AiPermissionBody>

/**
 * The permission that applies in a project: editors and owners get what they
 * chose, reviewers only suggestions, viewers nothing (null: read and comment).
 */
export function permissionInProject(chosen: AiPermission, role: ProjectRole): AiPermission | null {
  if (role === 'owner' || role === 'editor') return chosen
  if (role === 'reviewer') return 'manual'
  return null
}

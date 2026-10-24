import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path/posix'
import { fileURLToPath } from 'node:url'
import { and, asc, eq } from 'drizzle-orm'
import { AiSkillBody, RESERVED_SKILL_NAMES, type AiItem, type AiSaveProposedSkill, type AiSkill, type AiSkillSummary, type SkillSource } from '@coltex/shared'
import type { Db } from '../db/client.ts'
import { aiSkills } from '../db/schema.ts'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import { isJunk, readProjectZip } from '../projects/zip.ts'
import { cleanPath } from '../storage/paths.ts'

/** Reference files kept per skill: text only, so the agent can read them. */
const MAX_FILE_BYTES = 256 * 1024
const MAX_FILES_BYTES = 2 * 1024 * 1024
const MAX_FILES = 100
const ZIP_LIMITS = { maxEntries: 500, maxFileBytes: 5 * 1024 * 1024, maxTotalBytes: 20 * 1024 * 1024 }

/** Whose skill: one person's, or a project's (added by `userId`). */

/** A skill as the agent uses it. */
export type LoadedSkill = { name: string; description: string; body: string; scope: SkillSource; files: Record<string, string> }

/** A skill read from a SKILL.md (and its folder), before it is saved. */
export type ParsedSkill = { name: string; description: string; body: string; files: Record<string, string> }

// ---- SKILL.md -----------------------------------------------------------------

/**
 * The YAML front matter of a SKILL.md: top-level `key: value` pairs, quoted
 * or plain, and `|`/`>` block scalars. Enough for Agent Skills (name,
 * description; other keys such as license or allowed-tools are ignored).
 */
export function parseFrontMatter(src: string): { data: Record<string, string>; body: string } {
  const m = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src)
  if (!m) return { data: {}, body: src.replace(/^﻿/, '') }
  const lines = m[1]!.split(/\r?\n/)
  const data: Record<string, string> = {}
  for (let i = 0; i < lines.length; i++) {
    const key = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[i]!)
    if (!key) continue
    let value = key[2]!.trim()
    // Lines indented under the key: a block scalar, a continued plain scalar, or a nested map.
    const more: string[] = []
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]!) || lines[i + 1]!.trim() === '')) more.push(lines[++i]!)
    while (more.length && more.at(-1)!.trim() === '') more.pop()
    const block = /^([|>])[-+]?\d*$/.exec(value)
    if (block) {
      const indent = Math.min(...more.filter(l => l.trim()).map(l => l.length - l.trimStart().length))
      const body = more.map(l => l.slice(indent))
      value = block[1] === '|' ? body.join('\n') : body.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ')
    } else if (value.startsWith('"')) {
      value = [value, ...more.map(l => l.trim())].join(' ')
      try {
        value = JSON.parse(value.replace(/\s+#.*$/, '')) as string
      } catch {
        value = value.replace(/^"|"$/g, '')
      }
    } else if (value.startsWith("'")) {
      value = [value, ...more.map(l => l.trim())].join(' ').replace(/^'|'$/g, '').replace(/''/g, "'")
    } else if (value) {
      value = [value.replace(/\s+#.*$/, ''), ...more.map(l => l.trim())].join(' ')
    } else continue // a nested map (metadata:) or an empty value
    data[key[1]!] = value.trim()
  }
  return { data, body: src.slice(m[0].length) }
}

/** A valid skill name from whatever a file calls it ("My Skill" → "my-skill"). */
export function skillName(raw: string): string {
  const name = raw
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '')
  if (!name) return 'skill'
  return (RESERVED_SKILL_NAMES as readonly string[]).includes(name) ? `${name}-skill` : name
}

/** Read a SKILL.md. `fallbackName` (its folder or file name) is used when it has no name. */
export function parseSkillMarkdown(src: string, fallbackName: string, warnings: string[]): ParsedSkill {
  const { data, body } = parseFrontMatter(src)
  const name = skillName(data.name || fallbackName)
  if (data.name && name !== data.name) warnings.push(`Renamed “${data.name}” to ${name}`)
  let description = data.description?.trim() ?? ''
  if (!description) {
    // Agent Skills require one; the first line of text is the best guess.
    description = body.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean)?.slice(0, 300) ?? name
    warnings.push(`${name} has no description; used its first line`)
  }
  return { name, description: description.slice(0, 1024), body: body.trim(), files: {} }
}

/** UTF-8 text, or undefined for anything binary. */
function asText(data: Buffer): string | undefined {
  if (data.includes(0)) return undefined
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return undefined
  }
}

/**
 * Skills from a set of files keyed by relative path (a zip, a folder, or
 * files picked one by one): each folder with a SKILL.md is a skill, and the
 * files under it are its reference files (scripts are kept as text: the
 * agent can read them but nothing runs them). Binary files are skipped. A
 * single Markdown file picked on its own (`loose`) is taken as the skill
 * itself; in a zip it takes a SKILL.md.
 */
export function readSkillFiles(files: Map<string, Buffer>, fallbackName: string, warnings: string[], loose = false): ParsedSkill[] {
  const roots = [...files.keys()].filter(p => path.basename(p).toLowerCase() === 'skill.md').map(p => path.dirname(p))
  if (!roots.length) {
    const [only] = files
    if (loose && files.size === 1 && /\.(md|markdown)$/i.test(only![0])) {
      const text = asText(only![1])
      if (text === undefined) throw new BadRequestError(`${only![0]} is not a text file`)
      return [parseSkillMarkdown(text, path.basename(only![0]).replace(/\.(md|markdown)$/i, ''), warnings)]
    }
    throw new BadRequestError('No SKILL.md found')
  }
  // Each file belongs to the deepest skill folder it is in.
  const owner = (p: string) =>
    roots.filter(r => r === '.' || p.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0]
  const skills: ParsedSkill[] = []
  for (const root of roots) {
    const prefix = root === '.' ? '' : `${root}/`
    const md = [...files.keys()].find(p => owner(p) === root && p.slice(prefix.length).toLowerCase() === 'skill.md')!
    const text = asText(files.get(md)!)
    if (text === undefined) throw new BadRequestError(`${md} is not a text file`)
    const skill = parseSkillMarkdown(text, root === '.' ? fallbackName : path.basename(root), warnings)
    let total = 0
    for (const [p, data] of files) {
      if (p === md || owner(p) !== root) continue
      const rel = p.slice(prefix.length)
      const content = asText(data)
      if (content === undefined) {
        warnings.push(`${skill.name}: skipped ${rel} (not a text file)`)
        continue
      }
      if (data.length > MAX_FILE_BYTES || total + data.length > MAX_FILES_BYTES || Object.keys(skill.files).length >= MAX_FILES) {
        warnings.push(`${skill.name}: skipped ${rel} (too large)`)
        continue
      }
      total += data.length
      skill.files[rel] = content
    }
    skills.push(skill)
  }
  return skills
}

/** Reference files the agent drafted for a skill, checked against the same limits as uploads. */
export function draftedFiles(files: { path: string; content: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  let total = 0
  for (const f of files) {
    const p = cleanPath(f.path)
    if (p.toLowerCase() === 'skill.md') throw new BadRequestError('SKILL.md is the instructions themselves, not a reference file')
    const size = Buffer.byteLength(f.content)
    total += size
    if (size > MAX_FILE_BYTES) throw new BadRequestError(`${p} is larger than ${MAX_FILE_BYTES / 1024} KB`)
    if (total > MAX_FILES_BYTES) throw new BadRequestError(`The reference files add up to more than ${MAX_FILES_BYTES / 1048576} MB`)
    out[p] = f.content
  }
  if (Object.keys(out).length > MAX_FILES) throw new BadRequestError(`A skill can have at most ${MAX_FILES} reference files`)
  return out
}

/** Skills from a zip of one or more skill folders (see `readSkillFiles`). */
export async function readSkillZip(buffer: Buffer, fallbackName: string): Promise<{ skills: ParsedSkill[]; warnings: string[] }> {
  const archive = await readProjectZip(buffer, ZIP_LIMITS)
  const warnings = [...archive.warnings]
  return { skills: readSkillFiles(archive.files, fallbackName, warnings), warnings }
}

/** The most files and bytes accepted in one upload of separate files (as for a zip). */
export const UPLOAD_LIMITS = { maxFiles: ZIP_LIMITS.maxEntries, maxTotalBytes: ZIP_LIMITS.maxTotalBytes }

/** A skill as one SKILL.md (front matter plus instructions), for downloading. */
export function skillMarkdown(s: { name: string; description: string; body: string }): string {
  return `---\nname: ${s.name}\ndescription: ${JSON.stringify(s.description)}\n---\n\n${s.body}\n`
}

// ---- Built-in skills ------------------------------------------------------------

/** Skills shipped with ColTex: one folder each, as in an Agent Skills repository. */
export const BUILTIN_SKILLS_DIR = fileURLToPath(new URL('../../skills/', import.meta.url))

/** Read every skill folder under `dir` (licence files stay out of the skill's reference files). */
export function loadBuiltinSkills(dir: string): LoadedSkill[] {
  if (!fs.existsSync(dir)) return []
  const files = new Map<string, Buffer>()
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const rel = path.relative(dir.replaceAll('\\', '/'), `${entry.parentPath.replaceAll('\\', '/')}/${entry.name}`)
    if (isJunk(rel) || /^LICEN[CS]E/i.test(entry.name)) continue
    files.set(rel, fs.readFileSync(path.join(entry.parentPath, entry.name)))
  }
  const warnings: string[] = []
  const skills = files.size ? readSkillFiles(files, 'skill', warnings) : []
  if (warnings.length) throw new Error(`Built-in skills: ${warnings.join('; ')}`)
  return skills.map(s => ({ ...s, scope: 'builtin' as const })).sort((a, b) => a.name.localeCompare(b.name))
}

// ---- Store ----------------------------------------------------------------------

type Row = typeof aiSkills.$inferSelect

const mine = (userId: string) => eq(aiSkills.userId, userId)

/** AI skills (`ai_skills`): each person's own, for all their projects (user's decision 2026-10-24). */
export class SkillStore {
  private readonly db: Db
  /** Shipped with ColTex, read once: everyone with the AI agent can use them; nobody can change them. */
  readonly builtins: LoadedSkill[]
  private readonly loadedAt = new Date().toISOString()

  constructor(db: Db, builtinDir = BUILTIN_SKILLS_DIR) {
    this.db = db
    this.builtins = loadBuiltinSkills(builtinDir)
  }

  private builtinSkill(s: LoadedSkill): AiSkill {
    return {
      id: `builtin:${s.name}`,
      scope: 'builtin',
      name: s.name,
      description: s.description,
      body: s.body,
      files: Object.entries(s.files)
        .map(([p, text]) => ({ path: p, size: Buffer.byteLength(text) }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      updatedAt: this.loadedAt,
    }
  }

  /** Someone's own skills, then the built-in ones they haven't replaced with their own of the same name. */
  async listWithBuiltins(userId: string): Promise<AiSkill[]> {
    const own = await this.list(userId)
    const taken = new Set(own.map(s => s.name))
    return [...own, ...this.builtins.filter(b => !taken.has(b.name)).map(b => this.builtinSkill(b))]
  }

  private toSkill(row: Row): AiSkill {
    return {
      id: row.id,
      scope: 'personal',
      name: row.name,
      description: row.description,
      body: row.body,
      files: Object.entries(row.files)
        .map(([p, text]) => ({ path: p, size: Buffer.byteLength(text) }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async list(userId: string): Promise<AiSkill[]> {
    const rows = await this.db.select().from(aiSkills).where(mine(userId)).orderBy(asc(aiSkills.name))
    return rows.map(r => this.toSkill(r))
  }

  private async row(userId: string, name: string): Promise<Row> {
    const [row] = await this.db.select().from(aiSkills).where(and(mine(userId), eq(aiSkills.name, name)))
    if (!row) throw new NotFoundError('Skill not found')
    return row
  }

  async get(userId: string, name: string): Promise<AiSkill> {
    return this.toSkill(await this.row(userId, name))
  }

  /** The skill's reference files too, for downloading (a built-in one when the person has none of that name). */
  async full(userId: string, name: string): Promise<ParsedSkill> {
    const [row] = await this.db.select().from(aiSkills).where(and(mine(userId), eq(aiSkills.name, name)))
    if (row) return { name: row.name, description: row.description, body: row.body, files: row.files }
    const builtin = this.builtins.find(b => b.name === name)
    if (!builtin) throw new NotFoundError('Skill not found')
    return { name: builtin.name, description: builtin.description, body: builtin.body, files: builtin.files }
  }

  async exists(userId: string, name: string): Promise<boolean> {
    const [row] = await this.db.select({ id: aiSkills.id }).from(aiSkills).where(and(mine(userId), eq(aiSkills.name, name)))
    return !!row
  }

  async create(userId: string, body: AiSkillBody, files: Record<string, string> = {}): Promise<AiSkill> {
    const input = AiSkillBody.parse(body)
    if (await this.exists(userId, input.name)) throw new ConflictError(`A skill named ${input.name} already exists`)
    const [row] = await this.db
      .insert(aiSkills)
      .values({ id: crypto.randomUUID(), userId, ...input, files })
      .returning()
    return this.toSkill(row!)
  }

  /** Change a skill (renaming keeps its files; `files` replaces them). */
  async update(userId: string, name: string, body: AiSkillBody, files?: Record<string, string>): Promise<AiSkill> {
    const input = AiSkillBody.parse(body)
    const row = await this.row(userId, name)
    if (input.name !== name && (await this.exists(userId, input.name))) throw new ConflictError(`A skill named ${input.name} already exists`)
    const [updated] = await this.db
      .update(aiSkills)
      .set({ ...input, ...(files ? { files } : {}), updatedAt: new Date() })
      .where(eq(aiSkills.id, row.id))
      .returning()
    return this.toSkill(updated!)
  }

  async remove(userId: string, name: string): Promise<void> {
    const row = await this.row(userId, name)
    await this.db.delete(aiSkills).where(eq(aiSkills.id, row.id))
  }

  /**
   * Save imported skills. Names already taken are refused as a whole (nothing
   * saved) unless `replace`, which overwrites them.
   */
  async import(userId: string, skills: ParsedSkill[], replace: boolean): Promise<AiSkill[]> {
    const names = new Set<string>()
    for (const s of skills) {
      const parsed = AiSkillBody.safeParse(s)
      if (!parsed.success) throw new BadRequestError(`${s.name}: ${parsed.error.issues[0]?.message ?? 'invalid skill'}`)
      if (names.has(s.name)) throw new BadRequestError(`The archive has two skills named ${s.name}`)
      names.add(s.name)
    }
    if (!replace) {
      const taken = []
      for (const s of skills) if (await this.exists(userId, s.name)) taken.push(s.name)
      if (taken.length) throw new ConflictError(`Skills with these names already exist: ${taken.join(', ')}`)
    }
    await this.db.transaction(async tx => {
      for (const s of skills) {
        await tx.delete(aiSkills).where(and(mine(userId), eq(aiSkills.name, s.name)))
        await tx.insert(aiSkills).values({
          id: crypto.randomUUID(),
          userId,
          name: s.name,
          description: s.description,
          body: s.body,
          files: s.files,
        })
      }
    })
    const all = await this.list(userId)
    return all.filter(s => names.has(s.name))
  }

  /** The skills someone can use: the built-in ones and their own; one of theirs hides a built-in one of the same name. */
  async available(userId: string): Promise<LoadedSkill[]> {
    const own = await this.db.select().from(aiSkills).where(mine(userId))
    const byName = new Map<string, LoadedSkill>()
    for (const b of this.builtins) byName.set(b.name, b)
    for (const r of own) byName.set(r.name, { name: r.name, description: r.description, body: r.body, scope: 'personal', files: r.files })
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  async menu(userId: string): Promise<AiSkillSummary[]> {
    return (await this.available(userId)).map(s => ({ name: s.name, description: s.description, scope: s.scope }))
  }
}

/**
 * Save a skill the agent drafted in a conversation (as drafted, or edited by
 * the person), with the reference files drafted with it. A skill of the same
 * name is a conflict unless `replace`, which overwrites it (a new version).
 */
export async function saveDraftedSkill(
  store: SkillStore,
  userId: string,
  items: AiItem[],
  itemId: string,
  input: AiSaveProposedSkill,
  saved: (item: Extract<AiItem, { kind: 'skill' }>) => void,
): Promise<AiSkill> {
  const item = items.find(i => i.id === itemId)
  if (item?.kind !== 'skill') throw new NotFoundError('Skill draft not found')
  if (item.saved) throw new ConflictError('This skill is already saved')
  const body = AiSkillBody.parse(input)
  const files = item.files ?? {}
  const skill =
    input.replace && (await store.exists(userId, body.name))
      ? await store.update(userId, body.name, body, files)
      : await store.create(userId, body, files)
  saved({ ...item, ...body, saved: 'personal' })
  return skill
}

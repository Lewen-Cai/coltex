import { diffLines } from 'diff'
import type { AiChanges, AiItem, AiTrialCompile } from '@coltex/shared'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import { cleanPath, isTextPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import { findEditTarget, type MatchKind } from './match.ts'

type ChangedFile = { kind: 'modified' | 'created'; base: string; proposed: string }

/** Largest text the assistant may propose for one file (protects the browser diff view too). */
const MAX_FILE_CHARS = 2_000_000

export type TurnFile = Extract<AiItem, { kind: 'changes' }>['files'][number]

function countLines(before: string, after: string): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const part of diffLines(before, after)) {
    if (part.added) added += part.count ?? 0
    else if (part.removed) removed += part.count ?? 0
  }
  return { added, removed }
}


/** `path` is `root` or inside the folder `root`. */
const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`)

/**
 * The assistant's private draft: proposed contents of the files it edited,
 * each with the content it started from. Nothing here touches the project
 * until the author applies it.
 */
export class Changeset {
  private readonly projectId: string
  private readonly store: ProjectStore
  private readonly files = new Map<string, ChangedFile>()
  trial: AiTrialCompile | null = null
  /** The draft when the current turn started (proposed text per file). */
  private turnStart?: Map<string, string>
  /** Before-texts of the latest turn that changed something (see AiChanges.turn). */
  private turnBase: Record<string, string | null> | null = null

  constructor(projectId: string, store: ProjectStore) {
    this.projectId = projectId
    this.store = store
  }

  get size(): number {
    return this.files.size
  }

  has(path: string): boolean {
    return this.files.has(path)
  }

  paths(): string[] {
    return [...this.files.keys()]
  }

  private async readProject(path: string): Promise<string | undefined> {
    try {
      return (await this.store.readFile(this.projectId, path)).toString('utf8')
    } catch (err) {
      if (err instanceof NotFoundError) return undefined
      throw err
    }
  }

  static checkPath(raw: string): string {
    const path = cleanPath(raw)
    if (!isTextPath(path)) throw new BadRequestError(`${path} is not a text file the assistant can edit`)
    return path
  }

  /** The file as the assistant sees it: its proposed version if it changed it, else the project's. */
  async read(path: string): Promise<string | undefined> {
    return this.files.get(path)?.proposed ?? (await this.readProject(path))
  }

  /**
   * Replace `oldText` (found exactly, or after normalising quotes and
   * whitespace; see match.ts) with `newText`. `kind` says how it was found.
   */
  async edit(rawPath: string, oldText: string, newText: string): Promise<{ line: number; kind: MatchKind }> {
    const path = Changeset.checkPath(rawPath)
    if (!oldText) throw new BadRequestError('old_text is empty; use create_file for new files')
    const entry = this.files.get(path)
    const current = entry?.proposed ?? (await this.readProject(path))
    if (current === undefined) throw new NotFoundError(`${path} does not exist`)
    const found = findEditTarget(current, oldText)
    if ('error' in found) {
      if (found.error === 'ambiguous') {
        throw new BadRequestError(`old_text matches ${found.count} places in ${path}; include more surrounding lines so it is unique.`)
      }
      throw new BadRequestError(`old_text was not found in ${path}. Read the file again and copy the text exactly.`)
    }
    const { start, end, kind } = found.match
    const next = current.slice(0, start) + newText + current.slice(end)
    if (next.length > MAX_FILE_CHARS) throw new BadRequestError(`${path} would become too large`)
    this.set(path, entry ?? { kind: 'modified', base: current, proposed: current }, next)
    return { line: current.slice(0, start).split('\n').length, kind }
  }

  async create(rawPath: string, content: string): Promise<void> {
    const path = Changeset.checkPath(rawPath)
    if (content.length > MAX_FILE_CHARS) throw new BadRequestError(`${path} is too large`)
    const entry = this.files.get(path)
    if (entry?.kind === 'modified' || (!entry && (await this.readProject(path)) !== undefined)) {
      throw new ConflictError(`${path} already exists; use edit_file`)
    }
    this.files.set(path, { kind: 'created', base: '', proposed: content })
    this.trial = null
  }

  revert(rawPath: string): boolean {
    const removed = this.files.delete(cleanPath(rawPath))
    if (removed) this.trial = null
    return removed
  }

  /** A file or folder was deleted from the project (full access): drop its drafts. */
  forget(path: string): void {
    for (const p of [...this.files.keys()]) if (under(p, path)) this.files.delete(p)
    for (const p of [...(this.turnStart?.keys() ?? [])]) if (under(p, path)) this.turnStart!.delete(p)
    this.trial = null
  }

  /** A file or folder was moved in the project (full access): its drafts follow. */
  rename(from: string, to: string): void {
    const moved = (p: string) => to + p.slice(from.length)
    for (const [p, f] of [...this.files]) {
      if (!under(p, from)) continue
      this.files.delete(p)
      this.files.set(moved(p), f)
    }
    for (const [p, text] of [...(this.turnStart ?? [])]) {
      if (!under(p, from)) continue
      this.turnStart!.delete(p)
      this.turnStart!.set(moved(p), text)
    }
    this.trial = null
  }

  private set(path: string, entry: ChangedFile, proposed: string): void {
    // An edit that restores the original is no change at all.
    if (entry.kind === 'modified' && proposed === entry.base) this.files.delete(path)
    else this.files.set(path, { ...entry, proposed })
    this.trial = null
  }

  /** Files to lay over the project for a trial compile. */
  overlay(): Record<string, string> {
    return Object.fromEntries([...this.files].map(([path, f]) => [path, f.proposed]))
  }

  get(path: string): ChangedFile | undefined {
    return this.files.get(path)
  }

  clear(): void {
    this.files.clear()
    this.trial = null
    this.turnBase = null
  }

  /** Remember the draft as a turn starts, to tell later what the turn changed. */
  beginTurn(): void {
    this.turnStart = new Map([...this.files].map(([path, f]) => [path, f.proposed]))
  }

  /**
   * What the turn changed in the draft, file by file with line counts. Keeps
   * the before-texts for the "this turn" diff; a turn that changed nothing
   * leaves the previous turn's in place.
   */
  async endTurn(): Promise<TurnFile[]> {
    const start = this.turnStart
    this.turnStart = undefined
    if (!start) return []
    const summary: TurnFile[] = []
    const base: Record<string, string | null> = {}
    for (const path of new Set([...start.keys(), ...this.files.keys()])) {
      const now = this.files.get(path)
      const before = start.has(path) ? start.get(path)! : now?.kind === 'created' ? null : (now?.base ?? null)
      const after = now ? now.proposed : ((await this.readProject(path)) ?? '')
      if (before === after) continue
      summary.push({ path, kind: !now ? 'reverted' : before === null ? 'created' : 'modified', ...countLines(before ?? '', after) })
      if (now) base[path] = before
    }
    if (summary.length) this.turnBase = Object.keys(base).length ? base : null
    return summary
  }

  toJSON(): AiChanges {
    return {
      files: [...this.files].map(([path, f]) => ({ path, ...f })),
      trial: this.trial,
      turn: this.turnBase ? { base: this.turnBase } : null,
    }
  }
}

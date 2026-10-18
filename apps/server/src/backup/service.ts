import fs from 'node:fs/promises'
import path from 'node:path'
import { desc, eq, lt } from 'drizzle-orm'
import { BackupConfig, type BackupConfigPatch, type BackupRun, type BackupState, type StorageInfo } from '@coltex/shared'
import type { SecretBox } from '../ai/credentials.ts'
import type { CollabHooks } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { appSettings, backupRuns, projects } from '../db/schema.ts'
import { BadRequestError, ConflictError, NotFoundError } from '../errors.ts'
import type { SnapshotService } from '../history/snapshots.ts'
import type { ProjectStore } from '../storage/types.ts'
import { ARCHIVE_FORMAT, MANIFEST, writeArchive, type ArchiveEntry, type BackupManifest } from './archive.ts'
import { WebDav } from './webdav.ts'

const SETTINGS_KEY = 'backup'
/** pg advisory lock: one backup at a time, across server processes. */
const LOCK_KEY = 0x636f6c74
export const BACKUP_FILE = /^coltex-backup-\d{8}-\d{6}\.zip(\.enc)?$/
const RUNS_SHOWN = 20
const RUNS_KEPT = 200
/** A failed scheduled backup is retried after an hour, at most this many times per slot. */
const RETRY_MS = 3_600_000
const MAX_ATTEMPTS = 3
const TICK_MS = 60_000

/** What `app_settings.backup` holds. Passwords are sealed with the instance secret. */
type Stored = Omit<BackupConfig, 'hasPassword' | 'encrypted'> & {
  password: string | null
  encryption: string | null
  /** When the schedule last changed; earlier slots don't count as missed. */
  scheduledSince: string | null
}

const DEFAULTS: Stored = {
  url: '',
  username: '',
  password: null,
  encryption: null,
  schedule: 'off',
  hour: 3,
  weekday: 1,
  timeZone: 'UTC',
  keep: 14,
  scheduledSince: null,
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STEP_MS = 15 * 60_000

/**
 * The scheduled time nearest to `from` in `direction` (the latest at or before
 * it, or the first after it), or null when nothing is scheduled. Walks in
 * 15-minute steps so half-hour time zones and DST changes come out right.
 */
export function scheduleSlot(cfg: Pick<BackupConfig, 'schedule' | 'hour' | 'weekday' | 'timeZone'>, from: Date, direction: -1 | 1): Date | null {
  if (cfg.schedule === 'off') return null
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timeZone, hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
  let t = direction < 0 ? Math.floor(from.getTime() / STEP_MS) * STEP_MS : (Math.floor(from.getTime() / STEP_MS) + 1) * STEP_MS
  for (let i = 0; i < (8 * 86_400_000) / STEP_MS; i++, t += direction * STEP_MS) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(t)).map(p => [p.type, p.value]))
    if (Number(parts.hour) === cfg.hour && parts.minute === '00' && (cfg.schedule === 'daily' || parts.weekday === WEEKDAYS[cfg.weekday])) return new Date(t)
  }
  return null
}

function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** coltex-backup-20261017-030000.zip, in UTC. */
function fileName(at: Date, encrypted: boolean): string {
  const stamp = at.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  return `coltex-backup-${stamp}.zip${encrypted ? '.enc' : ''}`
}

type Row = typeof backupRuns.$inferSelect

function toRun(r: Row): BackupRun {
  return {
    id: r.id,
    trigger: r.trigger,
    status: r.status,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
    file: r.file,
    bytes: r.bytes,
    projects: r.projects,
    error: r.error,
  }
}

export type BackupOptions = {
  /** Scratch space for the archive while it is built and uploaded. */
  tmpDir: string
  instanceSecret: string
  secretFromEnv: boolean
  version: string
  storage: StorageInfo
  /** Write a plain SQL dump of the database to the given file (pg_dump). */
  dumpDatabase: (file: string) => Promise<void>
}

/**
 * Backups to a WebDAV folder: the database (pg_dump), every project's files
 * (read through the ProjectStore, so S3 works too) and its history (a git
 * bundle per project, and its Git bridge repository) in one zip, optionally encrypted. Runs on demand and on
 * a schedule; keeps the latest `keep` archives on the server.
 */
export class BackupService {
  private readonly db: Db
  private readonly store: ProjectStore
  private readonly collab: Pick<CollabHooks, 'flushProject'>
  private readonly snapshots: Pick<SnapshotService, 'bundle'>
  /** The Git bridge's repositories: people's clones know their commits. */
  private readonly box: SecretBox
  private readonly opts: BackupOptions
  private timer: NodeJS.Timeout | undefined
  /** The backup this process is running, if any. */
  private current: Promise<void> | undefined

  constructor(
    deps: {
      db: Db
      store: ProjectStore
      collab: Pick<CollabHooks, 'flushProject'>
      snapshots: Pick<SnapshotService, 'bundle'>
      box: SecretBox
    },
    opts: BackupOptions,
  ) {
    this.db = deps.db
    this.store = deps.store
    this.collab = deps.collab
    this.snapshots = deps.snapshots
    this.box = deps.box
    this.opts = opts
  }

  /** Check every minute whether a scheduled backup is due. */
  start(): void {
    void this.cleanUpInterrupted().catch(err => console.error('backup: cleaning up interrupted runs failed', err))
    this.timer = setInterval(() => {
      this.tick().catch(err => console.error('backup: scheduled run failed to start', err))
    }, TICK_MS)
    this.timer.unref()
  }

  stop(): void {
    clearInterval(this.timer)
  }

  /** Wait for a backup this process started (tests, shutdown). */
  async idle(): Promise<void> {
    await this.current
  }

  /** Runs left 'running' by a process that stopped mid-backup. */
  private async cleanUpInterrupted(): Promise<void> {
    await this.withLock(async () => {
      await this.db
        .update(backupRuns)
        .set({ status: 'failed', finishedAt: new Date(), error: 'Interrupted: the server stopped during the backup' })
        .where(eq(backupRuns.status, 'running'))
    })
  }

  private async stored(): Promise<Stored> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, SETTINGS_KEY))
    return { ...DEFAULTS, ...(row?.value as Partial<Stored> | undefined) }
  }

  private view(s: Stored): BackupConfig {
    return {
      url: s.url,
      username: s.username,
      hasPassword: s.password !== null,
      encrypted: s.encryption !== null,
      schedule: s.schedule,
      hour: s.hour,
      weekday: s.weekday,
      timeZone: s.timeZone,
      keep: s.keep,
    }
  }

  async state(now = new Date()): Promise<BackupState> {
    const s = await this.stored()
    const runs = await this.db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt), desc(backupRuns.id)).limit(RUNS_SHOWN)
    return {
      config: this.view(s),
      runs: runs.map(toRun),
      nextRun: s.url ? (scheduleSlot(s, now, 1)?.toISOString() ?? null) : null,
      storage: this.opts.storage,
    }
  }

  private merge(s: Stored, patch: BackupConfigPatch): Stored {
    if (patch.timeZone !== undefined && !validTimeZone(patch.timeZone)) throw new BadRequestError(`Unknown time zone: ${patch.timeZone}`)
    const next: Stored = { ...s }
    for (const k of ['url', 'username', 'schedule', 'hour', 'weekday', 'timeZone', 'keep'] as const) {
      if (patch[k] !== undefined) (next as Record<string, unknown>)[k] = patch[k]
    }
    if (patch.password !== undefined) next.password = patch.password === null || patch.password === '' ? null : this.box.seal(patch.password)
    if (patch.encryptionPassword !== undefined) next.encryption = patch.encryptionPassword === null ? null : this.box.seal(patch.encryptionPassword)
    return next
  }

  async save(patch: BackupConfigPatch, now = new Date()): Promise<BackupConfig> {
    const s = await this.stored()
    const next = this.merge(s, patch)
    if (next.schedule !== 'off' && !next.url) throw new BadRequestError('Set the WebDAV folder before scheduling backups')
    if ((['schedule', 'hour', 'weekday', 'timeZone'] as const).some(k => next[k] !== s[k])) next.scheduledSince = now.toISOString()
    await this.db
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, value: next })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedAt: now } })
    return this.view(next)
  }

  private client(s: Stored): WebDav {
    if (!s.url) throw new BadRequestError('Set the WebDAV folder first')
    return new WebDav({ url: s.url, username: s.username, password: s.password ? this.box.open(s.password) : '' })
  }

  /** Check that the folder exists (or can be made) and is writable, with unsaved changes applied. */
  async test(patch: BackupConfigPatch): Promise<void> {
    const dav = this.client(this.merge(await this.stored(), patch))
    try {
      await dav.ensureFolder()
      await dav.put('.coltex-write-test', 'ColTex checks that it can write here; this file is deleted right away.\n')
      await dav.remove('.coltex-write-test')
    } catch (err) {
      throw new BadRequestError((err as Error).message)
    }
  }

  /** Run `fn` holding the backup lock, or return false when someone else holds it. */
  private async withLock(fn: () => Promise<void>): Promise<boolean> {
    const client = await this.db.$client.connect()
    let locked = false
    try {
      locked = (await client.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [LOCK_KEY])).rows[0]!.ok
      if (locked) await fn()
      return locked
    } finally {
      if (locked) await client.query('select pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {})
      client.release()
    }
  }

  /** Start a backup and return its run; it carries on in the background, holding the lock. */
  async run(trigger: BackupRun['trigger']): Promise<BackupRun> {
    const s = await this.stored()
    if (!s.url) throw new BadRequestError('Set the WebDAV folder first')
    if (this.current) throw new ConflictError('A backup is already running')
    const client = await this.db.$client.connect()
    let locked = false
    const release = async () => {
      if (locked) await client.query('select pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {})
      client.release()
    }
    let run: Row
    try {
      locked = (await client.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [LOCK_KEY])).rows[0]!.ok
      if (!locked) throw new ConflictError('A backup is already running')
      ;[run] = (await this.db.insert(backupRuns).values({ trigger, status: 'running' }).returning()) as [Row]
    } catch (err) {
      await release()
      throw err
    }
    this.current = this.perform(run, s).finally(async () => {
      await release()
      this.current = undefined
    })
    await this.db.delete(backupRuns).where(lt(backupRuns.id, run.id - RUNS_KEPT))
    return toRun(run)
  }

  /** Start a scheduled backup if one is due. */
  async tick(now = new Date()): Promise<boolean> {
    if (this.current) return false
    const s = await this.stored()
    const slot = scheduleSlot(s, now, -1)
    if (!s.url || !slot || (s.scheduledSince && slot < new Date(s.scheduledSince))) return false
    const since = (await this.db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt)).limit(MAX_ATTEMPTS + 1)).filter(r => r.startedAt >= slot)
    if (since.some(r => r.status !== 'failed') || since.length >= MAX_ATTEMPTS) return false
    if (since[0] && now.getTime() - since[0].startedAt.getTime() < RETRY_MS) return false
    try {
      await this.run('schedule')
      return true
    } catch (err) {
      if (err instanceof ConflictError) return false
      throw err
    }
  }

  private async perform(run: Row, s: Stored): Promise<void> {
    await fs.mkdir(this.opts.tmpDir, { recursive: true })
    const work = await fs.mkdtemp(path.join(this.opts.tmpDir, 'backup-'))
    try {
      const password = s.encryption ? this.box.open(s.encryption) : undefined
      const name = fileName(run.startedAt, !!password)
      const dav = this.client(s)
      // Fail before the heavy work if the server can't be reached.
      await dav.ensureFolder()

      const dump = path.join(work, 'database.sql')
      await this.opts.dumpDatabase(dump)

      const ids = (await this.db.select({ id: projects.id }).from(projects)).map(r => r.id)
      const entries: ArchiveEntry[] = []
      for (const id of ids) {
        // Live edits reach the store first.
        await this.collab.flushProject(id).catch(() => {})
        const tree = await this.store.listTree(id).catch(err => {
          if (err instanceof NotFoundError) return null
          throw err
        })
        if (tree) {
          entries.push({ name: `projects/${id}/`, folder: true })
          for (const folder of tree.folders) entries.push({ name: `projects/${id}/${folder}/`, folder: true })
          for (const f of tree.files) {
            entries.push({
              name: `projects/${id}/${f.path}`,
              // Deleted since the listing: keep the archive going.
              read: () => this.store.readFile(id, f.path).catch(err => (err instanceof NotFoundError ? Buffer.alloc(0) : Promise.reject(err))),
            })
          }
        }
        const bundle = path.join(work, `${id}.bundle`)
        if (await this.snapshots.bundle(id, bundle)) entries.push({ name: `history/${id}.bundle`, file: bundle })
      }

      const secret: BackupManifest['secret'] = this.opts.secretFromEnv ? 'environment' : password ? 'included' : 'omitted'
      const manifest: BackupManifest = {
        format: ARCHIVE_FORMAT,
        createdAt: run.startedAt.toISOString(),
        version: this.opts.version,
        storage: this.opts.storage.driver,
        projects: ids,
        secret,
      }
      entries.unshift({ name: MANIFEST, buffer: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }, { name: 'database.sql', file: dump })
      if (secret === 'included') entries.push({ name: 'secret', buffer: Buffer.from(this.opts.instanceSecret) })

      const archive = path.join(work, name)
      const bytes = await writeArchive(archive, entries, { password })
      await dav.upload(name, archive)

      const listed = await dav.list()
      const remote = listed.find(f => f.name === name)
      if (!remote) throw new Error('The uploaded backup is not in the WebDAV folder')
      if (Number.isFinite(remote.size) && remote.size !== bytes) throw new Error(`The uploaded backup has ${remote.size} bytes on the server instead of ${bytes}`)

      const old = listed
        .map(f => f.name)
        .filter(n => BACKUP_FILE.test(n))
        .sort()
        .reverse()
        .slice(s.keep)
      for (const n of old) await dav.remove(n).catch(err => console.warn(`backup: could not delete old backup ${n}`, err))

      await this.db.update(backupRuns).set({ status: 'success', finishedAt: new Date(), file: name, bytes, projects: ids.length }).where(eq(backupRuns.id, run.id))
    } catch (err) {
      console.error('backup failed', err)
      await this.db
        .update(backupRuns)
        .set({ status: 'failed', finishedAt: new Date(), error: (err as Error).message.slice(0, 2000) })
        .where(eq(backupRuns.id, run.id))
    } finally {
      await fs.rm(work, { recursive: true, force: true })
    }
  }
}

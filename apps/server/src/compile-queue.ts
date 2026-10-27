import { Queue, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'
import { customAlphabet } from 'nanoid'
import {
  CLEANUP_QUEUE,
  COMPILE_QUEUE,
  COMPILER_RESOURCES_KEY,
  CompileResult,
  PAGE_QUEUE,
  PageJob,
  PageResult,
  SYNCTEX_QUEUE,
  SynctexResult,
  TEXLIVE_QUEUE,
  TexLookupResult,
  CompileJob,
  WORD_QUEUE,
  WordJob,
  WordResult,
  type CleanupJob,
  type CompileJobInput,
  type SynctexJob,
  type TexLookupJob,
} from '@coltex/shared'
import { config } from './config.ts'
import { ServiceUnavailableError } from './errors.ts'

const buildSuffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6)
const SYNCTEX_TIMEOUT_MS = 15_000
const PAGE_TIMEOUT_MS = 30_000
/** Converting a large PDF manual to text the first time takes a while. */
const TEXLIVE_TIMEOUT_MS = 90_000
/** The compiler stops pandoc after two minutes; this covers the copy and the queue. */
const WORD_TIMEOUT_MS = 180_000

export type CompilerContainer = { name: string; used: number; limit: number | null; cpu: number | null; cpus: number | null }

export type QueueStats = {
  workers: number
  /** Builds the workers run at once now (each reports its own). */
  slots: number
  waiting: number
  active: number
  failed: number
  /** Round trip of a Valkey ping, or null when it didn't answer. */
  valkeyMs: number | null
  /** Container memory (and CPU: % of its CPUs, null on the first report) each worker reported in the last 15 s. */
  containers: CompilerContainer[]
}

/** Producer side of the queues served by the compiler worker. */
export class CompileQueue {
  private readonly connection: Redis
  private readonly eventsConnection: Redis
  private readonly compileQueue: Queue<CompileJob, CompileResult>
  private readonly synctexQueue: Queue<SynctexJob, SynctexResult>
  private readonly compileEvents: QueueEvents
  private readonly synctexEvents: QueueEvents
  private readonly pageQueue: Queue<PageJob, PageResult>
  private readonly pageEvents: QueueEvents
  private readonly texliveQueue: Queue<TexLookupJob, TexLookupResult>
  private readonly texliveEvents: QueueEvents
  private readonly cleanupQueue: Queue<CleanupJob>
  private readonly wordQueue: Queue<WordJob, WordResult>
  private readonly wordEvents: QueueEvents
  /** Each project's latest build, which the next one waits for (see compile()). */
  private readonly projectTail = new Map<string, Promise<unknown>>()
  /** Told about every finished build (the admin overview records them). */
  onBuild: ((ms: number, status: string) => void) | undefined
  /** Runs before each build, so the compiler reads current files (the S3 driver's local copy). */
  beforeCompile: ((projectId: string) => Promise<void>) | undefined

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null })
    this.eventsConnection = new Redis(redisUrl, { maxRetriesPerRequest: null })
    this.compileQueue = new Queue(COMPILE_QUEUE, { connection: this.connection })
    this.synctexQueue = new Queue(SYNCTEX_QUEUE, { connection: this.connection })
    this.compileEvents = new QueueEvents(COMPILE_QUEUE, { connection: this.eventsConnection })
    this.synctexEvents = new QueueEvents(SYNCTEX_QUEUE, { connection: this.eventsConnection.duplicate() })
    this.pageQueue = new Queue(PAGE_QUEUE, { connection: this.connection })
    this.pageEvents = new QueueEvents(PAGE_QUEUE, { connection: this.eventsConnection.duplicate() })
    this.texliveQueue = new Queue(TEXLIVE_QUEUE, { connection: this.connection })
    this.texliveEvents = new QueueEvents(TEXLIVE_QUEUE, { connection: this.eventsConnection.duplicate() })
    this.cleanupQueue = new Queue(CLEANUP_QUEUE, { connection: this.connection })
    this.wordQueue = new Queue(WORD_QUEUE, { connection: this.connection })
    this.wordEvents = new QueueEvents(WORD_QUEUE, { connection: this.eventsConnection.duplicate() })
  }

  /**
   * Have the compiler remove a deleted project's compile directory and
   * outputs. Not awaited by anyone: the job waits in Valkey if no worker is
   * running and is done when one starts.
   */
  async forget(projectId: string): Promise<void> {
    await this.cleanupQueue.add('cleanup', { projectId }, { removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
  }

  /**
   * Build a project. One job per project is in the queue at a time: the
   * compiler builds a project's jobs one after another, and a job waiting for
   * that would hold a slot other projects could use (trial builds of the AI
   * agent next to the author's own).
   */
  compile(input: Omit<CompileJobInput, 'buildId'>, signal?: AbortSignal): Promise<CompileResult> {
    return this.serial(input.projectId, () => this.runCompile(input, signal), signal)
  }

  /** Run after the project's earlier jobs (builds and exports) have finished. */
  private serial<T>(projectId: string, run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const before = this.projectTail.get(projectId) ?? Promise.resolve()
    const result = before.catch(() => {}).then(run)
    this.projectTail.set(projectId, result)
    const settled = () => {
      if (this.projectTail.get(projectId) === result) this.projectTail.delete(projectId)
    }
    result.then(settled, settled)
    if (!signal) return result
    // Stopped while an earlier job of the project runs: answer now; run() then skips it.
    return Promise.race([result, new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))])
  }

  /** Turn a project into a .docx (pandoc, in the compiler); the file is in the outputs directory. */
  word(input: Omit<WordJob, 'exportId'>): Promise<WordResult> {
    return this.serial(input.projectId, async () => {
      if ((await this.wordQueue.getWorkersCount()) === 0) {
        throw new ServiceUnavailableError('No compiler worker is running')
      }
      await this.beforeCompile?.(input.projectId)
      await this.wordEvents.waitUntilReady()
      const exportId = `${Date.now().toString(36)}-${buildSuffix()}`
      const job = await this.wordQueue.add('word', WordJob.parse({ ...input, exportId }), { removeOnComplete: true, removeOnFail: 100 })
      try {
        return WordResult.parse(await job.waitUntilFinished(this.wordEvents, WORD_TIMEOUT_MS))
      } catch (err) {
        await job.remove().catch(() => {})
        throw err
      }
    })
  }

  private async runCompile(input: Omit<CompileJobInput, 'buildId'>, signal?: AbortSignal): Promise<CompileResult> {
    signal?.throwIfAborted()
    if ((await this.compileQueue.getWorkersCount()) === 0) {
      throw new ServiceUnavailableError('No compiler worker is running')
    }
    await this.beforeCompile?.(input.projectId)
    const buildId = `${Date.now().toString(36)}-${buildSuffix()}`
    // Listen before adding: a job that finishes (and is removed) first would never be seen.
    await this.compileEvents.waitUntilReady()
    const job = await this.compileQueue.add('compile', CompileJob.parse({ ...input, buildId }), { removeOnComplete: 200, removeOnFail: 200 })
    const started = Date.now()
    let onAbort: (() => void) | undefined
    try {
      // Allow some slack on top of the compiler's own timeout for queueing/sync.
      const finished = job.waitUntilFinished(this.compileEvents, config.compileTimeoutMs + 60_000)
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(signal!.reason)
        signal?.addEventListener('abort', onAbort, { once: true })
      })
      const result = CompileResult.parse(await Promise.race([finished, aborted]))
      this.sample(started, result.status)
      return result
    } catch (err) {
      // Nobody waits for it any more: a job that hasn't started yet shouldn't take a slot later.
      await job.remove().catch(() => {})
      this.sample(started, 'error')
      throw err
    } finally {
      if (onAbort) signal?.removeEventListener('abort', onAbort)
    }
  }

  private sample(started: number, status: string): void {
    this.onBuild?.(Date.now() - started, status)
  }

  async synctex(input: SynctexJob): Promise<SynctexResult> {
    if ((await this.synctexQueue.getWorkersCount()) === 0) {
      throw new ServiceUnavailableError('No compiler worker is running')
    }
    await this.synctexEvents.waitUntilReady()
    const job = await this.synctexQueue.add('synctex', input, { removeOnComplete: true, removeOnFail: 100 })
    return SynctexResult.parse(await job.waitUntilFinished(this.synctexEvents, SYNCTEX_TIMEOUT_MS))
  }

  /** A page of a build as a PNG (for the AI agent to look at the layout). */
  async renderPage(input: Omit<PageJob, 'dpi'> & { dpi?: number }): Promise<PageResult> {
    if ((await this.pageQueue.getWorkersCount()) === 0) {
      throw new ServiceUnavailableError('No compiler worker is running')
    }
    await this.pageEvents.waitUntilReady()
    const job = await this.pageQueue.add('page', PageJob.parse(input), { removeOnComplete: true, removeOnFail: 100 })
    return PageResult.parse(await job.waitUntilFinished(this.pageEvents, PAGE_TIMEOUT_MS))
  }

  /** Read or search an installed TeX Live file or package documentation (for the assistant). */
  async texLookup(input: TexLookupJob): Promise<TexLookupResult> {
    if ((await this.texliveQueue.getWorkersCount()) === 0) {
      throw new ServiceUnavailableError('No compiler worker is running')
    }
    await this.texliveEvents.waitUntilReady()
    const job = await this.texliveQueue.add('lookup', input, { removeOnComplete: true, removeOnFail: 100 })
    return TexLookupResult.parse(await job.waitUntilFinished(this.texliveEvents, TEXLIVE_TIMEOUT_MS))
  }

  /**
   * Whether a compiler worker has the package manuals (the full edition), so
   * the assistant is offered texlive_doc only where it can find something.
   */
  async hasManuals(): Promise<boolean> {
    const reports = await this.connection.hgetall(COMPILER_RESOURCES_KEY).catch(() => ({}) as Record<string, string>)
    return Object.values(reports).some(json => {
      try {
        const r = JSON.parse(json) as { at: number; manuals?: boolean }
        return Date.now() - r.at < 15_000 && r.manuals === true
      } catch {
        return false
      }
    })
  }

  /** Workers online, jobs by state, Valkey latency and the workers' resources, for the admin overview. */
  async stats(): Promise<QueueStats> {
    const pinged = Date.now()
    const valkeyMs = await Promise.race([
      this.connection.ping().then(() => Date.now() - pinged),
      new Promise<null>(r => setTimeout(() => r(null), 2000).unref()),
    ]).catch(() => null)
    if (valkeyMs === null) return { workers: 0, slots: 0, waiting: 0, active: 0, failed: 0, valkeyMs, containers: [] }
    const [workers, counts, reports] = await Promise.all([
      this.compileQueue.getWorkersCount(),
      this.compileQueue.getJobCounts('waiting', 'active', 'failed'),
      this.connection.hgetall(COMPILER_RESOURCES_KEY),
    ])
    let slots = 0
    const containers = Object.entries(reports).flatMap(([name, json]) => {
      try {
        const r = JSON.parse(json) as { used: number; limit: number | null; cpu?: number | null; cpus?: number; at: number; slots?: number }
        if (Date.now() - r.at >= 15_000) return []
        slots += r.slots ?? 0
        return [{ name, used: r.used, limit: r.limit, cpu: r.cpu ?? null, cpus: r.cpus ?? null }]
      } catch {
        return []
      }
    })
    return { workers, slots, waiting: counts.waiting ?? 0, active: counts.active ?? 0, failed: counts.failed ?? 0, valkeyMs, containers }
  }

  async close(): Promise<void> {
    await Promise.all([this.compileEvents.close(), this.synctexEvents.close(), this.pageEvents.close(), this.texliveEvents.close(), this.wordEvents.close()])
    await Promise.all([this.compileQueue.close(), this.synctexQueue.close(), this.pageQueue.close(), this.texliveQueue.close(), this.cleanupQueue.close(), this.wordQueue.close()])
    this.connection.disconnect()
    this.eventsConnection.disconnect()
  }
}

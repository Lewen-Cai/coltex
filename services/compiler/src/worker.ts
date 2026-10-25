import fs from 'node:fs/promises'
import path from 'node:path'
import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import {
  CLEANUP_QUEUE,
  COMPILE_QUEUE,
  CleanupJob,
  CompileJob,
  OUTPUT,
  SYNCTEX_QUEUE,
  SynctexJob,
  TEXLIVE_QUEUE,
  TexLookupJob,
  WORD_QUEUE,
  WordJob,
  type WordResult,
  type CompileResult,
  type Diagnostic,
  type SynctexResult,
  type TexLookupResult,
} from '@coltex/shared'
import { parseBibLog, parseLatexLog } from '@coltex/log-parser'
import { config } from './config.ts'
import { syncProject } from './sync.ts'
import { runLatexmk } from './latexmk.ts'
import { synctex } from './synctex.ts'
import { texLookup } from './texlive.ts'
import { reportResources } from './resources.ts'
import { writeOverlay } from './overlay.ts'
import { toWord } from './word.ts'
import { Slots } from './slots.ts'

/** Serialise builds of the same project; different projects run in parallel. */
const projectLocks = new Map<string, Promise<unknown>>()
function withProjectLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const prev = projectLocks.get(projectId) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  projectLocks.set(projectId, next)
  // Not .finally(): its promise rejects with a failed job's error, and an
  // unhandled rejection ends the whole worker (every build in it).
  const release = () => {
    if (projectLocks.get(projectId) === next) projectLocks.delete(projectId)
  }
  next.then(release, release)
  return next
}

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    return undefined
  }
}

async function mtime(file: string): Promise<number | undefined> {
  return fs.stat(file).then(st => st.mtimeMs, () => undefined)
}

/** The options of the last build in a compile directory (see build()). */
const OPTIONS_FILE = '.coltex-build-options'

/** Marks a trial build's output directory, so trials don't push real builds out. */
const TRIAL_MARKER = '.trial'

async function pruneBuilds(projectOutputDir: string, keep: number): Promise<void> {
  const entries = await fs.readdir(projectOutputDir, { withFileTypes: true }).catch(() => [])
  const dirs = await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(async e => {
        const full = path.join(projectOutputDir, e.name)
        const trial = await fs.access(path.join(full, TRIAL_MARKER)).then(() => true, () => false)
        return { full, trial, mtime: (await fs.stat(full)).mtimeMs }
      }),
  )
  dirs.sort((a, b) => b.mtime - a.mtime)
  for (const trial of [false, true]) {
    for (const d of dirs.filter(x => x.trial === trial).slice(keep)) await fs.rm(d.full, { recursive: true, force: true })
  }
}

async function compile(job: CompileJob): Promise<CompileResult> {
  const started = Date.now()
  const srcDir = path.join(config.projectsDir, job.projectId)
  const projectWorkDir = path.join(config.workDir, job.projectId)
  const outDir = path.join(config.outputsDir, job.projectId, job.buildId)
  // Trial builds run in a throwaway copy seeded from the project's compile
  // directory (so aux files make them fast) and never touch the real one.
  const workDir = job.overlay ? path.join(config.workDir, '.trials', job.buildId) : projectWorkDir

  // A build queued before its project was deleted: leave nothing behind.
  if (!(await fs.stat(srcDir).then(s => s.isDirectory(), () => false))) throw new Error('Project not found')

  try {
    if (job.overlay) {
      await fs.rm(workDir, { recursive: true, force: true })
      await fs.mkdir(path.dirname(workDir), { recursive: true })
      await fs.cp(projectWorkDir, workDir, { recursive: true }).catch(() => fs.mkdir(workDir, { recursive: true }))
      await syncProject(srcDir, workDir)
      await writeOverlay(workDir, job.overlay)
    } else {
      if (job.clean) await fs.rm(workDir, { recursive: true, force: true })
      await syncProject(srcDir, workDir)
    }
    return await build(job, workDir, outDir, started)
  } finally {
    if (job.overlay) await fs.rm(workDir, { recursive: true, force: true })
  }
}

async function build(job: CompileJob, workDir: string, outDir: string, started: number): Promise<CompileResult> {
  // Switching engine, draft mode or error handling must rebuild even if no source changed.
  const options = JSON.stringify({ engine: job.engine, draft: job.draft, stopOnFirstError: job.stopOnFirstError })
  const optionsFile = path.join(workDir, OPTIONS_FILE)
  const force = (await readIfExists(optionsFile)) !== options
  const pdfBefore = await mtime(path.join(workDir, OUTPUT.pdf))
  const run = await runLatexmk(workDir, job.rootFile, job.engine, config.timeoutMs, {
    draft: job.draft,
    stopOnFirstError: job.stopOnFirstError,
    force,
  })
  await fs.writeFile(optionsFile, options)

  await fs.mkdir(outDir, { recursive: true })
  if (job.overlay) await fs.writeFile(path.join(outDir, TRIAL_MARKER), '')
  const outputFiles: string[] = []
  // A run that stopped before writing a PDF (e.g. at the first error) leaves the
  // previous one behind; it only counts if this run wrote it or nothing needed rebuilding.
  const pdfFresh = run.exitCode === 0 || (await mtime(path.join(workDir, OUTPUT.pdf))) !== pdfBefore
  for (const name of Object.values(OUTPUT)) {
    if (name === OUTPUT.pdf && !pdfFresh) continue
    try {
      await fs.copyFile(path.join(workDir, name), path.join(outDir, name))
      outputFiles.push(name)
    } catch {}
  }
  await pruneBuilds(path.dirname(outDir), config.keepBuilds)

  const diagnostics: Diagnostic[] = []
  const log = await readIfExists(path.join(workDir, OUTPUT.log))
  if (log) diagnostics.push(...parseLatexLog(log, workDir))
  const blg = await readIfExists(path.join(workDir, OUTPUT.blg))
  if (blg) diagnostics.push(...parseBibLog(blg, workDir))

  const hasPdf = outputFiles.includes(OUTPUT.pdf)
  const status = run.timedOut ? 'timeout' : run.exitCode === 0 && hasPdf ? 'success' : 'failure'
  return {
    buildId: job.buildId,
    status,
    outputFiles,
    diagnostics,
    durationMs: Date.now() - started,
    message: run.timedOut
      ? `Compile exceeded ${config.timeoutMs / 1000}s and was stopped`
      : !log
        ? run.output.slice(-2000)
        : undefined,
  }
}

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null })

const slots = new Slots(config.concurrency)

const worker = new Worker<CompileJob, CompileResult>(
  COMPILE_QUEUE,
  async job => {
    const data = CompileJob.parse(job.data)
    return slots.track(() => withProjectLock(data.projectId, () => compile(data)))
  },
  { connection, concurrency: await slots.initial() },
)
const stopSlots = slots.follow(worker)

// SyncTeX lookups are quick and interactive, so they get their own queue and
// never wait behind long compiles.
const synctexWorker = new Worker<SynctexJob, SynctexResult>(
  SYNCTEX_QUEUE,
  job => synctex(SynctexJob.parse(job.data), { workDir: config.workDir, outputsDir: config.outputsDir }),
  { connection, concurrency: 4 },
)

// The assistant's lookups in TeX Live (package sources and documentation).
const texliveWorker = new Worker<TexLookupJob, TexLookupResult>(
  TEXLIVE_QUEUE,
  job => texLookup(TexLookupJob.parse(job.data), { workDir: config.workDir }),
  { connection, concurrency: 2 },
)

// Word exports (pandoc), under the project lock like builds: they read the same sources.
const wordWorker = new Worker<WordJob, WordResult>(
  WORD_QUEUE,
  job => {
    const data = WordJob.parse(job.data)
    return withProjectLock(data.projectId, () => toWord(data, config))
  },
  { connection, concurrency: 2 },
)

// A deleted project's compile directory and outputs. Under the project lock, so
// a build still running finishes first and its files go too.
const cleanupWorker = new Worker<CleanupJob>(
  CLEANUP_QUEUE,
  job => {
    const { projectId } = CleanupJob.parse(job.data)
    return withProjectLock(projectId, async () => {
      await fs.rm(path.join(config.workDir, projectId), { recursive: true, force: true })
      await fs.rm(path.join(config.outputsDir, projectId), { recursive: true, force: true })
    })
  },
  { connection, concurrency: 2 },
)

const stopReporting = reportResources(connection, () => worker.concurrency)

worker.on('ready', () => console.log(`[compiler] ready, ${slots.describe()}`))
for (const w of [worker, synctexWorker, texliveWorker, wordWorker, cleanupWorker]) {
  w.on('failed', (job, err) => console.error(`[compiler] ${w.name} job ${job?.id} failed:`, err))
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    stopReporting()
    stopSlots()
    await Promise.all([worker.close(), synctexWorker.close(), texliveWorker.close(), wordWorker.close(), cleanupWorker.close()])
    await connection.quit()
    process.exit(0)
  })
}

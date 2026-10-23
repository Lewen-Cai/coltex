import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

/** The first wait before starting the program again after it stopped on its own; it doubles with each failure in a row. */
const RESTART_DELAY_MS = 5000
const MAX_RESTART_DELAY_MS = 5 * 60_000
/** A run this long counts as having worked: the next failure starts from the first wait again. */
const STABLE_RUN_MS = 2 * 60_000

type Launch = { args: string[]; env: Record<string, string> }

/**
 * A program the server keeps running while it is turned on (tailscaled,
 * cloudflared): started on demand, restarted when it exits (waiting longer
 * each time it fails again), stopped with the server. Keeps its last lines
 * of output for when it fails.
 *
 * There is never more than one: starts and stops run one after another,
 * every start ends the previous run (or its pending restart) first, and a
 * restart is only for the launch it was scheduled for. (Two cloudflareds once
 * ran side by side: a new start while the old one waited to restart left the
 * timer behind, and both fought over the metrics port.)
 */
export class Supervised {
  private readonly binary: string
  private child?: ChildProcess
  private wanted = false
  private restartTimer?: NodeJS.Timeout
  private installedCache?: boolean
  private launch?: Launch
  /** Starts and stops in the order they were asked for. */
  private queue: Promise<void> = Promise.resolve()
  /** Runs in a row that ended on their own soon after starting. */
  private failures = 0
  /** The last lines the program printed. */
  readonly lines: string[] = []
  /** Called for every line of output (to pick out addresses, errors…). */
  onLine?: (line: string) => void
  /** Called before each start (to clear what the last run learned). */
  onStart?: () => void
  /** How long to wait before the next start, when the output calls for a different wait (a rate limit). */
  restartDelay?: (lines: string[], failures: number) => number | undefined

  private readonly firstDelay: number

  /** `restartDelayMs`: the first wait (tests shorten it). */
  constructor(binary: string, restartDelayMs = RESTART_DELAY_MS) {
    this.binary = binary
    this.firstDelay = restartDelayMs
  }

  /** Whether the program can be run here (the Docker image has it; a development machine may not). */
  installed(): boolean {
    this.installedCache ??= spawnSync(this.binary, ['--version'], { stdio: 'ignore' }).status === 0
    return this.installedCache
  }

  running(): boolean {
    return !!this.child && this.child.exitCode === null
  }

  wantedOn(): boolean {
    return this.wanted
  }

  /** What it printed last (each line once), when it isn't running although it should be. */
  lastError(): string | null {
    if (!this.wanted || this.running() || !this.lines.length) return null
    return [...new Set(this.lines.slice(-6))].slice(-3).join('\n')
  }

  /**
   * Start it (again, if the arguments changed) and keep it running. The same
   * arguments while it waits to restart keep the wait, so asking again can't
   * get round a rate limit.
   */
  start(args: string[], env: Record<string, string> = {}): Promise<void> {
    return this.serial(async () => {
      const same = this.wanted && JSON.stringify(this.launch) === JSON.stringify({ args, env })
      if (same && (this.running() || this.restartTimer)) return
      await this.kill()
      this.wanted = true
      this.launch = { args, env }
      this.failures = 0
      this.spawn(this.launch)
    })
  }

  stop(): Promise<void> {
    return this.serial(async () => {
      this.wanted = false
      await this.kill()
    })
  }

  private serial(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task)
    this.queue = run.catch(() => {})
    return run
  }

  /** End the current run and any pending restart. */
  private async kill(): Promise<void> {
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.restartTimer = undefined
    const child = this.child
    // Let go of it first, so its exit doesn't schedule a restart.
    this.child = undefined
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    await new Promise<void>(resolve => {
      const force = setTimeout(() => child.kill('SIGKILL'), 5000)
      child.once('exit', () => {
        clearTimeout(force)
        resolve()
      })
      child.kill('SIGTERM')
    })
  }

  private spawn(launch: Launch): void {
    this.lines.length = 0
    this.onStart?.()
    const started = Date.now()
    const child = spawn(this.binary, launch.args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...launch.env } })
    this.child = child
    const keep = (chunk: Buffer) => {
      for (const raw of chunk.toString('utf8').split('\n')) {
        const line = raw.trim()
        if (!line) continue
        this.lines.push(line)
        if (this.lines.length > 80) this.lines.shift()
        this.onLine?.(line)
      }
    }
    child.stdout?.on('data', keep)
    child.stderr?.on('data', keep)
    child.on('error', err => this.lines.push(err.message))
    child.on('exit', () => {
      // Ended by kill(), or a later start took over.
      if (this.child !== child) return
      this.child = undefined
      if (!this.wanted || this.launch !== launch) return
      // Stopped on its own while it should run: start it again, later each time it fails again.
      this.failures = Date.now() - started >= STABLE_RUN_MS ? 1 : this.failures + 1
      const backoff = Math.min(MAX_RESTART_DELAY_MS, this.firstDelay * 2 ** (this.failures - 1))
      const delay = this.restartDelay?.(this.lines, this.failures) ?? backoff
      this.restartTimer = setTimeout(() => {
        this.restartTimer = undefined
        if (this.wanted && this.launch === launch && !this.child) this.spawn(launch)
      }, delay)
    })
  }
}

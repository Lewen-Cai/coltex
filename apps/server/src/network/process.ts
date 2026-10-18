import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

/** Wait this long before starting the program again after it stopped on its own. */
const RESTART_DELAY_MS = 5000

/**
 * A program the server keeps running while it is turned on (tailscaled,
 * cloudflared): started on demand, restarted when it exits, stopped with the
 * server. Keeps its last lines of output for when it fails.
 */
export class Supervised {
  private readonly binary: string
  private child?: ChildProcess
  private wanted = false
  private restartTimer?: NodeJS.Timeout
  private installedCache?: boolean
  private launch?: { args: string[]; env: Record<string, string> }
  /** The last lines the program printed. */
  readonly lines: string[] = []
  /** Called for every line of output (to pick out addresses, errors…). */
  onLine?: (line: string) => void
  /** Called before each start (to clear what the last run learned). */
  onStart?: () => void

  constructor(binary: string) {
    this.binary = binary
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

  /** What it printed last, when it isn't running although it should be. */
  lastError(): string | null {
    return this.wanted && !this.running() && this.lines.length ? this.lines.slice(-3).join('\n') : null
  }

  /** Start it (again, if the arguments changed) and keep it running. */
  async start(args: string[], env: Record<string, string> = {}): Promise<void> {
    const same = this.launch && JSON.stringify(this.launch) === JSON.stringify({ args, env })
    if (this.running() && same) return
    if (this.running()) await this.kill()
    this.wanted = true
    this.launch = { args, env }
    this.spawn()
  }

  async stop(): Promise<void> {
    this.wanted = false
    await this.kill()
  }

  private async kill(): Promise<void> {
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.restartTimer = undefined
    const child = this.child
    if (!child || child.exitCode !== null) return
    await new Promise<void>(resolve => {
      const force = setTimeout(() => child.kill('SIGKILL'), 5000)
      child.once('exit', () => {
        clearTimeout(force)
        resolve()
      })
      child.kill('SIGTERM')
    })
  }

  private spawn(): void {
    const launch = this.launch!
    this.lines.length = 0
    this.onStart?.()
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
      if (this.child === child) this.child = undefined
      // Stopped on its own while it should run: start it again shortly.
      if (this.wanted && this.launch === launch) this.restartTimer = setTimeout(() => this.wanted && this.spawn(), RESTART_DELAY_MS)
    })
  }
}

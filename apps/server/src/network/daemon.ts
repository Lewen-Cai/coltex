import fs from 'node:fs/promises'
import path from 'node:path'
import { Supervised } from './process.ts'

/** How long tailscaled may take to open its socket. */
const START_TIMEOUT_MS = 20_000

/**
 * tailscaled run by the server itself (the server image ships it), so an
 * administrator turns Tailscale on from Settings → Network: no extra
 * container, no Docker socket. Userspace networking needs no privileges; it
 * runs as the server's user, which is what lets the server change its
 * settings over the socket (tailscaled takes changes only from its own user).
 * Its state (the device's keys) lives in DATA_DIR/tailscale, outside backups.
 */
export class TailscaleDaemon {
  readonly socket: string
  private readonly stateDir: string
  private readonly proc: Supervised

  constructor(opts: { stateDir: string; binary: string }) {
    this.stateDir = opts.stateDir
    this.socket = path.join(opts.stateDir, 'tailscaled.sock')
    this.proc = new Supervised(opts.binary)
  }

  installed(): boolean {
    return this.proc.installed()
  }

  running(): boolean {
    return this.proc.running()
  }

  /** What tailscaled printed last, when it isn't running although it should be. */
  lastError(): string | null {
    return this.proc.lastError()
  }

  /** Start tailscaled (and keep it running) and wait for its socket. */
  async start(): Promise<void> {
    if (!this.proc.running()) {
      await fs.mkdir(this.stateDir, { recursive: true, mode: 0o700 })
      await fs.rm(this.socket, { force: true })
    }
    await this.proc.start(['--tun=userspace-networking', `--statedir=${this.stateDir}`, `--socket=${this.socket}`])
    // Failed and waiting to start again: its state shows why.
    if (!this.proc.running()) return
    const until = Date.now() + START_TIMEOUT_MS
    while (Date.now() < until) {
      const ready = await fs.stat(this.socket).then(
        s => s.isSocket(),
        () => false,
      )
      if (ready) return
      await new Promise(r => setTimeout(r, 200))
    }
    throw new Error(`tailscaled did not start${this.proc.lines.length ? `: ${this.proc.lines.slice(-2).join(' ')}` : ''}`)
  }

  /** Stop tailscaled. Its state stays, so starting again reconnects without signing in. */
  stop(): Promise<void> {
    return this.proc.stop()
  }
}

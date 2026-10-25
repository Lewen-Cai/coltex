import type { Worker } from 'bullmq'
import { containerCpus, containerMemory } from './resources.ts'

const GiB = 1024 ** 3
/** At most this many builds at once, however large the machine. */
const MAX_SLOTS = 8
/** A build is given about this much memory when counting how many fit. */
const PER_BUILD = GiB
/** Below this much free memory no new build starts until one finishes. */
const LOW_MEMORY = 768 * 1024 ** 2
const CHECK_MS = 5000

/**
 * How many builds this worker runs at once. A fixed COMPILE_CONCURRENCY is
 * kept as it is. Otherwise it is one per CPU, as many as fit in the
 * container's memory limit, and it drops to the builds already running while
 * free memory is low, so a busy compiler slows down instead of being killed
 * for running out of memory.
 */
export class Slots {
  private readonly fixed: number | null
  private ceiling = 1
  private active = 0

  constructor(fixed: number | null) {
    this.fixed = fixed
  }

  async initial(): Promise<number> {
    if (this.fixed) return this.fixed
    const cpus = Math.floor(await containerCpus())
    const memory = await containerMemory()
    const fit = memory?.limit ? Math.floor(memory.limit / PER_BUILD) : MAX_SLOTS
    this.ceiling = Math.max(1, Math.min(MAX_SLOTS, cpus, fit))
    return this.ceiling
  }

  track<T>(fn: () => Promise<T>): Promise<T> {
    this.active++
    return fn().finally(() => this.active--)
  }

  /** Re-check free memory every few seconds (not with a fixed number). */
  follow(worker: Worker): () => void {
    if (this.fixed) return () => {}
    const check = async () => {
      const memory = await containerMemory()
      if (!memory?.limit) return
      const low = memory.limit - memory.used < LOW_MEMORY
      const next = low ? Math.max(1, Math.min(this.ceiling, this.active)) : this.ceiling
      if (worker.concurrency !== next) worker.concurrency = next
    }
    const timer = setInterval(() => void check().catch(() => {}), CHECK_MS)
    timer.unref()
    return () => clearInterval(timer)
  }

  describe(): string {
    return this.fixed ? `concurrency=${this.fixed}` : `up to ${this.ceiling} builds at once`
  }
}

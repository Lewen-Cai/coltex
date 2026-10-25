import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Builds of different projects must not see each other. TeX itself can read
 * any file (TeX Live made openin_any a no-op) and latexmk runs a project's
 * latexmkrc, which is Perl, so a build is untrusted code. The worker runs as
 * root in the container with a few capabilities (compose) and starts every
 * program a build runs as a user of the project's own, which has none:
 *
 * - /data/projects is the server's and 0700 (the worker copies sources);
 * - /work is 0711 and each compile directory 0700, its project's;
 * - /data/outputs is 0711 and each project's outputs group-readable by its
 *   project's group only, owned by the server's user (who serves them);
 * - children get a short environment (no Valkey password), a process limit,
 *   and whatever is left of a project's processes is killed after its run.
 *
 * Without root (a worker run by hand) nothing is switched: builds aren't
 * isolated then, which the worker says when it starts.
 */

export type User = { uid: number; gid: number }

export const isolated = process.getuid?.() === 0

const int = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isInteger(n) && n >= 0 ? n : fallback
}

/** The server's user, who owns the data folders and reads the outputs. */
export const serverUser: User = { uid: int(process.env.COLTEX_UID, 1000), gid: int(process.env.COLTEX_GID, 1000) }

/** TeX Live lookups (package sources and manuals) and their caches. */
export const lookupUser: User = { uid: 9_999_999, gid: 9_999_999 }

/**
 * A project's own user and group, the same on every start. From a hash of
 * the id: a collision (two projects sharing one) is about one in a million
 * for a thousand projects.
 */
export function projectUser(projectId: string): User {
  const n = crypto.createHash('sha256').update(projectId).digest().readUInt32BE(0) % 1_000_000_000
  const uid = 10_000_000 + n
  return { uid, gid: uid }
}

/** Options for spawn/execFile: run as `user` when the worker can switch. */
export function runAs(user: User): { uid?: number; gid?: number } {
  return isolated ? { uid: user.uid, gid: user.gid } : {}
}

/** Processes a single project may have at once (RLIMIT_NPROC is per user). */
const MAX_PROCESSES = 256

/** The command line that starts `command` with the process limit (prlimit), when isolated. */
export function limited(command: string, args: string[]): [string, string[]] {
  return isolated ? ['prlimit', [`--nproc=${MAX_PROCESSES}`, '--', command, ...args]] : [command, args]
}

/** What a build's programs get from the environment: nothing of the worker's own. */
export function childEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const keep = ['PATH', 'LANG', 'LC_ALL', 'TEXLIVE_INSTALL_NO_CONTEXT_CACHE', 'NOPERLDOC', 'TZ']
  const env: NodeJS.ProcessEnv = {}
  for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k]
  return { ...env, ...extra }
}

/** Give a tree to `user` (the worker writes files as root). Symbolic links are changed, not followed. */
export async function ownTree(dir: string, user: User, mode?: { dir: number; file: number }): Promise<void> {
  if (!isolated) return
  const walk = async (p: string, isDir: boolean) => {
    await fs.lchown(p, user.uid, user.gid)
    if (mode) await fs.chmod(p, isDir ? mode.dir : mode.file)
    if (!isDir) return
    for (const e of await fs.readdir(p, { withFileTypes: true })) {
      if (e.isSymbolicLink()) await fs.lchown(path.join(p, e.name), user.uid, user.gid)
      else await walk(path.join(p, e.name), e.isDirectory())
    }
  }
  const st = await fs.lstat(dir).catch(() => undefined)
  if (st && !st.isSymbolicLink()) await walk(dir, st.isDirectory())
}

/** A compile directory: its project's alone. */
export async function ownWorkDir(dir: string, user: User): Promise<void> {
  if (!isolated) return
  await ownTree(dir, user)
  await fs.chmod(dir, 0o700)
}

/** A project's outputs: the server's, readable by the project's group (SyncTeX runs as the project). */
export async function shareOutputs(dir: string, user: User): Promise<void> {
  await ownTree(dir, { uid: serverUser.uid, gid: user.gid }, { dir: 0o750, file: 0o640 })
}

/**
 * Kill what is left of a user's processes (a build may start ones that leave
 * its process group). Run only when that project has nothing running.
 */
export async function killUser(user: User): Promise<void> {
  if (!isolated) return
  for (const name of await fs.readdir('/proc').catch(() => [])) {
    if (!/^\d+$/.test(name)) continue
    const st = await fs.stat(`/proc/${name}`).catch(() => undefined)
    if (st?.uid !== user.uid) continue
    try {
      process.kill(Number(name), 'SIGKILL')
    } catch {}
  }
}

/** biber unpacks itself (PAR) into a cache; the image has a read-only one all projects share. */
const BIBER_CACHE = '/opt/biber-par'
let biberCache: string | null | undefined

async function sharedBiber(): Promise<string | null> {
  if (biberCache !== undefined) return biberCache
  const top = await fs.readdir(BIBER_CACHE).catch(() => [])
  for (const user of top.filter(n => n.startsWith('par-'))) {
    const caches = (await fs.readdir(path.join(BIBER_CACHE, user)).catch(() => [])).filter(n => n.startsWith('cache-'))
    if (caches[0]) return (biberCache = path.join(BIBER_CACHE, user, caches[0]))
  }
  return (biberCache = null)
}

/**
 * PAR_GLOBAL_TMPDIR for a build in `cwd`: its own folder (PAR wants a private
 * one), holding a link to the shared cache, so biber isn't unpacked (160 MB)
 * once per project. Without the shared cache it unpacks into the folder.
 */
export async function parTmp(cwd: string, user: User): Promise<string> {
  const dir = path.join(cwd, '.par')
  const shared = await sharedBiber()
  if (shared) {
    // PAR names the folder after the user; one without a name (ours) is "SYSTEM".
    const own = path.join(dir, path.basename(path.dirname(shared)))
    await fs.mkdir(own, { recursive: true, mode: 0o700 })
    const link = path.join(own, path.basename(shared))
    if (!(await fs.lstat(link).catch(() => undefined))) await fs.symlink(shared, link)
    await fs.chmod(own, 0o700)
  } else {
    await fs.mkdir(dir, { recursive: true })
  }
  await ownTree(dir, user)
  return dir
}

/**
 * At start: /work and the outputs closed to builds, compile directories left
 * by earlier versions (owned by the worker's old user) made private.
 */
export async function prepare(dirs: { workDir: string; outputsDir: string }): Promise<void> {
  if (!isolated) {
    console.warn('[compiler] not running as root: builds of different projects are not isolated from each other')
    return
  }
  await fs.mkdir(dirs.workDir, { recursive: true })
  await fs.chown(dirs.workDir, 0, 0)
  await fs.chmod(dirs.workDir, 0o711)
  for (const e of await fs.readdir(dirs.workDir, { withFileTypes: true })) {
    const full = path.join(dirs.workDir, e.name)
    if (!e.isDirectory()) continue
    if (e.name === '.texmf-var' || e.name === '.texdoc-cache') await ownTree(full, lookupUser)
    else if (e.name.startsWith('.')) await ownTree(full, { uid: 0, gid: 0 })
    if (e.name.startsWith('.')) await fs.chmod(full, e.name === '.trials' || e.name === '.word' ? 0o711 : 0o700)
    else await ownWorkDir(full, projectUser(e.name))
  }
  for (const d of ['.trials', '.word']) {
    await fs.mkdir(path.join(dirs.workDir, d), { recursive: true, mode: 0o711 })
    await fs.chmod(path.join(dirs.workDir, d), 0o711)
  }
  for (const d of ['.texmf-var', '.texdoc-cache']) {
    await fs.mkdir(path.join(dirs.workDir, d), { recursive: true })
    await ownTree(path.join(dirs.workDir, d), lookupUser)
    await fs.chmod(path.join(dirs.workDir, d), 0o700)
  }
  await fs.chmod(dirs.outputsDir, 0o711)
  for (const e of await fs.readdir(dirs.outputsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const full = path.join(dirs.outputsDir, e.name)
    if (e.name.startsWith('.')) await ownTree(full, serverUser, { dir: 0o700, file: 0o600 })
    else await shareOutputs(full, projectUser(e.name))
  }
}

export type RunResult = { exitCode: number | null; timedOut: boolean; output: string }

/**
 * Run a build's program (latexmk, pandoc) as `user`, in its own process
 * group, keeping the tail of what it prints. It is done when the program
 * exits: processes it left behind (in the group or not) may still hold its
 * output open, so they don't keep the build waiting; they are killed. After
 * `timeoutMs` everything of the run is killed.
 */
export function runProcess(command: string, args: string[], o: { cwd: string; env: NodeJS.ProcessEnv; user?: User; timeoutMs: number }): Promise<RunResult> {
  return new Promise(resolve => {
    const [cmd, cmdArgs] = o.user ? limited(command, args) : [command, args]
    const child = spawn(cmd, cmdArgs, { cwd: o.cwd, detached: true, env: o.env, stdio: ['ignore', 'pipe', 'pipe'], ...(o.user ? runAs(o.user) : {}) })
    let output = ''
    const append = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-20_000)
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    const killGroup = () => {
      try {
        process.kill(-child.pid!, 'SIGKILL')
      } catch {}
    }
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killGroup()
      if (o.user) void killUser(o.user)
    }, o.timeoutMs)
    let done = false
    const finish = (exitCode: number | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      child.stdout.destroy()
      child.stderr.destroy()
      killGroup()
      resolve({ exitCode, timedOut, output })
    }
    child.on('exit', code => {
      // What is still buffered arrives with 'close'; a leftover process holding the pipes
      // would keep that from ever coming.
      const grace = setTimeout(() => finish(code), 500)
      child.once('close', () => {
        clearTimeout(grace)
        finish(code)
      })
    })
    child.on('error', err => {
      output = String(err)
      finish(null)
    })
  })
}

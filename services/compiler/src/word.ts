import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORD_CITATION_STYLES, type WordJob, type WordResult } from '@coltex/shared'
import { syncProject } from './sync.ts'
import { writeOverlay } from './overlay.ts'

const PANDOC_DIR = fileURLToPath(new URL('../pandoc/', import.meta.url))
/** Exports wait here until the server has sent them on (it deletes them). */
export const EXPORTS = '.exports'
/** What the server didn't pick up (it stopped) is removed after this long. */
const KEEP_MS = 10 * 60_000
const TIMEOUT_MS = 120_000

/** A project path inside the scratch copy, or an error for one that leaves it. */
function inside(root: string, rel: string): string {
  const full = path.resolve(root, rel)
  if (path.isAbsolute(rel) || !full.startsWith(root + path.sep)) throw new Error(`Invalid path: ${rel}`)
  return full
}

async function removeOld(dir: string): Promise<void> {
  const entries = await fs.readdir(dir).catch(() => [])
  for (const name of entries) {
    const full = path.join(dir, name)
    const st = await fs.stat(full).catch(() => undefined)
    if (st && Date.now() - st.mtimeMs > KEEP_MS) await fs.rm(full, { force: true })
  }
}

/**
 * Turn a project into a .docx with pandoc, in a scratch copy of its sources
 * (plus the server's wrapper with the front matter). pandoc can't run
 * anything from the document; the filter is ColTex's own.
 */
export async function toWord(job: WordJob, dirs: { projectsDir: string; workDir: string; outputsDir: string }): Promise<WordResult> {
  const srcDir = path.join(dirs.projectsDir, job.projectId)
  if (!(await fs.stat(srcDir).then(s => s.isDirectory(), () => false))) throw new Error('Project not found')
  const scratch = path.join(dirs.workDir, '.word', job.exportId)
  const outDir = path.join(dirs.outputsDir, EXPORTS)
  const file = `${job.exportId}.docx`
  try {
    await fs.rm(scratch, { recursive: true, force: true })
    await syncProject(srcDir, scratch)
    await writeOverlay(scratch, job.overlay)
    const entry = inside(scratch, job.entry)
    const args = [
      // pandoc's own advice for untrusted input: a memory ceiling.
      '+RTS', '-M1024m', '-RTS',
      path.basename(entry),
      '--from=latex',
      '--to=docx+native_numbering',
      '--standalone',
      '--number-sections',
      '--citeproc',
      `--lua-filter=${path.join(PANDOC_DIR, 'word.lua')}`,
      `--resource-path=.${path.delimiter}${scratch}`,
      `--output=${path.join(outDir, file)}`,
    ]
    if (job.reference) args.push(`--reference-doc=${inside(scratch, job.reference)}`)
    if (job.csl) {
      const builtin = (WORD_CITATION_STYLES as readonly string[]).includes(job.csl)
      args.push(`--csl=${builtin ? path.join(PANDOC_DIR, 'csl', `${job.csl}.csl`) : inside(scratch, job.csl)}`)
    }
    await fs.mkdir(outDir, { recursive: true })
    await removeOld(outDir)
    const run = await runPandoc(path.dirname(entry), args)
    if (run.timedOut) throw new Error(`The export took longer than ${TIMEOUT_MS / 1000}s and was stopped`)
    if (run.exitCode !== 0) throw new Error(run.output.trim().split('\n').slice(-5).join('\n') || `pandoc exited with ${run.exitCode}`)
    const warnings = run.output
      .split('\n')
      .filter(l => l.startsWith('[WARNING]'))
      .map(l => l.replace(/^\[WARNING\]\s*/, ''))
      .slice(0, 50)
    return { exportId: job.exportId, file: `${EXPORTS}/${file}`, warnings }
  } finally {
    await fs.rm(scratch, { recursive: true, force: true })
  }
}

function runPandoc(cwd: string, args: string[]): Promise<{ exitCode: number | null; timedOut: boolean; output: string }> {
  return new Promise(resolve => {
    const child = spawn('pandoc', args, { cwd, detached: true, env: { ...process.env, HOME: cwd }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const append = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-20_000)
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      // The filter starts pdftoppm and Ghostscript: the whole group goes.
      try {
        process.kill(-child.pid!, 'SIGKILL')
      } catch {}
    }, TIMEOUT_MS)
    child.on('close', exitCode => {
      clearTimeout(timer)
      resolve({ exitCode, timedOut, output })
    })
    child.on('error', err => {
      clearTimeout(timer)
      resolve({ exitCode: null, timedOut: false, output: String(err) })
    })
  })
}

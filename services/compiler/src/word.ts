import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORD_CITATION_STYLES, type WordJob, type WordResult } from '@coltex/shared'
import { syncProject } from './sync.ts'
import { writeOverlay } from './overlay.ts'
import { prepareSources } from './word-source.ts'
import { childEnv, killUser, ownTree, ownWorkDir, projectUser, runProcess, serverUser, type RunResult, type User } from './sandbox.ts'

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
    await prepareSources(scratch)
    const user = projectUser(job.projectId)
    await ownWorkDir(scratch, user)
    const entry = inside(scratch, job.entry)
    // pandoc runs as the project and can't write the outputs; the worker moves the file there.
    const written = path.join(scratch, '.coltex-word.docx')
    const args = [
      // pandoc's own advice for untrusted input: a memory ceiling.
      '+RTS', '-M1024m', '-RTS',
      path.basename(entry),
      '--from=latex',
      '--to=docx+native_numbering',
      '--standalone',
      ...(job.numberSections ? ['--number-sections'] : []),
      '--citeproc',
      // Citations link to their entries, as hyperref makes them in the PDF.
      '--metadata=link-citations=true',
      `--lua-filter=${path.join(PANDOC_DIR, 'word.lua')}`,
      `--resource-path=.${path.delimiter}${scratch}`,
      `--output=${written}`,
    ]
    // Without a journal's template, ColTex's: pandoc's own styles with black headings (its are blue).
    args.push(`--reference-doc=${job.reference ? inside(scratch, job.reference) : path.join(PANDOC_DIR, 'reference.docx')}`)
    if (job.csl) {
      const builtin = (WORD_CITATION_STYLES as readonly string[]).includes(job.csl)
      args.push(`--csl=${builtin ? path.join(PANDOC_DIR, 'csl', `${job.csl}.csl`) : inside(scratch, job.csl)}`)
    }
    await fs.mkdir(outDir, { recursive: true })
    await ownTree(outDir, serverUser, { dir: 0o700, file: 0o600 })
    await removeOld(outDir)
    const run = await runPandoc(path.dirname(entry), args, user)
    if (run.timedOut) throw new Error(`The export took longer than ${TIMEOUT_MS / 1000}s and was stopped`)
    if (run.exitCode !== 0) throw new Error(run.output.trim().split('\n').slice(-5).join('\n') || `pandoc exited with ${run.exitCode}`)
    await fs.copyFile(written, path.join(outDir, file))
    await ownTree(path.join(outDir, file), serverUser, { dir: 0o700, file: 0o600 })
    const warnings = run.output
      .split('\n')
      .filter(l => l.startsWith('[WARNING]'))
      // The filter's own warnings come with its location, which says nothing to the author.
      .map(l => l.replace(/^\[WARNING\]\s*/, '').replace(/^Scripting warning at \S+ line \d+ column \d+: /, ''))
      .slice(0, 50)
    return { exportId: job.exportId, file: `${EXPORTS}/${file}`, warnings }
  } finally {
    await killUser(projectUser(job.projectId))
    await fs.rm(scratch, { recursive: true, force: true })
  }
}

function runPandoc(cwd: string, args: string[], user: User): Promise<RunResult> {
  return runProcess('pandoc', args, { cwd, env: childEnv({ HOME: cwd }), user, timeoutMs: TIMEOUT_MS })
}

import { spawn } from 'node:child_process'
import type { Engine } from '@coltex/shared'

const ENGINE_FLAG: Record<Engine, string> = {
  pdflatex: '-pdf',
  xelatex: '-pdfxe',
  lualatex: '-pdflua',
}

export type RunResult = { exitCode: number | null; timedOut: boolean; output: string }

/** Draft mode as in Overleaf: graphics are drawn as boxes, so pages build faster. */
const DRAFT_PRETEX = String.raw`\PassOptionsToPackage{draft}{graphicx}\PassOptionsToPackage{draft}{graphics}`

/** `force` reruns everything (-g): latexmk doesn't notice when only its own options changed. */
export type LatexmkOptions = { draft?: boolean; stopOnFirstError?: boolean; force?: boolean }

/**
 * Run latexmk in `cwd`. Outputs are named `output.*` via -jobname so artifact
 * names do not depend on the root file. Shell escape stays at TeX Live's
 * default restricted mode.
 */
export function runLatexmk(
  cwd: string,
  rootFile: string,
  engine: Engine,
  timeoutMs: number,
  options: LatexmkOptions = {},
): Promise<RunResult> {
  const args = [
    ENGINE_FLAG[engine],
    '-f',
    ...(options.force ? ['-g'] : []),
    '-interaction=nonstopmode',
    '-file-line-error',
    '-synctex=1',
    '-jobname=output',
    // Here, whatever a project's latexmkrc says ($out_dir = 'build' from VS Code's LaTeX
    // Workshop): the command line is read after the rc files, and the worker looks here.
    '-outdir=.',
    '-auxdir=.',
    // Passed to the engine before the root file; latexmk reruns when it changes.
    ...(options.draft ? [`-usepretex=${DRAFT_PRETEX}`] : []),
    // latexmk passes this on to the engine: stop at the first error (no PDF then).
    ...(options.stopOnFirstError ? ['-halt-on-error'] : []),
    rootFile,
  ]
  return new Promise(resolve => {
    const child = spawn('latexmk', args, {
      cwd,
      detached: true,
      env: { ...process.env, HOME: cwd, TEXMFVAR: `${cwd}/.texmf-var` },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const append = (chunk: Buffer) => {
      // Keep the tail only; the full log is in output.log.
      output = (output + chunk.toString()).slice(-20_000)
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      // Kill the whole process group (latexmk spawns the engine and bibtex/biber).
      try {
        process.kill(-child.pid!, 'SIGKILL')
      } catch {}
    }, timeoutMs)

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

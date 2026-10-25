import type { Engine } from '@coltex/shared'
import { childEnv, runProcess, type RunResult, type User } from './sandbox.ts'

const ENGINE_FLAG: Record<Engine, string> = {
  pdflatex: '-pdf',
  xelatex: '-pdfxe',
  lualatex: '-pdflua',
}

export type { RunResult }

/** Draft mode as in Overleaf: graphics are drawn as boxes, so pages build faster. */
const DRAFT_PRETEX = String.raw`\PassOptionsToPackage{draft}{graphicx}\PassOptionsToPackage{draft}{graphics}`

/** `force` reruns everything (-g): latexmk doesn't notice when only its own options changed. */
export type LatexmkOptions = {
  draft?: boolean
  stopOnFirstError?: boolean
  force?: boolean
  /** The project's own user (see sandbox.ts), and biber's PAR_GLOBAL_TMPDIR. */
  user?: User
  parTmp?: string
}

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
  return runProcess('latexmk', args, {
    cwd,
    env: childEnv({ HOME: cwd, TEXMFVAR: `${cwd}/.texmf-var`, PAR_GLOBAL_TMPDIR: options.parTmp ?? cwd }),
    user: options.user,
    timeoutMs,
  })
}

import { execFile } from 'node:child_process'
import path from 'node:path'
import type { CodePosition, PdfPosition, SynctexJob, SynctexResult } from '@coltex/shared'

const TIMEOUT_MS = 10_000

function run(args: string[], cwd: string): Promise<string> {
  return new Promise(resolve => {
    // Failures (missing build, unknown file) simply yield no result.
    execFile('synctex', args, { cwd, timeout: TIMEOUT_MS }, (_err, stdout) => resolve(stdout ?? ''))
  })
}

/** Split `synctex` CLI output into records; a new record starts at `startKey`. */
function records(output: string, startKey: string): Record<string, string>[] {
  const out: Record<string, string>[] = []
  for (const line of output.split('\n')) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i)
    const value = line.slice(i + 1)
    if (key === startKey) out.push({})
    const current = out.at(-1)
    if (current) current[key] = value
  }
  return out
}

export function parseView(output: string): PdfPosition[] {
  return records(output, 'Page')
    .map(r => ({
      page: Number(r.Page),
      h: Number(r.h),
      v: Number(r.v),
      width: Number(r.W),
      height: Number(r.H),
    }))
    .filter(p => Number.isFinite(p.page) && p.page >= 1 && [p.h, p.v, p.width, p.height].every(Number.isFinite))
}

/** Input paths in the synctex file look like `/work/<id>/./sec/intro.tex`; make them project-relative. */
export function parseEdit(output: string, workDir: string): CodePosition | null {
  const [r] = records(output, 'Input')
  if (!r?.Input) return null
  const file = path.posix.normalize(r.Input)
  const base = workDir.endsWith('/') ? workDir : `${workDir}/`
  if (!file.startsWith(base)) return null // e.g. a class file from TeX Live
  const line = Number(r.Line)
  if (!Number.isInteger(line) || line < 1) return null
  return { file: file.slice(base.length), line, column: Math.max(0, Number(r.Column) || 0) }
}

export async function synctex(job: SynctexJob, dirs: { workDir: string; outputsDir: string }): Promise<SynctexResult> {
  const workDir = path.join(dirs.workDir, job.projectId)
  const pdf = path.join(dirs.outputsDir, job.projectId, job.buildId, 'output.pdf')
  if (job.kind === 'code') {
    const out = await run(['view', '-i', `${job.line}:${job.column}:${job.file}`, '-o', pdf], workDir)
    return { pdf: parseView(out) }
  }
  const out = await run(['edit', '-o', `${job.page}:${job.h}:${job.v}:${pdf}`], workDir)
  return { code: parseEdit(out, workDir) }
}

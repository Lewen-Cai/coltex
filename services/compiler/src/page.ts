import { execFile } from 'node:child_process'
import path from 'node:path'
import { OUTPUT, type PageJob, type PageResult } from '@coltex/shared'
import { childEnv, projectUser, runAs, type User } from './sandbox.ts'

const TIMEOUT_MS = 20_000
/** A page image larger than this isn't sent (a model takes a few megabytes at most). */
const MAX_PNG = 6 * 1024 * 1024

/** As the project's user, like the build that wrote the PDF. Failures yield nothing. */
function run(cmd: string, args: string[], cwd: string, user: User): Promise<Buffer | undefined> {
  return new Promise(resolve => {
    execFile(cmd, args, { cwd, timeout: TIMEOUT_MS, encoding: 'buffer', maxBuffer: MAX_PNG, env: childEnv({ HOME: cwd }), ...runAs(user) }, (err, stdout) =>
      resolve(err ? undefined : stdout),
    )
  })
}

/** One page of a build's PDF as a PNG (pdftoppm), with the page count. */
export async function renderPage(job: PageJob, dirs: { outputsDir: string }): Promise<PageResult> {
  const dir = path.join(dirs.outputsDir, job.projectId, job.buildId)
  const pdf = path.join(dir, OUTPUT.pdf)
  const user = projectUser(job.projectId)
  const info = (await run('pdfinfo', [pdf], dir, user))?.toString('utf8') ?? ''
  const pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? 0)
  if (!pages || job.page > pages) return { pages, png: null }
  const page = String(job.page)
  // Without an output name pdftoppm writes the image to stdout.
  const png = await run('pdftoppm', ['-png', '-singlefile', '-f', page, '-l', page, '-r', String(job.dpi), pdf], dir, user)
  return { pages, png: png?.length ? png.toString('base64') : null }
}

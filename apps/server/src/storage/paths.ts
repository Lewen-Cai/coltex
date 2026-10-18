import path from 'node:path'
import { BadRequestError } from '../errors.ts'

const TEXT_EXTENSIONS = new Set([
  '.tex', '.bib', '.cls', '.sty', '.bst', '.bbx', '.cbx', '.def', '.cfg', '.clo',
  '.dtx', '.ins', '.ltx', '.txt', '.md', '.csv', '.tsv', '.json', '.yaml', '.yml',
  '.lua', '.py', '.r', '.rnw', '.tikz', '.pgf', '.mtx', '.lbx', '.gitignore', '.latexmkrc',
])

export function isTextPath(p: string): boolean {
  const base = path.basename(p).toLowerCase()
  return TEXT_EXTENSIONS.has(path.extname(base) || base)
}

/**
 * Normalise a client-supplied project-relative path and reject anything that
 * could escape the project directory or collide with in-progress writes.
 */
export function cleanPath(p: string): string {
  const normalised = path.posix.normalize(p.replaceAll('\\', '/')).replace(/^\/+/, '')
  if (
    !normalised ||
    normalised === '.' ||
    normalised.startsWith('../') ||
    normalised === '..' ||
    normalised.split('/').some(seg => seg === '') ||
    normalised.endsWith('.coltex-tmp') ||
    // Marks folders in S3 buckets (storage/s3.ts).
    normalised.split('/').includes('.coltex-folder') ||
    normalised.includes('\0')
  ) {
    throw new BadRequestError(`Invalid path: ${p}`)
  }
  return normalised
}

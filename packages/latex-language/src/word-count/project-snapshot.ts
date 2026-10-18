// ColTex: the entry point for the ported word count. Overleaf counts from its
// ProjectSnapshot; here the caller passes the project's sources directly.

import type { IncludedFileSnapshot } from '../utils/walk-included-files'
import { countWordsInFile } from './count-words-in-file'
import { createSegmenters } from './segmenters'
import type { WordCountData } from './word-count-data'

/** Resolve `rel` against an absolute directory, like path.resolve (no leading slash in the result). */
function resolvePath(base: string, rel: string): string {
  const parts: string[] = []
  for (const part of `${base}/${rel}`.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

/**
 * Files by project path, located the way Overleaf's ProjectSnapshot does: an
 * included path is tried relative to the project root first, then to the
 * including file's directory, as given and with `.tex` appended.
 */
export class SourceSnapshot implements IncludedFileSnapshot {
  constructor(private readonly files: Map<string, string>) {}

  locateFile(filePath: string, currentPath = '/', extensions = ['.tex']) {
    if (filePath.startsWith('/')) return null
    const basePaths = currentPath === '/' ? ['/'] : ['/', currentPath]
    for (const basePath of basePaths) {
      for (const extension of ['', ...extensions]) {
        const candidate = resolvePath(basePath, `${filePath}${extension}`)
        if (this.files.has(candidate)) return candidate
      }
    }
    return null
  }

  getDocContents(path: string) {
    return this.files.get(path) ?? null
  }
}

export const emptyWordCountData = (): WordCountData => ({
  encode: 'utf8',
  textWords: 0,
  textCharacters: 0,
  headWords: 0,
  headCharacters: 0,
  abstractWords: 0,
  abstractCharacters: 0,
  captionWords: 0,
  captionCharacters: 0,
  footnoteWords: 0,
  footnoteCharacters: 0,
  outside: 0,
  otherWords: 0,
  otherCharacters: 0,
  headers: 0,
  elements: 0,
  mathInline: 0,
  mathDisplay: 0,
  errors: 0,
  messages: '',
  textCjk: 0,
  headCjk: 0,
  abstractCjk: 0,
  captionCjk: 0,
  footnoteCjk: 0,
  otherCjk: 0,
})

/**
 * Count the words of a document: `rootFile` and everything it pulls in with
 * \input, \include and \subfile. `locale` (e.g. the spell-check language,
 * `en_US`) picks the word segmentation rules.
 */
export function countProjectWords({
  files,
  rootFile,
  locale,
}: {
  files: Map<string, string>
  rootFile: string
  locale?: string
}): WordCountData {
  const data = emptyWordCountData()
  countWordsInFile(data, new SourceSnapshot(files), rootFile, '/', createSegmenters(locale?.replace(/_/, '-') || undefined))
  return data
}

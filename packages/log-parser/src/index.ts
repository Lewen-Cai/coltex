import LatexParser, { type LatexLogEntry } from './latex-log-parser.ts'
import BibLogParser, { type BibLogEntry } from './bib-log-parser.ts'
import { humanize, type HumanReadable } from './human-readable/index.ts'

export { LatexParser, BibLogParser, humanize }
export type { LatexLogEntry, BibLogEntry, HumanReadable }

export type LogEntry = {
  level: 'error' | 'warning' | 'typesetting'
  message: string
  /** Path relative to the compile directory, when known */
  file?: string
  line?: number
  content?: string
  raw: string
  source: 'latex' | 'bib'
} & HumanReadable

function toLine(line: string | number | null | undefined): number | undefined {
  const n = typeof line === 'number' ? line : Number.parseInt(line ?? '', 10)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Normalise a file path reported by TeX into a path relative to `compileDir`.
 * TeX reports files as `./main.tex`, `/abs/compile/dir/sec/intro.tex`, etc.
 */
function normaliseFile(file: string | undefined, compileDir: string): string | undefined {
  if (!file) return undefined
  let f = file.trim()
  const dir = compileDir.endsWith('/') ? compileDir : `${compileDir}/`
  if (f.startsWith(dir)) f = f.slice(dir.length)
  if (f.startsWith('./')) f = f.slice(2)
  return f
}

export function parseLatexLog(log: string, compileDir: string): LogEntry[] {
  const escaped = compileDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const result = new LatexParser(log, {
    fileBaseNames: [new RegExp(escaped), /\/usr\/local/, /\/opt\/texlive/],
    ignoreDuplicates: true,
  }).parse()
  return humanize(
    result.all.map(e => ({
      level: e.level,
      message: e.message,
      file: normaliseFile(e.file, compileDir),
      line: toLine(e.line),
      content: e.content,
      raw: e.raw,
      source: 'latex' as const,
    })),
  )
}

export function parseBibLog(log: string, compileDir: string): LogEntry[] {
  let result: { errors: BibLogEntry[]; warnings: BibLogEntry[] }
  try {
    result = new BibLogParser(log, {}).parse()
  } catch {
    return []
  }
  const map = (level: 'error' | 'warning') => (e: BibLogEntry) => ({
    level,
    message: e.message,
    file: normaliseFile(e.file, compileDir),
    line: toLine(e.line),
    raw: e.raw,
    source: 'bib' as const,
  })
  return [...result.errors.map(map('error')), ...result.warnings.map(map('warning'))]
}

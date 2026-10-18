import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import type { TexLookupJob, TexLookupResult } from '@coltex/shared'

const run = promisify(execFile)
const MAX_CHARS = 12_000
const PAGE_LINES = 250
const MAX_HITS = 40
const CONTEXT = 2

type Options = { workDir: string }

/** texdoc and kpsewhich want a writable TEXMFVAR; the image's home is read-only. */
const env = (o: Options) => ({ ...process.env, TEXMFVAR: path.join(o.workDir, '.texmf-var') })

async function kpsewhich(name: string, o: Options): Promise<string | undefined> {
  // A bare package name usually means its .sty (or a class).
  const candidates = path.extname(name) ? [name] : [`${name}.sty`, `${name}.cls`, name]
  for (const c of candidates) {
    try {
      const { stdout } = await run('kpsewhich', [c], { env: env(o), timeout: 10_000 })
      const found = stdout.trim()
      if (found) return found
    } catch {
      // Not found: kpsewhich exits 1.
    }
  }
  return undefined
}

/** The best documentation file texdoc knows for a package, if docs are installed. */
async function texdoc(name: string, o: Options): Promise<string | undefined> {
  try {
    const { stdout } = await run('texdoc', ['-l', '-M', name], { env: env(o), timeout: 15_000 })
    // Machine-readable lines: argument, score, file, language, description (tab-separated), best first.
    const files = stdout
      .split('\n')
      .map(l => l.split('\t')[2])
      .filter((f): f is string => !!f && /\.(pdf|txt|md|html?)$/i.test(f) && !/\/README$/i.test(f))
    return files.find(f => f.endsWith('.pdf')) ?? files[0]
  } catch {
    return undefined
  }
}

/** Plain text of a documentation file; PDFs are converted once and cached in the work volume. */
async function docText(file: string, o: Options): Promise<string> {
  if (!file.toLowerCase().endsWith('.pdf')) return fs.readFile(file, 'utf8')
  const cacheDir = path.join(o.workDir, '.texdoc-cache')
  const cached = path.join(cacheDir, `${crypto.createHash('sha1').update(file).digest('hex')}.txt`)
  try {
    return await fs.readFile(cached, 'utf8')
  } catch {}
  await fs.mkdir(cacheDir, { recursive: true })
  await run('pdftotext', ['-enc', 'UTF-8', '-nopgbrk', file, cached], { timeout: 60_000 })
  return fs.readFile(cached, 'utf8')
}

export function excerpt(text: string, job: TexLookupJob): { text: string; totalLines: number } {
  const lines = text.split(/\r?\n/)
  const numbered = (i: number) => `${i + 1}: ${lines[i]}`
  let out: string[] = []
  if (job.query) {
    const q = job.query.toLowerCase()
    const hits = lines.flatMap((l, i) => (l.toLowerCase().includes(q) ? [i] : [])).slice(0, MAX_HITS)
    if (hits.length === 0) return { text: `No lines contain “${job.query}”.`, totalLines: lines.length }
    let last = -1
    for (const h of hits) {
      const from = Math.max(h - CONTEXT, last + 1)
      if (from > last + 1 && out.length) out.push('…')
      for (let i = from; i <= Math.min(h + CONTEXT, lines.length - 1); i++) out.push(numbered(i))
      last = Math.min(h + CONTEXT, lines.length - 1)
    }
  } else {
    const start = (job.fromLine ?? 1) - 1
    out = lines.slice(start, start + PAGE_LINES).map((_, k) => numbered(start + k))
    if (start + PAGE_LINES < lines.length) out.push(`… (${lines.length} lines; continue with fromLine ${start + PAGE_LINES + 1})`)
  }
  let joined = out.join('\n')
  if (joined.length > MAX_CHARS) joined = `${joined.slice(0, MAX_CHARS)}\n… (truncated; narrow it down with a query)`
  return { text: joined, totalLines: lines.length }
}

/** Read or search an installed TeX Live file or a package's documentation. */
export async function texLookup(job: TexLookupJob, o: Options): Promise<TexLookupResult> {
  const file = job.kind === 'source' ? await kpsewhich(job.name, o) : await texdoc(job.name, o)
  if (!file) {
    return {
      found: false,
      text:
        job.kind === 'source'
          ? `“${job.name}” is not installed in this TeX Live.`
          : `No documentation found for “${job.name}” (or this TeX Live was built without documentation).`,
    }
  }
  const content = job.kind === 'source' ? await fs.readFile(file, 'utf8') : await docText(file, o)
  const { text, totalLines } = excerpt(content, job)
  const rel = file.replace(/^.*?\/texmf-dist\//, '')
  return { found: true, file: rel, totalLines, text }
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { ACK_MARK, BIB_MARK, ConvertError, extractPaper, type Paper } from '@coltex/convert'
import type { ProjectMeta, WordCitationStyle, WordExportRequest } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { CompileQueue } from '../compile-queue.ts'
import { BadRequestError, NotFoundError } from '../errors.ts'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'

const MAX_TEXT = 4 * 1024 * 1024
/** An export not downloaded by then is forgotten (the compiler removes its file too). */
const KEEP_MS = 10 * 60_000
/** The wrapper pandoc reads, next to the main document so relative paths resolve the same. */
const WRAPPER = '.coltex-word.tex'
/** Where the abstract goes; pandoc/word.lua moves it there from Word's title block. */
const ABSTRACT_MARK = 'COLTEX-ABSTRACT-HERE'
/** Where the reference list goes; citeproc puts it at the end, pandoc/word.lua moves it here. */
const REFERENCES_MARK = 'COLTEX-REFERENCES-HERE'

export type WordExportReady = { id: string; warnings: string[] }

/**
 * Word export. pandoc reads LaTeX well but not the front matter of most
 * journal classes (sn-jnl's \abstract{}, elsarticle's frontmatter, IEEE's
 * \IEEEauthorblockN): the converter's extractor reads that, and the export
 * runs on a plain-article wrapper around the document's own body.
 */
export class WordExport {
  private readonly store: ProjectStore
  private readonly collab: CollabHooks
  private readonly queue: Pick<CompileQueue, 'word'>
  private readonly outputsDir: string
  private readonly ready = new Map<string, { projectId: string; userId: string; file: string; name: string; at: number }>()

  constructor(deps: { store: ProjectStore; collab: CollabHooks; queue: Pick<CompileQueue, 'word'>; outputsDir: string }) {
    this.store = deps.store
    this.collab = deps.collab
    this.queue = deps.queue
    this.outputsDir = deps.outputsDir
  }

  async export(project: ProjectMeta, userId: string, request: WordExportRequest): Promise<WordExportReady> {
    await this.collab.flushProject(project.id)
    const tree = await this.store.listTree(project.id)
    const has = (p: string, ext: string) => p.toLowerCase().endsWith(ext) && tree.files.some(f => f.path === p)
    const reference = request.reference ? cleanPath(request.reference) : undefined
    if (reference && !has(reference, '.docx')) throw new BadRequestError(`${reference} is not a .docx file in this project`)
    const csl = request.csl ? cleanPath(request.csl) : undefined
    if (csl && !has(csl, '.csl')) throw new BadRequestError(`${csl} is not a .csl file in this project`)

    const text = new Map<string, string>()
    for (const f of tree.files) {
      if (f.binary || f.size > MAX_TEXT || !/\.(tex|ltx|sty|cls|bib)$/i.test(f.path)) continue
      text.set(f.path, (await this.store.readFile(project.id, f.path)).toString('utf8'))
    }
    const main = text.get(project.rootFile)
    if (main === undefined) throw new BadRequestError(`The main document ${project.rootFile} is missing; choose one first.`)
    const dir = project.rootFile.includes('/') ? project.rootFile.slice(0, project.rootFile.lastIndexOf('/') + 1) : ''
    const paper = extract(main, p => {
      try {
        return text.get(cleanPath(p)) ?? text.get(cleanPath(dir + p))
      } catch {
        return undefined
      }
    })

    const result = await this.queue.word({
      projectId: project.id,
      entry: paper ? dir + WRAPPER : project.rootFile,
      overlay: paper ? { [dir + WRAPPER]: wordWrapper(paper) } : {},
      reference,
      csl: csl ?? request.citationStyle ?? (paper ? citationStyleFor(paper) : undefined),
      numberSections: paper ? numbersSections(paper.classOptions, `${paper.preamble}\n${paper.body}`) : numbersSections([], main),
    })
    this.forgetOld()
    this.ready.set(result.exportId, { projectId: project.id, userId, file: path.join(this.outputsDir, result.file), name: project.name, at: Date.now() })
    return { id: result.exportId, warnings: result.warnings }
  }

  /** The finished file, once, for the person who asked for it. */
  async take(projectId: string, userId: string, id: string): Promise<{ data: Buffer; name: string }> {
    const entry = this.ready.get(id)
    if (!entry || entry.projectId !== projectId || entry.userId !== userId) throw new NotFoundError('This export is no longer available')
    this.ready.delete(id)
    try {
      return { data: await fs.readFile(entry.file), name: entry.name }
    } finally {
      await fs.rm(entry.file, { force: true })
    }
  }

  private forgetOld(): void {
    for (const [id, e] of this.ready) {
      if (Date.now() - e.at > KEEP_MS) {
        this.ready.delete(id)
        void fs.rm(e.file, { force: true })
      }
    }
  }
}

function extract(main: string, read: (p: string) => string | undefined): Paper | undefined {
  try {
    return extractPaper(main, read)
  } catch (err) {
    // A document the extractor doesn't understand goes to pandoc as it is.
    if (err instanceof ConvertError) return undefined
    throw err
  }
}

/** The document as a plain article pandoc reads completely: front matter it understands, then the body. */
export function wordWrapper(paper: Paper): string {
  const order = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const author = (a: Paper['authors'][number]) => {
    const marks = a.affiliations.map(id => order.get(id)).filter(n => n !== undefined)
    const sup = [...(marks.length && paper.affiliations.length > 1 ? [marks.join(',')] : []), ...(a.corresponding ? ['*'] : [])]
    return sup.length ? `${a.name}\\textsuperscript{${sup.join(',')}}` : a.name
  }
  const front: string[] = []
  if (paper.affiliations.length) {
    front.push(
      paper.affiliations
        .map((a, i) => `\\noindent ${paper.affiliations.length > 1 ? `\\textsuperscript{${i + 1}}` : ''}${a.raw}`)
        .join('\n\n'),
    )
  }
  const corresponding = paper.authors.filter(a => a.corresponding && a.email)
  if (corresponding.length) {
    front.push(`\\noindent\\textsuperscript{*}Corresponding author: ${corresponding.map(a => `${a.name} (\\href{mailto:${a.email}}{${a.email}})`).join('; ')}`)
  }
  const keywords = paper.keywords.length ? `\\noindent\\textbf{Keywords:} ${paper.keywords.join(', ')}` : ''

  const bib = paper.bibliography
  const files = bib.kind === 'bibtex' || bib.kind === 'biblatex' ? bib.files : []
  // The extractor marks where the acknowledgements and the bibliography were; they go back there.
  const ack = paper.acknowledgments?.trim() ? `\\section*{Acknowledgements}\n${paper.acknowledgments.trim()}` : ''
  let body = paper.body.trim()
  // A heading, as LaTeX gives the list (pandoc writes none), unless the author wrote one just before it.
  const before = body.includes(BIB_MARK) ? body.slice(0, body.indexOf(BIB_MARK)) : body
  const headed = /\\(?:section|chapter)\*?\s*(?:\[[^\]]*\])?\s*\{[^{}]*\}\s*$/.test(before)
  const heading = headed ? '' : `\\section*{${bib.kind === 'biblatex' && bib.title ? bib.title : '\\refname'}}`
  const references = files.length
    ? [heading, bib.kind === 'bibtex' ? `\\bibliography{${files.join(',')}}` : '', REFERENCES_MARK].filter(Boolean).join('\n\n')
    : ''
  const place = (mark: string, text: string) => {
    if (!body.includes(mark)) return text
    body = body.replace(mark, () => text)
    return ''
  }
  const ackAtEnd = place(ACK_MARK, ack)
  const referencesAtEnd = place(BIB_MARK, references)
  return [
    '\\documentclass{article}',
    // Table rules of journal classes (OUP, Springer Nature) that pandoc doesn't know.
    '\\providecommand{\\botrule}{\\bottomrule}',
    // The reference list's heading; the document may rename it.
    '\\providecommand{\\refname}{References}',
    paper.preamble.trim(),
    ...(bib.kind === 'biblatex' ? files.map(f => `\\addbibresource{${f}}`) : []),
    paper.title ? `\\title{${paper.title}}` : '',
    paper.authors.length ? `\\author{${paper.authors.map(author).join(' \\and ')}}` : '',
    '\\begin{document}',
    '\\maketitle',
    // As on a journal's title page: affiliations under the authors, then the abstract and keywords.
    ...front,
    paper.abstract.trim() ? `\\begin{abstract}\n${paper.abstract.trim()}\n\\end{abstract}\n\n${ABSTRACT_MARK}` : '',
    keywords,
    body,
    ackAtEnd,
    referencesAtEnd,
    '\\end{document}',
    '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Whether the document numbers its sections: not with OUP's unnumsec, secnumdepth 0 or only \section*. */
export function numbersSections(classOptions: string[], text: string): boolean {
  if (classOptions.includes('unnumsec')) return false
  if (/\\setcounter\s*\{secnumdepth\}\s*\{\s*(-\d+|0)\s*\}/.test(text)) return false
  return !/\\section\*/.test(text) || /\\section\s*(\[[^\]]*\])?\s*\{/.test(text)
}

/** A built-in citation style like the one the document asks for (its .bst or biblatex style). */
export function citationStyleFor(paper: Paper): WordCitationStyle | undefined {
  const bib = paper.bibliography
  const style =
    bib.kind === 'bibtex' ? bib.style : bib.kind === 'biblatex' ? /(?:^|,)\s*(?:style|citestyle)\s*=\s*([^,\s]+)/.exec(bib.options ?? '')?.[1] : undefined
  if (!style) return undefined
  const s = style.toLowerCase()
  if (s.includes('apa')) return 'apa'
  if (s.includes('vancouver') || s.includes('nlm')) return 'vancouver'
  if (/\bama\b|jama/.test(s)) return 'american-medical-association'
  if (s.includes('nature')) return 'nature'
  if (/harv|agsm|chicago|apalike|authoryear|author-year|plainnat|abbrvnat|sn-basic|dcu|kluwer/.test(s)) return 'chicago-author-date'
  if (/ieee|num|plain|unsrt|abbrv|alpha|splncs|acm|mathphys|siam|revtex|aps|elsarticle/.test(s)) return 'ieee'
  return undefined
}

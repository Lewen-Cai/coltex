import { randomBytes } from 'node:crypto'
import { ConvertError, TARGETS, convertPaper, convertToTemplate, extractPaper, mask, type Conversion, type Paper } from '@coltex/convert'
import type { BuildSummary, CompileResult, ConvertAnalysis, ConvertInto, ConvertMetadata, ConvertOptions, ConvertReport, ConvertUpload, ProjectMeta } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { CompileQueue } from '../compile-queue.ts'
import { BadRequestError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import { engineFor } from '../projects/engine.ts'
import type { ProjectService } from '../projects/service.ts'
import type { TemplateService } from '../projects/templates.ts'
import type { ProjectArchive } from '../projects/zip.ts'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'

/** Sources larger than this aren't read for conversion (images and data stay as they are). */
const MAX_TEXT = 4 * 1024 * 1024
/** How long an uploaded template zip waits for its conversion. */
const UPLOAD_TTL_MS = 60 * 60 * 1000

type TemplateFiles = { name: string; files: Map<string, Buffer>; rootFile: string }

/** The template's main file: its own choice, else the one .tex file with \documentclass and \begin{document}. */
function templateMain(files: Map<string, Buffer>, rootFile: string | undefined): string | undefined {
  const isMain = (p: string) => p.endsWith('.tex') && /\\documentclass[\s\S]*\\begin\{document\}/.test(mask(files.get(p)!.toString('utf8')))
  if (rootFile && files.has(rootFile) && isMain(rootFile)) return rootFile
  const mains = [...files.keys()].filter(isMain).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  return mains[0]
}

export function summarize(result: CompileResult): BuildSummary {
  const count = (re: RegExp) => result.diagnostics.filter(d => re.test(d.message)).length
  return {
    buildId: result.buildId,
    status: result.status,
    errors: result.diagnostics.filter(d => d.level === 'error').length,
    warnings: result.diagnostics.filter(d => d.level === 'warning').length,
    undefinedReferences: count(/Reference .* undefined|There were undefined references/),
    undefinedCitations: count(/Citation .* undefined|There were undefined citations/),
    overfull: count(/^Overfull \\[hv]box/),
  }
}

/**
 * Journal template conversion: the deterministic converter (@coltex/convert)
 * reads the project, the author checks the extracted metadata, and the result
 * becomes a *new* project, compiled and compared with the original. The
 * original is never modified.
 */
export class ConvertService {
  private readonly store: ProjectStore
  private readonly collab: CollabHooks
  private readonly projects: ProjectService
  private readonly history: HistoryService
  private readonly queue: Pick<CompileQueue, 'compile' | 'texLookup'>
  private readonly templates: TemplateService
  /** Template zips sent for a conversion, by id, for the person who sent them. */
  private readonly uploads = new Map<string, TemplateFiles & { userId: string; expires: number }>()

  constructor(deps: { store: ProjectStore; collab: CollabHooks; projects: ProjectService; history: HistoryService; queue: Pick<CompileQueue, 'compile' | 'texLookup'>; templates: TemplateService }) {
    this.store = deps.store
    this.collab = deps.collab
    this.projects = deps.projects
    this.history = deps.history
    this.queue = deps.queue
    this.templates = deps.templates
  }

  /** Keep a template zip for a conversion, checking it has a main file. */
  hold(userId: string, name: string, archive: ProjectArchive & { rootFile: string | undefined }): ConvertUpload {
    const now = Date.now()
    for (const [id, u] of this.uploads) if (u.expires < now) this.uploads.delete(id)
    const rootFile = templateMain(archive.files, archive.rootFile)
    if (!rootFile) throw new BadRequestError('The zip has no LaTeX main file (a .tex file with \\documentclass and \\begin{document}).')
    const documentClass = mask(archive.files.get(rootFile)!.toString('utf8')).match(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/)?.[1]?.trim() ?? 'article'
    const upload = `${now.toString(36)}-${randomBytes(6).toString('hex')}`
    this.uploads.set(upload, { name, files: archive.files, rootFile, userId, expires: now + UPLOAD_TTL_MS })
    return { upload, name, rootFile, documentClass }
  }

  /** The template a conversion goes into, read the way its owner sees it. */
  private async template(target: Exclude<ConvertInto, string>, user: { id: string; role?: string | null }): Promise<TemplateFiles> {
    if ('upload' in target) {
      const u = this.uploads.get(target.upload)
      if (!u || u.userId !== user.id || u.expires < Date.now()) throw new BadRequestError('The template upload has expired; send the zip again.')
      return u
    }
    if ('project' in target) {
      const { project } = await this.projects.requireAccess(target.project, user.id, 'viewer')
      const { text, binary } = await this.load(project)
      const files = new Map<string, Buffer>([...binary, ...[...text].map(([p, t]) => [p, Buffer.from(t, 'utf8')] as const)])
      return { name: project.name, files, rootFile: project.rootFile }
    }
    const content = await this.templates.contents(target.template, user)
    const name = (await this.templates.list(user)).find(t => t.id === target.template)?.name ?? target.template
    return { name, files: content.files, rootFile: content.rootFile }
  }

  /** Every file of the project, with text sources decoded. */
  private async load(project: ProjectMeta) {
    await this.collab.flushProject(project.id)
    const tree = await this.store.listTree(project.id)
    const binary = new Map<string, Buffer>()
    const text = new Map<string, string>()
    for (const f of tree.files) {
      const data = await this.store.readFile(project.id, f.path)
      if (!f.binary && data.length <= MAX_TEXT) text.set(f.path, data.toString('utf8'))
      else binary.set(f.path, data)
    }
    const main = text.get(project.rootFile)
    if (main === undefined) throw new BadRequestError(`The main document ${project.rootFile} is missing; choose one first.`)
    return { tree, binary, text, main }
  }

  private extract(main: string, text: Map<string, string>, rootFile: string): Paper {
    const dir = rootFile.includes('/') ? rootFile.slice(0, rootFile.lastIndexOf('/') + 1) : ''
    const read = (p: string) => {
      try {
        return text.get(cleanPath(p)) ?? text.get(cleanPath(dir + p))
      } catch {
        return undefined
      }
    }
    try {
      return extractPaper(main, read)
    } catch (err) {
      if (err instanceof ConvertError) throw new BadRequestError(err.message)
      throw err
    }
  }

  async analyze(project: ProjectMeta): Promise<ConvertAnalysis> {
    const { main, text } = await this.load(project)
    const paper = this.extract(main, text, project.rootFile)
    return {
      rootFile: project.rootFile,
      sourceClass: paper.sourceClass,
      metadata: {
        title: paper.title,
        shortTitle: paper.shortTitle,
        authors: paper.authors,
        affiliations: paper.affiliations,
        abstract: paper.abstract,
        keywords: paper.keywords,
        acknowledgments: paper.acknowledgments,
      },
      hints: paper.hints,
      bibliography: paper.bibliography.kind,
      notes: paper.notes,
      targets: TARGETS.map(t => ({
        id: t.id,
        label: t.label,
        publisher: t.publisher,
        description: t.description,
        documentClass: t.documentClass,
        twoColumn: t.twoColumn,
        review: t.review,
        fields: t.fields,
      })),
    }
  }

  async convert(
    project: ProjectMeta,
    user: { id: string; role?: string | null },
    input: { target: ConvertInto; name: string; metadata: ConvertMetadata; options: ConvertOptions },
  ): Promise<ConvertReport> {
    const userId = user.id
    const { tree, binary, text, main } = await this.load(project)
    // The body and preamble always come from the source; only the metadata the author reviewed is taken from the form.
    const paper: Paper = { ...this.extract(main, text, project.rootFile), ...input.metadata }
    const texFiles = Object.fromEntries([...text].filter(([p]) => p.endsWith('.tex')))
    const bibFiles = Object.fromEntries([...text].filter(([p]) => p.endsWith('.bib')))
    const files = new Map<string, Buffer>()
    for (const [p, data] of binary) files.set(p, data)
    const folders = new Set(tree.folders)
    let result: Conversion
    let label: string
    let documentClass: string
    if (typeof input.target === 'string') {
      result = convertPaper(paper, input.target, input.options, { rootFile: project.rootFile, texFiles, bibFiles })
      label = input.target
      documentClass = TARGETS.find(t => t.id === input.target)!.documentClass
    } else {
      const tpl = await this.template(input.target, user)
      const rootFile = templateMain(tpl.files, tpl.rootFile)
      if (!rootFile) throw new BadRequestError(`${tpl.name} has no LaTeX main file (a .tex file with \\documentclass and \\begin{document}).`)
      const read = (p: string) => {
        const data = tpl.files.get(p)
        return data && data.length <= MAX_TEXT ? data.toString('utf8') : undefined
      }
      // A class from TeX Live: what it loads, from the compiler's copy (only its \RequirePackage lines).
      const cls = mask(read(rootFile) ?? '').match(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/)?.[1]?.trim()
      const classFile = cls && /^[A-Za-z0-9._-]+$/.test(cls) ? `${cls}.cls` : undefined
      const classSource =
        classFile && !tpl.files.has(classFile)
          ? await this.queue
              .texLookup({ kind: 'source', name: classFile, query: 'RequirePackage' })
              .then(r => (r.found ? r.text : undefined), () => undefined)
          : undefined
      const readTemplate = (p: string) => (p === classFile && classSource !== undefined ? classSource : read(p))
      try {
        const conv = convertToTemplate(paper, { name: tpl.name, rootFile, main: read(rootFile)!, paths: [...tpl.files.keys()], read: readTemplate }, input.options, { rootFile: project.rootFile, texFiles, bibFiles })
        // The paper's own files win over the template's of the same name.
        for (const [from, to] of Object.entries(conv.templateFiles)) {
          if (files.has(to) || text.has(to)) {
            conv.notes.push({ level: 'info', text: `Kept the paper's ${to}; the template's copy was left out.` })
            continue
          }
          files.set(to, tpl.files.get(from)!)
          for (let dir = to; dir.includes('/'); ) folders.add((dir = dir.slice(0, dir.lastIndexOf('/'))))
        }
        result = conv
        documentClass = conv.documentClass
      } catch (err) {
        if (err instanceof ConvertError) throw new BadRequestError(err.message)
        throw err
      }
      label = tpl.name
    }
    for (const [p, t] of text) files.set(p, Buffer.from(result.files[p] ?? t, 'utf8'))
    for (const [p, t] of Object.entries(result.files)) if (!files.has(p)) files.set(p, Buffer.from(t, 'utf8'))
    // A template may need another engine (xelatex for its fonts): pick it again at each build.
    const engine = typeof input.target === 'string' ? project.engine : 'auto'
    const copy = await this.projects.create(userId, input.name, engine, { files, folders, rootFile: project.rootFile })
    await this.history.record(copy.id, 'convert', [userId])

    // Build both, so the report can say whether anything got worse.
    const build = (p: ProjectMeta) =>
      engineFor(this.store, p)
        .then(engine => this.queue.compile({ projectId: p.id, rootFile: p.rootFile, engine, clean: false }))
        .then(summarize, () => null)
    const [after, before] = await Promise.all([build(copy), build(project)])
    return {
      projectId: copy.id,
      name: copy.name,
      target: label,
      documentClass,
      notes: result.notes,
      changedFiles: Object.keys(result.files).sort(),
      build: after,
      baseline: before,
    }
  }
}

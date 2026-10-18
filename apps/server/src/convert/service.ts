import { ConvertError, TARGETS, convertPaper, extractPaper, type Paper } from '@coltex/convert'
import type { BuildSummary, CompileResult, ConvertAnalysis, ConvertMetadata, ConvertOptions, ConvertReport, ConvertTargetId, ProjectMeta } from '@coltex/shared'
import type { CollabHooks } from '../collab/server.ts'
import type { CompileQueue } from '../compile-queue.ts'
import { BadRequestError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import { engineFor } from '../projects/engine.ts'
import type { ProjectService } from '../projects/service.ts'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'

/** Sources larger than this aren't read for conversion (images and data stay as they are). */
const MAX_TEXT = 4 * 1024 * 1024

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
  private readonly queue: Pick<CompileQueue, 'compile'>

  constructor(deps: { store: ProjectStore; collab: CollabHooks; projects: ProjectService; history: HistoryService; queue: Pick<CompileQueue, 'compile'> }) {
    this.store = deps.store
    this.collab = deps.collab
    this.projects = deps.projects
    this.history = deps.history
    this.queue = deps.queue
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
    userId: string,
    input: { target: ConvertTargetId; name: string; metadata: ConvertMetadata; options: ConvertOptions },
  ): Promise<ConvertReport> {
    const { tree, binary, text, main } = await this.load(project)
    // The body and preamble always come from the source; only the metadata the author reviewed is taken from the form.
    const paper: Paper = { ...this.extract(main, text, project.rootFile), ...input.metadata }
    const texFiles = Object.fromEntries([...text].filter(([p]) => p.endsWith('.tex')))
    const bibFiles = Object.fromEntries([...text].filter(([p]) => p.endsWith('.bib')))
    const result = convertPaper(paper, input.target, input.options, { rootFile: project.rootFile, texFiles, bibFiles })

    const files = new Map<string, Buffer>()
    for (const [p, data] of binary) files.set(p, data)
    for (const [p, t] of text) files.set(p, Buffer.from(result.files[p] ?? t, 'utf8'))
    const copy = await this.projects.create(userId, input.name, project.engine, { files, folders: tree.folders, rootFile: project.rootFile })
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
      target: input.target,
      notes: result.notes,
      changedFiles: Object.keys(result.files).sort(),
      build: after,
      baseline: before,
    }
  }
}

import { and, eq } from 'drizzle-orm'
import type { DoiResult, LiteratureSearchResult, ReferenceImportResult, ReferenceLink, ZoteroCollection, ZoteroImportBody, ZoteroLibrary, ZoteroStatus } from '@coltex/shared'
import type { SecretBox } from '../ai/credentials.ts'
import type { CollabHooks } from '../collab/server.ts'
import { config } from '../config.ts'
import { TEXT_KEY } from '../collab/server.ts'
import type { Db } from '../db/client.ts'
import { referenceLinks, user, zoteroAccounts } from '../db/schema.ts'
import { BadRequestError, NotFoundError } from '../errors.ts'
import type { HistoryService } from '../history/service.ts'
import type { ProjectService } from '../projects/service.ts'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import { bibKeys, citationKey, fetchDoiBibtex, formatEntry, keyWithDoi, normalizeDoi } from './doi.ts'
import { LiteratureSearch } from './search.ts'
import { ZoteroClient } from './zotero.ts'

const BIB_PATH = /\.bib$/i

/**
 * References: a person's Zotero connection, .bib files made from Zotero
 * libraries or collections (and refreshed from them), and entries added by
 * DOI. Files are written like any other change: through the store and the
 * live documents, noted in the history.
 */
export class ReferenceService {
  private readonly db: Db
  private readonly box: SecretBox
  private readonly store: ProjectStore
  private readonly collab: CollabHooks
  private readonly history: HistoryService
  private readonly projects: ProjectService
  private readonly zotero: ZoteroClient
  private readonly doi: (doi: string) => Promise<string>
  private readonly literature: LiteratureSearch

  constructor(deps: {
    db: Db
    box: SecretBox
    store: ProjectStore
    collab: CollabHooks
    history: HistoryService
    projects: ProjectService
    zotero?: ZoteroClient
    fetchDoi?: (doi: string) => Promise<string>
    literature?: LiteratureSearch
  }) {
    this.db = deps.db
    this.box = deps.box
    this.store = deps.store
    this.collab = deps.collab
    this.history = deps.history
    this.projects = deps.projects
    this.zotero = deps.zotero ?? new ZoteroClient()
    this.doi = deps.fetchDoi ?? (doi => fetchDoiBibtex(doi))
    this.literature = deps.literature ?? new LiteratureSearch({ version: config.version })
  }

  // --- Zotero connection ---------------------------------------------------

  async zoteroStatus(userId: string): Promise<ZoteroStatus> {
    const [row] = await this.db.select().from(zoteroAccounts).where(eq(zoteroAccounts.userId, userId))
    return row ? { connected: true, username: row.username } : { connected: false }
  }

  async connectZotero(userId: string, apiKey: string): Promise<ZoteroStatus> {
    const info = await this.zotero.keyInfo(apiKey)
    const values = { userId, zoteroUserId: info.userId, username: info.username, apiKey: this.box.seal(apiKey) }
    await this.db.insert(zoteroAccounts).values(values).onConflictDoUpdate({ target: zoteroAccounts.userId, set: values })
    return { connected: true, username: info.username }
  }

  async disconnectZotero(userId: string): Promise<void> {
    await this.db.delete(zoteroAccounts).where(eq(zoteroAccounts.userId, userId))
  }

  private async account(userId: string) {
    const [row] = await this.db.select().from(zoteroAccounts).where(eq(zoteroAccounts.userId, userId))
    if (!row) throw new BadRequestError('Connect Zotero in Settings first')
    return { zoteroUserId: row.zoteroUserId, apiKey: this.box.open(row.apiKey) }
  }

  async libraries(userId: string): Promise<ZoteroLibrary[]> {
    const { zoteroUserId, apiKey } = await this.account(userId)
    return this.zotero.libraries(zoteroUserId, apiKey)
  }

  async collections(userId: string, library: string): Promise<ZoteroCollection[]> {
    const { apiKey } = await this.account(userId)
    return this.zotero.collections(library, apiKey)
  }

  // --- .bib files from Zotero ----------------------------------------------

  async links(projectId: string): Promise<ReferenceLink[]> {
    const rows = await this.db
      .select({ link: referenceLinks, name: user.name })
      .from(referenceLinks)
      .leftJoin(user, eq(user.id, referenceLinks.userId))
      .where(eq(referenceLinks.projectId, projectId))
    return rows
      .map(({ link, name }) => ({
        path: link.path,
        libraryName: link.libraryName,
        collectionName: link.collectionName,
        format: link.format,
        items: link.items,
        linkedBy: name,
        updatedAt: link.updatedAt.toISOString(),
      }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }

  async importZotero(projectId: string, userId: string, body: ZoteroImportBody): Promise<ReferenceImportResult> {
    const path = this.bibPath(body.path)
    const { zoteroUserId, apiKey } = await this.account(userId)
    // Names for the link, and a check that the library and collection are the person's.
    const libraries = await this.zotero.libraries(zoteroUserId, apiKey)
    const library = libraries.find(l => l.id === body.library)
    if (!library) throw new BadRequestError('That Zotero library is not one of yours')
    let collectionName: string | null = null
    if (body.collection) {
      const collection = (await this.zotero.collections(body.library, apiKey)).find(c => c.key === body.collection)
      if (!collection) throw new BadRequestError('That Zotero collection was not found')
      collectionName = collection.name
    }
    const { text, items } = await this.zotero.exportItems(body.library, body.collection, body.format, apiKey)
    await this.writeFile(projectId, userId, path, header(library.name, collectionName) + text)
    const values = {
      projectId,
      path,
      userId,
      library: body.library,
      libraryName: library.name,
      collectionKey: body.collection ?? null,
      collectionName,
      format: body.format,
      items,
      updatedAt: new Date(),
    }
    await this.db
      .insert(referenceLinks)
      .values(values)
      .onConflictDoUpdate({ target: [referenceLinks.projectId, referenceLinks.path], set: values })
    return { path, items }
  }

  /** Export the library or collection again, with the Zotero connection of whoever linked the file. */
  async refresh(projectId: string, userId: string, rawPath: string): Promise<ReferenceImportResult> {
    const path = cleanPath(rawPath)
    const [link] = await this.db
      .select()
      .from(referenceLinks)
      .where(and(eq(referenceLinks.projectId, projectId), eq(referenceLinks.path, path)))
    if (!link) throw new NotFoundError(`${path} is not linked to Zotero`)
    if (!link.userId) throw new BadRequestError('The person who linked this file no longer has an account; link it again')
    const { apiKey } = await this.account(link.userId).catch(() => {
      throw new BadRequestError('The person who linked this file has disconnected Zotero; link it again')
    })
    const { text, items } = await this.zotero.exportItems(link.library, link.collectionKey ?? undefined, link.format, apiKey)
    await this.writeFile(projectId, userId, path, header(link.libraryName, link.collectionName) + text)
    await this.db
      .update(referenceLinks)
      .set({ items, updatedAt: new Date() })
      .where(and(eq(referenceLinks.projectId, projectId), eq(referenceLinks.path, path)))
    return { path, items }
  }

  async unlink(projectId: string, rawPath: string): Promise<void> {
    await this.db
      .delete(referenceLinks)
      .where(and(eq(referenceLinks.projectId, projectId), eq(referenceLinks.path, cleanPath(rawPath))))
  }

  /** A linked file was renamed or moved (or a folder above it). */
  async followMove(projectId: string, from: string, to: string): Promise<void> {
    const rows = await this.db.select().from(referenceLinks).where(eq(referenceLinks.projectId, projectId))
    for (const row of rows) {
      const moved = row.path === from ? to : row.path.startsWith(`${from}/`) ? to + row.path.slice(from.length) : null
      if (moved) {
        await this.db
          .update(referenceLinks)
          .set({ path: moved })
          .where(and(eq(referenceLinks.projectId, projectId), eq(referenceLinks.path, row.path)))
      }
    }
  }

  // --- DOI -----------------------------------------------------------------

  /** Look the DOI up and add its entry to the end of a .bib file (made if missing). */
  /** Papers matching a title, authors or keywords, from Crossref and arXiv. */
  searchLiterature(query: string): Promise<LiteratureSearchResult> {
    return this.literature.search(query)
  }

  async addDoi(projectId: string, userId: string, id: string, rawPath: string): Promise<DoiResult> {
    const path = this.bibPath(rawPath)
    const doi = normalizeDoi(id)
    await this.collab.flushProject(projectId)
    const current = await this.read(projectId, path)
    const existing = current === undefined ? undefined : keyWithDoi(current, doi)
    if (existing) throw new BadRequestError(`${doi} is already in ${path} as ${existing}`)
    const raw = await this.doi(doi)
    const keys = current === undefined ? new Set<string>() : bibKeys(current)
    const base = citationKey(raw)
    let key = base
    for (let i = 0; keys.has(key); i++) key = `${base}${String.fromCharCode(97 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`
    const entry = formatEntry(raw, key)
    if (current === undefined) {
      await this.writeFile(projectId, userId, path, entry)
    } else {
      // Append in the live document, so edits being made to the file stay.
      const docId = await this.collab.resolveDoc(projectId, path)
      await this.collab.editDoc(projectId, docId, userId, doc => {
        const ytext = doc.getText(TEXT_KEY)
        const text = ytext.toString()
        const gap = text === '' ? '' : text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n'
        ytext.insert(ytext.length, gap + entry)
      })
      // On disk and in everyone's file list (sizes), so the new key reaches completions.
      await this.collab.flushProject(projectId)
      await this.collab.treeChanged(projectId)
      this.history.noteChange(projectId, userId)
      await this.projects.touch(projectId)
    }
    return { path, key, entry }
  }

  // --- helpers -------------------------------------------------------------

  private bibPath(raw: string): string {
    const path = cleanPath(raw)
    if (!BIB_PATH.test(path)) throw new BadRequestError('References go into a .bib file')
    return path
  }

  private async read(projectId: string, path: string): Promise<string | undefined> {
    try {
      return (await this.store.readFile(projectId, path)).toString('utf8')
    } catch (err) {
      if (err instanceof NotFoundError) return undefined
      throw err
    }
  }

  private async writeFile(projectId: string, userId: string, path: string, text: string): Promise<void> {
    await this.collab.mutate(projectId, async () => {
      await this.store.writeFile(projectId, path, text)
      // Someone may have this file open: carry the new content into the live document.
      await this.collab.afterWrite(projectId, path, text)
    })
    await this.projects.touch(projectId)
    await this.collab.treeChanged(projectId)
    this.history.noteChange(projectId, userId)
  }
}

function header(library: string, collection: string | null): string {
  const source = collection ? `${library} / ${collection}` : library
  return `% Exported from Zotero (${source}) by ColTex. Refreshing replaces this file;\n% make changes in Zotero.\n\n`
}

import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { Hocuspocus, type Document, type WebSocketLike } from '@hocuspocus/server'
import crossws from 'crossws/adapters/node'
import * as Y from 'yjs'
import { checkSuggestionUpdate } from '@coltex/review'
import type { ProjectRole } from '@coltex/shared'
import type { Auth } from '../auth/auth.ts'
import type { ProjectService } from '../projects/service.ts'
import { isTextPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'
import type { DocService } from './docs.ts'
import { applyTextDiff } from './text-diff.ts'

export const COLLAB_PATH = '/api/collab'
/** The Y.Text holding a file's content inside its Yjs document. */
export const TEXT_KEY = 'content'
/** Per-project document for presence and change notifications; never persisted. */
export const PROJECT_DOC = '~project'

type Context = { userId: string; name: string; role: ProjectRole; projectId: string; docId: string }

/**
 * Prefix of the close reason when a reviewer's update is refused (Hocuspocus
 * passes only the reason to clients). The client drops its local copy and
 * reloads the document, so the refused edit isn't sent again.
 */
export const SUGGESTION_REFUSED = 'coltex/suggestion-refused'

/** Origin for changes the server makes (disk sync, uploads), as opposed to clients. */
const SERVER_ORIGIN = Symbol('coltex-server')

function parseName(documentName: string): { projectId: string; docId: string } | undefined {
  const [projectId, docId, ...rest] = documentName.split('/')
  if (!projectId || !docId || rest.length) return undefined
  return { projectId, docId }
}

/**
 * The project-facing side of collaboration that file routes call into. Kept
 * as an interface so tests (and future multi-instance setups) can swap it.
 */
export interface CollabHooks {
  /** Write every open document of the project to disk now (before compile/export). */
  flushProject(projectId: string): Promise<void>
  /**
   * Run a file-tree mutation exclusively with document persistence: open docs
   * are flushed first, and no debounced write can land on a path mid-move or
   * resurrect a deleted file.
   */
  mutate<T>(projectId: string, fn: () => Promise<T>): Promise<T>
  /** A text file was written through the API: push the new content into the live doc, if any. */
  afterWrite(projectId: string, path: string, text: string): Promise<void>
  afterMove(projectId: string, from: string, to: string): Promise<void>
  afterDelete(projectId: string, path: string): Promise<void>
  /** The file tree changed: tell connected clients to refresh. */
  treeChanged(projectId: string): Promise<void>
  /** Disconnect everyone from a project's documents (project deleted). */
  closeProject(projectId: string): void
  /** Disconnect one person from a project (their role changed or was removed); they reconnect with the new role. */
  closeUser(projectId: string, userId: string): void
  /** Review data (comments, tracked changes) changed: tell connected clients to refresh. */
  reviewChanged(projectId: string): Promise<void>
  /** The project's chat changed: tell connected clients to refresh. */
  chatChanged(projectId: string): Promise<void>
  resolveDoc(projectId: string, path: string): Promise<string>
  listDocs(projectId: string): Promise<{ id: string; path: string }[]>
  /**
   * Change a file's live Yjs document (loading it if nobody has it open). Edits
   * reach connected clients and are persisted like theirs; `userId` attributes
   * them in the history.
   */
  editDoc<T>(projectId: string, docId: string, userId: string, fn: (doc: Y.Doc) => T): Promise<T>
  /**
   * Read a file's Yjs document. `filter` sees the persisted state first, so
   * documents without anything of interest are skipped without loading them.
   */
  readDoc<T>(projectId: string, docId: string, fn: (doc: Y.Doc) => T, filter?: (stored: Y.Doc) => boolean): Promise<T | undefined>
}

export type CollabOptions = {
  auth: Auth
  projects: ProjectService
  store: ProjectStore
  docs: DocService
  /** A user edited a document (for version history attribution). */
  onEdit?: (projectId: string, userId: string) => void
  /** Debounce for writing edits to disk and DB. */
  debounceMs?: number
  maxDebounceMs?: number
}

export class CollabServer implements CollabHooks {
  readonly hocuspocus: Hocuspocus<Context>
  private readonly ws: ReturnType<typeof crossws>
  private readonly opts: CollabOptions
  private readonly locks = new Map<string, Promise<unknown>>()

  /** Serialise persistence and tree mutations per project. */
  private withLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(projectId) ?? Promise.resolve()
    const next = prev.catch(() => {}).then(fn)
    this.locks.set(projectId, next)
    void next.finally(() => {
      if (this.locks.get(projectId) === next) this.locks.delete(projectId)
    }).catch(() => {})
    return next
  }

  constructor(opts: CollabOptions) {
    this.opts = opts
    const { auth, projects, store, docs } = opts

    this.hocuspocus = new Hocuspocus<Context>({
      name: 'coltex-collab',
      quiet: true,
      debounce: opts.debounceMs ?? 2000,
      maxDebounce: opts.maxDebounceMs ?? 10_000,

      onAuthenticate: async ({ documentName, requestHeaders, token, connectionConfig }) => {
        const target = parseName(documentName)
        if (!target) throw new Error('Unknown document')
        // Browsers authenticate with the session cookie on the upgrade request;
        // other clients may pass the cookie string as the provider token.
        const headers = new Headers(requestHeaders)
        if (token && token !== 'cookie') headers.set('cookie', token)
        const session = await auth.api.getSession({ headers })
        if (!session) throw new Error('Sign in required')
        const { role } = await projects.requireAccess(target.projectId, session.user.id, 'viewer')
        if (target.docId !== PROJECT_DOC) {
          const row = await docs.get(target.docId)
          if (!row || row.projectId !== target.projectId) throw new Error('Unknown document')
        }
        // Viewers may follow along but their updates are rejected by the server.
        // Reviewers may write, but only tracked suggestions (checked in beforeSync).
        connectionConfig.readOnly = role === 'viewer' && target.docId !== PROJECT_DOC
        return { userId: session.user.id, name: session.user.name, role, ...target } satisfies Context
      },

      beforeSync: async ({ context, document, documentName, type, payload }) => {
        // 1 = sync step 2 (a client's pending changes), 2 = update.
        if (context?.role !== 'reviewer' || (type !== 1 && type !== 2)) return
        if (parseName(documentName)?.docId === PROJECT_DOC) return
        const reason = checkSuggestionUpdate(document, payload, context.userId)
        if (reason) throw Object.assign(new Error(reason), { reason: `${SUGGESTION_REFUSED}: ${reason}` })
      },

      onLoadDocument: async ({ document, documentName }) => {
        const target = parseName(documentName)!
        if (target.docId === PROJECT_DOC) return document
        const row = await docs.get(target.docId)
        if (!row) return document
        if (row.state) Y.applyUpdate(document, row.state, SERVER_ORIGIN)
        const disk = await store.readFile(target.projectId, row.path).then(b => b.toString('utf8'), () => '')
        // The file may have changed while nobody had it open (upload, import, AI):
        // reconcile as edits so reconnecting clients merge instead of duplicating.
        const ytext = document.getText(TEXT_KEY)
        if (ytext.toString() !== disk) document.transact(() => applyTextDiff(ytext, disk), SERVER_ORIGIN)
        return document
      },

      onChange: async ({ context, documentName }) => {
        // Server-side changes (disk sync, uploads) have no connection context.
        const target = parseName(documentName)
        if (context?.userId && target && target.docId !== PROJECT_DOC) opts.onEdit?.(target.projectId, context.userId)
      },

      onStoreDocument: async ({ document, documentName }) => {
        const target = parseName(documentName)!
        if (target.docId !== PROJECT_DOC) {
          await this.withLock(target.projectId, () => this.persist(target.projectId, target.docId, document))
        }
      },
    })

    this.ws = crossws({
      hooks: {
        open: peer => {
          const connection = this.hocuspocus.handleConnection(
            peer.websocket as unknown as WebSocketLike,
            peer.request as Request,
          )
          ;(peer as unknown as { _hp: typeof connection })._hp = connection
          ;(peer.websocket as unknown as { on?: (e: string, l: () => void) => void }).on?.('pong', () =>
            connection.touch(),
          )
        },
        message: (peer, message) => {
          ;(peer as unknown as { _hp?: { handleMessage(m: Uint8Array): void } })._hp?.handleMessage(message.uint8Array())
        },
        close: (peer, event) => {
          ;(peer as unknown as { _hp?: { handleClose(e: { code?: number; reason?: string }): void } })._hp?.handleClose({
            code: event.code,
            reason: event.reason,
          })
        },
      },
    })
  }

  /** Route WebSocket upgrades for the collaboration path; leave others alone. */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    if (!request.url?.startsWith(COLLAB_PATH)) return false
    void this.ws.handleUpgrade(request, socket, head)
    return true
  }

  /** Write a document's text to disk (if changed) and save its Yjs state. Call under the project lock. */
  private async persist(projectId: string, docId: string, document: Y.Doc): Promise<void> {
    const { docs, store, projects } = this.opts
    const row = await docs.get(docId)
    if (!row) return // deleted while open
    const text = document.getText(TEXT_KEY).toString()
    const disk = await store.readFile(projectId, row.path).then(b => b.toString('utf8'), () => undefined)
    if (disk !== text) {
      await store.writeFile(projectId, row.path, text)
      await projects.touch(projectId)
    }
    await docs.saveState(docId, Y.encodeStateAsUpdate(document))
  }

  private openDocuments(projectId: string): [string, Document][] {
    return [...this.hocuspocus.documents].filter(([name]) => name.startsWith(`${projectId}/`))
  }

  private async flushUnlocked(projectId: string): Promise<void> {
    for (const [name, document] of this.openDocuments(projectId)) {
      const target = parseName(name)
      if (target && target.docId !== PROJECT_DOC) await this.persist(projectId, target.docId, document)
    }
  }

  flushProject(projectId: string): Promise<void> {
    return this.withLock(projectId, () => this.flushUnlocked(projectId))
  }

  mutate<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    return this.withLock(projectId, async () => {
      await this.flushUnlocked(projectId)
      return fn()
    })
  }

  async afterWrite(projectId: string, path: string, text: string): Promise<void> {
    if (!isTextPath(path)) return
    const row = (await this.opts.docs.list(projectId)).find(d => d.path === path)
    const document = row && this.hocuspocus.documents.get(`${projectId}/${row.id}`)
    if (document) document.transact(() => applyTextDiff(document.getText(TEXT_KEY), text), SERVER_ORIGIN)
  }

  /** Call inside `mutate`, after the storage move. */
  async afterMove(projectId: string, from: string, to: string): Promise<void> {
    await this.opts.docs.move(projectId, from, to)
    await this.treeChanged(projectId)
  }

  /** Call inside `mutate`, after the storage delete. */
  async afterDelete(projectId: string, path: string): Promise<void> {
    for (const id of await this.opts.docs.remove(projectId, path)) {
      this.hocuspocus.closeConnections(`${projectId}/${id}`)
    }
    await this.treeChanged(projectId)
  }

  treeChanged(projectId: string): Promise<void> {
    return this.bump(projectId, 'treeVersion')
  }

  reviewChanged(projectId: string): Promise<void> {
    return this.bump(projectId, 'reviewVersion')
  }

  chatChanged(projectId: string): Promise<void> {
    return this.bump(projectId, 'chatVersion')
  }

  /** Increment a counter in the project document's `meta` map; clients observe it. */
  private async bump(projectId: string, key: string): Promise<void> {
    const name = `${projectId}/${PROJECT_DOC}`
    // Only notify if someone is connected; don't spin up an empty document.
    if (!this.hocuspocus.documents.has(name)) return
    const connection = await this.hocuspocus.openDirectConnection(name)
    await connection.transact(doc => {
      const meta = doc.getMap('meta')
      meta.set(key, ((meta.get(key) as number | undefined) ?? 0) + 1)
    })
    await connection.disconnect()
  }

  async editDoc<T>(projectId: string, docId: string, userId: string, fn: (doc: Y.Doc) => T): Promise<T> {
    const connection = await this.hocuspocus.openDirectConnection(`${projectId}/${docId}`, { userId } as Context)
    try {
      let result: T | undefined
      await connection.transact(doc => {
        result = fn(doc)
      })
      return result as T
    } finally {
      await connection.disconnect()
    }
  }

  async readDoc<T>(projectId: string, docId: string, fn: (doc: Y.Doc) => T, filter?: (stored: Y.Doc) => boolean): Promise<T | undefined> {
    const live = this.hocuspocus.documents.get(`${projectId}/${docId}`)
    if (live) return fn(live)
    if (filter) {
      const row = await this.opts.docs.get(docId)
      if (!row?.state) return undefined
      const stored = new Y.Doc()
      try {
        Y.applyUpdate(stored, row.state)
        if (!filter(stored)) return undefined
      } finally {
        stored.destroy()
      }
    }
    // Load properly so the text is reconciled with the file on disk.
    const connection = await this.hocuspocus.openDirectConnection(`${projectId}/${docId}`)
    try {
      return fn(connection.document!)
    } finally {
      await connection.disconnect()
    }
  }

  closeProject(projectId: string): void {
    for (const [name] of this.openDocuments(projectId)) this.hocuspocus.closeConnections(name)
  }

  closeUser(projectId: string, userId: string): void {
    for (const [, document] of this.openDocuments(projectId)) {
      for (const connection of document.getConnections()) {
        if ((connection.context as Context | undefined)?.userId === userId) connection.close()
      }
    }
  }

  resolveDoc(projectId: string, path: string): Promise<string> {
    return this.opts.docs.resolve(projectId, path)
  }

  listDocs(projectId: string) {
    return this.opts.docs.list(projectId)
  }

  async close(): Promise<void> {
    this.hocuspocus.flushPendingStores()
    this.hocuspocus.closeConnections()
  }
}

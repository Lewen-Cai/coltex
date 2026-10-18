import { and, eq, like, or, sql } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import type { Db } from '../db/client.ts'
import { projectDocs } from '../db/schema.ts'

const newDocId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

/** Escape LIKE wildcards in a path used as a prefix pattern. */
const likePrefix = (p: string) => `${p.replace(/[\\%_]/g, c => `\\${c}`)}/%`

/** Stable ids for collaboratively edited text files, plus their persisted Yjs state. */
export class DocService {
  private readonly db: Db

  constructor(db: Db) {
    this.db = db
  }

  async resolve(projectId: string, path: string): Promise<string> {
    const [row] = await this.db
      .insert(projectDocs)
      .values({ id: newDocId(), projectId, path })
      .onConflictDoUpdate({ target: [projectDocs.projectId, projectDocs.path], set: { path } })
      .returning({ id: projectDocs.id })
    return row!.id
  }

  async get(docId: string) {
    const [row] = await this.db.select().from(projectDocs).where(eq(projectDocs.id, docId))
    return row
  }

  async list(projectId: string): Promise<{ id: string; path: string }[]> {
    return this.db
      .select({ id: projectDocs.id, path: projectDocs.path })
      .from(projectDocs)
      .where(eq(projectDocs.projectId, projectId))
  }

  async saveState(docId: string, state: Uint8Array): Promise<void> {
    await this.db.update(projectDocs).set({ state }).where(eq(projectDocs.id, docId))
  }

  /** Keep ids attached to their files when a file or folder is moved/renamed. */
  async move(projectId: string, from: string, to: string): Promise<void> {
    await this.db
      .update(projectDocs)
      // char_length, not JS length: Postgres counts code points, JS counts UTF-16 units.
      .set({ path: sql`${to} || substr(${projectDocs.path}, char_length(${from}) + 1)` })
      .where(
        and(
          eq(projectDocs.projectId, projectId),
          or(eq(projectDocs.path, from), like(projectDocs.path, likePrefix(from))),
        ),
      )
  }

  /** Forget docs for a deleted file or folder; returns the removed ids. */
  async remove(projectId: string, path: string): Promise<string[]> {
    const rows = await this.db
      .delete(projectDocs)
      .where(
        and(
          eq(projectDocs.projectId, projectId),
          or(eq(projectDocs.path, path), like(projectDocs.path, likePrefix(path))),
        ),
      )
      .returning({ id: projectDocs.id })
    return rows.map(r => r.id)
  }
}

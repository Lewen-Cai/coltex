import path from 'node:path'
import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from './schema.ts'

export type Db = NodePgDatabase<typeof schema> & { $client: pg.Pool }

export function createDb(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10 })
  return drizzle(pool, { schema }) as Db
}

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../drizzle')

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
}

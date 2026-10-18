import crypto from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import type { AuthOperationOptions, Credential, CredentialInfo, CredentialStore } from '@earendil-works/pi-ai'
import type { Db } from '../db/client.ts'
import { aiCredentials } from '../db/schema.ts'

const ALGORITHM = 'aes-256-gcm'

/** Symmetric encryption for secrets at rest, keyed from the instance secret. */
export class SecretBox {
  private readonly key: Buffer

  constructor(instanceSecret: string) {
    this.key = Buffer.from(crypto.hkdfSync('sha256', instanceSecret, 'coltex', 'ai-credentials', 32))
  }

  seal(plain: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv)
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
  }

  open(sealed: string): string {
    const [version, iv, tag, data] = sealed.split('.')
    if (version !== 'v1' || !iv || !tag || data === undefined) throw new Error('Unrecognised secret format')
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
  }
}

/**
 * pi-ai credential store backed by Postgres. Writes take a transaction-scoped
 * advisory lock per provider, so OAuth refreshes are serialized even across
 * server processes (a rotated refresh token is never used twice).
 */
export class DbCredentialStore implements CredentialStore {
  private readonly db: Db
  private readonly box: SecretBox

  constructor(db: Db, box: SecretBox) {
    this.db = db
    this.box = box
  }

  async read(providerId: string, _options?: AuthOperationOptions): Promise<Credential | undefined> {
    const [row] = await this.db.select().from(aiCredentials).where(eq(aiCredentials.providerId, providerId))
    return row ? (JSON.parse(this.box.open(row.secret)) as Credential) : undefined
  }

  async list(_options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
    const rows = await this.db.select({ providerId: aiCredentials.providerId, type: aiCredentials.type }).from(aiCredentials)
    return rows
  }

  async modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>,
    _options?: AuthOperationOptions,
  ): Promise<Credential | undefined> {
    return this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`coltex-ai-credential:${providerId}`}))`)
      const [row] = await tx.select().from(aiCredentials).where(eq(aiCredentials.providerId, providerId))
      const current = row ? (JSON.parse(this.box.open(row.secret)) as Credential) : undefined
      const next = await fn(current)
      if (!next) return current
      const secret = this.box.seal(JSON.stringify(next))
      await tx
        .insert(aiCredentials)
        .values({ providerId, type: next.type, secret })
        .onConflictDoUpdate({ target: aiCredentials.providerId, set: { type: next.type, secret, updatedAt: new Date() } })
      return next
    })
  }

  async delete(providerId: string, _options?: AuthOperationOptions): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`coltex-ai-credential:${providerId}`}))`)
      await tx.delete(aiCredentials).where(eq(aiCredentials.providerId, providerId))
    })
  }
}

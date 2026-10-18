import path from 'node:path'
import type { Config } from '../config.ts'
import { LocalProjectStore } from './local.ts'
import { S3ProjectStore } from './s3.ts'
import { S3Client } from './s3-client.ts'
import type { ProjectStore } from './types.ts'

/** The configured project store. For S3, fails fast when the bucket can't be reached. */
export async function createStore(config: Pick<Config, 'storage' | 'projectsDir' | 'cacheDir'>): Promise<ProjectStore> {
  if (config.storage.driver === 'local') return new LocalProjectStore(config.projectsDir)
  const client = new S3Client(config.storage.s3)
  try {
    await client.checkBucket()
  } catch (err) {
    throw new Error(`Cannot reach S3 bucket "${config.storage.s3.bucket}" at ${config.storage.s3.endpoint}: ${(err as Error).message}`, { cause: err })
  }
  return new S3ProjectStore({
    client,
    prefix: config.storage.s3.prefix,
    mirrorDir: config.projectsDir,
    manifestDir: path.join(config.cacheDir, 's3-mirror'),
  })
}

/** Where files are kept, for the admin pages. */
export function storageLocation(config: Pick<Config, 'storage' | 'projectsDir'>): { driver: 'local' | 's3'; location: string } {
  if (config.storage.driver === 'local') return { driver: 'local', location: config.projectsDir }
  const { endpoint, bucket, prefix } = config.storage.s3
  return { driver: 's3', location: `s3://${bucket}/${prefix ? `${prefix.replace(/^\/+|\/+$/g, '')}/` : ''} (${endpoint})` }
}

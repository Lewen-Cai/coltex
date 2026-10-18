import crypto from 'node:crypto'
import fs from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import yauzl from 'yauzl'
import yazl from 'yazl'

/**
 * Backup archives: a zip file, optionally encrypted the way
 * `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256` does it, so a
 * backup can be opened with standard tools and no ColTex at hand:
 *
 *   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in X.zip.enc -out X.zip
 */

export const MANIFEST = 'coltex-backup.json'
export const ARCHIVE_FORMAT = 1
export const PBKDF2_ITERATIONS = 600_000
const MAGIC = Buffer.from('Salted__')

export type BackupManifest = {
  format: number
  createdAt: string
  version: string
  storage: 'local' | 's3'
  projects: string[]
  /** The instance secret (decrypts stored AI credentials) is in the archive only when it is encrypted. */
  secret: 'included' | 'environment' | 'omitted'
}

export type ArchiveEntry =
  | { name: string; file: string }
  | { name: string; buffer: Buffer }
  | { name: string; read: () => Promise<Buffer> }
  | { name: string; folder: true }

const pbkdf2 = promisify(crypto.pbkdf2)

/** `iterations` is only lowered by tests; archives always use PBKDF2_ITERATIONS. */
async function keyAndIv(password: string, salt: Buffer, iterations = PBKDF2_ITERATIONS): Promise<{ key: Buffer; iv: Buffer }> {
  const bytes = await pbkdf2(password, salt, iterations, 48, 'sha256')
  return { key: bytes.subarray(0, 32), iv: bytes.subarray(32) }
}

/** Already compressed formats are stored as they are. */
const STORED = /\.(png|jpe?g|gif|webp|pdf|zip|gz|bz2|xz|bundle)$/i

/** Write the entries to `out` (in order, reading lazily) and return its size. */
export async function writeArchive(out: string, entries: ArchiveEntry[], opts: { password?: string; iterations?: number } = {}): Promise<number> {
  const zip = new yazl.ZipFile()
  for (const e of entries) {
    const options = { compress: !STORED.test(e.name) }
    if ('folder' in e) zip.addEmptyDirectory(e.name)
    else if ('file' in e) zip.addFile(e.file, e.name, options)
    else if ('buffer' in e) zip.addBuffer(e.buffer, e.name, options)
    else {
      const read = e.read
      zip.addReadStreamLazy(e.name, options, cb => {
        read().then(
          buf => cb(null, Readable.from([buf])),
          (err: Error) => cb(err, undefined as unknown as Readable),
        )
      })
    }
  }
  zip.end()

  const target = fs.createWriteStream(out)
  const stages: (NodeJS.ReadableStream | NodeJS.WritableStream)[] = [zip.outputStream]
  if (opts.password) {
    const salt = crypto.randomBytes(8)
    const { key, iv } = await keyAndIv(opts.password, salt, opts.iterations)
    target.write(Buffer.concat([MAGIC, salt]))
    stages.push(crypto.createCipheriv('aes-256-cbc', key, iv))
  }
  // A failed lazy read surfaces as an error on the zip's output stream.
  await pipeline([...stages, target] as unknown as [NodeJS.ReadableStream, NodeJS.WritableStream])
  return (await fs.promises.stat(out)).size
}

export async function isEncrypted(file: string): Promise<boolean> {
  const handle = await fs.promises.open(file, 'r')
  try {
    const head = Buffer.alloc(8)
    await handle.read(head, 0, 8, 0)
    return head.equals(MAGIC)
  } finally {
    await handle.close()
  }
}

/** Decrypt an encrypted archive to `out`. */
export async function decryptArchive(file: string, out: string, password: string, iterations?: number): Promise<void> {
  const handle = await fs.promises.open(file, 'r')
  const salt = Buffer.alloc(8)
  await handle.read(salt, 0, 8, 8)
  await handle.close()
  const { key, iv } = await keyAndIv(password, salt, iterations)
  const wrong = () => new Error('Wrong password, or the file is damaged')
  try {
    await pipeline(fs.createReadStream(file, { start: 16 }), crypto.createDecipheriv('aes-256-cbc', key, iv), fs.createWriteStream(out))
  } catch (err) {
    if ((err as { code?: string }).code === 'ERR_OSSL_BAD_DECRYPT') throw wrong()
    throw err
  }
  // The format has no MAC: about one wrong password in 256 still ends in valid
  // padding and decrypts to noise. A zip starts with its local header signature.
  const out_ = await fs.promises.open(out, 'r')
  const head = Buffer.alloc(4)
  await out_.read(head, 0, 4, 0)
  await out_.close()
  if (!head.equals(Buffer.from('PK\x03\x04', 'latin1'))) throw wrong()
}

export type ArchiveReader = {
  names: string[]
  isFolder(name: string): boolean
  read(name: string): Promise<Buffer>
  /** Copy an entry to a file on disk. */
  extract(name: string, dest: string): Promise<void>
  close(): void
}

const openZip = promisify<string, yauzl.Options, yauzl.ZipFile>(yauzl.open)

/** Open a (decrypted) archive for reading entries by name. */
export async function readArchive(file: string): Promise<ArchiveReader> {
  const zip = await openZip(file, { lazyEntries: true, autoClose: false })
  const entries = new Map<string, yauzl.Entry>()
  await new Promise<void>((resolve, reject) => {
    zip.on('entry', (e: yauzl.Entry) => {
      entries.set(e.fileName, e)
      zip.readEntry()
    })
    zip.on('end', () => resolve())
    zip.on('error', reject)
    zip.readEntry()
  })
  const stream = (name: string) => {
    const entry = entries.get(name)
    if (!entry) throw new Error(`${name} is missing from the backup`)
    return promisify(zip.openReadStream.bind(zip))(entry) as Promise<Readable>
  }
  return {
    names: [...entries.keys()],
    isFolder: name => name.endsWith('/'),
    async read(name) {
      const chunks: Buffer[] = []
      await pipeline(
        await stream(name),
        new Transform({
          transform(chunk: Buffer, _enc, cb) {
            chunks.push(chunk)
            cb()
          },
        }),
      )
      return Buffer.concat(chunks)
    },
    async extract(name, dest) {
      await pipeline(await stream(name), fs.createWriteStream(dest))
    },
    close: () => zip.close(),
  }
}

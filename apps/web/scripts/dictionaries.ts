// Fetch the spell-check dictionaries (Overleaf's @overleaf/dictionaries:
// Hunspell dictionaries converted to UTF-8 from Debian) into vendor/dictionaries.
//
// They are not an npm dependency on purpose: the package unpacks to ~270 MB,
// and pnpm unpacks tarballs in memory, which gets killed on a 2 GB Docker VM
// or VPS. Here the download is checked against a pinned SHA-256 and unpacked
// with tar, which streams. The Dockerfile fetches the same file with
// `ADD --checksum`; keep VERSION and SHA256 in step with it.
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export const VERSION = '0.0.3'
const URL_ = `https://github.com/overleaf/dictionaries/archive/refs/tags/v${VERSION}.tar.gz`
const SHA256 = 'c8da867b784c9d7a0e47962b43df1f817e95be055ea85bf4e3f85176c779cd15'

const target = path.resolve(import.meta.dirname, '../vendor/dictionaries')
const stamp = path.join(target, '.version')

if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === VERSION) process.exit(0)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coltex-dictionaries-'))
try {
  const archive = path.join(tmp, 'dictionaries.tar.gz')
  console.log(`Downloading spell-check dictionaries ${VERSION} (about 60 MB)…`)
  const res = await fetch(URL_)
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  const hash = crypto.createHash('sha256')
  await pipeline(
    Readable.fromWeb(res.body as import('node:stream/web').ReadableStream),
    async function* (chunks) {
      for await (const chunk of chunks) {
        hash.update(chunk as Buffer)
        yield chunk
      }
    },
    fs.createWriteStream(archive),
  )
  const digest = hash.digest('hex')
  if (digest !== SHA256) throw new Error(`Checksum mismatch for ${URL_}: got ${digest}`)

  const unpacked = path.join(tmp, 'out')
  fs.mkdirSync(unpacked)
  // Only the dictionaries folder: <archive root>/dictionaries/* → out/*
  const tar = spawnSync('tar', ['-xzf', archive, '-C', unpacked, '--strip-components=2', `dictionaries-${VERSION}/dictionaries`], {
    stdio: 'inherit',
  })
  if (tar.status !== 0) throw new Error('tar failed to unpack the dictionaries')
  fs.writeFileSync(path.join(unpacked, '.version'), VERSION)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.renameSync(unpacked, target)
  console.log(`Spell-check dictionaries ready in ${path.relative(process.cwd(), target)}`)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

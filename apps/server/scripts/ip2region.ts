// Fetch ip2region's offline databases (IPv4 and IPv6, github.com/lionsoul2014/ip2region,
// Apache-2.0 OR MIT) into vendor/ip2region, for the place shown next to a sign-in's address.
// Pinned to a commit and checked against SHA-256; the Dockerfile adds the same files with
// `ADD --checksum`, so keep COMMIT and the checksums in step with it. Without them the server
// still runs and shows addresses without a place.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const COMMIT = '1bf6cabfb63c1a14af0971749c2120a3e5c77d72'
const FILES: Record<string, string> = {
  'ip2region_v4.xdb': '27ecba8c9a6d5e3b280aedbe7ee15c65372b179fbd0dad3845d8c608f2fcace1',
  'ip2region_v6.xdb': '939f6b46bd2b8bec3cf7c5ceb8ba782266ae9b1f35b5ba7916700dec0b7506ed',
}

const target = path.resolve(import.meta.dirname, '../vendor/ip2region')
const stamp = path.join(target, '.version')

if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === COMMIT) process.exit(0)

fs.mkdirSync(target, { recursive: true })
console.log('Downloading the ip2region databases (about 48 MB)…')
for (const [name, sha256] of Object.entries(FILES)) {
  const url = `https://raw.githubusercontent.com/lionsoul2014/ip2region/${COMMIT}/data/${name}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText} (${url})`)
  const data = Buffer.from(await res.arrayBuffer())
  const digest = crypto.createHash('sha256').update(data).digest('hex')
  if (digest !== sha256) throw new Error(`Checksum mismatch for ${url}: got ${digest}`)
  fs.writeFileSync(path.join(target, name), data)
}
fs.writeFileSync(stamp, COMMIT)
console.log(`ip2region databases ready in ${path.relative(process.cwd(), target)}`)

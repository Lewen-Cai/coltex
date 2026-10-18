import fs from 'node:fs/promises'
import path from 'node:path'

const MANIFEST = '.coltex-manifest.json'

type Manifest = Record<string, { size: number; mtimeMs: number }>

async function walk(dir: string, base = dir, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    // Skip files the server is still writing (atomic write via rename).
    if (entry.name.endsWith('.coltex-tmp')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, base, out)
    else if (entry.isFile()) out.push(path.relative(base, full))
  }
  return out
}

async function readManifest(workDir: string): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(path.join(workDir, MANIFEST), 'utf8')) as Manifest
  } catch {
    return {}
  }
}

/**
 * Mirror project sources into the compile directory.
 *
 * Only source files are tracked in the manifest, so intermediate files produced
 * by previous runs (.aux, .bbl, .toc, ...) survive and speed up the next build,
 * while sources deleted from the project are removed here too.
 */
export async function syncProject(srcDir: string, workDir: string): Promise<void> {
  await fs.mkdir(workDir, { recursive: true })
  const previous = await readManifest(workDir)
  const next: Manifest = {}

  for (const rel of await walk(srcDir)) {
    const src = path.join(srcDir, rel)
    const stat = await fs.stat(src)
    next[rel] = { size: stat.size, mtimeMs: stat.mtimeMs }
    const prev = previous[rel]
    if (prev && prev.size === stat.size && prev.mtimeMs === stat.mtimeMs) continue
    const dest = path.join(workDir, rel)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
  }

  for (const rel of Object.keys(previous)) {
    if (!(rel in next)) await fs.rm(path.join(workDir, rel), { force: true })
  }

  await fs.writeFile(path.join(workDir, MANIFEST), JSON.stringify(next))
}

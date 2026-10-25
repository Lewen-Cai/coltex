import fs from 'node:fs/promises'
import path from 'node:path'

/** Write trial files into the scratch directory, refusing paths that escape it. */
export async function writeOverlay(workDir: string, overlay: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(overlay)) {
    const dest = path.resolve(workDir, rel)
    if (path.isAbsolute(rel) || !dest.startsWith(workDir + path.sep)) throw new Error(`Invalid overlay path: ${rel}`)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, content)
  }
}

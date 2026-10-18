import { describe, expect, it } from 'vitest'
import { buildProjectMetadata, loadPackageCommands } from '../src/index'

describe('package commands', () => {
  it('adds the commands of the packages a project loads', async () => {
    const mapping = await loadPackageCommands()
    expect(Object.keys(mapping).length).toBeGreaterThan(500)
    const contents = new Map([['main.tex', '\\documentclass{article}\n\\usepackage{amsmath,hyperref}\n% \\usepackage{tikz}\n']])
    const meta = buildProjectMetadata([{ path: 'main.tex', binary: false }], contents, mapping)
    const captions = meta.commands.map(c => c.caption)
    expect(captions).toContain('\\eqref{}')
    expect(captions).toContain('\\href{}{}')
    // Commented out: not loaded.
    expect(meta.commands.some(c => c.meta === 'tikz-cmd')).toBe(false)
    expect(new Set(meta.commands.map(c => c.meta))).toEqual(new Set(['amsmath-cmd', 'hyperref-cmd']))
  })

  it('works without the mapping', () => {
    const meta = buildProjectMetadata([], new Map([['a.tex', '\\usepackage{amsmath}']]))
    expect(meta.commands).toEqual([])
    expect([...meta.packageNames]).toEqual(['amsmath'])
  })
})

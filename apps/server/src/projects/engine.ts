import type { Engine, ProjectMeta } from '@coltex/shared'
import { cleanPath } from '../storage/paths.ts'
import type { ProjectStore } from '../storage/types.ts'

/** Reads a project file as text; undefined when it doesn't exist. */
export type ReadText = (path: string) => Promise<string | undefined>

const MAX_FILES = 20

const LUA_PACKAGES = /^(luacode|luatexja.*|luaotfload|luapackageloader|lua-.*)$/
const XE_PACKAGES = /^(fontspec|xeCJK|ctex|polyglossia|unicode-math|mathspec|xltxtra|xunicode|xecjk)$/
const XE_CLASSES = /^ctex(art|rep|book|beamer)$/

const stripComments = (text: string) => text.replace(/(?<!\\)%.*$/gm, '')
const withExtension = (name: string, ext: string) => (/\.[A-Za-z]+$/.test(name) ? name : `${name}${ext}`)

/**
 * The engine a document needs, read from its sources the way a person would
 * tell: a `% !TEX program` comment, latexmkrc, then what the preamble loads
 * (fontspec, ctex, xeCJK… → XeLaTeX; luacode, luatexja… → LuaLaTeX; anything
 * else builds with pdfLaTeX). Follows `\input`s in the preamble and the
 * project's own .sty/.cls files, since a shared preamble often lives there.
 */
export async function detectEngine(read: ReadText, mainFile: string): Promise<Engine> {
  const main = (await read(mainFile)) ?? ''
  const magic = main.match(/^%\s*!\s*TEX\s+(?:TS-)?program\s*=\s*(\w+)/im)?.[1]?.toLowerCase()
  if (magic === 'xelatex' || magic === 'lualatex' || magic === 'pdflatex') return magic

  const rc = (await read('latexmkrc')) ?? (await read('.latexmkrc')) ?? ''
  const pdfMode = rc.match(/^\s*\$pdf_mode\s*=\s*(\d)/m)?.[1]
  if (pdfMode === '5') return 'xelatex'
  if (pdfMode === '4') return 'lualatex'

  const seen = new Set([mainFile])
  let xe = false
  const queue: string[] = [stripComments(main).split(/\\begin\s*\{document\}/)[0]!]
  while (queue.length) {
    const text = queue.shift()!
    if (/\\directlua\b/.test(text)) return 'lualatex'
    const local: string[] = []
    for (const m of text.matchAll(/\\(usepackage|RequirePackage|documentclass|LoadClass)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g)) {
      const isClass = m[1] === 'documentclass' || m[1] === 'LoadClass'
      for (const name of m[2]!.split(',').map(s => s.trim()).filter(Boolean)) {
        if (isClass ? false : LUA_PACKAGES.test(name)) return 'lualatex'
        if (isClass ? XE_CLASSES.test(name) : XE_PACKAGES.test(name)) xe = true
        local.push(withExtension(name, isClass ? '.cls' : '.sty'))
      }
    }
    for (const m of text.matchAll(/\\(?:input|include)\s*\{([^}]+)\}/g)) local.push(withExtension(m[1]!.trim(), '.tex'))
    for (const file of local) {
      if (seen.has(file) || seen.size >= MAX_FILES) continue
      seen.add(file)
      const content = await read(file)
      if (content !== undefined) queue.push(stripComments(content))
    }
  }
  return xe ? 'xelatex' : 'pdflatex'
}

/**
 * The engine for a build: the project's setting, or for 'auto' what its
 * sources need. `overlay` holds a trial build's replaced files.
 */
export function engineFor(
  store: Pick<ProjectStore, 'readFile'>,
  project: Pick<ProjectMeta, 'id' | 'engine' | 'rootFile'>,
  overlay?: Record<string, string>,
): Promise<Engine> {
  if (project.engine !== 'auto') return Promise.resolve(project.engine)
  return detectEngine(async p => {
    let clean: string
    try {
      clean = cleanPath(p)
    } catch {
      return undefined
    }
    if (overlay && clean in overlay) return overlay[clean]
    return store.readFile(project.id, clean).then(b => b.toString('utf8'), () => undefined)
  }, project.rootFile)
}

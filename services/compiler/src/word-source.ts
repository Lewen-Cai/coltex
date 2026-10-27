import fs from 'node:fs/promises'
import path from 'node:path'

/** Larger files go to pandoc as they are. */
const MAX_BYTES = 4 * 1024 * 1024

/** The end of the group that opens at `i` (after spaces), or -1 when there isn't a balanced one. */
function groupEnd(text: string, i: number, open: string, close: string): number {
  if (text[i] !== open) return -1
  let depth = 0
  for (let j = i; j < text.length; j++) {
    const c = text[j]
    if (c === '\\') {
      j++
      continue
    }
    if (c === open) depth++
    else if (c === close && --depth === 0) return j + 1
  }
  return -1
}

/**
 * Rewrite every `\name` with the arguments `args` ('{' required, '[' and '('
 * optional) as `out` says, given the arguments' contents. A command whose
 * arguments don't parse stays as it is.
 */
function rewrite(text: string, name: string, args: string, out: (a: string[]) => string): string {
  const re = new RegExp('\\\\' + name.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&') + '(?![A-Za-z])', 'g')
  let result = ''
  let from = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    let i = m.index + m[0].length
    const found: string[] = []
    let ok = true
    for (const kind of args) {
      let j = i
      while (text[j] === ' ' || text[j] === '\n' || text[j] === '\t') j++
      const close = kind === '{' ? '}' : kind === '[' ? ']' : ')'
      const end = groupEnd(text, j, kind, close)
      if (end < 0) {
        if (kind === '{') ok = false
        found.push('')
        if (!ok) break
        continue
      }
      found.push(text.slice(j + 1, end - 1))
      i = end
    }
    if (!ok) continue
    result += text.slice(from, m.index) + out(found)
    from = i
    re.lastIndex = i
  }
  return result + text.slice(from)
}

/** siunitx's S columns read as centred ones; braces are left alone, except a repeat's columns. */
function plainColumns(spec: string): string {
  let out = ''
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i]!
    const count = c === '*' ? groupEnd(spec, i + 1, '{', '}') : -1
    const repeated = count > 0 ? groupEnd(spec, count, '{', '}') : -1
    if (repeated > 0) {
      out += `${spec.slice(i, count)}{${plainColumns(spec.slice(count + 1, repeated - 1))}}`
      i = repeated - 1
    } else if (c === '{') {
      const end = groupEnd(spec, i, '{', '}')
      if (end < 0) return spec
      out += spec.slice(i, end)
      i = end - 1
    } else if (c === 'S' || c === 's') {
      const end = groupEnd(spec, i + 1, '[', ']')
      out += 'c'
      if (end > 0) i = end - 1
    } else out += c
  }
  return out
}

/**
 * LaTeX that pandoc reads wrongly, rewritten for the Word export (in its
 * scratch copy, never the project): tables it would drop, lose the caption of
 * or break, so that they reach Word as tables.
 */
export function forPandoc(tex: string): string {
  let t = tex
  // pandoc knows neither environment and drops their captions.
  t = t.replace(/\\(begin|end)\s*\{(?:table\*|sidewaystable\*?)\}/g, '\\$1{table}')
  t = t.replace(/\\(begin|end)\s*\{sidewaysfigure\*?\}/g, '\\$1{figure}')
  // A table inside these is dropped, or its options are left in as text.
  t = rewrite(t, 'resizebox', '{{{', a => a[2]!)
  t = rewrite(t, 'resizebox*', '{{{', a => a[2]!)
  t = rewrite(t, 'scalebox', '{[{', a => a[2]!)
  t = rewrite(t, 'begin{adjustbox}', '{', () => '')
  t = t.replace(/\\end\s*\{adjustbox\}/g, '')
  // Partial rules leave their column range in the table, and \addlinespace eats the next cell.
  t = rewrite(t, 'cline', '{', () => '')
  t = rewrite(t, 'cmidrule', '[({', () => '')
  t = rewrite(t, 'addlinespace', '[', () => '')
  // Cells with line breaks: pandoc keeps only their last line.
  for (const name of ['makecell', 'thead', 'shortstack']) t = rewrite(t, name, '[{', a => a[1]!.replace(/\\\\(\s*\[[^\]]*\])?/g, '\\newline '))
  t = rewrite(t, 'tnote', '{', a => `\\textsuperscript{${a[0]}}`)
  // Column types pandoc doesn't know make it read the whole table as text.
  t = rewrite(t, 'begin{tabular}', '[{', a => `\\begin{tabular}{${plainColumns(a[1]!)}}`)
  t = rewrite(t, 'begin{tabularx}', '{{', a => `\\begin{tabularx}{${a[0]}}{${plainColumns(a[1]!)}}`)
  t = rewrite(t, 'begin{tabular*}', '{[{', a => `\\begin{tabular*}{${a[0]}}{${plainColumns(a[2]!)}}`)
  t = rewrite(t, 'begin{longtable}', '[{', a => `\\begin{longtable}{${plainColumns(a[1]!)}}`)
  return t
}

/** Apply `forPandoc` to the .tex files of the export's scratch copy. */
export async function prepareSources(dir: string): Promise<void> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await prepareSources(full)
    else if (entry.isFile() && /\.(tex|ltx)$/i.test(entry.name)) {
      const st = await fs.stat(full)
      if (st.size > MAX_BYTES) continue
      const text = await fs.readFile(full, 'utf8')
      const next = forPandoc(text)
      if (next !== text) await fs.writeFile(full, next)
    }
  }
}

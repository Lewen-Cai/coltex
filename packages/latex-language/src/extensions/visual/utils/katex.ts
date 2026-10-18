// ColTex: typesets maths for the visual editor with KaTeX, where Overleaf uses
// MathJax (features/mathjax/load-mathjax). KaTeX, its stylesheet and mhchem
// (\ce) load on first use. `trust` stays off, so input can't produce links,
// classes or other HTML; errors render in place instead of throwing.

type Katex = typeof import('katex').default
type RenderMathInElement = typeof import('katex/contrib/auto-render').default

let loading: Promise<{ katex: Katex; renderMathInElement: RenderMathInElement }> | undefined

export function loadKatex() {
  loading ??= (async () => {
    const [katex, autoRender] = await Promise.all([
      import('katex').then(m => m.default),
      import('katex/contrib/auto-render').then(m => m.default),
      import('katex/dist/katex.min.css'),
    ])
    // mhchem registers \ce and \pu on the katex instance it imports.
    await import('katex/contrib/mhchem')
    return { katex, renderMathInElement: autoRender }
  })()
  return loading
}

const OPTIONS = { throwOnError: false, trust: false, strict: false, maxExpand: 1000, maxSize: 50 } as const

/** The balanced {…} group starting at `open` (which must be "{"), or undefined. */
function bracedGroup(text: string, open: number): { content: string; end: number } | undefined {
  if (text[open] !== '{') return undefined
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\') {
      i++
    } else if (ch === '{') {
      depth++
    } else if (ch === '}' && --depth === 0) {
      return { content: text.slice(open + 1, i), end: i + 1 }
    }
  }
  return undefined
}

/** \DeclareMathOperator isn't KaTeX syntax: rewrite it as a \newcommand with \operatorname. */
export function convertPreamble(preamble: string): string {
  const re = /\\DeclareMathOperator(\*?)\s*/g
  let out = ''
  let last = 0
  for (let m = re.exec(preamble); m; m = re.exec(preamble)) {
    let i = m.index + m[0].length
    let name: string | undefined
    const group = bracedGroup(preamble, i)
    if (group) {
      name = group.content.trim()
      i = group.end
    } else {
      name = /^\\[A-Za-z@]+/.exec(preamble.slice(i))?.[0]
      if (name) i += name.length
    }
    while (preamble[i] === ' ') i++
    const body = bracedGroup(preamble, i)
    if (!name || !body) continue
    out += preamble.slice(last, m.index) + `\\newcommand{${name}}{\\operatorname${m[1]}{${body.content}}}`
    last = body.end
    re.lastIndex = body.end
  }
  return out + preamble.slice(last)
}

const DEFINITION_START = /\n(?=\s*\\(?:newcommand|renewcommand|providecommand|def|gdef|let|newenvironment|renewenvironment|DeclareMathOperator)\b)/

/** \DeclareMathOperator lines before \begin{document} (Overleaf's visual editor doesn't collect them; MathJax didn't need them). */
export function declaredMathOperators(text: string): string {
  const end = text.indexOf('\\begin{document}')
  const head = end < 0 ? text : text.slice(0, end)
  return (head.match(/^[^%\n]*\\DeclareMathOperator\*?.*$/gm) ?? []).map(l => l.replace(/^[^\\]*/, '')).join('\n')
}

/**
 * Macros defined by the document's \newcommand, \renewcommand, \def, \let and
 * \DeclareMathOperator lines (the "preamble" the visual editor collects).
 * A fresh table per render, so definitions never leak between widgets.
 */
export function macrosFor(katex: Katex, preamble: string | undefined): Record<string, string> {
  const macros: Record<string, string> = {}
  if (!preamble) return macros
  // One definition at a time (a definition may span lines), so a bad one doesn't stop the rest.
  for (const line of convertPreamble(preamble).split(DEFINITION_START)) {
    if (!line.trim()) continue
    // globalGroup keeps \newcommand definitions in `macros` after the call.
    const define = (tex: string) => katex.renderToString(tex, { ...OPTIONS, throwOnError: true, macros, globalGroup: true })
    try {
      define(line)
    } catch {
      try {
        // KaTeX predefines some commands LaTeX doesn't (\R, \N, \Z…): the document's definition wins.
        if (/^\s*\\newcommand\b/.test(line)) define(line.replace(/\\newcommand/, '\\renewcommand'))
      } catch {
        // A definition KaTeX can't parse is skipped; the rest still apply.
      }
    }
  }
  return macros
}

/** `tex` without its \label{…} commands. */
export function withoutLabels(tex: string): string {
  const re = /\\label\s*(?=\{)/g
  let out = ''
  let last = 0
  for (let m = re.exec(tex); m; m = re.exec(tex)) {
    const group = bracedGroup(tex, m.index + m[0].length)
    if (!group) continue
    out += tex.slice(last, m.index)
    last = group.end
    re.lastIndex = group.end
  }
  return out + tex.slice(last)
}

/** Render one formula into `element` (replacing its content). */
export async function renderMath(element: HTMLElement, tex: string, displayMode: boolean, preamble?: string) {
  const { katex } = await loadKatex()
  // KaTeX has no \label (MathJax ignores it); left in, it renders as an error.
  katex.render(withoutLabels(tex), element, { ...OPTIONS, displayMode, macros: macrosFor(katex, preamble) })
}

/** Typeset $…$, $$…$$, \(…\) and \[…\] inside already-rendered text (titles, theorem names). */
export async function typesetElement(element: HTMLElement) {
  const { renderMathInElement } = await loadKatex()
  renderMathInElement(element, {
    ...OPTIONS,
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
    ],
  })
}

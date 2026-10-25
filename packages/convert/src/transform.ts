import { cut, findEnvs, findMacros, mask, readGroup, type MacroHit } from './scan.ts'

export type BodyContext = {
  /** The target understands natbib's \citet/\citep. */
  natbib: boolean
  /** biblatex stays (plain article target): leave citation commands alone. */
  keepCitations?: boolean
  twoColumn: boolean
  /** Target class family (IEEEtran, acmart, …): its own constructs are kept. */
  family: string
  /**
   * The source class's lists took the widest label as an option
   * (\begin{enumerate}[1.]), which the target's lists don't: drop it.
   */
  dropListWidths?: boolean
}

/** Classes whose enumerate and itemize take the widest label as an optional argument. */
export const WIDEST_LABEL_LISTS = new Set(['sn-jnl', 'IEEEtran', 'oup-authoring-template', 'cas-sc', 'cas-dc', 'elsarticle'])

export type TransformCounts = {
  citations: number
  lostCiteDetail: number
  figureWidths: number
  removed: Record<string, number>
}

type Edit = { start: number; end: number; text: string }

function apply(src: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  for (const e of sorted) {
    if (e.start < pos) continue
    out += src.slice(pos, e.start) + e.text
    pos = e.end
  }
  return out + src.slice(pos)
}

/** biblatex → natbib names, and natbib → plain \cite when natbib isn't available. */
const BIBLATEX_TO_NATBIB: Record<string, string> = {
  textcite: 'citet',
  Textcite: 'Citet',
  parencite: 'citep',
  Parencite: 'Citep',
  autocite: 'citep',
  Autocite: 'Citep',
  smartcite: 'citep',
  supercite: 'cite',
  citeauthor: 'citeauthor',
  citeyear: 'citeyear',
}
const NATBIB_ONLY = ['citet', 'Citet', 'citep', 'Citep', 'citealp', 'citealt', 'citeauthor', 'Citeauthor', 'citeyear', 'citeyearpar', 'citenum']

/**
 * Adapt a .tex file's body to the target: citation commands, figure widths
 * for two-column layouts, and constructs specific to the source class.
 */
export function transformTex(src: string, ctx: BodyContext): { text: string; counts: TransformCounts } {
  const m = mask(src)
  const edits: Edit[] = []
  const counts: TransformCounts = { citations: 0, lostCiteDetail: 0, figureWidths: 0, removed: {} }
  const bump = (k: string) => (counts.removed[k] = (counts.removed[k] ?? 0) + 1)

  // ---- citations (left alone when biblatex stays) ----
  if (!ctx.keepCitations) {
    const rewrite = (h: MacroHit, name: string) => {
      const [pre, post] = h.opts.length === 2 ? [h.opts[0]!.inner, h.opts[1]!.inner] : [undefined, h.opts[0]?.inner]
      const keys = h.args[0]?.inner ?? ''
      if (name === 'cite' && pre) counts.lostCiteDetail++
      const opts = name === 'cite' ? (post ? `[${post}]` : '') : pre !== undefined ? `[${pre}][${post ?? ''}]` : post !== undefined ? `[${post}]` : ''
      edits.push({ start: h.start, end: h.end, text: `\\${name}${h.star && name !== 'cite' ? '*' : ''}${opts}{${keys}}` })
      counts.citations++
    }
    for (const [from, to] of Object.entries(BIBLATEX_TO_NATBIB)) {
      for (const h of findMacros(m, src, from, { opts: 2, args: 1 })) {
        const name = ctx.natbib ? to : 'cite'
        if (!ctx.natbib && (to === 'citeauthor' || to === 'citeyear')) counts.lostCiteDetail++
        rewrite(h, name)
      }
    }
    for (const h of findMacros(m, src, 'footcite', { opts: 2, args: 1 })) {
      edits.push({ start: h.start, end: h.end, text: `\\footnote{\\cite{${h.args[0]?.inner ?? ''}}}` })
      counts.citations++
    }
    if (!ctx.natbib) {
      for (const name of NATBIB_ONLY) {
        for (const h of findMacros(m, src, name, { opts: 2, args: 1 })) {
          if (['citet', 'Citet', 'citeauthor', 'Citeauthor', 'citeyear', 'citealt'].includes(name)) counts.lostCiteDetail++
          rewrite(h, 'cite')
        }
      }
    }
  }

  // ---- figures in two columns: a column-wide figure can't be \textwidth wide ----
  if (ctx.twoColumn) {
    for (const env of ['figure', 'table', 'wrapfigure']) {
      for (const e of findEnvs(m, src, env, {}, 0)) {
        const inner = m.slice(e.bodyStart, e.bodyEnd)
        for (const match of inner.matchAll(/\\textwidth\b/g)) {
          edits.push({ start: e.bodyStart + match.index!, end: e.bodyStart + match.index! + '\\textwidth'.length, text: '\\columnwidth' })
          counts.figureWidths++
        }
      }
    }
  }

  // ---- source-class constructs ----
  if (ctx.family !== 'IEEEtran') {
    for (const h of findMacros(m, src, 'IEEEPARstart', { args: 2 })) {
      edits.push({ start: h.start, end: h.end, text: `${h.args[0]?.inner ?? ''}${h.args[1]?.inner ?? ''}` })
      bump('\\IEEEPARstart')
    }
    for (const env of ['IEEEbiography', 'IEEEbiographynophoto']) {
      for (const e of findEnvs(m, src, env)) {
        edits.push({ start: e.start, end: e.end, text: '' })
        bump(`${env} environment`)
      }
    }
    for (const h of findMacros(m, src, 'IEEEauthorrefmark', { args: 1 })) edits.push({ start: h.start, end: h.end, text: '' })
    for (const h of findMacros(m, src, 'IEEEpubidadjcol')) edits.push({ start: h.start, end: h.end, text: '' })
  }
  if (ctx.family !== 'acmart') {
    for (const h of findMacros(m, src, 'Description', { opts: 1, args: 1 })) {
      edits.push({ start: h.start, end: h.end, text: '' })
      bump('\\Description (ACM figure descriptions)')
    }
    for (const e of findEnvs(m, src, 'teaserfigure')) {
      edits.push({ start: e.start, end: e.start + '\\begin{teaserfigure}'.length, text: '\\begin{figure*}' })
      edits.push({ start: e.end - '\\end{teaserfigure}'.length, end: e.end, text: '\\end{figure*}' })
      bump('teaserfigure → figure*')
    }
  }
  // llncs's proof (no amsthm there) has no \qedhere; its \qed works in text and maths alike.
  if (ctx.family === 'llncs') {
    for (const h of findMacros(m, src, 'qedhere')) {
      edits.push({ start: h.start, end: h.end, text: '\\qed' })
      bump('\\qedhere → \\qed')
    }
  }
  // The appendix package's appendices environment clashes with IEEEtran's \appendices and
  // breaks in llncs (no \@chapapp); both classes switch to appendices with a command.
  if (ctx.family === 'IEEEtran' || ctx.family === 'llncs') {
    for (const e of findEnvs(m, src, 'appendices')) {
      edits.push({ start: e.start, end: e.bodyStart, text: ctx.family === 'IEEEtran' ? '\\appendices' : '\\appendix' })
      edits.push({ start: e.bodyEnd, end: e.end, text: '' })
      bump('appendices environment')
    }
  }
  // Springer Nature's back matter: \bmhead{..} run-in headings and the \backmatter switch.
  for (const h of findMacros(m, src, 'bmhead', { args: 1 })) {
    edits.push({ start: h.start, end: h.end, text: `\\section*{${h.args[0]?.inner ?? ''}}` })
    bump('\\bmhead → \\section*')
  }
  // BMC's back matter is an environment around the declarations and the references.
  for (const e of findEnvs(m, src, 'backmatter')) {
    edits.push({ start: e.start, end: e.bodyStart, text: '' })
    edits.push({ start: e.bodyEnd, end: e.end, text: '' })
    bump('backmatter environment')
  }
  for (const h of findMacros(m, src, 'backmatter')) {
    edits.push({ start: h.start, end: h.end, text: '' })
    bump('\\backmatter')
  }
  // sn-jnl's rule under a table: booktabs' \bottomrule, next to booktabs' \toprule and \midrule
  // (OUP has a \botrule too, but it doesn't mix with booktabs' rules).
  for (const h of findMacros(m, src, 'botrule')) {
    edits.push({ start: h.start, end: h.end, text: '\\bottomrule' })
    bump('\\botrule → \\bottomrule')
  }
  if (ctx.dropListWidths) {
    // Nested lists too, so not findEnvs (outermost only).
    for (const match of m.matchAll(/\\begin\{(enumerate|itemize)\}/g)) {
      const at = match.index! + match[0].length
      const opt = readGroup(m, src, at, '[')
      if (opt && opt.start === at) {
        edits.push({ start: opt.start, end: opt.end, text: '' })
        bump(`${match[1]} label width`)
      }
    }
  }

  // Elsevier CAS takes float options as keys (\begin{figure}[width=.9\textwidth,pos=htbp]); others want placements.
  if (ctx.family !== 'cas-sc' && ctx.family !== 'cas-dc') {
    for (const match of m.matchAll(/\\begin\{(figure|table)(\*?)\}/g)) {
      const at = match.index! + match[0].length
      const opt = readGroup(m, src, at, '[')
      if (!opt || opt.start !== at || !opt.inner.includes('=')) continue
      const pos = opt.inner.match(/(?:^|,)\s*pos\s*=\s*([!htbpH]+)/)?.[1]
      edits.push({ start: opt.start, end: opt.end, text: pos ? `[${pos}]` : '' })
      bump('float options (Elsevier CAS)')
    }
  }
  if (ctx.family !== 'elsarticle' && ctx.family !== 'cas-sc' && ctx.family !== 'cas-dc') {
    for (const e of findEnvs(m, src, 'highlights')) {
      edits.push({ start: e.start, end: e.end, text: '' })
      bump('highlights environment (Elsevier)')
    }
  }
  return { text: apply(src, edits), counts }
}

/** Preamble commands that only exist with biblatex. */
const BIBLATEX_PREAMBLE = [
  'ExecuteBibliographyOptions', 'DeclareFieldFormat', 'DeclareNameAlias', 'DeclareSourcemap', 'renewbibmacro', 'newbibmacro',
  'AtEveryBibitem', 'AtEveryCitekey', 'DeclareBibliographyCategory', 'addtocategory', 'DefineBibliographyStrings',
  'DeclareDelimFormat', 'DeclareLabeldate', 'DeclareSortingTemplate',
]

/** Remove biblatex-only configuration from a preamble (when the target uses BibTeX). */
export function stripBiblatexPreamble(preamble: string): { text: string; removed: number } {
  const m = mask(preamble)
  const ranges = BIBLATEX_PREAMBLE.flatMap(name => findMacros(m, preamble, name, { opts: 2, args: 3 }))
  return { text: cut(preamble, ranges), removed: ranges.length }
}

/**
 * Make a .bib written for biblatex readable by BibTeX styles: add `year`
 * from `date` and `journal` from `journaltitle` where missing. Nothing is
 * removed, so the file still works with biblatex.
 */
export function bibtexCompatible(bib: string): { text: string; changed: number } {
  let changed = 0
  const text = bib.replace(/@(\w+)\s*\{([^,]*),([\s\S]*?)\n\}/g, (entry, _type, _key, fields: string) => {
    const has = (f: string) => new RegExp(`(^|[,\\s])${f}\\s*=`, 'i').test(fields)
    const add: string[] = []
    if (!has('year') && has('date')) {
      const year = fields.match(/(?:^|[,\s])date\s*=\s*[{"]?\s*(\d{4})/i)?.[1]
      if (year) add.push(`  year = {${year}},`)
    }
    if (!has('journal') && has('journaltitle')) {
      const jt = fields.match(/(?:^|[,\s])journaltitle\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*")/i)?.[1]
      if (jt) add.push(`  journal = ${jt},`)
    }
    if (!add.length) return entry
    changed++
    return entry.replace(/\n\}$/, `${fields.trimEnd().endsWith(',') ? '' : ','}\n${add.join('\n')}\n}`)
  })
  return { text, changed }
}

// ---------------------------------------------------------------------------
// Theorem-like environments
// ---------------------------------------------------------------------------

/** What llncs defines itself (with \spnewtheorem); claim and proof are unnumbered. */
const LLNCS_THEOREMS = [
  'theorem', 'case', 'conjecture', 'corollary', 'definition', 'example', 'exercise', 'lemma', 'note', 'problem',
  'property', 'proposition', 'question', 'solution', 'remark',
]
const LLNCS_UNNUMBERED = ['claim', 'proof']
/** What acmart defines itself (all numbered with theorem, within sections), plus amsthm's proof, which it loads. */
const ACMART_THEOREMS = ['theorem', 'conjecture', 'proposition', 'lemma', 'corollary', 'example', 'definition']

/** Environments a class provides without a declaration, numbered and unnumbered. */
export const CLASS_THEOREMS: Record<string, { numbered: string[]; unnumbered: string[] }> = {
  llncs: { numbered: LLNCS_THEOREMS, unnumbered: LLNCS_UNNUMBERED },
  acmart: { numbered: ACMART_THEOREMS, unnumbered: ['proof'] },
  // jmlr (through jmlrutils)
  jmlr: { numbered: ['theorem', 'example', 'lemma', 'proposition', 'remark', 'corollary', 'definition', 'conjecture', 'axiom'], unnumbered: ['proof'] },
}

/** amsthm commands that only configure styles; llncs has neither amsthm nor these. */
const AMSTHM_STYLE: [string, number][] = [['theoremstyle', 1], ['newtheoremstyle', 9], ['swapnumbers', 0]]

type TheoremDecl = { start: number; end: number; star: boolean; name: string; shared?: string; title: string; within?: string }

/** \newtheorem{name}[shared]{Title}[within] and \newtheorem*{name}{Title}. */
function theoremDecls(src: string): TheoremDecl[] {
  const m = mask(src)
  return findMacros(m, src, 'newtheorem', { args: 1 }).flatMap(h => {
    const name = h.args[0]?.inner.trim()
    if (!name) return []
    const shared = readGroup(m, src, h.end, '[')
    const title = readGroup(m, src, shared?.end ?? h.end, '{')
    if (!title) return []
    const within = h.star || shared ? undefined : readGroup(m, src, title.end, '[')
    return [{ start: h.start, end: (within ?? title).end, star: h.star, name, shared: shared?.inner.trim(), title: title.inner, within: within?.inner.trim() }]
  })
}

/**
 * Adapt amsthm-style theorem declarations to llncs, which defines the usual
 * environments itself and can't load amsthm (both define proof). Declarations
 * of environments llncs has are dropped; the class options keep their
 * numbering (shared with theorem, or within sections) where the source asked
 * for it.
 */
export function theoremsForLlncs(preamble: string): { text: string; removed: number; classOptions: string[] } {
  const m = mask(preamble)
  const edits: Edit[] = []
  const classOptions = new Set<string>()
  let removed = 0
  const predefined = new Set([...LLNCS_THEOREMS, ...LLNCS_UNNUMBERED])
  for (const d of theoremDecls(preamble)) {
    if (predefined.has(d.name)) {
      edits.push({ start: d.start, end: d.end, text: '' })
      removed++
      if (d.shared === 'theorem') classOptions.add('envcountsame')
      if (d.name === 'theorem' && d.within === 'section') classOptions.add('envcountsect')
    } else if (d.star) {
      // Unnumbered environments need amsthm's \newtheorem*; llncs's own form takes the fonts.
      edits.push({ start: d.start, end: d.end, text: `\\spnewtheorem*{${d.name}}{${d.title}}{\\bfseries}{\\itshape}` })
    }
  }
  for (const [name, args] of AMSTHM_STYLE) {
    for (const h of findMacros(m, preamble, name, { args })) {
      edits.push({ start: h.start, end: h.end, text: '' })
      removed++
    }
  }
  // \qedsymbol is amsthm's; llncs's \qed draws its own box.
  for (const h of findMacros(m, preamble, 'renewcommand', { args: 2 })) {
    if (/^\s*\\qedsymbol\s*$/.test(h.args[0]?.inner ?? '')) {
      edits.push({ start: h.start, end: h.end, text: '' })
      removed++
    }
  }
  return { text: apply(preamble, edits), removed, classOptions: [...classOptions] }
}

/**
 * Declarations for theorem-like environments the source class provided
 * implicitly (llncs, acmart) that the body uses and the target lacks.
 * `amsthm` says whether they need amsthm (proof, unnumbered environments).
 */
export function missingTheorems(sourceClass: string, family: string, preamble: string, texts: string[]): { lines: string[]; amsthm: boolean } {
  const source = CLASS_THEOREMS[sourceClass]
  const target = CLASS_THEOREMS[family]
  if (!source) return { lines: [], amsthm: false }
  const has = new Set([...(target?.numbered ?? []), ...(target?.unnumbered ?? []), ...theoremDecls(preamble).map(d => d.name)])
  for (const name of ['spnewtheorem', 'newenvironment']) {
    for (const h of findMacros(mask(preamble), preamble, name, { args: 1 })) has.add(h.args[0]?.inner.trim() ?? '')
  }
  const text = texts.map(t => mask(t)).join('\n')
  const used = (env: string) => !has.has(env) && text.includes(`\\begin{${env}}`)
  const title = (env: string) => env[0]!.toUpperCase() + env.slice(1)
  const numbered = source.numbered.filter(used)
  const unnumbered = source.unnumbered.filter(used)
  const lines: string[] = []
  if (sourceClass === 'acmart') {
    // acmart numbers them all together, within sections.
    if (numbered.length && !has.has('theorem')) lines.push('\\newtheorem{theorem}{Theorem}[section]')
    for (const env of numbered) if (env !== 'theorem') lines.push(`\\newtheorem{${env}}[theorem]{${title(env)}}`)
  } else {
    for (const env of numbered) lines.push(`\\newtheorem{${env}}{${title(env)}}`)
  }
  // amsthm defines proof; the other unnumbered ones need a declaration.
  for (const env of unnumbered) if (env !== 'proof') lines.push(`\\newtheorem*{${env}}{${title(env)}}`)
  return { lines, amsthm: unnumbered.length > 0 }
}

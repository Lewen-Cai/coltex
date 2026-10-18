import { ACK_MARK, BIB_MARK } from './extract.ts'
import { cut, findMacros, mask } from './scan.ts'
import { CLASS_FAMILY, CLASS_LOADS, DROP, IMPLIED_BY_SOURCE, targetInfo } from './targets.ts'
import { bibtexCompatible, missingTheorems, stripBiblatexPreamble, theoremsForLlncs, transformTex, type TransformCounts } from './transform.ts'
import type { Affiliation, Author, Conversion, ConversionNote, Paper, TargetId, TargetOptions, UsedPackage } from './types.ts'

/** A value inside key={...}: braces balanced as written, but never empty. */
const kv = (s: string | undefined) => (s ?? '').trim()

/** The affiliation as one line: as written, since the structured fields may leave parts out (street, state). */
function affiliationText(a: Affiliation): string {
  return a.raw || [a.department, a.institution, a.city, a.country].filter(Boolean).join(', ')
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

function shortAuthors(authors: Author[]): string {
  const last = (n: string) => n.trim().split(/\s+/).at(-1) ?? n
  if (authors.length === 0) return ''
  if (authors.length === 1) return last(authors[0]!.name)
  if (authors.length === 2) return `${last(authors[0]!.name)} and ${last(authors[1]!.name)}`
  return `${last(authors[0]!.name)} et al.`
}

/** Authors grouped by their (first) affiliation, in order of appearance. */
function groupByAffiliation(paper: Paper): { affiliation?: Affiliation; authors: Author[] }[] {
  const groups: { affiliation?: Affiliation; authors: Author[] }[] = []
  for (const a of paper.authors) {
    const aff = paper.affiliations.find(x => x.id === a.affiliations[0])
    const g = groups.find(x => x.affiliation === aff)
    if (g) g.authors.push(a)
    else groups.push({ affiliation: aff, authors: [a] })
  }
  return groups
}

const affiliationsOf = (paper: Paper, a: Author) => a.affiliations.flatMap(id => paper.affiliations.filter(x => x.id === id))

// ---------------------------------------------------------------------------
// Front matter per target family
// ---------------------------------------------------------------------------

type Parts = { classLine: string; preClass?: string; afterPreamble?: string; beforeBegin?: string; front: string; ack: (t: string) => string; bib: (files: string[], style: string) => string }

function ieee(paper: Paper, conference: boolean, o: TargetOptions): Parts {
  const options = conference ? ['conference'] : o.review ? ['journal', 'onecolumn', 'draftclsnofoot'] : ['journal']
  let authors: string
  if (o.review && conference) {
    authors = '\\IEEEauthorblockN{Anonymous Authors}'
  } else if (conference) {
    authors = paper.authors
      .map(a => {
        const lines = affiliationsOf(paper, a).flatMap(af =>
          af.department || af.institution
            ? [af.department && `\\textit{${af.department}}`, af.institution && `\\textit{${af.institution}}`, [af.city, af.country].filter(Boolean).join(', ')].filter(Boolean)
            : [af.raw],
        )
        if (a.email) lines.push(a.email)
        return `\\IEEEauthorblockN{${a.name}}${lines.length ? `\n\\IEEEauthorblockA{${lines.join(' \\\\\n')}}` : ''}`
      })
      .join('\n\\and\n')
  } else {
    const thanks = groupByAffiliation(paper)
      .filter(g => g.affiliation)
      .map(g => {
        const who = joinNames(g.authors.map(a => a.name))
        const mails = g.authors.filter(a => a.email).map(a => a.email)
        const verb = g.authors.length > 1 ? 'are' : 'is'
        return `\\thanks{${who} ${verb} with ${affiliationText(g.affiliation!)}${mails.length ? ` (e-mail: ${mails.join('; ')})` : ''}.}`
      })
    const notes = paper.authors.filter(a => a.note).map(a => `\\thanks{${a.note}}`)
    authors = `${joinNames(paper.authors.map(a => a.name.replace(/ /g, '~')))}${[...thanks, ...notes].map(t => `%\n${t}`).join('')}`
  }
  const uses = !conference || /\\thanks/.test(paper.title)
  return {
    classLine: `\\documentclass[${options.join(',')}]{IEEEtran}`,
    afterPreamble: uses && conference ? '\\IEEEoverridecommandlockouts' : undefined,
    front: [
      `\\title{${paper.title}}`,
      '',
      `\\author{${authors}}`,
      !conference && o.journal ? `\n\\markboth{${o.journal}}{${shortAuthors(paper.authors)}: ${paper.shortTitle ?? paper.title}}` : '',
      '',
      '\\maketitle',
      '',
      paper.abstract ? `\\begin{abstract}\n${paper.abstract}\n\\end{abstract}` : '',
      paper.keywords.length ? `\n\\begin{IEEEkeywords}\n${paper.keywords.join(', ')}\n\\end{IEEEkeywords}` : '',
    ].join('\n'),
    ack: t => `\\section*{Acknowledgment}\n${t}`,
    bib: (files, style) => `\\bibliographystyle{${style}}\n\\bibliography{${files.join(',')}}`,
  }
}

/** Split \thanks{...} out of a title. */
function splitTitleNotes(title: string): { title: string; notes: string[] } {
  const m = mask(title)
  const hits = findMacros(m, title, 'thanks', { args: 1 })
  return { title: cut(title, hits).trim(), notes: hits.map(h => h.args[0]?.inner ?? '') }
}

function acm(paper: Paper, journal: boolean, o: TargetOptions): Parts {
  const titleNotes = splitTitleNotes(paper.title)
  const options = [journal ? 'acmsmall' : 'sigconf', ...(o.review ? ['review', 'anonymous'] : [])]
  const authors = paper.authors.map(a => {
    const lines = [`\\author{${a.name}}`]
    if (a.email) lines.push(`\\email{${a.email}}`)
    if (a.orcid) lines.push(`\\orcid{${a.orcid}}`)
    for (const af of affiliationsOf(paper, a)) {
      const fields = [
        af.department && `\\department{${af.department}}`,
        `\\institution{${af.institution ?? af.raw}}`,
        af.city && `\\city{${af.city}}`,
        // acmart stops with an error without a country: leave a visible placeholder.
        `\\country{${af.country ?? 'Country'}}`,
      ].filter(Boolean)
      lines.push(`\\affiliation{%\n  ${fields.join('\n  ')}\n}`)
    }
    return lines.join('\n')
  })
  const venue = o.venue?.name
    ? `\\acmConference[${o.venue.short ?? ''}]{${o.venue.name}}{${o.venue.date ?? ''}}{${o.venue.location ?? ''}}`
    : undefined
  return {
    classLine: `\\documentclass[${options.join(',')}]{acmart}`,
    afterPreamble: [
      '% Rights management and bibliographic details: replace with what ACM sends you on acceptance.',
      '\\setcopyright{none}',
      '\\settopmatter{printacmref=false}',
      venue,
      journal && o.journal ? `\\acmJournal{${o.journal}}` : undefined,
    ]
      .filter(Boolean)
      .join('\n'),
    front: [
      // acmart can't take \thanks inside \title (it recurses); its \titlenote follows the title.
      `\\title${paper.shortTitle ? `[${paper.shortTitle}]` : ''}{${titleNotes.title}}`,
      ...titleNotes.notes.map(n => `\\titlenote{${n}}`),
      '',
      authors.join('\n\n'),
      paper.authors.length > 2 ? `\n\\renewcommand{\\shortauthors}{${shortAuthors(paper.authors)}}` : '',
      '',
      paper.abstract ? `\\begin{abstract}\n${paper.abstract}\n\\end{abstract}` : '',
      paper.keywords.length ? `\n\\keywords{${paper.keywords.join(', ')}}` : '',
      '',
      '\\maketitle',
    ].join('\n'),
    ack: t => `\\begin{acks}\n${t}\n\\end{acks}`,
    bib: (files, style) => `\\bibliographystyle{${style}}\n\\bibliography{${files.join(',')}}`,
  }
}

function elsevier(paper: Paper, o: TargetOptions): Parts {
  const labels = new Map(paper.affiliations.map((a, i) => [a.id, `aff${i + 1}`]))
  const anyCorresponding = paper.authors.some(a => a.corresponding)
  const authors = paper.authors.map(a => {
    const keys = a.affiliations.map(id => labels.get(id)).filter(Boolean).join(',')
    return `\\author${keys ? `[${keys}]` : ''}{${a.name}${a.corresponding ? '\\corref{cor1}' : ''}}${a.email ? `\n\\ead{${a.email}}` : ''}`
  })
  const affs = paper.affiliations.map(a => {
    const org = [a.department, a.institution].filter(Boolean).join(', ') || a.raw
    const fields = [`organization={${kv(org)}}`, a.city && `city={${kv(a.city)}}`, a.country && `country={${kv(a.country)}}`].filter(Boolean)
    return `\\affiliation[${labels.get(a.id)}]{${fields.join(',\n  ')}}`
  })
  return {
    classLine: `\\documentclass[${o.review ? 'review' : 'preprint'},12pt]{elsarticle}`,
    afterPreamble: `\\journal{${o.journal || 'Journal Name'}}`,
    front: [
      '\\begin{frontmatter}',
      '',
      `\\title{${paper.title}}`,
      '',
      authors.join('\n'),
      anyCorresponding ? '\\cortext[cor1]{Corresponding author}' : '',
      '',
      affs.join('\n'),
      '',
      paper.abstract ? `\\begin{abstract}\n${paper.abstract}\n\\end{abstract}` : '',
      paper.keywords.length ? `\n\\begin{keyword}\n${paper.keywords.join(' \\sep ')}\n\\end{keyword}` : '',
      '',
      '\\end{frontmatter}',
    ].join('\n'),
    ack: t => `\\section*{Acknowledgements}\n${t}`,
    bib: (files, style) => `\\bibliographystyle{${style}}\n\\bibliography{${files.join(',')}}`,
  }
}

function lncs(paper: Paper, classOptions: string[]): Parts {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const authors = paper.authors.map(a => {
    const nums = a.affiliations.map(id => index.get(id)).filter(Boolean)
    return `${a.name}${nums.length && paper.affiliations.length > 1 ? `\\inst{${nums.join(',')}}` : ''}${a.orcid ? `\\orcidID{${a.orcid}}` : ''}`
  })
  const institutes = paper.affiliations.map(af => {
    const mails = paper.authors.filter(a => a.email && a.affiliations[0] === af.id).map(a => a.email)
    return `${affiliationText(af)}${mails.length ? `\\\\\n\\email{${mails.join(', ')}}` : ''}`
  })
  return {
    classLine: `\\documentclass[${['runningheads', ...classOptions].join(',')}]{llncs}`,
    front: [
      `\\title{${paper.title}}`,
      paper.shortTitle ? `\\titlerunning{${paper.shortTitle}}` : '',
      `\\author{${authors.join(' \\and\n')}}`,
      `\\authorrunning{${shortAuthors(paper.authors)}}`,
      institutes.length ? `\\institute{${institutes.join(' \\and\n')}}` : '',
      '',
      '\\maketitle',
      '',
      paper.abstract || paper.keywords.length
        ? `\\begin{abstract}\n${paper.abstract}${paper.keywords.length ? `\n\n\\keywords{${paper.keywords.join(' \\and ')}}` : ''}\n\\end{abstract}`
        : '',
    ]
      .filter((l, i, all) => l !== '' || all[i - 1] !== '')
      .join('\n'),
    ack: t => `\\begin{credits}\n\\subsubsection{\\ackname} ${t}\n\\end{credits}`,
    bib: (files, style) => `\\bibliographystyle{${style}}\n\\bibliography{${files.join(',')}}`,
  }
}

function revtex(paper: Paper, o: TargetOptions): Parts {
  const blocks: string[] = []
  for (const a of paper.authors) {
    const lines = [`\\author{${a.name}}`]
    if (a.email) lines.push(`\\email{${a.email}}`)
    for (const af of affiliationsOf(paper, a)) lines.push(`\\affiliation{${affiliationText(af)}}`)
    blocks.push(lines.join('\n'))
  }
  return {
    classLine: `\\documentclass[aps,${o.review ? 'preprint' : 'reprint'},superscriptaddress,amsmath,amssymb]{revtex4-2}`,
    front: [
      `\\title{${paper.title}}`,
      '',
      blocks.join('\n\n'),
      '',
      paper.abstract ? `\\begin{abstract}\n${paper.abstract}\n\\end{abstract}` : '',
      paper.keywords.length ? `\n\\keywords{${paper.keywords.join(', ')}}` : '',
      '',
      '\\maketitle',
    ].join('\n'),
    ack: t => `\\begin{acknowledgments}\n${t}\n\\end{acknowledgments}`,
    // REVTeX picks apsrev4-2 itself.
    bib: (files, style) => `${style !== 'apsrev4-2' ? `\\bibliographystyle{${style}}\n` : ''}\\bibliography{${files.join(',')}}`,
  }
}

function article(paper: Paper): Parts {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const multi = paper.affiliations.length > 0
  const authors = multi
    ? paper.authors.map(a => `\\author[${a.affiliations.map(id => index.get(id)).join(',')}]{${a.name}${a.email ? `\\thanks{\\texttt{${a.email}}}` : ''}}`).join('\n')
    : `\\author{${paper.authors.map(a => a.name).join(' \\and ')}}`
  const affils = multi ? paper.affiliations.map(a => `\\affil[${index.get(a.id)}]{${affiliationText(a)}}`).join('\n') : ''
  return {
    classLine: '\\documentclass[11pt]{article}',
    afterPreamble: [multi ? '' : undefined, `\\title{${paper.title}}`, authors, affils, '\\date{}'].filter(x => x !== undefined).join('\n'),
    front: [
      '\\maketitle',
      '',
      paper.abstract ? `\\begin{abstract}\n${paper.abstract}\n\\end{abstract}` : '',
      paper.keywords.length ? `\n\\noindent\\textbf{Keywords:} ${paper.keywords.join(', ')}` : '',
    ].join('\n'),
    ack: t => `\\section*{Acknowledgments}\n${t}`,
    bib: (files, style) => `\\bibliographystyle{${style}}\n\\bibliography{${files.join(',')}}`,
  }
}

// ---------------------------------------------------------------------------

/**
 * Turn a paper into a project for `target`. `texFiles` are the project's other
 * .tex files (path → content), adapted the same way as the body; `bibFiles`
 * likewise for .bib files when the bibliography moves from biblatex to BibTeX.
 */
export function convertPaper(
  paper: Paper,
  target: TargetId,
  options: TargetOptions,
  project: { rootFile: string; texFiles: Record<string, string>; bibFiles: Record<string, string> },
): Conversion {
  const info = targetInfo(target)
  const family = CLASS_FAMILY[target]
  const notes: ConversionNote[] = paper.notes.map(text => ({ level: 'warning' as const, text }))
  const files: Record<string, string> = {}

  // ---- packages ----
  const drop = new Set(DROP[family] ?? [])
  const classLoads = new Set(CLASS_LOADS[family] ?? [])
  const kept: UsedPackage[] = []
  const passOptions: string[] = []
  const dropped: string[] = []
  // Keep biblatex for a plain article; everything else goes through BibTeX.
  const keepBiblatex = target === 'article' && paper.bibliography.kind === 'biblatex'
  for (const p of paper.packages) {
    if (p.name === 'biblatex' && keepBiblatex) {
      kept.push(p)
      continue
    }
    if (drop.has(p.name)) {
      dropped.push(p.name)
      continue
    }
    if (classLoads.has(p.name)) {
      if (p.options) passOptions.push(`\\PassOptionsToPackage{${p.options}}{${p.name}}`)
      continue
    }
    if (!kept.some(k => k.name === p.name)) kept.push(p)
  }
  // The source class may have provided packages implicitly (ctexart → ctex, acmart → booktabs, …).
  for (const name of IMPLIED_BY_SOURCE[paper.sourceClass] ?? []) {
    if (!kept.some(k => k.name === name) && !classLoads.has(name) && !drop.has(name)) {
      kept.push({ name })
      notes.push({ level: 'info', text: `Added \\usepackage{${name}}: ${paper.sourceClass} provided it implicitly.` })
    }
  }
  if (family === 'IEEEtran' && !kept.some(p => p.name === 'cite') && paper.bibliography.kind !== 'none') kept.unshift({ name: 'cite' })
  const anyText = [paper.body, ...Object.values(project.texFiles)].join('\n')
  if (family !== 'IEEEtran' && /\\begin\{IEEEeqnarray/.test(anyText) && !kept.some(p => p.name === 'IEEEtrantools')) {
    kept.push({ name: 'IEEEtrantools' })
    notes.push({ level: 'info', text: 'Added IEEEtrantools for the IEEEeqnarray environments.' })
  }
  if (family === 'article' && paper.affiliations.length && !kept.some(p => p.name === 'authblk')) kept.push({ name: 'authblk' })
  if (dropped.length) {
    notes.push({ level: 'info', text: `Left out packages that conflict with ${info.documentClass} or that it replaces: ${[...new Set(dropped)].join(', ')}.` })
  }
  if (passOptions.length) notes.push({ level: 'info', text: `${info.documentClass} loads some packages itself; their options are passed with \\PassOptionsToPackage.` })

  // ---- preamble ----
  let preamble = paper.preamble
  const toBibtex = paper.bibliography.kind === 'biblatex' && !keepBiblatex
  if (toBibtex) {
    const stripped = stripBiblatexPreamble(preamble)
    preamble = stripped.text
    notes.push({ level: 'warning', text: 'Moved the bibliography from biblatex to BibTeX, which journal templates expect.' })
    if (stripped.removed) notes.push({ level: 'warning', text: `Removed ${stripped.removed} biblatex-only preamble command(s); check citation formatting.` })
  }

  // ---- theorem-like environments: classes that define their own ----
  let llncsOptions: string[] = []
  if (family === 'llncs') {
    const t = theoremsForLlncs(preamble)
    preamble = t.text
    llncsOptions = t.classOptions
    if (t.removed) notes.push({ level: 'info', text: `Removed ${t.removed} theorem declaration(s) or style command(s): llncs defines its theorem environments itself.` })
  }
  const theorems = missingTheorems(paper.sourceClass, family, preamble, [paper.body, ...Object.values(project.texFiles)])
  if (theorems.lines.length) {
    preamble = `${preamble}\n\n${theorems.lines.join('\n')}`.trim()
    notes.push({ level: 'info', text: `Declared ${theorems.lines.length} theorem environment(s) that ${paper.sourceClass} provided implicitly.` })
  }
  // acmart loads amsthm itself; llncs can't have it.
  if (theorems.amsthm && family !== 'llncs' && family !== 'acmart' && !kept.some(p => p.name === 'amsthm')) kept.push({ name: 'amsthm' })

  // ---- body and the project's other .tex files ----
  const ctx = { natbib: info.natbib, keepCitations: keepBiblatex, twoColumn: info.twoColumn, family }
  const total: TransformCounts = { citations: 0, lostCiteDetail: 0, figureWidths: 0, removed: {} }
  const merge = (c: TransformCounts) => {
    total.citations += c.citations
    total.lostCiteDetail += c.lostCiteDetail
    total.figureWidths += c.figureWidths
    for (const [k, v] of Object.entries(c.removed)) total.removed[k] = (total.removed[k] ?? 0) + v
  }
  const body = transformTex(paper.body, ctx)
  merge(body.counts)
  for (const [path, text] of Object.entries(project.texFiles)) {
    if (path === project.rootFile) continue
    const t = transformTex(text, ctx)
    merge(t.counts)
    if (t.text !== text) files[path] = t.text
  }
  if (total.citations) notes.push({ level: 'info', text: `Adapted ${total.citations} citation command(s) to ${info.natbib ? 'natbib' : '\\cite'}.` })
  if (total.lostCiteDetail) {
    notes.push({ level: 'warning', text: `${total.lostCiteDetail} citation(s) used author/year forms or a prenote that ${info.documentClass}'s numeric style can't show; check the wording around them.` })
  }
  if (total.figureWidths) notes.push({ level: 'info', text: `Changed ${total.figureWidths} \\textwidth to \\columnwidth inside single-column figures and tables (two-column layout).` })
  for (const [what, n] of Object.entries(total.removed)) notes.push({ level: 'info', text: `Adapted ${n} × ${what} from the old class.` })

  // ---- bibliography files: BibTeX styles need year/journal, which biblatex-style entries may lack ----
  if (toBibtex || paper.bibliography.kind === 'bibtex') {
    for (const [path, text] of Object.entries(project.bibFiles)) {
      const b = bibtexCompatible(text)
      if (b.changed) {
        files[path] = b.text
        notes.push({ level: 'info', text: `${path}: added the year/journal fields BibTeX styles need to ${b.changed} entr${b.changed === 1 ? 'y' : 'ies'} (biblatex's date/journaltitle are kept).` })
      }
    }
  }

  // ---- assemble ----
  const parts =
    family === 'IEEEtran'
      ? ieee(paper, target === 'ieee-conference', options)
      : family === 'acmart'
        ? acm(paper, target === 'acm-journal', options)
        : family === 'elsarticle'
          ? elsevier(paper, options)
          : family === 'llncs'
            ? lncs(paper, llncsOptions)
            : family === 'revtex4-2'
              ? revtex(paper, options)
              : article(paper)

  // A plain article keeps a generic source style; a publisher's style goes with its class.
  const sourceStyle = paper.bibliography.kind === 'bibtex' ? paper.bibliography.style : undefined
  const publisherStyle = !!sourceStyle && /^(IEEEtran|ACM-Reference-Format|elsarticle|splncs|apsrev|aipnum|sn-)/.test(sourceStyle)
  const bibStyle = options.bibStyle || (target === 'article' && sourceStyle && !publisherStyle ? sourceStyle : info.bibStyle)
  let bibBlock = ''
  if (paper.bibliography.kind === 'bibtex' || toBibtex) {
    const files = paper.bibliography.kind === 'bibtex' || paper.bibliography.kind === 'biblatex' ? paper.bibliography.files : []
    bibBlock = parts.bib(files, bibStyle)
  } else if (keepBiblatex) {
    bibBlock = '\\printbibliography'
  }
  const ackBlock = paper.acknowledgments ? parts.ack(paper.acknowledgments) : ''

  let text = body.text
  text = text.includes(ACK_MARK) ? text.replace(ACK_MARK, ackBlock) : text
  if (text.includes(BIB_MARK)) {
    // Acknowledgments without a place of their own go right before the references.
    text = text.replace(BIB_MARK, `${!body.text.includes(ACK_MARK) && ackBlock ? `${ackBlock}\n\n` : ''}${bibBlock}`)
  } else {
    if (!body.text.includes(ACK_MARK) && ackBlock) text += `\n\n${ackBlock}`
    if (bibBlock) text += `\n\n${bibBlock}`
  }

  const packageLines = kept.map(p => `\\usepackage${p.options ? `[${p.options}]` : ''}{${p.name}}`)
  if (keepBiblatex && paper.bibliography.kind === 'biblatex') packageLines.push(...paper.bibliography.files.map(f => `\\addbibresource{${f}.bib}`))

  const main = [
    `% Converted to ${info.label} by ColTex from ${paper.sourceClass}. Check the conversion report.`,
    ...passOptions,
    parts.classLine,
    '',
    ...packageLines,
    '',
    preamble,
    parts.afterPreamble ? `\n${parts.afterPreamble}` : '',
    '',
    '\\begin{document}',
    '',
    parts.front,
    '',
    text.trim(),
    '',
    '\\end{document}',
    '',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  files[project.rootFile] = main

  // ---- things to check by hand ----
  if (family === 'acmart' && paper.affiliations.some(a => !a.country)) {
    notes.push({ level: 'warning', text: 'acmart requires a country for every affiliation; "Country" was put where it was missing.' })
  }
  if (target === 'acm-sigconf' && !options.venue?.name) {
    notes.push({ level: 'info', text: 'No conference details given; acmart prints its placeholder venue in the footer until you add \\acmConference.' })
  }
  if (family === 'elsarticle' && !options.journal) notes.push({ level: 'warning', text: 'No journal name given; "Journal Name" is used as a placeholder.' })
  if (target === 'ieee-conference' && paper.authors.length > 6) {
    notes.push({ level: 'warning', text: 'IEEE conference author blocks get crowded beyond six authors; consider grouping by affiliation.' })
  }
  if (!paper.abstract) notes.push({ level: 'warning', text: 'No abstract found.' })
  return { files, rootFile: project.rootFile, notes }
}


import { ACK_MARK, BIB_MARK, ConvertError, extractPaper } from './extract.ts'
import { affiliationText, affiliationsOf, braced, joinNames, kv, shortAuthors, splitTitleNotes } from './render.ts'
import { clean, findEnvs, findMacros, mask, readGroup, type MacroHit } from './scan.ts'
import { CLASS_LOADS, COMPAT, DROP, IMPLIED_BY_OPTION, IMPLIED_BY_SOURCE, LAYOUT, TARGETS } from './targets.ts'
import { bibtexCompatible, missingTheorems, stripBiblatexPreamble, theoremsForLlncs, transformTex, WIDEST_LABEL_LISTS, type TransformCounts } from './transform.ts'
import type { Affiliation, Author, AuthorStyle, Conversion, ConversionNote, Paper, TargetOptions, UsedPackage } from './types.ts'

/**
 * Converting into a template the author brings (a journal's zip, a shared
 * template, another project): the template's own main file is the target.
 * Its preamble, class options and front-matter layout stay as they are; the
 * paper's title, authors, abstract and keywords are written where the
 * template has its sample ones, in the way the template writes them (the
 * same macros, label scheme and fields), and its sample text after the front
 * matter is replaced by the paper's body. The template's other files (its
 * class, styles, bibliography style) go into the new project with it.
 */
export type TemplateInput = {
  /** A name for the report ("Springer Nature", the zip's name). */
  name: string
  rootFile: string
  main: string
  /** Every file of the template, the main file included. */
  paths: string[]
  /** A text file of the template (its .cls and .sty files), if it has it. */
  read: (path: string) => string | undefined
}

export type TemplateConversion = Conversion & {
  /** Template file → its path in the new project. */
  templateFiles: Record<string, string>
  /** The template's document class, for the report. */
  documentClass: string
}

type Edit = { start: number; end: number; text: string }

function apply(src: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end)
  let out = ''
  let pos = 0
  for (const e of sorted) {
    if (e.start < pos) continue
    out += src.slice(pos, e.start) + e.text
    pos = e.end
  }
  return out + src.slice(pos)
}

const inside = (h: { start: number; end: number }, o: { start: number; end: number }) => o !== h && o.start <= h.start && h.end <= o.end && (o.start < h.start || o.end > h.end)

// ---------------------------------------------------------------------------
// Authors, written the way the template writes its sample ones
// ---------------------------------------------------------------------------

/** Surname particles that belong to the family name ("van der Berg"). */
const PARTICLES = new Set(['van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'dos', 'du', 'la', 'le', 'ten', 'ter', 'bin', 'al'])

/** "Jane van der Berg" → ["Jane", "van der Berg"]; a degree after a comma is left out of both. */
function nameParts(name: string): { given: string; family: string } {
  const words = name.replace(/,.*$/, '').trim().split(/\s+/)
  if (words.length < 2) return { given: '', family: words.join(' ') }
  let i = words.length - 1
  while (i > 1 && PARTICLES.has(words[i - 1]!.toLowerCase())) i--
  return { given: words.slice(0, i).join(' '), family: words.slice(i).join(' ') }
}

/** What the template's sample front matter shows about how it writes authors. */
type Features = {
  /** The affiliation command: \affiliation, \affil, \address or \institute. */
  affMacro: string
  /** How an affiliation's text is written. */
  affFormat: 'keyval' | 'tagged' | 'acm' | 'text'
  /** Affiliation labels: 1, a, aff1, or BMC's id=aff1. */
  label: (i: number) => string
  bmcLabels: boolean
  emailMacro: 'email' | 'ead' | null
  /** The email follows the affiliation (amsart) rather than the name (acmart, revtex). */
  emailAfterAffiliation: boolean
  /** How the corresponding author is marked. */
  corresponding: 'star' | 'corref' | 'cormark' | 'ast' | 'bmc' | null
  /** \fnm{..} \sur{..} (or BMC's \snm) name parts. */
  nameTags: { surname: 'sur' | 'snm' } | null
  orcid: 'cas' | 'ORCID' | 'orcid' | 'orcidID' | null
  /** \affil* on the corresponding author's affiliation (Springer Nature). */
  starredAffiliation: boolean
  /** Springer Nature's \equalcont, CAS's \fnmark/\fntext for authors' notes. */
  noteMacro: 'equalcont' | 'fnmark' | 'authornote' | null
  /** BMC's \cny for the country. */
  countryMacro: 'country' | 'cny'
  /** The sample uses \thanks for notes on authors. */
  thanks: boolean
  /** The part tags the sample affiliation uses (a class may lack \city). */
  tags: Set<string>
  /** \orcid{..} after the name (acmart). */
  orcidMacro: boolean
}

function features(front: string, cls: string): Features {
  const has = (re: RegExp) => re.test(front)
  const affMacro = ['affiliation', 'affil', 'address', 'institute'].find(n => new RegExp(`\\\\${n}\\*?\\s*[[{]`).test(front)) ?? 'affiliation'
  const m = mask(front)
  const firstAff = findMacros(m, front, affMacro, { opts: 1, args: 1 })[0]
  const opt = firstAff?.opts[0]?.inner.trim() ?? ''
  const bmcLabels = /^id\s*=/.test(opt)
  const plainOpt = bmcLabels ? opt.replace(/^id\s*=\s*/, '') : opt
  const label = /^\d+$/.test(plainOpt)
    ? (i: number) => String(i + 1)
    : /^[a-z]$/.test(plainOpt)
      ? (i: number) => String.fromCharCode(97 + (i % 26))
      : ((prefix: string) => (i: number) => `${prefix}${i + 1}`)(plainOpt.replace(/\d+$/, '') || 'aff')
  const affText = firstAff?.args[0]?.inner ?? ''
  const affFormat = /\b(organization|addressline)\s*=/.test(affText) ? 'keyval' : /\\(?:orgname|orgdiv|orgaddress)\b/.test(affText) ? 'tagged' : /\\institution\b/.test(affText) ? 'acm' : 'text'
  const emailMacro = has(/\\ead\s*[[{]/) ? 'ead' : has(/\\email\s*\{/) ? 'email' : null
  const firstAuthor = m.search(/\\author\b/)
  const nextEmail = emailMacro ? m.indexOf(`\\${emailMacro}`, firstAuthor) : -1
  const nextAff = m.indexOf(`\\${affMacro}`, firstAuthor)
  const authorOpts = findMacros(m, front, 'author', { opts: 1, args: 1 }).map(h => h.opts[0]?.inner ?? '')
  const corresponding = authorOpts.some(o => /=/.test(o))
    ? 'bmc'
    : has(/\\author\*/)
      ? 'star'
      : has(/\\corref\b/)
        ? 'corref'
        : has(/\\cormark\b/)
          ? 'cormark'
          : authorOpts.some(o => /\\ast\b|\*/.test(o)) || has(/\\corresp\b/)
            ? 'ast'
            : null
  return {
    affMacro,
    affFormat,
    label,
    bmcLabels,
    emailMacro,
    emailAfterAffiliation: nextEmail !== -1 && nextAff !== -1 && nextAff < nextEmail,
    corresponding,
    nameTags: has(/\\fnm\s*\{/) ? { surname: has(/\\snm\s*\{/) ? 'snm' : 'sur' } : null,
    orcid: has(/\]\s*\[\s*orcid\s*=/i) ? 'cas' : has(/\\ORCID\s*\{/) ? 'ORCID' : has(/\\orcidID\s*\{/) ? 'orcidID' : has(/\\orcid\s*\{/) ? 'orcid' : null,
    starredAffiliation: new RegExp(`\\\\${affMacro}\\*`).test(front),
    noteMacro: has(/\\equalcont\s*\{/) ? 'equalcont' : has(/\\fnmark\b/) ? 'fnmark' : has(/\\authornote\s*\{/) || cls === 'acmart' ? 'authornote' : null,
    countryMacro: has(/\\cny\s*\{/) ? 'cny' : 'country',
    thanks: has(/\\thanks\s*\{/),
    tags: new Set(['orgdiv', 'orgname', 'orgaddress', 'city', 'country', 'cny', 'state', 'street', 'postcode'].filter(n => new RegExp(`\\\\${n}\\s*\\{`).test(affText))),
    orcidMacro: has(/\\orcid\s*\{/),
  }
}

function affiliationBody(a: Affiliation, f: Features): string {
  if (f.affFormat === 'keyval') {
    const org = [a.department, a.institution].filter(Boolean).join(', ') || a.raw
    return [`organization={${kv(org)}}`, a.city && `city={${kv(a.city)}}`, a.country && `country={${kv(a.country)}}`].filter(Boolean).join(',\n  ')
  }
  if (f.affFormat === 'tagged') {
    // Only the tags the template's sample shows: a class may define \orgaddress but not \city.
    const tag = (name: string, value: string | undefined) => (value ? (f.tags.has(name) ? `\\${name}{${value}}` : value) : '')
    if (!a.institution && !a.department) return tag('orgname', a.raw)
    const address = [tag('city', a.city), tag(f.countryMacro, a.country)].filter(Boolean).join(', ')
    return [tag('orgdiv', a.department), tag('orgname', a.institution), address && (f.tags.has('orgaddress') ? `\\orgaddress{${address}}` : address)].filter(Boolean).join(', ')
  }
  if (f.affFormat === 'acm') {
    // acmart stops without a country: a visible placeholder.
    return [a.department && `\\department{${a.department}}`, `\\institution{${a.institution ?? a.raw}}`, a.city && `\\city{${a.city}}`, `\\country{${a.country ?? 'Country'}}`].filter(Boolean).join('\n  ')
  }
  return affiliationText(a)
}

function taggedName(a: Author, f: Features): string {
  if (!f.nameTags) return a.name
  const { given, family } = nameParts(a.name)
  return given ? `\\fnm{${given}} \\${f.nameTags.surname}{${family}}` : `\\${f.nameTags.surname}{${family}}`
}

/** Elsevier, CAS, Springer Nature, OUP and BMC: authors pointing at labelled affiliations. */
function labelledBlock(paper: Paper, f: Features): string {
  const labels = new Map(paper.affiliations.map((a, i) => [a.id, f.label(i)]))
  const notes: string[] = []
  const firstCorresponding = paper.authors.find(a => a.corresponding)
  const lines: string[] = []
  for (const a of paper.authors) {
    const keys = a.affiliations.map(id => labels.get(id)).filter(Boolean) as string[]
    let name = taggedName(a, f)
    if (f.orcid === 'ORCID' && a.orcid) name += `\\ORCID{${a.orcid}}`
    if (f.corresponding === 'corref' && a.corresponding) name += '\\corref{cor1}'
    let opt: string
    if (f.corresponding === 'bmc') {
      const parts = [keys.length && `addressref={${keys.join(',')}}`, a.corresponding && keys[0] && `corref={${keys[0]}}`, a.email && `email={${a.email}}`].filter(Boolean)
      opt = parts.length ? `[${parts.join(',\n  ')}]` : ''
    } else {
      const all = [...keys, ...(f.corresponding === 'ast' && a.corresponding ? ['$\\ast$'] : [])]
      opt = all.length ? `[${all.join(',')}]` : ''
    }
    const block = [`\\author${f.corresponding === 'star' && a.corresponding ? '*' : ''}${opt}{${name}}${f.orcid === 'cas' && a.orcid ? `[orcid=${a.orcid}]` : ''}`]
    if (f.corresponding === 'cormark' && a.corresponding) block.push('\\cormark[1]')
    if (a.note && f.noteMacro === 'equalcont') block.push(`\\equalcont{${a.note}}`)
    if (a.note && f.noteMacro === 'fnmark') {
      if (!notes.includes(a.note)) notes.push(a.note)
      block.push(`\\fnmark[${notes.indexOf(a.note) + 1}]`)
    }
    if (a.email && f.emailMacro && f.corresponding !== 'bmc') block.push(`\\${f.emailMacro}{${a.email}}`)
    lines.push(block.join('\n'))
  }
  const affs = paper.affiliations.map(a => {
    const star = f.starredAffiliation && firstCorresponding?.affiliations[0] === a.id ? '*' : ''
    const key = f.bmcLabels ? `id=${labels.get(a.id)}` : labels.get(a.id)
    return `\\${f.affMacro}${star}[${key}]{${affiliationBody(a, f)}}`
  })
  const closing: string[] = []
  if (firstCorresponding) {
    if (f.corresponding === 'corref') closing.push('\\cortext[cor1]{Corresponding author}')
    if (f.corresponding === 'cormark') closing.push('\\cortext[1]{Corresponding author}')
    if (f.corresponding === 'ast') {
      const mails = paper.authors.filter(a => a.corresponding && a.email).map(a => `\\href{mailto:${a.email}}{${a.email}}`)
      closing.push(`\\corresp[$\\ast$]{Corresponding author.${mails.length ? ` ${mails.join(', ')}` : ''}}`)
    }
  }
  closing.push(...notes.map((n, i) => `\\fntext[${i + 1}]{${n}}`))
  return [lines.join('\n\n'), affs.join('\n'), closing.join('\n')].filter(Boolean).join('\n\n')
}

/** acmart, REVTeX, amsart, AASTeX, achemso: \author, its affiliations and email, one author after another. */
function sequenceBlock(paper: Paper, f: Features, cls: string): string {
  // AASTeX stops without an email and an affiliation for every author: visible placeholders.
  const aastex = /^aastex/.test(cls)
  if (aastex) {
    paper = {
      ...paper,
      affiliations: paper.authors.some(a => !a.affiliations.length) ? [...paper.affiliations, { id: '_placeholder', raw: 'Affiliation' }] : paper.affiliations,
      authors: paper.authors.map(a => ({ ...a, email: a.email ?? 'author@example.org', affiliations: a.affiliations.length ? a.affiliations : ['_placeholder'] })),
    }
  }
  return paper.authors
    .map(a => {
      const lines = [`\\author{${a.name}}`]
      const mail = a.email && f.emailMacro ? `\\${f.emailMacro}{${a.email}}` : undefined
      if (mail && !f.emailAfterAffiliation) lines.push(mail)
      if (a.orcid && f.orcidMacro) lines.push(`\\orcid{${a.orcid}}`)
      for (const af of affiliationsOf(paper, a)) {
        const body = affiliationBody(af, f)
        lines.push(f.affFormat === 'acm' ? `\\${f.affMacro}{%\n  ${body}\n}` : `\\${f.affMacro}{${body}}`)
      }
      if (mail && f.emailAfterAffiliation) lines.push(mail)
      // Some classes take notes on authors only in their own way (achemso has no \thanks).
      if (a.note && (f.noteMacro === 'authornote' || f.thanks)) lines.push(`\\${f.noteMacro === 'authornote' ? 'authornote' : 'thanks'}{${a.note}}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

/** authblk: \author[1,2]{Name} with \affil[1]{Text}. */
function authblkBlock(paper: Paper): string {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const thanks = (a: Author) => [a.email && `\\texttt{${a.email}}`, a.note].filter(Boolean).map(t => `\\thanks{${t}}`).join('')
  const authors = paper.authors.map(a => {
    const keys = a.affiliations.map(id => index.get(id)).filter(Boolean)
    return `\\author${keys.length ? `[${keys.join(',')}]` : ''}{${braced(a.name)}${thanks(a)}}`
  })
  return [...authors, ...paper.affiliations.map(a => `\\affil[${index.get(a.id)}]{${affiliationText(a)}}`)].join('\n')
}

/** \author{Name \\ Affiliation \\ email \and …}. */
function blockAuthors(paper: Paper): string {
  const parts = paper.authors.map(a => {
    const lines = [braced(a.name), ...affiliationsOf(paper, a).map(affiliationText), ...(a.email ? [`\\texttt{${a.email}}`] : [])]
    return `${lines.join(' \\\\\n')}${a.note ? `\\thanks{${a.note}}` : ''}`
  })
  return `\\author{${parts.join('\n\\and\n')}}`
}

/** IEEEtran: blocks of name and affiliation (conferences), or names with \thanks (journals). */
function ieeeBlock(paper: Paper, blocks: boolean): string {
  if (blocks) {
    return `\\author{${paper.authors
      .map(a => {
        const lines = affiliationsOf(paper, a).flatMap(af =>
          af.department || af.institution
            ? [af.department && `\\textit{${af.department}}`, af.institution && `\\textit{${af.institution}}`, [af.city, af.country].filter(Boolean).join(', ')].filter(Boolean)
            : [af.raw],
        )
        if (a.email) lines.push(a.email)
        return `\\IEEEauthorblockN{${braced(a.name)}}${lines.length ? `\n\\IEEEauthorblockA{${lines.join(' \\\\\n')}}` : ''}`
      })
      .join('\n\\and\n')}}`
  }
  const groups = new Map<string, Author[]>()
  for (const a of paper.authors) if (a.affiliations[0]) groups.set(a.affiliations[0], [...(groups.get(a.affiliations[0]) ?? []), a])
  const thanks = [...groups].map(([id, authors]) => {
    const aff = paper.affiliations.find(x => x.id === id)!
    const mails = authors.filter(a => a.email).map(a => a.email)
    return `\\thanks{${joinNames(authors.map(a => a.name))} ${authors.length > 1 ? 'are' : 'is'} with ${affiliationText(aff)}${mails.length ? ` (e-mail: ${mails.join('; ')})` : ''}.}`
  })
  return `\\author{${joinNames(paper.authors.map(a => braced(a.name).replace(/ /g, '~')))}${thanks.map(t => `%\n${t}`).join('')}}`
}

function lncsBlock(paper: Paper): string {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const authors = paper.authors.map(a => {
    const nums = a.affiliations.map(id => index.get(id)).filter(Boolean)
    return `${a.name}${nums.length && paper.affiliations.length > 1 ? `\\inst{${nums.join(',')}}` : ''}${a.orcid ? `\\orcidID{${a.orcid}}` : ''}`
  })
  const institutes = paper.affiliations.map(af => {
    const mails = paper.authors.filter(a => a.email && a.affiliations[0] === af.id).map(a => a.email)
    return `${affiliationText(af)}${mails.length ? `\\\\\n\\email{${mails.join(', ')}}` : ''}`
  })
  return [`\\author{${authors.join(' \\and\n')}}`, `\\authorrunning{${shortAuthors(paper.authors)}}`, institutes.length ? `\\institute{${institutes.join(' \\and\n')}}` : ''].filter(Boolean).join('\n')
}

/** Names marked with numbers and the affiliations they point to: MNRAS's one \author, Nature's affiliations list. */
function marksBlock(paper: Paper, front: string): string {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const names = paper.authors.map((a, i) => {
    const keys = a.affiliations.map(id => index.get(id)).filter(Boolean)
    const mail = a.email && (a.corresponding || i === 0) ? `\\thanks{E-mail: ${a.email}}` : ''
    return `${braced(a.name)}${keys.length ? `$^{${keys.join(',')}}$` : ''}${mail}`
  })
  // JPSJ: the affiliations in \inst{..} after the names.
  if (/^\s*\\inst\s*\{/m.test(front)) {
    const plain = paper.authors.map(a => `${braced(a.name)}${(() => {
      const keys = a.affiliations.map(id => index.get(id)).filter(Boolean)
      return keys.length ? `$^{${keys.join(',')}}$` : ''
    })()}${a.email && a.corresponding ? `\\thanks{${a.email}}` : ''}`)
    return `\\author{${joinNames(plain)}}\n\\inst{${paper.affiliations.map(a => `$^{${index.get(a.id)}}$${affiliationText(a)}`).join('\\\\\n')}}`
  }
  if (/\\begin\{affiliations\}/.test(front)) {
    return `\\author{${joinNames(names)}}\n\n\\begin{affiliations}\n${paper.affiliations.map(a => ` \\item ${affiliationText(a)}`).join('\n')}\n\\end{affiliations}`
  }
  const short = mask(front).match(/\\author\s*\[/) ? `[${shortAuthors(paper.authors) || 'Author'}]` : ''
  return `\\author${short}{\n${[joinNames(names), ...paper.affiliations.map(a => `$^{${index.get(a.id)}}$${affiliationText(a)}`)].join('\n\\\\\n')}\n}`
}

function apaBlock(paper: Paper): string {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const keys = paper.authors.map(a => {
    const k = a.affiliations.map(id => index.get(id)).filter(Boolean)
    return k.length > 1 ? `{${k.join(',')}}` : String(k[0] ?? 1)
  })
  const corresponding = paper.authors.find(a => a.corresponding && a.email) ?? paper.authors.find(a => a.email)
  return [
    `\\authorsnames${paper.affiliations.length > 1 ? `[${keys.join(',')}]` : ''}{${paper.authors.map(a => braced(a.name)).join(', ') || 'Author Name'}}`,
    `\\authorsaffiliations{${paper.affiliations.length ? paper.affiliations.map(a => `{${affiliationText(a)}}`).join(', ') : '{Affiliation}'}}`,
    corresponding ? `\\authornote{Correspondence concerning this article should be addressed to ${corresponding.name}, ${corresponding.email}.}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function jmlrBlock(paper: Paper): string {
  return `\\author{${paper.authors
    .map(a => {
      const aff = affiliationsOf(paper, a).map(affiliationText)
      return `\\Name{${a.name}}${a.email ? ` \\Email{${a.email}}` : ''}${aff.length ? `\\\\\n\\addr ${aff.join(' \\\\ ')}` : ''}`
    })
    .join('\n\\AND\n')}}`
}

function asmeBlock(paper: Paper): string {
  const index = new Map(paper.affiliations.map((a, i) => [a.id, i + 1]))
  const authors = paper.authors.map(a => `${a.name}${a.affiliations.map(id => `\\affil{${index.get(id)}}`).join('')}${a.corresponding && a.email ? `\\CorrespondingAuthor{${a.email}}` : ''}`)
  return [`\\SetAuthors{%\n${authors.join(',\n')}\n}`, ...paper.affiliations.map(a => `\\SetAffiliation{${index.get(a.id)}}{${affiliationText(a)}}`)].join('\n')
}

/** nrc2: the names in \author, and in \address a line per author ("F. Author. Department, …"). */
function nrcBlock(paper: Paper): string {
  const short = (name: string) => {
    const { given, family } = nameParts(name)
    return `${given.split(/\s+/).filter(Boolean).map(g => `${g[0]}.`).join(' ')} ${family}`.trim()
  }
  const lines = paper.authors.map(a => `${short(a.name)}. ${affiliationsOf(paper, a).map(affiliationText).join('; ') || 'Affiliation'}.`)
  const corresponding = paper.authors.find(a => a.corresponding && a.email) ?? paper.authors.find(a => a.email)
  return [
    `\\author{${joinNames(paper.authors.map(a => a.name)) || 'Author'}}`,
    `\\address{${lines.join('\\\\\n') || 'Affiliation.'}}`,
    corresponding ? `\\correspond{${short(corresponding.name)} (e-mail: ${corresponding.email}).}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function jacowBlock(paper: Paper): string {
  return `\\author{${paper.authors.map(a => `${a.name}${a.email ? `\\thanks{${a.email}}` : ''}${affiliationsOf(paper, a).map(af => `, ${affiliationText(af)}`).join('')}`).join(' \\\\\n')}}`
}

function authorBlock(style: AuthorStyle, front: string, paper: Paper, cls: string): string {
  const f = features(front, cls)
  switch (style) {
    case 'labelled':
      return labelledBlock(paper, f)
    case 'sequence':
      return sequenceBlock(paper, f, cls)
    case 'authblk':
      return authblkBlock(paper)
    case 'ieee':
      return ieeeBlock(paper, /\\IEEEauthorblockN/.test(front))
    case 'lncs':
      return lncsBlock(paper)
    case 'marks':
      return marksBlock(paper, front)
    case 'apa':
      return apaBlock(paper)
    case 'jmlr':
      return jmlrBlock(paper)
    case 'asme':
      return asmeBlock(paper)
    case 'jacow':
      return jacowBlock(paper)
    case 'nrc':
      return nrcBlock(paper)
    default:
      return blockAuthors(paper)
  }
}

/** Classes that stop when amsthm is loaded or clash with it; they have their own theorems. */
const NO_AMSTHM = new Set(['jmlr', 'llncs', 'spie'])

/** Theorem environments classes define themselves (llncs's are handled by theoremsForLlncs). */
const PREDEFINED_THEOREMS: Record<string, string[]> = {
  acmart: ['theorem', 'conjecture', 'proposition', 'lemma', 'corollary', 'example', 'definition', 'proof'],
  jmlr: ['theorem', 'example', 'lemma', 'proposition', 'remark', 'corollary', 'definition', 'conjecture', 'axiom', 'proof'],
  spie: ['theorem', 'lemma', 'definition'],
}

/** Packages built into a class without a \\RequirePackage (the AMS classes have amsthm in them; acmart loads it at the end of the preamble). */
const BUILT_IN: Record<string, string[]> = {
  amsart: ['amsmath', 'amsfonts', 'amsthm'],
  amsproc: ['amsmath', 'amsfonts', 'amsthm'],
  amsbook: ['amsmath', 'amsfonts', 'amsthm'],
  aomart: ['amsmath', 'amsfonts', 'amsthm'],
  acmart: ['amsthm'],
}

/** Packages some classes can't take (nrc2 declares its Helvetica for OT1 only: T1 from fontenc breaks it). */
const CLASS_DROP: Record<string, string[]> = { nrc2: ['fontenc', 'hyperref'] }

/** Font packages: in a journal's template its fonts are the journal's (fontspec stays, for the text's scripts). */
const FONT_PACKAGES = new Set(['times', 'mathptmx', 'newtxtext', 'newtxmath', 'newpxtext', 'newpxmath', 'txfonts', 'pxfonts', 'helvet', 'courier', 'lmodern', 'libertine', 'libertinus', 'libertinust1math', 'mathpazo', 'palatino', 'charter', 'XCharter', 'fourier', 'kpfonts', 'stix', 'stix2', 'tgtermes', 'tgpagella', 'ebgaramond', 'sourcesanspro', 'sourceserifpro', 'mtpro2', 'mathdesign'])

/** Classes with citation commands of their own that natbib would redefine (ascelike's \\citeyear). */
const NO_NATBIB = new Set(['ascelike'])

/** What some classes lack that papers rely on (OUP: \\appendix; JPSJ: the lists' file names hyperref writes). */
const CLASS_FIXES: Record<string, string> = {
  'oup-authoring-template': '\\providecommand{\\societylogo}{}\n\\providecommand{\\appendix}{\\par\\setcounter{section}{0}\\renewcommand{\\thesection}{\\Alph{section}}}',
  jpsj2: '\\makeatletter\n\\providecommand\\ext@figure{lof}\n\\providecommand\\ext@table{lot}\n\\makeatother',
  // nrc2's \\caption doesn't survive hyperref: links stay text.
  nrc2: '\\usepackage{url}\n\\providecommand{\\href}[2]{#2}\n\\providecommand{\\hypersetup}[1]{}',
}

/**
 * The paper's theorem declarations, without those the template has (`taken`,
 * which keep the journal's numbering) and, for a class without amsthm, without
 * amsthm's style commands; unnumbered ones become numbered there.
 */
function fitTheorems(preamble: string, taken: Set<string>, amsthm: boolean): string {
  const m = mask(preamble)
  const edits: Edit[] = []
  for (const h of findMacros(m, preamble, 'newtheorem', { args: 1 })) {
    const name = h.args[0]!.inner.trim()
    const shared = readGroup(m, preamble, h.end, '[')
    const title = readGroup(m, preamble, shared?.end ?? h.end, '{')
    if (!title) continue
    const within = h.star || shared ? undefined : readGroup(m, preamble, title.end, '[')
    const end = (within ?? title).end
    if (taken.has(name)) edits.push({ start: h.start, end, text: '' })
    else if (h.star && !amsthm) edits.push({ start: h.start, end, text: `\\newtheorem{${name}}{${title.inner}}` })
  }
  if (!amsthm) {
    for (const [name, args] of [['theoremstyle', 1], ['newtheoremstyle', 9], ['swapnumbers', 0]] as const) {
      for (const h of findMacros(m, preamble, name, { args })) edits.push({ start: h.start, end: h.end, text: '' })
    }
  }
  return apply(preamble, edits).replace(/\n{3,}/g, '\n\n')
}

/** Packages that set the maths in another font, with amssymb's symbols. */
const MATH_FONTS = new Set(['newtxmath', 'newpxmath', 'txfonts', 'pxfonts', 'stix', 'stix2', 'libertinust1math', 'mathpazo', 'mtpro2', 'fourier', 'kpfonts', 'mathdesign', 'lucimatx', 'unicode-math'])

/** Classes whose \title takes a \thanks (article's kind). */
const THANKS_IN_TITLE = new Set(['article', 'report', 'IEEEtran', 'llncs', 'revtex4-2', 'revtex4-1', 'elsarticle'])

/** The AMS classes (and those built on them): \thanks and \keywords their own way. */
const AMS_CLASSES = new Set(['amsart', 'amsproc', 'amsbook', 'aomart'])

/** Commands that carry a template's sample authors, affiliations and their marks. */
const AUTHOR_MACROS: [string, number, number][] = [
  ['author', 1, 1], ['affil', 1, 1], ['affiliation', 1, 1], ['address', 1, 1], ['institute', 0, 1], ['inst', 0, 1],
  ['email', 1, 1], ['ead', 1, 1], ['orcid', 0, 1], ['thanks', 0, 1], ['corresp', 1, 1], ['cormark', 1, 0], ['fnmark', 1, 0],
  ['cortext', 1, 1], ['fntext', 1, 1], ['equalcont', 0, 1], ['presentaddress', 0, 1], ['credit', 0, 1],
  ['authorsnames', 1, 1], ['authorsaffiliations', 0, 1], ['authornote', 0, 1], ['SetAuthors', 0, 1], ['SetAffiliation', 0, 2],
  ['correspondingauthor', 0, 1], ['correspond', 0, 1], ['altaffiliation', 1, 1], ['additionalaffiliation', 0, 1], ['authorrunning', 0, 1],
]

/** Between two of a template's author commands: nothing but spaces, comments and separators. */
const IGNORABLE_GAP = /^(?:\s|\\(?:and|AND|And|par|newline)(?![a-zA-Z])|\\\\|\\(?:vspace|hspace)\*?\s*\{[^{}]*\})*$/

// ---------------------------------------------------------------------------
// The rest of the front matter
// ---------------------------------------------------------------------------

/** "\\textbf{Keywords:} a, b" written by hand in a template. */
const MANUAL_KEYWORDS = /(?:\\noindent\s*)?\\(?:textbf|textit|emph|textsc)\{\s*(?:Key\s?words|Index Terms)\s*[:.—-]?\s*\}\s*[:.—-]?\s*([^\n]+)/

/** How the template separates its sample keywords. */
function keywordText(sample: string, keywords: string[]): string {
  if (/\\kwd\s*\{/.test(sample)) return keywords.map(k => `\\kwd{${k}}`).join(' ')
  if (/\\sep\b/.test(sample)) return keywords.join(' \\sep ')
  if (/\\and\b/.test(sample)) return keywords.join(' \\and ')
  if (/\s---\s/.test(sample)) return keywords.join(' --- ')
  if (/\s--\s/.test(sample)) return keywords.join(' -- ')
  if (/;/.test(sample)) return keywords.join('; ')
  if (/·/.test(sample)) return keywords.join(' · ')
  return keywords.join(', ')
}

/** The template's way of writing the acknowledgments: its environment, command or heading. */
function acknowledgmentsForm(m: string, src: string, from: number, to: number): (text: string) => string {
  for (const env of ['acks', 'acknowledgments', 'acknowledgements', 'acknowledgement', 'acknowledgment']) {
    if (findEnvs(m, src, env, {}, from, to).length) return t => `\\begin{${env}}\n${t}\n\\end{${env}}`
  }
  if (findEnvs(m, src, 'credits', {}, from, to).length) return t => `\\begin{credits}\n\\subsubsection{\\ackname} ${t}\n\\end{credits}`
  if (findMacros(m, src, 'acks', { args: 1 }, from, to).length) return t => `\\acks{${t}}`
  const re = /\\(section|subsection|subsubsection|paragraph|bmhead)(\*?)\s*\{\s*((?:Acknowledge?ments?|Acknowledgment)\s*)\}|\\(acknowledge?ments)(?![a-zA-Z])(?!\s*\{)/gi
  re.lastIndex = from
  const head = re.exec(m)
  if (head && head.index < to) {
    if (head[4]) return t => `\\${head[4]}\n${t}`
    return t => `\\${head[1]}${head[2]}{${head[3]!.trim()}}\n${t}`
  }
  return t => `\\section*{Acknowledgments}\n${t}`
}

/** \newcommand-style definitions in a preamble, with the names they define. */
function definitions(src: string): { name: string; start: number; end: number }[] {
  const m = mask(src)
  const out: { name: string; start: number; end: number }[] = []
  const after = (h: MacroHit, opts: number, args: number) => {
    let end = h.end
    for (let i = 0; i < opts; i++) end = readGroup(m, src, end, '[')?.end ?? end
    for (let i = 0; i < args; i++) end = readGroup(m, src, end, '{')?.end ?? end
    return end
  }
  for (const name of ['newcommand', 'providecommand', 'DeclareMathOperator', 'DeclareRobustCommand']) {
    for (const h of findMacros(m, src, name, {})) {
      // \newcommand{\x}[1][d]{..} or \newcommand\x{..}
      const braced = readGroup(m, src, h.end, '{')
      const bare = braced ? undefined : /^\s*(\\[a-zA-Z@]+)/.exec(src.slice(h.end))
      const what = braced ? braced.inner.trim() : bare?.[1]
      if (!what) continue
      const from = braced ? braced.end : h.end + bare![0].length
      out.push({ name: what, start: h.start, end: after({ ...h, end: from }, name === 'DeclareMathOperator' ? 0 : 2, 1) })
    }
  }
  for (const h of findMacros(m, src, 'newtheorem', { args: 1 })) {
    const shared = readGroup(m, src, h.end, '[')
    const title = readGroup(m, src, shared?.end ?? h.end, '{')
    const within = h.star || shared || !title ? undefined : readGroup(m, src, title.end, '[')
    if (title) out.push({ name: `env:${h.args[0]!.inner.trim()}`, start: h.start, end: (within ?? title).end })
  }
  for (const h of findMacros(m, src, 'newenvironment', { args: 1 })) out.push({ name: `env:${h.args[0]!.inner.trim()}`, start: h.start, end: after(h, 2, 2) })
  return out
}

/** Packages a class file loads itself (\RequirePackage, and what its base class has). */
function classPackages(cls: string | undefined): string[] {
  if (!cls) return []
  const m = mask(cls)
  return ['RequirePackage', 'usepackage'].flatMap(name => findMacros(m, cls, name, { opts: 1, args: 1 }).flatMap(h => (h.args[0]?.inner ?? '').split(',').map(s => clean(s)).filter(Boolean)))
}

/** Packages a class loads at the end of the preamble (jacow's csquotes): loading them first would clash with its options. */
function deferredPackages(cls: string | undefined): Set<string> {
  const lines = (cls ?? '').split('\n').filter(l => /\\AtEndPreamble|\\AddToHook\s*\{begindocument\/before\}/.test(l))
  return new Set(classPackages(lines.join('\n')))
}

// ---------------------------------------------------------------------------

export function convertToTemplate(
  paper: Paper,
  template: TemplateInput,
  options: TargetOptions,
  project: { rootFile: string; texFiles: Record<string, string>; bibFiles: Record<string, string> },
): TemplateConversion {
  const src = template.main
  const m = mask(src)
  const docClass = findMacros(m, src, 'documentclass', { opts: 1, args: 1 })[0]
  const begin = m.indexOf('\\begin{document}')
  const end = m.lastIndexOf('\\end{document}')
  if (!docClass || begin === -1 || end === -1) throw new ConvertError(`The template's main file ${template.rootFile} has no \\documentclass and \\begin{document} … \\end{document}.`)
  const cls = docClass.args[0]?.inner.trim() ?? 'article'
  const classOptions = (docClass.opts[0]?.inner ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const known = TARGETS.find(t => t.documentClass === cls)
  const clsText = template.read(`${cls}.cls`)
  const sample = extractPaper(src)
  const notes: ConversionNote[] = [
    ...paper.notes.map(text => ({ level: 'warning' as const, text })),
    { level: 'info', text: `Converted into the template ${template.name} (${cls}); its sample text was replaced by the paper's.` },
  ]
  const files: Record<string, string> = {}
  const edits: Edit[] = []
  const bodyStart = begin + '\\begin{document}'.length

  // ---- where the front matter ends: the first heading, or after the abstract, keywords and \maketitle ----
  const heading = /\\(?:section|chapter|part)\*?\s*[[{]/g
  heading.lastIndex = bodyStart
  const first = heading.exec(m)
  const stop = first ? first.index : end
  const manualKeywords = (() => {
    const re = new RegExp(MANUAL_KEYWORDS.source, 'gi')
    re.lastIndex = bodyStart
    const hit = re.exec(m)
    return hit && hit.index < stop ? { start: hit.index + hit[0].length - hit[1]!.length, end: hit.index + hit[0].length } : undefined
  })()
  const frontItems = [
    ...['abstract', 'keywords', 'keyword', 'IEEEkeywords', 'frontmatter', 'highlights', 'graphicalabstract', 'tocentry'].flatMap(e => findEnvs(m, src, e, {}, bodyStart, stop)),
    ...['maketitle', 'keywords', 'IEEEpeerreviewmaketitle', 'IEEEdisplaynontitleabstractindextext'].flatMap(n => findMacros(m, src, n, { args: n === 'keywords' ? 1 : 0 }, bodyStart, stop)),
    ...(manualKeywords ? [manualKeywords] : []),
  ]
  // Sample text between the front matter and the first heading (APA's untitled introduction) goes too.
  const frontEnd = frontItems.length ? Math.max(...frontItems.map(h => h.end)) : first ? first.index : bodyStart

  // ---- title ----
  const titleHit = findMacros(m, src, 'title', { opts: 1, args: 1 }, 0, frontEnd)[0]
  const short = paper.shortTitle ?? splitTitleNotes(paper.title).title
  // A note on the title: acmart's \titlenote and the AMS classes' \thanks follow the title; other
  // classes than article's kind may put the title where \thanks breaks (bookmarks, \csname).
  const titleNotes = splitTitleNotes(paper.title)
  const thanksInTitle = THANKS_IN_TITLE.has(cls) || /\\thanks\b/.test(titleHit?.args[0]?.inner ?? '')
  const noteAfter = cls === 'acmart' || AMS_CLASSES.has(cls)
  const titleText = thanksInTitle && !noteAfter ? paper.title : titleNotes.title
  if (!thanksInTitle && !noteAfter && titleNotes.notes.length) {
    notes.push({ level: 'warning', text: `The title's note was left out (${titleNotes.notes.join(' ')}); add it the way the journal wants, often in the acknowledgments.` })
  }
  if (titleHit) {
    const opt = titleHit.opts[0] ? (/=/.test(titleHit.opts[0].inner) ? `[${titleHit.opts[0].inner}]` : `[${short}]`) : ''
    const after = noteAfter ? titleNotes.notes.map(n => `\n\\${cls === 'acmart' ? 'titlenote' : 'thanks'}{${n}}`).join('') : ''
    edits.push({ start: titleHit.start, end: titleHit.end, text: `\\title${opt}{${titleText}}${after}` })
  } else notes.push({ level: 'warning', text: 'The template has no \\title; add the title where the journal wants it.' })
  for (const name of ['shorttitle', 'titlerunning', 'runningtitle']) {
    for (const h of findMacros(m, src, name, { args: 1 }, 0, frontEnd)) edits.push({ start: h.args[0]!.start, end: h.args[0]!.end, text: `{${short}}` })
  }
  const running = shortAuthors(paper.authors) || 'Author'
  for (const name of ['shortauthors', 'leftheader', 'authormark']) {
    for (const h of findMacros(m, src, name, { args: 1 }, 0, frontEnd)) edits.push({ start: h.args[0]!.start, end: h.args[0]!.end, text: `{${running}}` })
  }
  for (const h of findMacros(m, src, 'renewcommand', { args: 2 }, 0, frontEnd)) {
    if (/^\s*\\shortauthors\s*$/.test(h.args[0]?.inner ?? '')) edits.push({ start: h.args[1]!.start, end: h.args[1]!.end, text: `{${running}}` })
  }
  for (const h of findMacros(m, src, 'markboth', { args: 2 }, 0, frontEnd)) {
    edits.push({ start: h.args[1]!.start, end: h.args[1]!.end, text: `{${running}: ${short}}` })
    if (options.journal) edits.push({ start: h.args[0]!.start, end: h.args[0]!.end, text: `{${options.journal}}` })
  }

  // ---- authors: the template's own commands, in one place ----
  const hits = AUTHOR_MACROS.flatMap(([name, o, a]) => findMacros(m, src, name, { opts: o, args: a }, 0, frontEnd).map(h => ({ name, ...h })))
  for (const e of findEnvs(m, src, 'affiliations', {}, 0, frontEnd)) hits.push({ name: 'affiliations', start: e.start, end: e.end, star: false, opts: [], args: [] })
  // CAS: \author[1]{Name}[orcid=..]: the details after the name are the author's too.
  for (const h of hits) {
    if (h.name !== 'author' || !h.args.length) continue
    const details = readGroup(m, src, h.end, '[')
    if (details && !/\n\s*\n/.test(src.slice(h.end, details.start))) h.end = details.end
  }
  const top = hits.filter(h => !hits.some(o => inside(h, o))).sort((a, b) => a.start - b.start)
  const anchor = top.findIndex(h => ['author', 'authorsnames', 'SetAuthors'].includes(h.name))
  if (anchor === -1) {
    notes.push({ level: 'warning', text: 'The template has no \\author; add the authors where the journal wants them.' })
  } else {
    let last = anchor
    while (last + 1 < top.length && IGNORABLE_GAP.test(m.slice(top[last]!.end, top[last + 1]!.start))) last++
    const cluster = top.slice(anchor, last + 1)
    const front = src.slice(cluster[0]!.start, cluster.at(-1)!.end)
    const style = sample.authorStyle ?? 'block'
    edits.push({ start: cluster[0]!.start, end: cluster.at(-1)!.end, text: authorBlock(style, front, paper, cls) })
    // Sample marks elsewhere (\cortext after the abstract, a stray \email) go.
    for (const h of top) if (!cluster.includes(h)) edits.push({ start: h.start, end: h.end, text: '' })
    if (!paper.authors.length) notes.push({ level: 'warning', text: 'The paper has no authors; the template’s author commands were left empty.' })
  }

  // ---- abstract and keywords, in the template's places ----
  const keywordEnvs = ['keywords', 'keyword', 'IEEEkeywords'].flatMap(e => findEnvs(m, src, e, {}, 0, frontEnd))
  const keywordMacros = ['keywords', 'KeyWords', 'keyword', 'kword'].flatMap(n => findMacros(m, src, n, { opts: 1, args: 1 }, 0, frontEnd))
  const abstractEnv = findEnvs(m, src, 'abstract', {}, 0, frontEnd)[0]
  const abstractMacro = abstractEnv ? undefined : ['abstract', 'abst'].flatMap(n => findMacros(m, src, n, { args: 1 }, 0, frontEnd)).find(h => h.args.length)
  const keywordsIn = (r: { start: number; end: number }) => [...keywordEnvs, ...keywordMacros].filter(k => k.start >= r.start && k.end <= r.end)
  const keywordSlots = [...keywordEnvs, ...keywordMacros].filter(k => !abstractEnv || !(k.start > abstractEnv.bodyStart && k.end < abstractEnv.bodyEnd))
  let keywordsPlaced = false
  const writeKeywords = (k: (typeof keywordEnvs)[number] | (typeof keywordMacros)[number]) => {
    // Without keywords of the paper's the sample ones stay (an empty list may not even build); the report says so.
    if (!paper.keywords.length) return
    if ('bodyStart' in k) {
      edits.push({ start: k.bodyStart, end: k.bodyEnd, text: `\n${keywordText(src.slice(k.bodyStart, k.bodyEnd), paper.keywords)}\n` })
    } else edits.push({ start: k.args[0]!.start, end: k.args[0]!.end, text: `{${keywordText(k.args[0]!.inner, paper.keywords)}}` })
    keywordsPlaced = true
  }
  if (abstractEnv) {
    // llncs keeps \keywords inside the abstract.
    const inner = keywordsIn({ start: abstractEnv.bodyStart, end: abstractEnv.bodyEnd })[0]
    const kw = inner && paper.keywords.length && 'args' in inner && !('bodyStart' in inner) ? `\n\n\\keywords{${keywordText(inner.args[0]!.inner, paper.keywords)}}` : ''
    if (inner) keywordsPlaced = !!kw
    edits.push({ start: abstractEnv.bodyStart, end: abstractEnv.bodyEnd, text: `\n${paper.abstract}${kw}\n` })
  } else if (abstractMacro) {
    // A macro argument isn't always \long: the parts of a structured abstract become lines.
    edits.push({ start: abstractMacro.args[0]!.start, end: abstractMacro.args[0]!.end, text: `{${paper.abstract.replace(/\s*\n\s*\n\s*/g, '\\\\\n')}}` })
  } else if (paper.abstract) {
    const at = findMacros(m, src, 'maketitle', {}, bodyStart, frontEnd)[0]?.end ?? frontEnd
    edits.push({ start: at, end: at, text: `\n\n\\begin{abstract}\n${paper.abstract}\n\\end{abstract}\n` })
    notes.push({ level: 'warning', text: 'The template shows no abstract; it was put after the title. Check where the journal wants it.' })
  }
  // aomart: one \keyword per keyword, repeated; the paper's keywords take the first and the rest go.
  const repeated = keywordMacros.filter(k => keywordSlots.includes(k))
  if (paper.keywords.length && repeated.length > 1 && new Set(repeated.map(k => src.slice(k.start, k.start + 12).replace(/[[{].*$/, ''))).size === 1) {
    const name = /^\\(\w+)/.exec(src.slice(repeated[0]!.start))![1]
    edits.push({ start: repeated[0]!.start, end: repeated[0]!.end, text: paper.keywords.map(k => `\\${name}{${k}}`).join('\n') })
    for (const k of repeated.slice(1)) edits.push({ start: k.start, end: k.end, text: '' })
    keywordsPlaced = paper.keywords.length > 0
  } else for (const k of keywordSlots) writeKeywords(k)
  if (manualKeywords && paper.keywords.length) {
    edits.push({ start: manualKeywords.start, end: manualKeywords.end, text: keywordText(src.slice(manualKeywords.start, manualKeywords.end), paper.keywords) })
    keywordsPlaced = true
  }
  if (paper.keywords.length && !keywordsPlaced) {
    const at = abstractEnv ? abstractEnv.end : (findMacros(m, src, 'maketitle', {}, bodyStart, frontEnd)[0]?.end ?? frontEnd)
    edits.push({ start: at, end: at, text: `\n\n\\noindent\\textbf{Keywords:} ${paper.keywords.join(', ')}\n` })
    notes.push({ level: 'warning', text: 'The template shows no keywords; they were put after the abstract as a plain line.' })
  }
  if (!paper.abstract) notes.push({ level: 'warning', text: 'No abstract found.' })
  if (!paper.keywords.length && keywordSlots.length) notes.push({ level: 'warning', text: "The paper has no keywords; the template's sample keywords are still there: replace them." })

  // ---- bibliography: the template's style and kind ----
  const tplPackages = ['usepackage', 'RequirePackage'].flatMap(name =>
    findMacros(m, src, name, { opts: 1, args: 1 }, docClass.end, begin).flatMap(h => (h.args[0]?.inner ?? '').split(',').map(s => clean(s)).filter(Boolean)),
  )
  const tplBiblatex = tplPackages.includes('biblatex') || findMacros(m, src, 'addbibresource', { opts: 1, args: 1 }, 0, begin).length > 0
  const styleHit = findMacros(m, src, 'bibliographystyle', { args: 1 })[0]
  const tplStyle = styleHit?.args[0] ? clean(styleHit.args[0].inner) : undefined
  // A style set in the preamble would be a second \bibliographystyle.
  if (styleHit && styleHit.start < frontEnd) edits.push({ start: styleHit.start, end: styleHit.end, text: '' })
  const tplHasBib = findMacros(m, src, 'bibliography', { args: 1 }, bodyStart, end).length > 0
  const resources = findMacros(m, src, 'addbibresource', { opts: 1, args: 1 }, 0, begin)

  // ---- packages ----
  // What the class loads: its file when the template has it, else what ColTex knows of TeX Live's classes.
  const byClassOption = IMPLIED_BY_OPTION[cls] ?? {}
  // What ColTex knows a class has (a copy of a package inside it, OUP's appendix): never loaded again.
  const deferred = deferredPackages(clsText)
  const knownLoads = new Set([...(CLASS_LOADS[cls] ?? []), ...(BUILT_IN[cls] ?? [])])
  const classLoads = new Set([
    ...knownLoads,
    // ColTex's table of what classes provide is a fallback: the class file, when there is one, says it.
    ...(clsText === undefined ? (IMPLIED_BY_SOURCE[cls] ?? []) : classPackages(clsText)),
    ...classOptions.flatMap(o => (byClassOption[o] ? [byClassOption[o]] : [])),
    ...tplPackages,
  ])
  const drop = new Set([...(DROP[cls] ?? (AMS_CLASSES.has(cls) ? DROP.amsart! : LAYOUT)), ...(tplBiblatex ? ['natbib', 'cite'] : ['biblatex'])])
  // A maths font package defines amssymb's \\Bbbk itself (the class may load it only with an option).
  const mathFont = [...classLoads].some(n => MATH_FONTS.has(n))
  if (NO_NATBIB.has(cls)) drop.add('natbib')
  for (const n of [...(CLASS_DROP[cls] ?? []), ...FONT_PACKAGES]) drop.add(n)
  // natbib and cite don't go together.
  if (classLoads.has('natbib')) drop.add('cite')
  if (classLoads.has('cite')) drop.add('natbib')
  const keepBiblatex = tplBiblatex && paper.bibliography.kind !== 'inline'
  const kept: UsedPackage[] = []
  const passOptions: string[] = []
  const dropped: string[] = []
  for (const p of paper.packages) {
    const isBiblatex = p.name === 'biblatex' || p.name === 'biblatex-chicago'
    if (isBiblatex) {
      if (!tplBiblatex) dropped.push(p.name)
      continue
    }
    if (drop.has(p.name)) {
      dropped.push(p.name)
      continue
    }
    // biblatex's companion: a BibTeX style's .bbl may define \enquote itself.
    if (p.name === 'csquotes' && paper.bibliography.kind === 'biblatex' && !tplBiblatex && !/\\(?:enquote|textquote|blockquote|foreignquote)\b/.test(paper.body)) {
      dropped.push(p.name)
      continue
    }
    // Options go ahead of the class, so a package the class or the template loads gets them too;
    // loading it again after that does nothing, and the class may load some only with an option.
    if (p.options) passOptions.push(`\\PassOptionsToPackage{${p.options}}{${p.name}}`)
    // The template loads it later with its own options: loading it first would clash with those.
    if (tplPackages.includes(p.name) || knownLoads.has(p.name) || deferred.has(p.name)) continue
    if (!kept.some(k => k.name === p.name)) kept.push({ name: p.name })
  }
  const byOption = IMPLIED_BY_OPTION[paper.sourceClass] ?? {}
  for (const name of [...(IMPLIED_BY_SOURCE[paper.sourceClass] ?? []), ...paper.classOptions.flatMap(o => (byOption[o] ? [byOption[o]] : []))]) {
    if (!kept.some(k => k.name === name) && !classLoads.has(name) && !drop.has(name)) {
      kept.push({ name })
      notes.push({ level: 'info', text: `Added \\usepackage{${name}}: ${paper.sourceClass} provided it implicitly.` })
    }
  }
  const anyText = [paper.body, ...Object.values(project.texFiles)].join('\n')
  if (/\\botrule\b/.test(anyText) && !kept.some(p => p.name === 'booktabs') && !classLoads.has('booktabs')) kept.push({ name: 'booktabs' })
  if (cls !== 'IEEEtran' && /\\begin\{IEEEeqnarray/.test(anyText) && !kept.some(p => p.name === 'IEEEtrantools')) kept.push({ name: 'IEEEtrantools' })
  // natbib brought by the paper: numbered, as a template's own style may be numbered (author–year mode stops on it).
  if (kept.some(p => p.name === 'natbib') && !passOptions.some(o => o.endsWith('{natbib}'))) passOptions.push('\\PassOptionsToPackage{numbers}{natbib}')
  if (dropped.length) notes.push({ level: 'info', text: `Left out packages that conflict with ${cls} or that it replaces: ${[...new Set(dropped)].join(', ')}.` })
  const hyperref = kept.findIndex(p => p.name === 'hyperref')
  if (hyperref !== -1) kept.push(...kept.splice(hyperref, 1))

  // ---- the paper's preamble ----
  let preamble = paper.preamble
  const toBibtex = paper.bibliography.kind === 'biblatex' && !tplBiblatex
  if (toBibtex) {
    const stripped = stripBiblatexPreamble(preamble)
    preamble = stripped.text
    notes.push({ level: 'warning', text: 'Moved the bibliography from biblatex to BibTeX, which journal templates expect.' })
    if (stripped.removed) notes.push({ level: 'warning', text: `Removed ${stripped.removed} biblatex-only preamble command(s); check citation formatting.` })
  }
  if (cls === 'llncs') preamble = theoremsForLlncs(preamble).text
  const tplPreamble = src.slice(docClass.end, begin)
  const theorems = missingTheorems(paper.sourceClass, cls, `${tplPreamble}\n${clsText ?? ''}\n${preamble}`, [paper.body, ...Object.values(project.texFiles)])
  if (theorems.lines.length) preamble = `${preamble}\n\n${theorems.lines.join('\n')}`.trim()
  if (theorems.amsthm && cls !== 'llncs' && !classLoads.has('amsthm') && !kept.some(p => p.name === 'amsthm')) kept.push({ name: 'amsthm' })
  // amsthm right after the class, over a proof the class defines (mnras) and a maths font's \\openbox;
  // not where the class loads it (acmart) or refuses it (jmlr, with theorems of its own).
  const amsthm = kept.findIndex(p => p.name === 'amsthm')
  if (amsthm !== -1) {
    kept.splice(amsthm, 1)
    if (!classLoads.has('amsthm') && !NO_AMSTHM.has(cls)) {
      edits.push({ start: docClass.end, end: docClass.end, text: '\n\\let\\proof\\relax\n\\let\\endproof\\relax\n\\let\\openbox\\relax\n\\usepackage{amsthm}' })
    }
  }
  const used = [preamble, paper.body, ...Object.values(project.texFiles)].join('\n')
  const compat = COMPAT.filter(
    c => ((c.from.includes(paper.sourceClass) && !c.from.includes(cls)) || c.from.some(f => dropped.includes(f))) && c.names.some(n => new RegExp(`\\\\${n}(?![a-zA-Z@])|\\\\begin\\s*\\{${n}\\}`).test(used)),
  )
  if (compat.length) preamble = `${compat.map(c => c.def).join('\n')}\n\n${preamble}`.trim()
  // Theorem-like environments the template (or its class) declares keep its numbering: the paper's go.
  const tplEnvs = new Set(definitions(tplPreamble).flatMap(d => (d.name.startsWith('env:') ? [d.name.slice(4)] : [])))
  for (const env of PREDEFINED_THEOREMS[cls] ?? []) tplEnvs.add(env)
  preamble = fitTheorems(preamble, tplEnvs, !NO_AMSTHM.has(cls))
  // The template's sample commands give way to the paper's of the same name.
  const ours = new Set(definitions(preamble).map(d => d.name))
  const clashes = definitions(tplPreamble).filter(d => ours.has(d.name) && !d.name.startsWith('env:'))
  for (const d of clashes) edits.push({ start: docClass.end + d.start, end: docClass.end + d.end, text: '' })
  if (clashes.length) notes.push({ level: 'info', text: `The paper's definitions replace the template's: ${clashes.map(d => d.name.replace(/^env:/, '')).join(', ')}.` })
  // After the template's packages, before its own front matter in the preamble.
  const packageHits = ['usepackage', 'RequirePackage'].flatMap(name => findMacros(m, src, name, { opts: 1, args: 1 }, docClass.end, begin)).sort((a, b) => a.start - b.start)
  // hyperref stays the last package: the paper's go before the template loads it.
  const hyperrefHit = packageHits.find(h => /\bhyperref\b/.test(h.args[0]?.inner ?? ''))
  const insertAt = hyperrefHit ? hyperrefHit.start : (packageHits.at(-1)?.end ?? docClass.end)
  const packageLines = kept.map(p => (p.name === 'amssymb' && mathFont ? '\\let\\Bbbk\\relax\n\\usepackage{amssymb}' : `\\usepackage{${p.name}}`))
  if (CLASS_FIXES[cls]) preamble = `${CLASS_FIXES[cls]}\n${preamble}`
  // amsthm's \\qedhere and \\qed where the class has no amsthm.
  if (NO_AMSTHM.has(cls) && /\\qed(?:here)?\b/.test(anyText)) preamble = `\\providecommand{\\qedhere}{}\n\\providecommand{\\qed}{\\hfill\\rule{1ex}{1ex}}\n${preamble}`
  if (keepBiblatex && paper.bibliography.kind !== 'none') {
    const bibs = paper.bibliography.kind === 'bibtex' || paper.bibliography.kind === 'biblatex' ? paper.bibliography.files : []
    // The template's sample resource gives way to the paper's.
    for (const r of resources) edits.push({ start: r.start, end: r.end, text: '' })
    packageLines.push(...bibs.map(f => `\\addbibresource{${f}.bib}`))
  }
  if (packageLines.length) edits.push({ start: insertAt, end: insertAt, text: `\n\n% ---- The paper's packages (ColTex) ----\n${packageLines.join('\n')}\n${hyperrefHit ? '\n' : ''}` })
  // The paper's definitions last: after the template's own (a \newtheorem{lemma}[theorem] needs its theorem).
  if (preamble.trim()) edits.push({ start: begin, end: begin, text: `% ---- The paper's definitions (ColTex) ----\n${preamble.trim()}\n\n` })

  // ---- the body, with the template's acknowledgments and references ----
  const natbib = !tplBiblatex && !NO_NATBIB.has(cls) && (classLoads.has('natbib') || kept.some(p => p.name === 'natbib') || classOptions.some(o => /natbib/.test(o)))
  const twoColumn = classOptions.includes('twocolumn') || (!classOptions.includes('onecolumn') && (known?.twoColumn ?? false))
  const listPackage = paper.packages.some(p => ['enumitem', 'enumerate', 'paralist'].includes(p.name))
  const ctx = { natbib: natbib || tplBiblatex, keepCitations: tplBiblatex, twoColumn, family: cls, dropListWidths: WIDEST_LABEL_LISTS.has(paper.sourceClass) && !WIDEST_LABEL_LISTS.has(cls) && !listPackage }
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
  if (total.citations) notes.push({ level: 'info', text: `Adapted ${total.citations} citation command(s) to ${natbib ? 'natbib' : '\\cite'}.` })
  if (total.lostCiteDetail) notes.push({ level: 'warning', text: `${total.lostCiteDetail} citation(s) used author/year forms or a prenote that ${cls}'s numeric style can't show; check the wording around them.` })
  if (total.figureWidths) notes.push({ level: 'info', text: `Changed ${total.figureWidths} \\textwidth to \\columnwidth inside single-column figures and tables (two-column layout).` })
  if (toBibtex || paper.bibliography.kind === 'bibtex') {
    for (const [path, text] of Object.entries(project.bibFiles)) {
      const b = bibtexCompatible(text)
      if (b.changed) files[path] = b.text
    }
  }
  if (tplBiblatex && /\\[Cc]ite(?:t|p|alp|alt|author|year)\b/.test(anyText)) {
    passOptions.push('\\PassOptionsToPackage{natbib=true}{biblatex}')
    notes.push({ level: 'info', text: 'The template uses biblatex; its natbib option keeps the paper\'s \\citet and \\citep.' })
  }

  let bibBlock = ''
  if (paper.bibliography.kind === 'bibtex' || toBibtex) {
    const bibs = paper.bibliography.kind === 'bibtex' || paper.bibliography.kind === 'biblatex' ? paper.bibliography.files : []
    if (keepBiblatex) bibBlock = '\\printbibliography'
    else {
      // A template with \bibliography but no style leaves it to its class (Springer Nature's options).
      const style = options.bibStyle ?? tplStyle ?? (tplHasBib ? undefined : known?.bibStyle ?? (paper.bibliography.kind === 'bibtex' ? paper.bibliography.style : undefined) ?? 'plain')
      bibBlock = `${style ? `\\bibliographystyle{${style}}\n` : ''}\\bibliography{${bibs.join(',')}}`
    }
  } else if (paper.bibliography.kind === 'biblatex' && keepBiblatex) bibBlock = '\\printbibliography'
  const ackBlock = paper.acknowledgments ? acknowledgmentsForm(m, src, bodyStart, end)(paper.acknowledgments) : ''
  let text = body.text
  text = text.includes(ACK_MARK) ? text.replace(ACK_MARK, ackBlock) : text
  if (text.includes(BIB_MARK)) text = text.replace(BIB_MARK, `${!body.text.includes(ACK_MARK) && ackBlock ? `${ackBlock}\n\n` : ''}${bibBlock}`)
  else {
    if (!body.text.includes(ACK_MARK) && ackBlock) text += `\n\n${ackBlock}`
    if (bibBlock) text += `\n\n${bibBlock}`
  }
  // The template's sample sections, references and back matter give way to the paper's.
  edits.push({ start: frontEnd, end, text: `\n\n${text.trim()}\n\n` })

  if (passOptions.length) edits.push({ start: docClass.start, end: docClass.start, text: `${passOptions.join('\n')}\n` })
  const main = apply(src, edits).replace(/\n{4,}/g, '\n\n\n')
  files[project.rootFile] = `% Converted into the template ${template.name} by ColTex from ${paper.sourceClass}. Check the conversion report.\n${main}`

  // ---- the template's files: its main file stays as a sample beside the paper ----
  const templateFiles: Record<string, string> = {}
  const taken = new Set([project.rootFile, ...Object.keys(project.texFiles), ...Object.keys(project.bibFiles)])
  for (const p of template.paths) {
    if (p === template.rootFile) {
      const stem = p.replace(/\.tex$/, '')
      let to = taken.has(p) ? `${stem}-template.tex` : p
      for (let n = 2; taken.has(to); n++) to = `${stem}-template-${n}.tex`
      templateFiles[p] = to
      if (to !== p) notes.push({ level: 'info', text: `The template's sample ${p} is kept as ${to}.` })
    } else if (!taken.has(p)) templateFiles[p] = p
  }
  const SLOTS = new Set(['abstract', 'keywords', 'keyword', 'IEEEkeywords', 'frontmatter', 'affiliations', 'document'])
  const placeholders = [...new Set([...m.slice(0, frontEnd).matchAll(/\\begin\{([a-zA-Z]+\*?)\}/g)].map(x => x[1]!).filter(e => !SLOTS.has(e)))]
  if (placeholders.length) notes.push({ level: 'warning', text: `The template's front matter also has ${placeholders.join(', ')}, still with its sample text: fill ${placeholders.length > 1 ? 'them' : 'it'} in.` })
  const frontConfig = ['journal', 'journaltitle', 'jyear', 'received', 'revised', 'accepted', 'acmConference', 'acmJournal', 'DOI', 'volume', 'pubyear', 'firstpage']
    .filter(n => findMacros(m, src, n, {}, 0, frontEnd).length)
  if (frontConfig.length) notes.push({ level: 'info', text: `The template's publication details are kept as it has them: ${frontConfig.map(n => `\\${n}`).join(', ')}.` })
  return { files, rootFile: project.rootFile, notes, templateFiles, documentClass: cls }
}

import { clean, cut, findEnvs, findMacros, mask, readGroup, splitTop, unbrace, type Group } from './scan.ts'
import type { Affiliation, Author, AuthorStyle, Bibliography, Paper, TargetOptions, UsedPackage } from './types.ts'

export class ConvertError extends Error {}

/** Where the bibliography and acknowledgments were, so the target puts its own versions there. */
export const BIB_MARK = '%%COLTEX:BIBLIOGRAPHY%%'
export const ACK_MARK = '%%COLTEX:ACKNOWLEDGMENTS%%'

/** Commands that only configure a particular class's front matter; dropped on conversion. */
const FRONT_CONFIG = [
  // general
  'date', 'maketitle', 'titlerunning', 'authorrunning', 'shorttitle',
  // IEEEtran
  'IEEEpeerreviewmaketitle', 'IEEEoverridecommandlockouts', 'IEEEdisplaynontitleabstractindextext', 'markboth',
  // acmart
  'acmConference', 'acmBooktitle', 'acmYear', 'acmDOI', 'acmISBN', 'acmPrice', 'acmSubmissionID', 'acmJournal',
  'acmVolume', 'acmNumber', 'acmArticle', 'acmMonth', 'acmArticleSeq', 'setcopyright', 'copyrightyear',
  'ccsdesc', 'settopmatter', 'received', 'citestyle', 'acmBadge',
  // elsarticle
  'journal', 'cortext', 'fntext',
  // revtex; Springer Nature (\pacs[JEL Classification]{..})
  'pacs',
  // Elsevier CAS
  'shortauthors', 'cormark', 'fnmark', 'credit', 'tnotemark', 'tnotetext', 'nonumnote',
  // BMC
  'dochead', 'startlocaldefs', 'endlocaldefs',
  // OUP
  'journaltitle', 'DOI', 'pubyear', 'access', 'appnotes', 'firstpage', 'authormark', 'revised', 'accepted', 'editor', 'vol', 'issue', 'corresp',
  // AMS classes
  'subjclass', 'dedicatory', 'curraddr', 'urladdr',
  // jmlr (PMLR, JMLR)
  'jmlrvolume', 'jmlryear', 'jmlrworkshop', 'jmlrpages', 'jmlrproceedings', 'jmlrsubmitted', 'jmlrpublished', 'jmlrheading', 'ShortHeadings', 'editors',
  // apa7 (volume: its journal layout)
  'leftheader', 'authornote', 'course', 'professor', 'duedate', 'note', 'volume',
  // mnras, AASTeX, achemso, nrc2, spie, aiaa-tc, asmeconf, jacow
  'pagerange', 'correspondingauthor', 'submitjournal', 'abbreviations', 'correspond', 'authorinfo', 'AIAAconference', 'AIAAcopyright',
  'ConfName', 'ConfDate', 'ConfCity', 'ConfAcronym', 'PaperNo',
]

/** Commands with their argument counts, as [name, optional, mandatory]. */
const ARGS: Record<string, [number, number]> = {
  date: [0, 1], titlerunning: [0, 1], authorrunning: [0, 1], shorttitle: [0, 1],
  markboth: [0, 2], acmConference: [1, 3], acmBooktitle: [0, 1], acmYear: [0, 1], acmDOI: [0, 1], acmISBN: [0, 1],
  acmPrice: [0, 1], acmSubmissionID: [0, 1], acmJournal: [0, 1], acmVolume: [0, 1], acmNumber: [0, 1],
  acmArticle: [0, 1], acmMonth: [0, 1], acmArticleSeq: [0, 1], setcopyright: [0, 1], copyrightyear: [0, 1],
  ccsdesc: [1, 1], settopmatter: [0, 1], received: [1, 3], citestyle: [0, 1], acmBadge: [1, 1], journal: [0, 1],
  cortext: [1, 1], fntext: [1, 1], pacs: [1, 1],
  shortauthors: [0, 1], cormark: [1, 0], fnmark: [1, 0], credit: [0, 1], tnotemark: [1, 0], tnotetext: [1, 1], nonumnote: [0, 1],
  subjclass: [1, 1], dedicatory: [0, 1], curraddr: [0, 1], urladdr: [0, 1],
  jmlrvolume: [0, 1], jmlryear: [0, 1], jmlrworkshop: [0, 1], jmlrpages: [0, 1], jmlrproceedings: [0, 2], jmlrsubmitted: [0, 1], jmlrpublished: [0, 1],
  jmlrheading: [0, 7], ShortHeadings: [0, 2], editors: [0, 1],
  leftheader: [0, 1], authornote: [0, 1], course: [0, 1], professor: [0, 1], duedate: [0, 1], note: [0, 1], volume: [0, 1],
  pagerange: [0, 1], correspondingauthor: [0, 1], submitjournal: [0, 1], abbreviations: [0, 1], correspond: [0, 1], authorinfo: [0, 1],
  AIAAconference: [0, 1], AIAAcopyright: [0, 1], ConfName: [0, 1], ConfDate: [0, 1], ConfCity: [0, 1], ConfAcronym: [0, 1], PaperNo: [0, 1],
  dochead: [0, 1],
  journaltitle: [0, 1], DOI: [0, 1], pubyear: [0, 1], access: [0, 1], appnotes: [0, 1], firstpage: [0, 1], authormark: [0, 1],
  // acmart: \received[stage]{date}; OUP: \received{day}{month}{year}.
  revised: [0, 3], accepted: [0, 3], editor: [0, 1], vol: [0, 1], issue: [0, 1], corresp: [1, 1],
}

const COUNTRIES = new Set(
  [
    'china', 'p. r. china', 'p.r. china', 'pr china', 'usa', 'u.s.a.', 'united states', 'united states of america', 'uk',
    'united kingdom', 'germany', 'france', 'japan', 'korea', 'south korea', 'republic of korea', 'singapore', 'canada',
    'australia', 'italy', 'spain', 'netherlands', 'the netherlands', 'switzerland', 'sweden', 'india', 'hong kong',
    'hong kong sar', 'taiwan', 'macau', 'israel', 'austria', 'belgium', 'denmark', 'finland', 'norway', 'portugal',
    'brazil', 'russia', 'new zealand', 'ireland', 'greece', 'poland', 'czech republic', 'saudi arabia', 'uae',
    'united arab emirates', 'mexico', 'turkey', 'iran', 'egypt', 'south africa', 'chile', 'argentina', 'malaysia',
    'thailand', 'vietnam', 'indonesia', 'pakistan', '中国', '中国香港', '日本', '新加坡', '美国', '英国',
  ],
)
const DEPARTMENT_RE = /\b(dep(?:t|artment)|school|faculty|division|lab(?:oratory)?|college of|center|centre|group)\b|学院|系|实验室|研究中心/i
const INSTITUTION_RE = /universit|institut|college|academy|polytechnic|\blabs?\b|\binc\b|corp|\bltd\b|gmbh|hospital|大学|研究院|研究所|公司|医院/i

/** Best-effort structure for an affiliation written as free text. */
export function structureAffiliation(raw: string): Omit<Affiliation, 'id' | 'raw'> {
  const parts = raw
    .split(/\s*,\s*/)
    .map(p => p.trim())
    .filter(Boolean)
  const out: Omit<Affiliation, 'id' | 'raw'> = {}
  if (parts.length && COUNTRIES.has(parts.at(-1)!.toLowerCase().replace(/\.$/, ''))) out.country = parts.pop()!.replace(/\.$/, '')
  const dept = parts.findIndex(p => DEPARTMENT_RE.test(p) && !INSTITUTION_RE.test(p.replace(/institute of .*/i, '')))
  if (dept !== -1) out.department = parts[dept]
  const inst = parts.findIndex((p, i) => i !== dept && INSTITUTION_RE.test(p))
  const instIndex = inst !== -1 ? inst : parts.findIndex((_, i) => i !== dept)
  if (instIndex !== -1) out.institution = parts[instIndex]
  // The city is usually the last remaining part (postal codes stripped).
  const rest = parts.filter((_, i) => i !== dept && i !== instIndex)
  // A country we don't know still comes last after a city ("…, Nairobi, Kenya"),
  // but not a state code or a postal code ("…, Stanford, CA 94305").
  if (!out.country && rest.length >= 2 && !/\d/.test(rest.at(-1)!) && !/^[A-Z]{2,3}$/.test(rest.at(-1)!)) out.country = rest.pop()!.replace(/\.$/, '')
  const city = rest.at(-1)?.replace(/\b\d{4,6}\b/g, '').trim()
  if (city && !/\d/.test(city) && city.length < 40) out.city = city
  return out
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/

/** Pull an email out of a line written as plain text, \texttt, \href{mailto:} or \email. */
function emailIn(line: string): string | undefined {
  return clean(line).match(EMAIL_RE)?.[0]
}

/** An email in an address line, with the markup around it (\\texttt, \\href{mailto:}, \\email, "E-mail:"). */
const EMAIL_MARKUP = /(?:e-?mail\s*:?\s*)?(?:\\(?:texttt|email|url|href)\s*\{(?:mailto:)?[^{}]*@[^{}]*\}(?:\{[^{}]*\})?|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gi

/**
 * Split emails out of an affiliation's lines: authblk and similar
 * affiliations often carry the author's address on a line of its own, and an
 * email left in would be taken for the city (and breaks elsarticle's
 * key=value affiliation).
 */
function takeEmails(ls: string[]): { lines: string[]; emails: string[] } {
  const emails: string[] = []
  const rest: string[] = []
  for (const l of ls) {
    for (const e of clean(l).matchAll(new RegExp(EMAIL_RE.source, 'g'))) emails.push(e[0])
    const left = l.replace(EMAIL_MARKUP, '').replace(/^[\s,;]+|[\s,;]+$/g, '')
    if (left) rest.push(left)
  }
  return { lines: rest, emails }
}

/** Give the authors of one affiliation the emails written into it, when it's clear whose they are. */
function assignEmails(owners: Author[], emails: string[]): boolean {
  if (!emails.length) return true
  if (!owners.length || (owners.length > 1 && owners.length !== emails.length)) return false
  owners.forEach((a, i) => {
    if (!a.email && emails[i]) a.email = emails[i]
  })
  return true
}

/** Drop font and size switches that only styled the front matter (\textit{x} → x). */
export function plain(s: string): string {
  let out = s
  for (let i = 0; i < 3; i++) out = out.replace(/\\(?:textit|textbf|textrm|textsf|textsc|textup|emph|mbox)\{([^{}]*)\}/g, '$1')
  return clean(out.replace(/\\(?:it|bf|rm|sf|sc|em|small|footnotesize|scriptsize|normalsize|large|Large|centering|upshape|itshape|bfseries)\b\s*/g, ''))
}

/**
 * An author's name without affiliation markers (\textsuperscript{1},
 * $^{1,*}$, \footnotemark) and with the name parts that Springer Nature, OUP
 * and BMC classes tag (\fnm{Jane} \spfx{van der} \sur{Berg}, \snm, \inits)
 * written out; a degree (\dgr{MD}) follows after a comma.
 */
function cleanName(s: string): string {
  return plain(
    s
      .replace(/\\textsuperscript\{[^}]*\}/g, '')
      .replace(/\$\^\{?[^$]*\}?\$/g, '')
      .replace(/\\(?:footnotemark|IEEEauthorrefmark|thanksref|corref|fnref|cormark|ORCID|orcidlink|inits)(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, '')
      .replace(/\\dgr\s*\{([^{}]*)\}/g, ', $1')
      .replace(/\\(?:fnm|sur|snm|spfx|sfx|tanm|particle)\s*\{([^{}]*)\}/g, '$1'),
  )
    .replace(/\s+,/g, ',')
    .replace(/[\s,]+$/, '')
}

/** An ORCID given inside a name (OUP's \ORCID{..}, \orcidlink{..}). */
function orcidIn(s: string): string | undefined {
  return s.match(/\\(?:ORCID|orcidlink)\s*\{([^{}]*)\}/)?.[1]?.trim() || undefined
}

function lines(s: string): string[] {
  return (
    splitTop(s, '\\\\')
      // A line set in a group of its own with a font switch ({\normalsize\itshape University, City}),
      // not a braced name ({Jane Doe, MD}) that must stay whole.
      .map(l => {
        const p = plain(l)
        return /^\s*\{\s*\\[a-zA-Z]/.test(l) && /^\{[^{}]*\}$/.test(p) ? p.slice(1, -1).trim() : p
      })
      .filter(Boolean)
  )
}

/** Remove a macro (with its arguments) from a string, returning the arguments of each hit. */
function takeMacro(s: string, name: string, opts: number, args: number): { rest: string; hits: { opts: string[]; args: string[] }[] } {
  const m = mask(s)
  const found = findMacros(m, s, name, { opts, args })
  return {
    rest: cut(s, found),
    hits: found.map(h => ({ opts: h.opts.map(o => o.inner), args: h.args.map(a => a.inner) })),
  }
}

class AffiliationTable {
  readonly list: Affiliation[] = []
  /** Add (or find) an affiliation by its text. */
  add(raw: string, structured?: Omit<Affiliation, 'id' | 'raw'>): string {
    const text = raw.replace(/\s+/g, ' ').trim()
    const existing = this.list.find(a => a.raw.toLowerCase() === text.toLowerCase())
    if (existing) return existing.id
    const id = `a${this.list.length + 1}`
    this.list.push({ id, raw: text, ...(structured ?? structureAffiliation(text)) })
    return id
  }
}

/** acmart's \affiliation{\institution{..}\department{..}\city{..}\country{..}}. */
function acmAffiliation(inner: string): { raw: string; structured: Omit<Affiliation, 'id' | 'raw'> } {
  const m = mask(inner)
  const get = (name: string) => {
    const hit = findMacros(m, inner, name, { args: 1 })[0]
    return hit?.args[0] ? clean(hit.args[0].inner) : undefined
  }
  const structured = {
    department: get('department'),
    institution: get('institution'),
    city: get('city'),
    country: get('country'),
  }
  const parts = [structured.department, structured.institution, get('streetaddress'), structured.city, get('state'), get('postcode'), structured.country]
  return { raw: parts.filter(Boolean).join(', '), structured }
}

/** elsarticle's key=value affiliation: organization={..}, city={..}, country={..}. */
function keyvalAffiliation(inner: string): { raw: string; structured: Omit<Affiliation, 'id' | 'raw'> } | undefined {
  if (!/\b(organization|addressline|city|country|postcode)\s*=/.test(inner)) return undefined
  const kv: Record<string, string> = {}
  for (const part of splitTop(inner, ',')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    kv[part.slice(0, eq).trim().toLowerCase()] = clean(unbrace(part.slice(eq + 1)))
  }
  const org = kv.organization ?? ''
  const [dept, inst] = org.includes(',') ? [org.split(',')[0]!.trim(), org.split(',').slice(1).join(',').trim()] : [undefined, org]
  const structured = { department: dept, institution: inst || undefined, city: kv.city, country: kv.country }
  const raw = [org, kv.addressline, kv.city, kv.postcode, kv.state, kv.country].filter(Boolean).join(', ')
  return { raw, structured }
}

/** The parts of a tagged affiliation (BMC writes \\cny for the country). */
const AFFILIATION_TAGS = ['orgdiv', 'orgname', 'orgaddress', 'street', 'city', 'postcode', 'state', 'country', 'cny']

/**
 * A tagged affiliation as text, in the order it was written: each part's text where its tag
 * was, and what was written between the tags kept (an institution or an address that has no
 * tag of its own, as OUP's samples allow). `loose` is only the text outside every tag.
 */
function untagged(s: string): { text: string; loose: string } {
  const m = mask(s)
  const hits = AFFILIATION_TAGS.flatMap(name => findMacros(m, s, name, { args: 1 }))
    .filter(h => h.args[0])
    .sort((a, b) => a.start - b.start)
  let text = ''
  let loose = ''
  let from = 0
  for (const h of hits) {
    // Parts inside another (\city in \orgaddress) come with it.
    if (h.start < from) continue
    text += `${s.slice(from, h.start)}, ${untagged(h.args[0]!.inner).text}, `
    loose += `${s.slice(from, h.start)}, `
    from = h.end
  }
  return { text: text + s.slice(from), loose: loose + s.slice(from) }
}

/** Comma-separated text with each part trimmed and empty ones (from tags side by side) left out. */
const commaList = (s: string) =>
  plain(s.replace(/\\email\s*\{[^{}]*\}/g, '').replace(/\\\\|\\newline\b/g, ','))
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)

/**
 * Springer Nature, OUP and BMC affiliations, tagged part by part:
 * \orgdiv{..}, \orgname{..}, \orgaddress{\street{..}, \city{..}, \postcode{..}, \state{..}, \country{..}}
 * (BMC: \cny for the country).
 */
function taggedAffiliation(inner: string): { raw: string; structured: Omit<Affiliation, 'id' | 'raw'> } | undefined {
  if (!/\\(?:orgname|orgdiv|orgaddress)\b/.test(inner)) return undefined
  const m = mask(inner)
  const get = (...names: string[]) => {
    for (const name of names) {
      const hit = findMacros(m, inner, name, { args: 1 })[0]
      const text = hit?.args[0] ? plain(hit.args[0].inner).replace(/^[\s,]+|[\s,]+$/g, '') : ''
      if (text) return text
    }
    return undefined
  }
  const { text, loose } = untagged(inner)
  const structured = {
    department: get('orgdiv'),
    // An institution written without \orgname: the text between the tags.
    institution: get('orgname') ?? commaList(loose)[0],
    city: get('city'),
    country: get('country', 'cny'),
  }
  return { raw: commaList(text).join(', '), structured }
}

/** One affiliation in whatever form it was written: acmart's fields, key=value, tagged parts, or text lines. */
function affiliationEntry(inner: string): { raw: string; structured?: Omit<Affiliation, 'id' | 'raw'>; emails: string[] } {
  const acm = /\\(institution|country|city)\b/.test(inner) && !/\\(?:orgname|orgdiv|orgaddress)\b/.test(inner) ? acmAffiliation(inner) : undefined
  const tagged = acm ? undefined : (keyvalAffiliation(inner) ?? taggedAffiliation(inner))
  if (acm || tagged) {
    // An email written into a tagged affiliation (\orgaddress{..}, \email{..}) is still the author's.
    const emails = [...clean(inner).matchAll(new RegExp(EMAIL_RE.source, 'g'))].map(e => e[0])
    return { ...(acm ?? tagged)!, emails }
  }
  const text = takeEmails(lines(inner))
  return { raw: text.lines.join(', '), emails: text.emails }
}

/** Find front-matter hits in order: [kind, hit] for the sequence-style classes (acmart, revtex, amsart). */
type Hit = { kind: string; start: number; end: number; opts: Group[]; args: Group[] }

function sequenceAuthors(m: string, src: string, to: number, table: AffiliationTable): { authors: Author[]; ranges: Hit[] } {
  const kinds: [string, number, number][] = [
    ['author', 1, 1],
    ['affiliation', 1, 1],
    ['address', 1, 1],
    ['email', 0, 1],
    ['orcid', 0, 1],
    ['additionalaffiliation', 0, 1],
    ['altaffiliation', 1, 1],
    ['affil', 1, 1],
    ['thanks', 0, 1],
  ]
  const hits: Hit[] = []
  for (const [kind, o, a] of kinds) {
    for (const h of findMacros(m, src, kind, { opts: o, args: a }, 0, to)) hits.push({ kind, ...h })
  }
  hits.sort((a, b) => a.start - b.start)
  // Drop hits nested inside an \author{...} argument (e.g. \thanks inside it).
  const top = hits.filter(h => !hits.some(o => o !== h && o.kind === 'author' && o.start < h.start && h.end <= o.end))

  const authors: Author[] = []
  let pending: Author[] = [] // authors waiting for an affiliation
  for (const h of top) {
    const arg = h.args[0]?.inner ?? ''
    if (h.kind === 'author') {
      const { rest, hits: thanks } = takeMacro(arg, 'thanks', 0, 1)
      const author: Author = { name: cleanName(rest), affiliations: [] }
      if (thanks.length) author.note = thanks.map(t => clean(t.args[0] ?? '')).join(' ')
      authors.push(author)
      if (pending.length && pending.every(p => p.affiliations.length)) pending = []
      pending.push(author)
    } else if (h.kind === 'affiliation' || h.kind === 'address' || h.kind === 'additionalaffiliation' || h.kind === 'altaffiliation') {
      const entry = affiliationEntry(arg)
      const id = table.add(entry.raw, entry.structured)
      const targets = pending.length ? pending : authors.slice(-1)
      for (const a of targets) if (!a.affiliations.includes(id)) a.affiliations.push(id)
      assignEmails(targets, entry.emails)
    } else if (h.kind === 'email') {
      const last = authors.at(-1)
      if (last && !last.email) last.email = clean(arg)
    } else if (h.kind === 'orcid') {
      const last = authors.at(-1)
      if (last) last.orcid = clean(arg)
    } else if (h.kind === 'thanks') {
      const last = authors.at(-1)
      if (last) last.note = [last.note, clean(arg)].filter(Boolean).join(' ')
    }
  }
  return { authors, ranges: top }
}

/** Several names on one line: "A, B and C". A braced name keeps its comma ("{Jane Doe, MD}"). */
function splitNames(line: string): string[] {
  return splitTop(line, ',')
    .flatMap(part => part.split(/^\s*and\s+|\s+and\s+/))
    .map(n => unbrace(n.trim()))
    .filter(Boolean)
}

/** \author{A \and B} with "\\"-separated lines (article, report, many others). */
function blockAuthors(arg: string, table: AffiliationTable): Author[] {
  return splitTop(arg, '\\and').flatMap(part => {
    const { rest, hits: thanks } = takeMacro(part, 'thanks', 0, 1)
    const ls = lines(rest)
    if (!ls.length) return []
    const [nameLine, ...others] = ls
    const emails = others.map(emailIn)
    const affLines = others.filter((_, i) => !emails[i])
    // Several names on one line ("A, B and C") share the affiliation.
    const names = splitNames(nameLine!)
    const affId = affLines.length ? table.add(affLines.join(', ')) : undefined
    return names.map((name, i) => ({
      name: cleanName(name),
      affiliations: affId ? [affId] : [],
      email: names.length === 1 ? emails.find(Boolean) : undefined,
      note: i === 0 && thanks.length ? thanks.map(t => clean(t.args[0] ?? '')).join(' ') : undefined,
    }))
  })
}

/** IEEEtran conference: \IEEEauthorblockN{..}\IEEEauthorblockA{..} pairs; journal: names with \thanks. */
function ieeeAuthors(arg: string, table: AffiliationTable): Author[] {
  if (!arg.includes('\\IEEEauthorblockN')) {
    let rest = arg
    rest = takeMacro(rest, 'IEEEmembership', 0, 1).rest
    const { rest: noThanks, hits: thanks } = takeMacro(rest, 'thanks', 0, 1)
    const names = splitNames(clean(noThanks).replace(/\\IEEEauthorrefmark\{[^}]*\}/g, ''))
    const note = thanks.map(t => clean(t.args[0] ?? '')).join(' ')
    return names.map((name, i) => ({ name: cleanName(name), affiliations: [], note: i === 0 && note ? note : undefined }))
  }
  return splitTop(arg, '\\and').flatMap(part => {
    const m = mask(part)
    const n = findMacros(m, part, 'IEEEauthorblockN', { args: 1 })
    const a = findMacros(m, part, 'IEEEauthorblockA', { args: 1 })
    const names = n.flatMap(h => lines(h.args[0]?.inner ?? '').flatMap(splitNames))
      .map(s => s.replace(/\\IEEEauthorrefmark\{[^}]*\}/g, '').replace(/\$\^\{?[\w,*†‡]+\}?\$/g, '').trim())
      .filter(Boolean)
    const affLines = a.flatMap(h => lines(h.args[0]?.inner ?? ''))
    const email = affLines.map(emailIn).find(Boolean)
    const rest = affLines.filter(l => !emailIn(l)).map(l => l.replace(/^\\textit\{(.*)\}$/, '$1'))
    const affId = rest.length ? table.add(rest.join(', ')) : undefined
    return names.map(name => ({ name: cleanName(name), affiliations: affId ? [affId] : [], email: names.length === 1 ? email : undefined }))
  })
}

/** jmlr (PMLR, JMLR): \author{\Name{A} \Email{a@x}\\ \addr Dept, University \AND \Name{B} …}. */
function jmlrAuthors(arg: string, table: AffiliationTable): Author[] {
  return splitTop(arg.replace(/\\(?:AND|And)(?![a-zA-Z])/g, '\\and'), '\\and').flatMap(part => {
    const m = mask(part)
    const names = findMacros(m, part, 'Name', { args: 1 }).map(h => cleanName(h.args[0]?.inner ?? '')).filter(Boolean)
    if (!names.length) return []
    const email = findMacros(m, part, 'Email', { args: 1 })[0]?.args[0]?.inner.trim()
    const addr = part.match(/\\addr(?![a-zA-Z])([\s\S]*)$/)?.[1]
    const affLines = addr ? lines(addr) : []
    const affId = affLines.length ? table.add(affLines.join(', ')) : undefined
    return names.map(name => ({ name, affiliations: affId ? [affId] : [], email: names.length === 1 ? email || undefined : undefined }))
  })
}

/** apa7: \authorsnames[1,2]{A, B} with \authorsaffiliations{{I1}, {I2}}. */
function apaAuthors(m: string, src: string, to: number, table: AffiliationTable): { authors: Author[]; ranges: { start: number; end: number }[] } {
  const names = findMacros(m, src, 'authorsnames', { opts: 1, args: 1 }, 0, to)[0]
  const affs = findMacros(m, src, 'authorsaffiliations', { args: 1 }, 0, to)[0]
  if (!names) return { authors: [], ranges: [] }
  const ids = splitTop(affs?.args[0]?.inner ?? '', ',')
    .map(a => unbrace(a.trim()))
    .filter(Boolean)
    .map(a => table.add(plain(a)))
  // [1,2] gives each author's affiliation, [{1,2},3] several; without it all share the first.
  const keys = names.opts[0] ? splitTop(names.opts[0].inner, ',').map(k => unbrace(k.trim()).split(',').map(n => Number(n.trim()))) : []
  const authors = splitTop(names.args[0]?.inner ?? '', ',')
    .map(n => cleanName(unbrace(n.trim())))
    .filter(Boolean)
    .map((name, i) => ({ name, affiliations: (keys[i] ?? [1]).map(k => ids[k - 1]).filter((x): x is string => !!x) }))
  return { authors, ranges: affs ? [names, affs] : [names] }
}

/** An affiliation mark: $^{1,2}$, \textsuperscript{a}, \supit{a} or ^{1}, with its keys. */
const MARK = /\$\^\{?([^${}]*)\}?\$|\\textsuperscript\s*\{([^{}]*)\}|\\supit\s*\{([^{}]*)\}/g

function marksOf(s: string): string[] {
  return [...s.matchAll(MARK)].flatMap(m => (m[1] ?? m[2] ?? m[3] ?? '').split(',')).map(k => k.trim()).filter(k => k && !/^[*∗†‡§]$|\\ast|\\dagger/.test(k))
}

/**
 * Names marked with affiliation keys, and affiliations headed by the same keys
 * (mnras, Nature, SPIE, JPSJ): "A$^{1}$, B$^{1,2}$ \& C$^{2}$" with
 * "$^{1}$Dept…" lines. Unmarked affiliation lines are numbered in order.
 */
function markedAuthors(namesPart: string, affLines: string[], table: AffiliationTable): Author[] {
  const keyed = new Map<string, string>()
  affLines.forEach((line, i) => {
    const lead = line.match(/^\s*(?:\$\^\{?([^${}]*)\}?\$|\\textsuperscript\s*\{([^{}]*)\}|\\supit\s*\{([^{}]*)\})/)
    const key = (lead?.[1] ?? lead?.[2] ?? lead?.[3] ?? String(i + 1)).trim()
    const text = plain(line.slice(lead ? lead[0].length : 0)).replace(/[;.]\s*$/, '').trim()
    if (text) keyed.set(key, table.add(text))
  })
  const { rest, hits: thanks } = takeMacro(namesPart, 'thanks', 0, 1)
  // "First Author,$^{1}$" (MNRAS): the mark after the comma is still the name's, and a mark
  // ends a name ("A$^{1}$ B$^{2}$" on lines of their own).
  const separated = rest
    .replace(/,\s*(?=\$\^|\\textsuperscript|\\supit)/g, '')
    .replace(MARK, m => `${m},`)
    .replace(/\\(?:&|and)(?![a-zA-Z])/g, ',')
  const names = splitTop(separated, ',')
    .flatMap(part => part.split(/\s+and\s+/))
    .map(s => s.trim())
    .filter(s => plain(s.replace(MARK, '')).length > 1)
  const only = keyed.size === 1 ? [...keyed.values()] : []
  const authors: Author[] = names.map(n => {
    const ids = marksOf(n).map(k => keyed.get(k)).filter((x): x is string => !!x)
    return { name: cleanName(unbrace(n.replace(MARK, '').trim())), affiliations: ids.length ? [...new Set(ids)] : only }
  })
  const emails = thanks.map(t => emailIn(clean(t.args[0] ?? ''))).filter((e): e is string => !!e)
  if (authors[0] && emails[0]) authors[0].email = emails[0]
  return authors
}

/** asmeconf: \SetAuthors{A\affil{1}\CorrespondingAuthor{a@x}, B\affil{2}} with \SetAffiliation{1}{..}. */
function asmeAuthors(m: string, src: string, to: number, table: AffiliationTable): { authors: Author[]; ranges: { start: number; end: number }[] } {
  const set = findMacros(m, src, 'SetAuthors', { args: 1 }, 0, to)[0]
  const affs = findMacros(m, src, 'SetAffiliation', { args: 2 }, 0, to)
  const keyed = new Map(affs.map(a => [clean(a.args[0]?.inner ?? ''), table.add(plain(a.args[1]?.inner ?? ''))]))
  const authors = splitTop(set?.args[0]?.inner ?? '', ',').flatMap(part => {
    const pm = mask(part)
    const keys = findMacros(pm, part, 'affil', { args: 1 }).flatMap(h => clean(h.args[0]?.inner ?? '').split(','))
    const email = findMacros(pm, part, 'CorrespondingAuthor', { args: 1 })[0]?.args[0]?.inner.trim()
    const name = cleanName(part.replace(/\\(?:affil|CorrespondingAuthor)\s*\{[^{}]*\}|\\JointFirstAuthor/g, ''))
    if (!name) return []
    return [{ name, affiliations: keys.map(k => keyed.get(k.trim())).filter((x): x is string => !!x), ...(email ? { email, corresponding: true } : {}) }]
  })
  return { authors, ranges: [...(set ? [set] : []), ...affs] }
}

/** jacow: \author{A\thanks{..}, Laboratory, City, Country\\ B, University, City, Country}: a name, then where. */
function jacowAuthors(arg: string, table: AffiliationTable): Author[] {
  return splitTop(arg, '\\\\').flatMap(line => {
    const { rest, hits: thanks } = takeMacro(line, 'thanks', 0, 1)
    const [name, ...where] = splitTop(rest, ',').map(s => plain(s))
    if (!name) return []
    const email = thanks.map(t => emailIn(clean(t.args[0] ?? ''))).find(Boolean)
    const id = where.length ? table.add(where.join(', ')) : undefined
    return [{ name: cleanName(name), affiliations: id ? [id] : [], ...(email ? { email } : {}) }]
  })
}

/** llncs: \author{A\inst{1}\orcidID{..} \and B\inst{2}} with \institute{I1 \and I2}. */
function lncsAuthors(authorArg: string, instituteArg: string | undefined, table: AffiliationTable): Author[] {
  const institutes = instituteArg
    ? splitTop(instituteArg, '\\and').map(part => {
        const { rest, hits } = takeMacro(part, 'email', 0, 1)
        const noUrl = takeMacro(rest, 'url', 0, 1).rest
        const ls = lines(noUrl).filter(l => !emailIn(l))
        return { id: ls.length ? table.add(ls.join(', ')) : undefined, emails: hits.map(h => clean(h.args[0] ?? '')) }
      })
    : []
  return splitTop(authorArg, '\\and').flatMap(part => {
    const inst = takeMacro(part, 'inst', 0, 1)
    const orcid = takeMacro(inst.rest, 'orcidID', 0, 1)
    const name = cleanName(orcid.rest)
    if (!name) return []
    const nums = inst.hits.flatMap(h => (h.args[0] ?? '').split(',').map(n => Number.parseInt(n.trim(), 10)))
    const affs = (nums.length ? nums : institutes.length === 1 ? [1] : []).flatMap(n => (institutes[n - 1]?.id ? [institutes[n - 1]!.id!] : []))
    const emails = nums.flatMap(n => institutes[n - 1]?.emails ?? [])
    return [{ name, affiliations: affs, orcid: orcid.hits[0] ? clean(orcid.hits[0].args[0] ?? '') : undefined, email: emails.length === 1 ? emails[0] : undefined }]
  })
}

/** authblk: \author[1,2]{Name} \affil[1]{Text}. */
function authblkAuthors(m: string, src: string, to: number, table: AffiliationTable, notes: string[]): { authors: Author[]; ranges: { start: number; end: number }[] } {
  const affils = findMacros(m, src, 'affil', { opts: 1, args: 1 }, 0, to)
  const labels = new Map<string, string>()
  const emails = new Map<string, string[]>()
  affils.forEach((h, i) => {
    const text = takeEmails(lines(h.args[0]?.inner ?? ''))
    const id = table.add(text.lines.join(', '))
    labels.set(h.opts[0]?.inner.trim() ?? String(i + 1), id)
    emails.set(id, [...(emails.get(id) ?? []), ...text.emails])
  })
  const authorHits = findMacros(m, src, 'author', { opts: 1, args: 1 }, 0, to)
  const authors = authorHits.flatMap(h => {
    const keys = (h.opts[0]?.inner ?? '').split(',').map(k => k.trim()).filter(Boolean)
    const ids = keys.flatMap(k => (labels.has(k) ? [labels.get(k)!] : []))
    return blockAuthors(h.args[0]?.inner ?? '', table).map(a => ({ ...a, affiliations: ids.length ? ids : a.affiliations }))
  })
  // authblk without labels: each \affil belongs to the authors before it.
  if (authorHits.every(h => !h.opts.length) && affils.length) {
    for (const a of authors) if (!a.affiliations.length) a.affiliations = [...labels.values()].slice(0, 1)
  }
  for (const [id, list] of emails) {
    if (!assignEmails(authors.filter(a => a.affiliations.includes(id)), list)) {
      notes.push(`Couldn't tell whose email ${list.join(', ')} is; add it to the right author.`)
    }
  }
  return { authors, ranges: [...affils, ...authorHits] }
}

/** Classes whose \author[..] options point at labelled affiliations. */
const LABELLED_CLASSES = ['elsarticle', 'cas-sc', 'cas-dc', 'sn-jnl', 'oup-authoring-template', 'bmcart']

/** key={value} options, as BMC writes them ("addressref={aff1,aff2}, email={..}"). */
function optionValues(opt: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of splitTop(opt, ',')) {
    const eq = part.indexOf('=')
    if (eq !== -1) out[part.slice(0, eq).trim().toLowerCase()] = unbrace(part.slice(eq + 1))
  }
  return out
}

/** A corresponding-author key in an \author[..] list: OUP's $\ast$, or a plain *. */
const CORRESPONDING_KEY = /^(?:\$\\ast\$|\\ast|\*|\$\*\$|\\textasteriskcentered)$/

/**
 * Authors pointing at labelled affiliations: elsarticle and Elsevier CAS
 * (\author[a,b]{Name\corref{c1}}[orcid=..] \cormark[1] \ead{..}
 * \affiliation[a]{organization={..}, ..}), Springer Nature
 * (\author*[1,2]{\fnm{..} \sur{..}}\email{..}\equalcont{..}
 * \affil[1]{\orgdiv{..}, \orgname{..}, \orgaddress{..}}) and OUP
 * (\author[1,$\ast$]{Name\ORCID{..}} \address[1]{..} \corresp[$\ast$]{.. email}).
 * What follows an author up to the next one (\email, \ead, \cormark, \equalcont) is theirs.
 */
function labelledAuthors(m: string, src: string, to: number, table: AffiliationTable, notes: string[]): { authors: Author[]; ranges: { start: number; end: number }[] } | undefined {
  const authorHits = findMacros(m, src, 'author', { opts: 1, args: 1 }, 0, to)
  if (!authorHits.some(h => h.opts.length || h.star)) return undefined
  const affHits = ['affiliation', 'address', 'affil'].flatMap(name => findMacros(m, src, name, { opts: 1, args: 1 }, 0, to)).sort((a, b) => a.start - b.start)
  const labels = new Map<string, string>()
  const affEmails = new Map<string, string[]>()
  for (const h of affHits) {
    const entry = affiliationEntry(h.args[0]?.inner ?? '')
    if (!entry.raw) continue
    const id = table.add(entry.raw, entry.structured)
    const opt = h.opts[0]?.inner ?? ''
    // BMC: \address[id=aff1]{..}
    labels.set(optionValues(opt).id ?? opt.trim(), id)
    affEmails.set(id, [...(affEmails.get(id) ?? []), ...entry.emails])
  }
  const ranges: { start: number; end: number }[] = [...affHits]
  const after = (i: number) => (authorHits[i + 1]?.start ?? to)
  const authors: Author[] = authorHits.map((h, i) => {
    // BMC: \author[addressref={aff1,aff2},corref={aff1},email={..}]{..}
    const opt = h.opts[0]?.inner ?? ''
    const kv = /=/.test(opt) ? optionValues(opt) : undefined
    const keys = (kv ? (kv.addressref ?? '') : opt).split(',').map(k => k.trim()).filter(Boolean)
    let name = h.args[0]?.inner ?? ''
    const corresponding = h.star || /\\corref\b/.test(name) || keys.some(k => CORRESPONDING_KEY.test(k)) || !!kv?.corref
    const orcid = orcidIn(name)
    for (const c of ['corref', 'fnref', 'tnoteref', 'ORCID', 'orcidlink']) name = takeMacro(name, c, 0, 1).rest
    const author: Author = { name: cleanName(name), affiliations: keys.flatMap(k => (labels.has(k) ? [labels.get(k)!] : [])) }
    if (corresponding) author.corresponding = true
    if (orcid) author.orcid = orcid
    if (kv?.email) author.email = clean(kv.email)
    // Elsevier CAS: \author[..]{Name}[orcid=.., ...] carries its details after the name.
    const details = h.args.length ? readGroup(m, src, h.end, '[') : undefined
    if (details && !/\n\s*\n/.test(src.slice(h.end, details.start))) {
      const id = details.inner.match(/\borcid\s*=\s*\{?([0-9X-]{19})\}?/i)?.[1]
      if (id && !author.orcid) author.orcid = id
      ranges.push({ start: h.start, end: details.end })
    } else ranges.push(h)
    const notesOf: string[] = []
    for (const [kind, o, a] of [['email', 0, 1], ['ead', 1, 1], ['cormark', 1, 0], ['equalcont', 0, 1], ['presentaddress', 0, 1]] as const) {
      for (const e of findMacros(m, src, kind, { opts: o, args: a }, h.end, after(i))) {
        if (kind === 'ead' && e.opts[0]?.inner.trim() === 'url') {
          ranges.push(e)
          continue
        }
        if (affHits.some(x => x.start <= e.start && e.end <= x.end)) continue
        const text = clean(e.args[0]?.inner ?? '')
        if ((kind === 'email' || kind === 'ead') && text && !author.email) author.email = text
        if (kind === 'cormark') author.corresponding = true
        if (kind === 'equalcont' && text) notesOf.push(text)
        if (kind === 'presentaddress' && text) notesOf.push(`Present address: ${text}`)
        ranges.push(e)
      }
    }
    if (notesOf.length) author.note = notesOf.join(' ')
    return author
  })
  // One affiliation without labels belongs to everyone who has none.
  if (labels.size === 1 && [...labels.keys()][0] === '') {
    for (const a of authors) if (!a.affiliations.length) a.affiliations = [...labels.values()]
  }
  // OUP: the corresponding author's address is in \corresp[$\ast$]{...}.
  for (const c of findMacros(m, src, 'corresp', { opts: 1, args: 1 }, 0, to)) {
    const email = emailIn(c.args[0]?.inner ?? '')
    const owner = authors.find(a => a.corresponding && !a.email)
    if (email && owner) owner.email = email
    ranges.push(c)
  }
  for (const [id, list] of affEmails) {
    if (!assignEmails(authors.filter(a => a.affiliations.includes(id) && !a.email), list)) {
      notes.push(`Couldn't tell whose email ${list.join(', ')} is; add it to the right author.`)
    }
  }
  return { authors, ranges }
}

function splitKeywords(s: string): string[] {
  // BMC: \kwd{a} \kwd{b}; AASTeX: \uat{Cosmology}{343} --- …; MNRAS: a -- b
  const text = s
    .replace(/\\kwd\s*\{([^{}]*)\}/g, '$1;')
    .replace(/\\uat\s*\{([^{}]*)\}\s*\{[^{}]*\}/g, '$1')
    .replace(/\\(and|sep)\b/g, ';')
    .replace(/\s-{2,3}\s/g, ';')
  return text
    .split(/[;,，；]|\s+·\s+/)
    .map(k => clean(k).replace(/\.$/, ''))
    .filter(Boolean)
}

/** "\textbf{Keywords:} a, b" written by hand (article and friends). */
const MANUAL_KEYWORDS = /(?:\\noindent\s*)?\\(?:textbf|textit|emph|textsc)\{\s*(?:Key\s?words|Index Terms|关键词)\s*[:：.—-]?\s*\}\s*[:：.—-]?\s*([^\n]+)/i

/** Inline \input/\include files that carry front matter, so it can be extracted. */
function inlineFrontMatter(src: string, read?: (path: string) => string | undefined): string {
  if (!read) return src
  const m = mask(src)
  const hits = [...findMacros(m, src, 'input', { args: 1 }), ...findMacros(m, src, 'include', { args: 1 })].sort((a, b) => b.start - a.start)
  let out = src
  for (const h of hits) {
    const name = h.args[0]?.inner.trim()
    if (!name) continue
    const content = read(name.endsWith('.tex') ? name : `${name}.tex`) ?? read(name)
    if (content && /\\(title|author|maketitle)\b|\\begin\{abstract\}/.test(mask(content))) out = out.slice(0, h.start) + content + out.slice(h.end)
  }
  return out
}

/**
 * Read a paper from its main file. `read` resolves other project files (for
 * front matter kept in an \input file).
 */
export function extractPaper(input: string, read?: (path: string) => string | undefined): Paper {
  const src = inlineFrontMatter(input, read)
  const m = mask(src)
  const notes: string[] = []
  const removed: { start: number; end: number }[] = []
  const remove = (r: { start: number; end: number } | undefined) => {
    if (r) removed.push({ start: r.start, end: r.end })
  }

  const docClass = findMacros(m, src, 'documentclass', { opts: 1, args: 1 })[0]
  const sourceClass = docClass?.args[0]?.inner.trim() ?? 'article'
  const classOptions = (docClass?.opts[0]?.inner ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const begin = m.indexOf('\\begin{document}')
  const end = m.lastIndexOf('\\end{document}')
  if (begin === -1 || end === -1) throw new ConvertError('The main file has no \\begin{document} … \\end{document}.')
  const preambleStart = docClass ? docClass.end : 0
  const bodyStart = begin + '\\begin{document}'.length

  // Front matter lives in the preamble and the start of the document, up to the first heading.
  const heading = /\\(?:section|chapter|part)\*?\s*[[{]/g
  heading.lastIndex = bodyStart
  const firstHeading = heading.exec(m)
  const abstractEnv = findEnvs(m, src, 'abstract', {}, bodyStart, end)[0]
  const frontEnd = Math.max(firstHeading ? firstHeading.index : end, abstractEnv ? abstractEnv.end : 0)

  // ---- title ----
  const titleHit = findMacros(m, src, 'title', { opts: 1, args: 1 }, 0, frontEnd)[0]
  const title = titleHit?.args[0] ? clean(titleHit.args[0].inner) : ''
  const shortTitle = titleHit?.opts[0] ? clean(titleHit.opts[0].inner) : findMacros(m, src, 'titlerunning', { args: 1 }, 0, frontEnd)[0]?.args[0]?.inner
  remove(titleHit)
  if (!title) notes.push('No \\title found; fill it in before converting.')

  // ---- authors and affiliations ----
  const table = new AffiliationTable()
  let authors: Author[] = []
  let authorStyle: AuthorStyle = 'none'
  const authorHits = findMacros(m, src, 'author', { opts: 1, args: 1 }, 0, frontEnd)
  if (sourceClass === 'jmlr' || authorHits.some(h => /\\Name\s*\{/.test(h.args[0]?.inner ?? ''))) {
    authorStyle = 'jmlr'
    for (const h of authorHits) {
      authors.push(...jmlrAuthors(h.args[0]?.inner ?? '', table))
      remove(h)
    }
  } else if (findMacros(m, src, 'authorsnames', { opts: 1, args: 1 }, 0, frontEnd).length) {
    const r = apaAuthors(m, src, frontEnd, table)
    authorStyle = 'apa'
    authors = r.authors
    r.ranges.forEach(remove)
  } else if (sourceClass === 'asmeconf' || findMacros(m, src, 'SetAuthors', { args: 1 }, 0, frontEnd).length) {
    const r = asmeAuthors(m, src, frontEnd, table)
    authorStyle = 'asme'
    authors = r.authors
    r.ranges.forEach(remove)
  } else if (sourceClass === 'jacow') {
    authorStyle = 'jacow'
    for (const h of authorHits) {
      authors.push(...jacowAuthors(h.args[0]?.inner ?? '', table))
      remove(h)
    }
  } else if (['mnras', 'spie', 'nature', 'jpsj2'].includes(sourceClass) && authorHits[0]) {
    // Names with marks, then the affiliations those marks point to.
    const arg = authorHits[0].args[0]?.inner ?? ''
    let names = arg
    let affLines: string[] = []
    if (sourceClass === 'spie') {
      const at = arg.search(/\\skiplinehalf(?![a-zA-Z])/)
      if (at !== -1) {
        names = arg.slice(0, at)
        affLines = splitTop(arg.slice(at + '\\skiplinehalf'.length), '\\\\')
      }
    } else if (sourceClass === 'mnras') {
      const parts = splitTop(arg, '\\\\')
      const marked = (p: string) => /^\s*\$\^/.test(p)
      names = parts.filter(p => !marked(p)).join(' ')
      affLines = parts.filter(marked)
    } else if (sourceClass === 'jpsj2') {
      const inst = findMacros(m, src, 'inst', { args: 1 }, 0, frontEnd)[0]
      affLines = inst ? splitTop(inst.args[0]?.inner ?? '', '\\\\') : []
      remove(inst)
    } else {
      const env = findEnvs(m, src, 'affiliations', {}, 0, end)[0]
      if (env) {
        affLines = src.slice(env.bodyStart, env.bodyEnd).split(/\\item(?![a-zA-Z])/).slice(1)
        remove(env)
      }
    }
    authors = markedAuthors(names, affLines, table)
    authorStyle = 'marks'
    remove(authorHits[0])
  } else if (sourceClass === 'nrc2' && authorHits[0]) {
    const address = findMacros(m, src, 'address', { args: 1 }, 0, frontEnd)[0]
    authors = blockAuthors(authorHits[0].args[0]?.inner ?? '', table)
    // "F. Author. Department…" lines, one per author in order.
    const ids = splitTop(address?.args[0]?.inner ?? '', '\\\\')
      .map(l => plain(l).replace(/^(?:[A-Z][a-z]*\.?\s*-?)+[A-Z][\w'-]+\.\s+/, '').replace(/\.\s*$/, ''))
      .filter(Boolean)
      .map(l => table.add(l))
    authors.forEach((a, i) => (a.affiliations = ids[i] ? [ids[i]!] : ids.slice(0, 1)))
    authorStyle = 'nrc'
    remove(authorHits[0])
    remove(address)
  } else if (sourceClass === 'IEEEtran' || authorHits.some(h => h.args[0]?.inner.includes('\\IEEEauthorblockN'))) {
    authorStyle = 'ieee'
    for (const h of authorHits) {
      authors.push(...ieeeAuthors(h.args[0]?.inner ?? '', table))
      remove(h)
    }
  } else if (sourceClass === 'llncs' || findMacros(m, src, 'institute', { args: 1 }, 0, frontEnd).length) {
    const inst = findMacros(m, src, 'institute', { args: 1 }, 0, frontEnd)[0]
    authorStyle = 'lncs'
    for (const h of authorHits) {
      authors.push(...lncsAuthors(h.args[0]?.inner ?? '', inst?.args[0]?.inner, table))
      remove(h)
    }
    remove(inst)
  } else {
    const front = m.slice(0, frontEnd)
    const labelled =
      LABELLED_CLASSES.includes(sourceClass) || /\\(?:fnm|sur|orgname|orgdiv)\s*\{/.test(front) ? labelledAuthors(m, src, frontEnd, table, notes) : undefined
    if (labelled) {
      authorStyle = 'labelled'
      authors = labelled.authors
      labelled.ranges.forEach(remove)
    } else if (findMacros(m, src, 'affil', { opts: 1, args: 1 }, 0, frontEnd).length) {
      const r = authblkAuthors(m, src, frontEnd, table, notes)
      authorStyle = 'authblk'
      authors = r.authors
      r.ranges.forEach(remove)
    } else if (
      authorHits.length > 1 ||
      ['acmart', 'revtex4-2', 'revtex4-1', 'amsart', 'elsarticle'].includes(sourceClass) ||
      findMacros(m, src, 'affiliation', { args: 1 }, 0, frontEnd).length ||
      // The AMS classes' kind (aomart): \author, \address and \email, even for one author.
      findMacros(m, src, 'address', { args: 1 }, 0, frontEnd).length
    ) {
      const r = sequenceAuthors(m, src, frontEnd, table)
      authorStyle = 'sequence'
      authors = r.authors
      r.ranges.forEach(remove)
    } else if (authorHits[0]) {
      authorStyle = 'block'
      authors = blockAuthors(authorHits[0].args[0]?.inner ?? '', table)
      remove(authorHits[0])
    }
  }
  // Emails not tied to an author by the class (\email after \maketitle, etc.) stay unassigned.
  for (const name of ['email', 'ead', 'orcid', 'institute', 'affiliation', 'address', 'thanks']) {
    for (const h of findMacros(m, src, name, { opts: 1, args: 1 }, 0, frontEnd)) {
      if (!removed.some(r => r.start <= h.start && h.end <= r.end) && h.start < bodyStart) remove(h)
    }
  }
  if (!authors.length) notes.push('No authors found; add them before converting.')

  // ---- abstract and keywords ----
  let abstract = ''
  let keywords: string[] = []
  const ieeeIndex = findMacros(m, src, 'IEEEtitleabstractindextext', { args: 1 }, 0, frontEnd)[0]
  const absEnv = abstractEnv ?? findEnvs(m, src, 'abstract', {}, 0, frontEnd)[0]
  if (absEnv) {
    abstract = src.slice(absEnv.bodyStart, absEnv.bodyEnd).trim()
    remove(absEnv)
  } else {
    // Springer Nature, OUP and others take the abstract as an argument: \abstract{...} before \maketitle.
    // jpsj2 calls it \abst{...}.
    const cmd = ['abstract', 'abst'].flatMap(name => findMacros(m, src, name, { args: 1 }, 0, frontEnd)).find(h => h.args.length)
    if (cmd) {
      abstract = cmd.args[0]!.inner.trim()
      remove(cmd)
    }
  }
  // OUP's and BMC's structured abstracts head their parts with \subheading{..} or \parttitle{..}, which only they define.
  abstract = abstract.replace(/\\(?:subheading|parttitle)\s*\{([^{}]*)\}/g, '\\textbf{$1}')
  for (const env of ['IEEEkeywords', 'keyword', 'keywords']) {
    for (const k of findEnvs(m, src, env, {}, 0, frontEnd)) {
      keywords.push(...splitKeywords(src.slice(k.bodyStart, k.bodyEnd)))
      remove(k)
    }
  }
  // OUP: \keywords[Key words]{..}; the heading isn't kept. ascelike \KeyWords, aomart \keyword (one each), jpsj2 \kword.
  for (const name of ['keywords', 'KeyWords', 'keyword', 'kword']) {
    for (const k of findMacros(m, src, name, { opts: 1, args: 1 }, 0, frontEnd)) {
      keywords.push(...splitKeywords(k.args[0]?.inner ?? ''))
      remove(k)
    }
  }
  if (ieeeIndex) {
    const inner = ieeeIndex.args[0]?.inner ?? ''
    const im = mask(inner)
    const a = findEnvs(im, inner, 'abstract')[0]
    if (a && !abstract) abstract = inner.slice(a.bodyStart, a.bodyEnd).trim()
    const k = findEnvs(im, inner, 'IEEEkeywords')[0]
    if (k) keywords.push(...splitKeywords(inner.slice(k.bodyStart, k.bodyEnd)))
    remove(ieeeIndex)
  }
  // llncs and others put \keywords inside the abstract: already collected above.
  abstract = takeMacro(abstract, 'keywords', 0, 1).rest.trim()
  // "Keywords:" typed inside the abstract or right after it.
  const inAbstract = abstract.match(MANUAL_KEYWORDS)
  if (inAbstract) {
    keywords.push(...splitKeywords(inAbstract[1]!))
    abstract = abstract.replace(MANUAL_KEYWORDS, '').trim()
  }
  if (!keywords.length) {
    const re = new RegExp(MANUAL_KEYWORDS.source, 'gi')
    re.lastIndex = bodyStart
    const after = re.exec(m)
    if (after && after.index < frontEnd + 400) {
      keywords.push(...splitKeywords(src.slice(after.index, after.index + after[0].length).replace(MANUAL_KEYWORDS, '$1')))
      remove({ start: after.index, end: after.index + after[0].length })
    }
  }
  keywords = [...new Set(keywords)]

  // ---- class-specific front-matter configuration ----
  const hints: TargetOptions = {}
  for (const name of FRONT_CONFIG) {
    const [o, a] = ARGS[name] ?? [0, 0]
    for (const h of findMacros(m, src, name, { opts: o, args: a }, 0, frontEnd)) {
      if ((name === 'journal' || name === 'journaltitle') && h.args[0] && !/^Journal Title/i.test(clean(h.args[0].inner))) hints.journal = clean(h.args[0].inner)
      if (name === 'acmConference' && h.args.length === 3) {
        hints.venue = { short: h.opts[0] ? clean(h.opts[0].inner) : undefined, name: clean(h.args[0]!.inner), date: clean(h.args[1]!.inner), location: clean(h.args[2]!.inner) }
      }
      remove(h)
    }
  }
  for (const env of ['CCSXML', 'frontmatter', 'fmbox', 'abstractbox']) {
    for (const e of findEnvs(m, src, env, {}, 0, frontEnd)) {
      if (env !== 'CCSXML') {
        // Keep what's inside (it was all extracted); drop the wrapper only.
        remove({ start: e.start, end: e.bodyStart })
        remove({ start: e.bodyEnd, end: e.end })
      } else remove(e)
    }
  }
  for (const h of findMacros(m, src, 'maketitle', {}, bodyStart, end)) remove(h)

  // ---- packages ----
  const packages: UsedPackage[] = []
  for (const name of ['usepackage', 'RequirePackage']) {
    for (const h of findMacros(m, src, name, { opts: 1, args: 1 }, preambleStart, begin)) {
      const options = h.opts[0] ? clean(h.opts[0].inner) : undefined
      for (const p of (h.args[0]?.inner ?? '').split(',').map(s => clean(s)).filter(Boolean)) packages.push({ name: p, options })
      remove(h)
    }
  }

  // ---- bibliography ----
  let bibliography: Bibliography = { kind: 'none' }
  const style = findMacros(m, src, 'bibliographystyle', { args: 1 })[0]
  const bibCmds = findMacros(m, src, 'bibliography', { args: 1 }, bodyStart, end)
  // biblatex-chicago is biblatex with Chicago's styles (and must be loaded as itself); jacow loads
  // biblatex with its biblatex option.
  if (sourceClass === 'jacow' && classOptions.includes('biblatex') && !packages.some(p => p.name === 'biblatex')) packages.push({ name: 'biblatex' })
  const biblatex = packages.find(p => p.name === 'biblatex' || p.name === 'biblatex-chicago')
  const resources = findMacros(m, src, 'addbibresource', { opts: 1, args: 1 }, preambleStart, begin)
  const prints = findMacros(m, src, 'printbibliography', { opts: 1 }, bodyStart, end)
  const files = (s: string) => s.split(',').map(f => clean(f).replace(/\.bib$/, '')).filter(Boolean)
  const marks: { at: number; text: string }[] = []
  if (biblatex) {
    const title = /(?:^|,)\s*title\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|[^,]+)/.exec(prints[0]?.opts[0]?.inner ?? '')?.[1]?.trim()
    bibliography = {
      kind: 'biblatex',
      files: [...resources.flatMap(r => files(r.args[0]?.inner ?? '')), ...bibCmds.flatMap(b => files(b.args[0]?.inner ?? ''))],
      options: biblatex.options,
      ...(title ? { title: title.replace(/^\{([\s\S]*)\}$/, '$1') } : {}),
    }
    resources.forEach(remove)
    prints.forEach((p, i) => (i === 0 ? marks.push({ at: p.start, text: BIB_MARK }) : null))
    prints.forEach(remove)
    bibCmds.forEach(remove)
  } else if (bibCmds.length) {
    bibliography = { kind: 'bibtex', files: bibCmds.flatMap(b => files(b.args[0]?.inner ?? '')), style: style?.args[0] ? clean(style.args[0].inner) : undefined }
    marks.push({ at: bibCmds[0]!.start, text: BIB_MARK })
    bibCmds.forEach(remove)
  } else if (findEnvs(m, src, 'thebibliography', { args: 1 }, bodyStart, end).length) {
    bibliography = { kind: 'inline' }
  }
  remove(style)
  // Springer Nature picks the reference style (and natbib's mode) with a class option.
  if (sourceClass === 'sn-jnl') {
    const numbered = snNumbered(classOptions)
    if (bibliography.kind === 'bibtex' && (!bibliography.style || bibliography.style.startsWith('sn-'))) bibliography.style = numbered ? 'unsrtnat' : 'plainnat'
    if (!packages.some(p => p.name === 'natbib' || p.name === 'apacite')) packages.push({ name: 'natbib', options: numbered ? 'numbers,sort&compress' : undefined })
  }

  // ---- acknowledgments ----
  let acknowledgments: string | undefined
  for (const env of ['acks', 'acknowledgments', 'acknowledgements', 'credits']) {
    const e = findEnvs(m, src, env, {}, bodyStart, end)[0]
    if (e && acknowledgments === undefined) {
      let text = src.slice(e.bodyStart, e.bodyEnd)
      text = text.replace(/\\subsubsection\*?\{\\ackname\}/, '').replace(/\\subsubsection\*?\{\\discintname\}[\s\S]*$/, '')
      acknowledgments = text.trim()
      marks.push({ at: e.start, text: ACK_MARK })
      remove(e)
    }
  }
  if (acknowledgments === undefined) {
    // jmlr: \acks{..}; achemso: \begin{acknowledgement}.
    const cmd = findMacros(m, src, 'acks', { args: 1 }, bodyStart, end)[0]
    // achemso's acknowledgement, jpsj2's acknowledgment and asmejour's.
    const env = ['acknowledgement', 'acknowledgment'].map(name => findEnvs(m, src, name, {}, bodyStart, end)[0]).find(Boolean)
    if (cmd) {
      acknowledgments = (cmd.args[0]?.inner ?? '').trim()
      marks.push({ at: cmd.start, text: ACK_MARK })
      remove(cmd)
    } else if (env) {
      acknowledgments = src.slice(env.bodyStart, env.bodyEnd).trim()
      marks.push({ at: env.start, text: ACK_MARK })
      remove(env)
    }
  }
  if (acknowledgments === undefined) {
    // Springer Nature's back matter heads it with \bmhead{Acknowledgements}.
    // SPIE heads them with a bare \acknowledgments.
    const re = /\\(?:section|subsection|subsubsection|paragraph|bmhead)\*?\s*\{\s*(?:Acknowledge?ments?|Acknowledgment|致谢|鸣谢)\s*\}|\\acknowledge?ments(?![a-zA-Z])(?!\s*\{)/gi
    re.lastIndex = bodyStart
    const head = re.exec(m)
    if (head && head.index < end) {
      const stop = /\\(?:section|chapter|appendix\b|bmhead\b|backmatter\b|bibliography\b|bibliographystyle|printbibliography)|\\begin\{(?:thebibliography|appendices)\}|\\end\{document\}/g
      stop.lastIndex = head.index + head[0].length
      const next = stop.exec(m)
      const until = next ? next.index : end
      acknowledgments = src.slice(head.index + head[0].length, until).trim()
      marks.push({ at: head.index, text: ACK_MARK })
      remove({ start: head.index, end: until })
    }
  }

  // ---- assemble ----
  // \renewcommand{\shortauthors}{...} (acmart) configures the old class only.
  for (const h of findMacros(m, src, 'renewcommand', { args: 2 }, preambleStart, frontEnd)) {
    if (/^\s*\\shortauthors\s*$/.test(h.args[0]?.inner ?? '')) remove(h)
  }
  const preambleRanges = [...removed.filter(r => r.end <= begin), { start: 0, end: preambleStart }]
  const preamble = sourcePreamble(sourceClass, tidy(cut(src.slice(0, begin), preambleRanges)))
  let body = src.slice(bodyStart, end)
  const bodyRanges = removed.filter(r => r.start >= bodyStart && r.end <= end).map(r => ({ start: r.start - bodyStart, end: r.end - bodyStart }))
  // Insert the marks where the removed parts were.
  const withMarks = [...bodyRanges]
  body = spliceMarks(body, withMarks, marks.map(mk => ({ at: mk.at - bodyStart, text: mk.text })))
  return {
    sourceClass,
    classOptions,
    title,
    shortTitle: shortTitle ? clean(shortTitle) : undefined,
    authors,
    affiliations: table.list,
    abstract,
    keywords,
    acknowledgments,
    packages,
    preamble,
    body: tidy(body),
    bibliography,
    notes,
    hints,
    authorStyle,
  }
}

/** Springer Nature reference styles: numbered unless an author-year one was chosen without `Numbered`. */
function snNumbered(options: string[]): boolean {
  if (options.includes('Numbered')) return true
  return !options.some(o => ['sn-basic', 'sn-mathphys-ay', 'sn-vancouver-ay', 'sn-apa', 'sn-chicago'].includes(o))
}

/** Theorem styles a source class defined for amsthm, as the nearest standard ones. */
const THEOREM_STYLES: Record<string, Record<string, string>> = {
  'sn-jnl': { thmstyleone: 'plain', thmstyletwo: 'remark', thmstylethree: 'definition', thmstylefour: 'remark' },
}

/** Adapt preamble commands that only the source class understands. */
function sourcePreamble(sourceClass: string, preamble: string): string {
  // sn-jnl's \unnumbered turns off section numbers.
  if (sourceClass === 'sn-jnl') preamble = preamble.replace(/\\unnumbered(?![a-zA-Z@])/g, '\\setcounter{secnumdepth}{0}')
  const styles = THEOREM_STYLES[sourceClass]
  if (!styles) return preamble
  return preamble.replace(/\\theoremstyle\s*\{\s*([A-Za-z]+)\s*\}/g, (all, name: string) => (styles[name] ? `\\theoremstyle{${styles[name]}}` : all))
}

/** Cut ranges and put each mark where its range began. */
function spliceMarks(src: string, ranges: { start: number; end: number }[], marks: { at: number; text: string }[]): string {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  const pending = [...marks].sort((a, b) => a.at - b.at)
  for (const r of sorted) {
    if (r.start < pos) continue
    out += src.slice(pos, r.start)
    while (pending.length && pending[0]!.at <= r.start) out += `\n${pending.shift()!.text}\n`
    pos = r.end
  }
  out += src.slice(pos)
  for (const mk of pending) out += `\n${mk.text}\n`
  return out
}

/** Collapse runs of blank lines left behind by removals. */
function tidy(s: string): string {
  return s
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


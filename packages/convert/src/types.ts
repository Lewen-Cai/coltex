/** The paper as a template-independent intermediate representation. */

export type Affiliation = {
  id: string
  /** The affiliation as written (lines joined with ", "). */
  raw: string
  department?: string
  institution?: string
  city?: string
  country?: string
}

export type Author = {
  name: string
  /** Affiliation ids, in order. */
  affiliations: string[]
  email?: string
  orcid?: string
  corresponding?: boolean
  /** Free-form notes (e.g. IEEE \thanks text, "equal contribution"). */
  note?: string
}

export type Bibliography =
  | { kind: 'bibtex'; files: string[]; style?: string }
  | { kind: 'biblatex'; files: string[]; options?: string }
  /** A thebibliography environment; it stays in the body. */
  | { kind: 'inline' }
  | { kind: 'none' }

export type UsedPackage = { name: string; options?: string }

export type Paper = {
  /** Detected source family, e.g. "article", "IEEEtran", "acmart". */
  sourceClass: string
  classOptions: string[]
  title: string
  shortTitle?: string
  authors: Author[]
  affiliations: Affiliation[]
  abstract: string
  keywords: string[]
  acknowledgments?: string
  packages: UsedPackage[]
  /** The rest of the preamble: the author's definitions and settings. */
  preamble: string
  /** The document body without front matter, acknowledgments and bibliography commands. */
  body: string
  bibliography: Bibliography
  /** Things the extractor was unsure about, for the report. */
  notes: string[]
  /** Target options found in the source (e.g. elsarticle's \journal, acmart's \acmConference). */
  hints: TargetOptions
  /** How the source wrote its authors (for a template target: how to write them back). */
  authorStyle?: AuthorStyle
}

/** The ways of writing authors and affiliations the extractor reads. */
export type AuthorStyle = 'jmlr' | 'apa' | 'asme' | 'jacow' | 'marks' | 'nrc' | 'ieee' | 'lncs' | 'labelled' | 'authblk' | 'sequence' | 'block' | 'none'

/** Fields a target needs beyond the paper itself (venue, journal, review mode). */
export type TargetOptions = {
  /** Anonymous / review version where the template supports it. */
  review?: boolean
  journal?: string
  venue?: { name?: string; short?: string; date?: string; location?: string }
  /** Override the bibliography style. */
  bibStyle?: string
}

export type TargetId =
  | 'ieee-journal'
  | 'ieee-conference'
  | 'acm-sigconf'
  | 'acm-journal'
  | 'elsevier'
  | 'elsevier-cas'
  | 'oup'
  | 'lncs'
  | 'revtex'
  | 'elsevier-cas-dc'
  | 'amsart'
  | 'apa7'
  | 'aastex'
  | 'mnras'
  | 'achemso'
  | 'article'

export type TargetField = { key: 'journal' | 'venue.name' | 'venue.short' | 'venue.date' | 'venue.location'; label: string; required: boolean; placeholder?: string }

export type TargetInfo = {
  id: TargetId
  label: string
  publisher: string
  description: string
  documentClass: string
  twoColumn: boolean
  /** natbib commands (\citet, \citep) work in the target. */
  natbib: boolean
  bibStyle: string
  fields: TargetField[]
  /** Supports a review / anonymous mode switch. */
  review: boolean
}

/** One change the converter made or a thing to check, for the report. */
export type ConversionNote = { level: 'info' | 'warning'; text: string }

export type Conversion = {
  /** Path → new content for every file that changed or was created. */
  files: Record<string, string>
  rootFile: string
  notes: ConversionNote[]
}

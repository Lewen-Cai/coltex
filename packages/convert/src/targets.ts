import type { TargetId, TargetInfo } from './types.ts'

export const TARGETS: TargetInfo[] = [
  {
    id: 'ieee-journal',
    label: 'IEEE Transactions / Journal',
    publisher: 'IEEE',
    description: 'IEEEtran, journal mode: two columns, numeric citations.',
    documentClass: 'IEEEtran',
    twoColumn: true,
    natbib: false,
    bibStyle: 'IEEEtran',
    fields: [{ key: 'journal', label: 'Journal name (running header)', required: false, placeholder: 'IEEE Transactions on …' }],
    review: true,
  },
  {
    id: 'ieee-conference',
    label: 'IEEE Conference',
    publisher: 'IEEE',
    description: 'IEEEtran, conference mode: two columns, author blocks.',
    documentClass: 'IEEEtran',
    twoColumn: true,
    natbib: false,
    bibStyle: 'IEEEtran',
    fields: [],
    review: true,
  },
  {
    id: 'acm-sigconf',
    label: 'ACM Conference (sigconf)',
    publisher: 'ACM',
    description: 'acmart sigconf: two columns, ACM reference format.',
    documentClass: 'acmart',
    twoColumn: true,
    natbib: true,
    bibStyle: 'ACM-Reference-Format',
    fields: [
      { key: 'venue.name', label: 'Conference name', required: false, placeholder: 'Proceedings of …' },
      { key: 'venue.short', label: 'Short name', required: false, placeholder: 'CONF ’27' },
      { key: 'venue.date', label: 'Dates', required: false, placeholder: 'June 1–5, 2027' },
      { key: 'venue.location', label: 'Location', required: false, placeholder: 'City, Country' },
    ],
    review: true,
  },
  {
    id: 'acm-journal',
    label: 'ACM Journal (acmsmall)',
    publisher: 'ACM',
    description: 'acmart acmsmall: one column, for ACM journals and transactions.',
    documentClass: 'acmart',
    twoColumn: false,
    natbib: true,
    bibStyle: 'ACM-Reference-Format',
    fields: [{ key: 'journal', label: 'ACM journal code (optional)', required: false, placeholder: 'TOSEM, JACM, CSUR …' }],
    review: true,
  },
  {
    id: 'elsevier',
    label: 'Elsevier journal',
    publisher: 'Elsevier',
    description: 'elsarticle preprint: one column, numeric citations.',
    documentClass: 'elsarticle',
    twoColumn: false,
    natbib: true,
    bibStyle: 'elsarticle-num',
    fields: [{ key: 'journal', label: 'Journal', required: true, placeholder: 'Journal of …' }],
    review: true,
  },
  {
    id: 'lncs',
    label: 'Springer LNCS',
    publisher: 'Springer',
    description: 'llncs: Lecture Notes in Computer Science and other Springer proceedings.',
    documentClass: 'llncs',
    twoColumn: false,
    natbib: false,
    bibStyle: 'splncs04',
    fields: [],
    review: false,
  },
  {
    id: 'revtex',
    label: 'APS (REVTeX 4.2)',
    publisher: 'APS / AIP',
    description: 'revtex4-2 reprint: two columns, for Physical Review and AIP journals.',
    documentClass: 'revtex4-2',
    twoColumn: true,
    natbib: true,
    bibStyle: 'apsrev4-2',
    fields: [],
    review: true,
  },
  {
    id: 'article',
    label: 'Plain article',
    publisher: 'LaTeX',
    description: 'The standard article class, e.g. for arXiv or a template-free draft.',
    documentClass: 'article',
    twoColumn: false,
    natbib: true,
    bibStyle: 'plainnat',
    fields: [],
    review: false,
  },
]

export function targetInfo(id: TargetId): TargetInfo {
  const t = TARGETS.find(x => x.id === id)
  if (!t) throw new Error(`Unknown target ${id}`)
  return t
}

/** Packages a target class loads itself: their options move to \PassOptionsToPackage, the \usepackage goes. */
export const CLASS_LOADS: Record<string, string[]> = {
  acmart: ['natbib', 'hyperref', 'graphicx', 'xcolor', 'caption', 'geometry', 'amsmath', 'amsfonts', 'amssymb', 'booktabs', 'fancyhdr', 'setspace', 'textcomp', 'microtype'],
  elsarticle: ['natbib', 'graphicx', 'geometry'],
  'revtex4-2': ['natbib'],
  IEEEtran: [],
  llncs: [],
  article: [],
}

/** Packages that fight with a journal class's own layout or front matter. */
const LAYOUT = ['geometry', 'fullpage', 'a4wide', 'vmargin', 'savetrees', 'titling', 'fancyhdr', 'titlesec', 'setspace', 'abstract', 'authblk', 'sectsty', 'anysize', 'layout']

export const DROP: Record<string, string[]> = {
  IEEEtran: [...LAYOUT, 'natbib', 'biblatex', 'times', 'mathptmx', 'caption'],
  acmart: [...LAYOUT, 'biblatex', 'cite', 'times', 'mathptmx', 'newtxtext', 'newtxmath', 'txfonts', 'pxfonts', 'lmodern', 'libertine', 'amssymb', 'amsfonts'],
  elsarticle: [...LAYOUT, 'biblatex', 'cite'],
  // llncs defines proof and the usual theorem environments itself; amsthm would clash.
  llncs: [...LAYOUT, 'natbib', 'biblatex', 'times', 'mathptmx', 'amsthm'],
  'revtex4-2': [...LAYOUT, 'biblatex', 'cite'],
  article: ['titling'],
}

/** Packages each source class makes available implicitly that the body may rely on. */
export const IMPLIED_BY_SOURCE: Record<string, string[]> = {
  acmart: ['amsmath', 'graphicx', 'booktabs', 'xcolor', 'hyperref', 'natbib'],
  elsarticle: ['graphicx', 'natbib'],
  'revtex4-2': ['natbib'],
  'revtex4-1': ['natbib'],
  ctexart: ['ctex'],
  ctexrep: ['ctex'],
  ctexbook: ['ctex'],
}

export const CLASS_FAMILY: Record<TargetId, string> = {
  'ieee-journal': 'IEEEtran',
  'ieee-conference': 'IEEEtran',
  'acm-sigconf': 'acmart',
  'acm-journal': 'acmart',
  elsevier: 'elsarticle',
  lncs: 'llncs',
  revtex: 'revtex4-2',
  article: 'article',
}

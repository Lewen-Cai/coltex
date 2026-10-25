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
    id: 'elsevier-cas',
    label: 'Elsevier journal (CAS)',
    publisher: 'Elsevier',
    description: 'cas-sc: Elsevier’s single-column CAS layout, used by many of its journals, medical ones among them.',
    documentClass: 'cas-sc',
    twoColumn: false,
    natbib: true,
    bibStyle: 'cas-model2-names',
    fields: [],
    review: true,
  },
  {
    id: 'oup',
    label: 'Oxford University Press journal',
    publisher: 'OUP',
    description: 'oup-authoring-template: two columns, numeric citations, for Oxford University Press journals.',
    documentClass: 'oup-authoring-template',
    twoColumn: true,
    natbib: true,
    bibStyle: 'oup-plain',
    fields: [{ key: 'journal', label: 'Journal', required: false, placeholder: 'Journal Title Here' }],
    review: false,
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
    id: 'elsevier-cas-dc',
    label: 'Elsevier journal (CAS, two columns)',
    publisher: 'Elsevier',
    description: 'cas-dc: Elsevier’s double-column CAS layout.',
    documentClass: 'cas-dc',
    twoColumn: true,
    natbib: true,
    bibStyle: 'cas-model2-names',
    fields: [],
    review: false,
  },
  {
    id: 'amsart',
    label: 'AMS journal',
    publisher: 'AMS',
    description: 'amsart: for mathematics journals, with AMS references.',
    documentClass: 'amsart',
    twoColumn: false,
    natbib: false,
    bibStyle: 'amsplain',
    fields: [],
    review: false,
  },
  {
    id: 'apa7',
    label: 'APA 7 manuscript',
    publisher: 'APA',
    description: 'apa7: for psychology and social science journals, APA references.',
    documentClass: 'apa7',
    twoColumn: false,
    natbib: true,
    bibStyle: 'apacite',
    fields: [],
    review: false,
  },
  {
    id: 'aastex',
    label: 'AAS journals (AASTeX)',
    publisher: 'AAS',
    description: 'aastex701: for The Astrophysical Journal, The Astronomical Journal and other AAS journals.',
    documentClass: 'aastex701',
    twoColumn: false,
    natbib: true,
    bibStyle: 'aasjournalv7',
    fields: [],
    review: false,
  },
  {
    id: 'mnras',
    label: 'Monthly Notices of the RAS',
    publisher: 'RAS',
    description: 'mnras: two columns, for Monthly Notices of the Royal Astronomical Society.',
    documentClass: 'mnras',
    twoColumn: true,
    natbib: true,
    bibStyle: 'mnras',
    fields: [],
    review: false,
  },
  {
    id: 'achemso',
    label: 'ACS journal',
    publisher: 'ACS',
    description: 'achemso: for American Chemical Society journals.',
    documentClass: 'achemso',
    twoColumn: false,
    natbib: true,
    bibStyle: 'achemso',
    fields: [{ key: 'journal', label: 'ACS journal code (optional)', required: false, placeholder: 'jacsat, jpccck, ancham …' }],
    review: false,
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
  'cas-sc': ['graphicx', 'amsmath', 'amsfonts', 'amssymb', 'booktabs', 'makecell', 'multirow', 'array', 'colortbl', 'dcolumn', 'stfloats', 'xspace', 'xstring', 'footmisc', 'xcolor', 'hyperref', 'etoolbox', 'xparse', 'fontenc', 'wrapfig', 'moreverb'],
  'oup-authoring-template': [
    'natbib', 'graphicx', 'caption', 'amsmath', 'array', 'color', 'xcolor', 'amssymb', 'flushend', 'stfloats', 'rotating', 'chngpage', 'footmisc',
    'wrapfig', 'amsthm', 'multirow', 'footnote', 'url', 'mathrsfs', 'algorithm', 'algorithmicx', 'algpseudocode', 'listings', 'hyperref', 'tikz',
    // It carries a copy of the appendix package (appendices environment included).
    'appendix',
  ],
  'revtex4-2': ['natbib'],
  'cas-dc': ['graphicx', 'amsmath', 'amsfonts', 'amssymb', 'booktabs', 'makecell', 'multirow', 'array', 'colortbl', 'dcolumn', 'stfloats', 'xspace', 'xstring', 'footmisc', 'xcolor', 'hyperref', 'etoolbox', 'xparse', 'fontenc', 'wrapfig', 'moreverb', 'balance', 'setspace'],
  amsart: ['amsmath', 'amsfonts'],
  apa7: ['graphicx', 'booktabs', 'threeparttable', 'caption', 'fancyhdr', 'geometry', 'etoolbox', 'float', 'longtable', 'array', 'apacite', 'natbib', 'hyperref'],
  // AASTeX loads amsmath only with some options: documents keep their own.
  aastex701: ['graphicx', 'natbib', 'latexsym', 'hyperref'],
  mnras: ['natbib', 'hyperref'],
  achemso: ['natbib', 'geometry', 'xkeyval', 'mciteplus'],
  IEEEtran: [],
  llncs: [],
  article: [],
}

/** Packages that fight with a journal class's own layout or front matter. */
const LAYOUT = ['geometry', 'fullpage', 'a4wide', 'vmargin', 'savetrees', 'titling', 'fancyhdr', 'titlesec', 'setspace', 'abstract', 'authblk', 'sectsty', 'anysize', 'layout']

export const DROP: Record<string, string[]> = {
  IEEEtran: [...LAYOUT, 'natbib', 'biblatex', 'times', 'mathptmx', 'caption', 'appendix'],
  acmart: [...LAYOUT, 'biblatex', 'cite', 'times', 'mathptmx', 'newtxtext', 'newtxmath', 'txfonts', 'pxfonts', 'lmodern', 'libertine', 'amssymb', 'amsfonts'],
  elsarticle: [...LAYOUT, 'biblatex', 'cite'],
  // cas-sc sets its fonts (STIX, Charis) itself.
  'cas-sc': [...LAYOUT, 'biblatex', 'cite', 'times', 'mathptmx', 'newtxtext', 'newtxmath', 'txfonts', 'pxfonts', 'stix', 'stix2', 'lmodern'],
  // OUP's class has its own float captions and subfloats.
  'oup-authoring-template': [...LAYOUT, 'biblatex', 'cite', 'subfig', 'times', 'mathptmx'],
  // llncs defines proof and the usual theorem environments itself; amsthm would clash.
  llncs: [...LAYOUT, 'natbib', 'biblatex', 'times', 'mathptmx', 'amsthm', 'appendix'],
  // manyfoot and bigfoot rewrite the footnote machinery REVTeX replaces; lineno breaks its
  // floats ("Improper \prevdepth"), and REVTeX numbers lines itself (linenumbers option).
  'revtex4-2': [...LAYOUT, 'biblatex', 'cite', 'manyfoot', 'bigfoot', 'lineno'],
  'cas-dc': [...LAYOUT, 'biblatex', 'cite', 'times', 'mathptmx', 'newtxtext', 'newtxmath', 'txfonts', 'pxfonts', 'stix', 'stix2', 'lmodern'],
  // amsart's AMS styles are numeric and its citations plain \cite: natbib (often author–year) goes.
  amsart: [...LAYOUT, 'biblatex', 'natbib'],
  // apa7 cites through apacite (natbib's commands with natbibapa).
  apa7: [...LAYOUT, 'biblatex', 'cite', 'natbib', 'apacite', 'times', 'mathptmx', 'lmodern'],
  aastex701: [...LAYOUT, 'biblatex', 'cite', 'lineno'],
  mnras: [...LAYOUT, 'biblatex', 'cite', 'times', 'mathptmx'],
  achemso: [...LAYOUT, 'biblatex', 'cite'],
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
  // sn-jnl defines \toprule/\midrule itself (\botrule becomes booktabs' \bottomrule) and loads natbib for its reference style.
  'sn-jnl': ['amsthm', 'graphicx', 'booktabs', 'rotating', 'hyperref', 'wrapfig'],
  'cas-sc': ['graphicx', 'amsmath', 'amssymb', 'booktabs', 'multirow', 'array', 'xcolor', 'hyperref'],
  'cas-dc': ['graphicx', 'amsmath', 'amssymb', 'booktabs', 'multirow', 'array', 'xcolor', 'hyperref'],
  'oup-authoring-template': ['graphicx', 'amsmath', 'amssymb', 'amsthm', 'xcolor', 'rotating', 'multirow', 'url', 'hyperref', 'natbib'],
  // The AMS classes have amsmath, amsfonts and amsthm built in (\theoremstyle, proof, \qedhere).
  amsart: ['amsmath', 'amssymb', 'amsthm'],
  amsproc: ['amsmath', 'amssymb', 'amsthm'],
  aomart: ['amsmath', 'amssymb', 'amsthm', 'graphicx', 'hyperref'],
  jmlr: ['amsmath', 'amssymb', 'graphicx', 'natbib', 'xcolor', 'url', 'hyperref'],
  apa7: ['graphicx', 'booktabs', 'threeparttable'],
  mnras: ['graphicx'],
  aastex701: ['amsmath', 'amssymb', 'graphicx', 'natbib'],
  aastex7: ['amsmath', 'amssymb', 'graphicx', 'natbib'],
  achemso: ['natbib', 'graphicx'],
  asmejour: ['amsmath', 'graphicx', 'booktabs', 'natbib', 'xcolor', 'hyperref'],
  asmeconf: ['amsmath', 'graphicx', 'booktabs', 'natbib', 'xcolor', 'hyperref'],
  ascelike: ['graphicx', 'natbib'],
  quantumarticle: ['amsmath', 'amssymb', 'graphicx', 'xcolor', 'hyperref'],
  jpsj2: ['amsmath', 'amssymb', 'graphicx'],
  ejpecp: ['amsmath', 'amssymb', 'amsthm', 'graphicx', 'hyperref'],
  jacow: ['amsmath', 'graphicx', 'booktabs', 'xcolor', 'url'],
  nature: ['cite'],
}

/** Packages a class loads only when given an option (revtex4-2's amsmath, amssymb). */
export const IMPLIED_BY_OPTION: Record<string, Record<string, string>> = {
  'revtex4-2': { amsmath: 'amsmath', amssymb: 'amssymb' },
  'revtex4-1': { amsmath: 'amsmath', amssymb: 'amssymb' },
  mnras: { usenatbib: 'natbib' },
}

/**
 * Commands a document may use that its class (or a package the target
 * leaves out) defined: when used and missing in the target, they get a
 * plain definition there, so the document still builds. `from` are source
 * classes or left-out packages; `def` is added to the preamble.
 */
export const COMPAT: { names: string[]; from: string[]; def: string }[] = [
  // Layout packages the journal classes replace.
  { names: ['doublespacing', 'onehalfspacing', 'singlespacing'], from: ['setspace'], def: '\\providecommand{\\doublespacing}{}\\providecommand{\\onehalfspacing}{}\\providecommand{\\singlespacing}{}' },
  { names: ['setstretch'], from: ['setspace'], def: '\\providecommand{\\setstretch}[1]{}' },
  { names: ['doublespace'], from: ['setspace'], def: '\\ifcsname doublespace\\endcsname\\else\\newenvironment{doublespace}{}{}\\fi' },
  { names: ['geometry', 'newgeometry', 'restoregeometry'], from: ['geometry'], def: '\\providecommand{\\geometry}[1]{}\\providecommand{\\newgeometry}[1]{}\\providecommand{\\restoregeometry}{}' },
  { names: ['titleformat', 'titlespacing'], from: ['titlesec'], def: '\\ProvideDocumentCommand{\\titleformat}{s m o m m m m o}{}\\ProvideDocumentCommand{\\titlespacing}{s m m m m o}{}' },
  { names: ['fancyhf', 'fancyhead', 'fancyfoot', 'lhead', 'chead', 'rhead', 'lfoot', 'cfoot', 'rfoot'], from: ['fancyhdr'], def: '\\ProvideDocumentCommand{\\fancyhf}{m}{}\\ProvideDocumentCommand{\\fancyhead}{o m}{}\\ProvideDocumentCommand{\\fancyfoot}{o m}{}\\ProvideDocumentCommand{\\lhead}{m}{}\\ProvideDocumentCommand{\\chead}{m}{}\\ProvideDocumentCommand{\\rhead}{m}{}\\ProvideDocumentCommand{\\lfoot}{m}{}\\ProvideDocumentCommand{\\cfoot}{m}{}\\ProvideDocumentCommand{\\rfoot}{m}{}' },
  { names: ['headrulewidth', 'footrulewidth'], from: ['fancyhdr'], def: '\\providecommand{\\headrulewidth}{0pt}\\providecommand{\\footrulewidth}{0pt}' },
  { names: ['linenumbers', 'nolinenumbers'], from: ['lineno'], def: '\\providecommand{\\linenumbers}{}\\providecommand{\\nolinenumbers}{}' },
  { names: ['sectionfont', 'subsectionfont', 'subsubsectionfont', 'allsectionsfont'], from: ['sectsty'], def: '\\providecommand{\\sectionfont}[1]{}\\providecommand{\\subsectionfont}[1]{}\\providecommand{\\subsubsectionfont}[1]{}\\providecommand{\\allsectionsfont}[1]{}' },
  // jmlr's float and cross-reference commands.
  { names: ['floatconts'], from: ['jmlr'], def: '\\providecommand{\\floatconts}[3]{{\\centering#3\\par}#2\\label{#1}}' },
  { names: ['figureref'], from: ['jmlr'], def: '\\providecommand{\\figureref}[1]{Figure~\\ref{#1}}' },
  { names: ['tableref'], from: ['jmlr'], def: '\\providecommand{\\tableref}[1]{Table~\\ref{#1}}' },
  { names: ['sectionref'], from: ['jmlr'], def: '\\providecommand{\\sectionref}[1]{Section~\\ref{#1}}' },
  { names: ['equationref'], from: ['jmlr'], def: '\\providecommand{\\equationref}[1]{Equation~(\\ref{#1})}' },
  { names: ['appendixref'], from: ['jmlr'], def: '\\providecommand{\\appendixref}[1]{Appendix~\\ref{#1}}' },
  { names: ['algorithmref'], from: ['jmlr'], def: '\\providecommand{\\algorithmref}[1]{Algorithm~\\ref{#1}}' },
  { names: ['theoremref'], from: ['jmlr'], def: '\\providecommand{\\theoremref}[1]{Theorem~\\ref{#1}}' },
  // Elsevier CAS prints its CRediT roles at the end.
  { names: ['printcredits'], from: ['cas-sc', 'cas-dc'], def: '\\providecommand{\\printcredits}{}' },
  // OUP's and apa7's table notes (threeparttable's, outside a threeparttable).
  {
    names: ['tablenotes'],
    from: ['oup-authoring-template'],
    def: '\\ifcsname tablenotes\\endcsname\\else\\newenvironment{tablenotes}{\\par\\footnotesize\\begin{list}{}{\\setlength{\\leftmargin}{0pt}\\setlength{\\itemsep}{0pt}}}{\\end{list}}\\fi',
  },
  // apa7's notes under figures and tables.
  { names: ['figurenote'], from: ['apa7'], def: '\\providecommand{\\figurenote}[1]{\\par\\footnotesize\\textit{Note.} #1}' },
  // Nature's Methods and closing notes.
  { names: ['methods'], from: ['nature'], def: '\\ifcsname methods\\endcsname\\else\\newenvironment{methods}{\\section*{Methods}}{}\\fi' },
  // A plain list: some classes (OUP's) have no description environment.
  {
    names: ['addendum'],
    from: ['nature'],
    def: '\\ifcsname addendum\\endcsname\\else\\newenvironment{addendum}{\\begin{list}{}{\\setlength{\\leftmargin}{0pt}\\setlength{\\labelwidth}{0pt}\\setlength{\\itemindent}{0pt}\\renewcommand{\\makelabel}[1]{\\textbf{##1}}}}{\\end{list}}\\fi',
  },
  // MNRAS ends with \bsp; AASTeX lists facilities and software.
  { names: ['bsp'], from: ['mnras'], def: '\\providecommand{\\bsp}{}' },
  { names: ['facilities'], from: ['aastex701', 'aastex7', 'aastex631'], def: '\\providecommand{\\facilities}[1]{\\par\\noindent\\textit{Facilities:} #1\\par}' },
  { names: ['software'], from: ['aastex701', 'aastex7', 'aastex631'], def: '\\providecommand{\\software}[1]{\\par\\noindent\\textit{Software:} #1\\par}' },
  // achemso's Supporting Information and table-of-contents graphic.
  { names: ['suppinfo'], from: ['achemso'], def: '\\ifcsname suppinfo\\endcsname\\else\\newenvironment{suppinfo}{\\section*{Supporting Information}}{}\\fi' },
  { names: ['tocentry'], from: ['achemso'], def: '\\ifcsname tocentry\\endcsname\\else\\newenvironment{tocentry}{\\par}{\\par}\\fi' },
  // SPIE heads the acknowledgments with a command.
  { names: ['acknowledgments'], from: ['spie'], def: '\\providecommand{\\acknowledgments}{\\section*{Acknowledgments}}' },
]

export const CLASS_FAMILY: Record<TargetId, string> = {
  'ieee-journal': 'IEEEtran',
  'ieee-conference': 'IEEEtran',
  'acm-sigconf': 'acmart',
  'acm-journal': 'acmart',
  elsevier: 'elsarticle',
  'elsevier-cas': 'cas-sc',
  oup: 'oup-authoring-template',
  lncs: 'llncs',
  revtex: 'revtex4-2',
  'elsevier-cas-dc': 'cas-dc',
  amsart: 'amsart',
  apa7: 'apa7',
  aastex: 'aastex701',
  mnras: 'mnras',
  achemso: 'achemso',
  article: 'article',
}

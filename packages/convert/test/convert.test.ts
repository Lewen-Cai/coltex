import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { bibtexCompatible, convertPaper, extractPaper, structureAffiliation, TARGETS, transformTex } from '../src/index.ts'
import { mask, splitTop } from '../src/scan.ts'

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const bib = fixture('refs.bib')
const convert = (src: string, target: Parameters<typeof convertPaper>[1], options = {}) =>
  convertPaper(extractPaper(src), target, options, { rootFile: 'main.tex', texFiles: { 'main.tex': src }, bibFiles: { 'refs.bib': bib } })

test('the scanner ignores comments and verbatim, and splits at top level only', () => {
  const src = 'a % \\title{no}\n\\verb|\\title{no}| b'
  assert.ok(!mask(src).includes('\\title'))
  assert.equal(mask(src).length, src.length)
  assert.deepEqual(splitTop('A \\and {B \\and C} \\and D', '\\and').map(s => s.trim()), ['A', '{B \\and C}', 'D'])
  assert.deepEqual(splitTop('x \\\\[2pt] y \\\\ z', '\\\\').map(s => s.trim()), ['x', 'y', 'z'])
  assert.equal(splitTop('\\anderson', '\\and').length, 1)
})

test('affiliations written as text get a best-effort structure', () => {
  assert.deepEqual(structureAffiliation('Department of Computer Science, Tsinghua University, Beijing 100084, China'), {
    country: 'China',
    department: 'Department of Computer Science',
    institution: 'Tsinghua University',
    city: 'Beijing',
  })
})

test('article + authblk + biblatex', () => {
  const p = extractPaper(fixture('article-authblk.tex'))
  assert.equal(p.title, 'Learning Sparse Representations\\\\ for Graphs')
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations]), [
    ['Alice Zhang', ['a1']],
    ['Bob M\\"uller', ['a1', 'a2']],
    ['Carol Li', ['a2']],
  ])
  assert.equal(p.affiliations[1]!.institution, 'Max Planck Institute for Informatics')
  assert.deepEqual(p.keywords, ['sparse coding', 'graph learning', 'representation'])
  assert.equal(p.acknowledgments, 'We thank the reviewers.')
  assert.deepEqual(p.bibliography, { kind: 'biblatex', files: ['refs'], options: 'style=authoryear,backend=biber' })
  assert.ok(!p.body.includes('\\maketitle') && !p.body.includes('Keywords'))
})

test('IEEE conference author blocks', () => {
  const p = extractPaper(fixture('ieee-conference.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.email]), [
    ['Dan Brown', 'dbrown@stanford.edu'],
    ['Eve Chen', 'eve@fudan.edu.cn'],
  ])
  assert.equal(p.affiliations[0]!.raw, 'Dept. of Electrical Engineering, Stanford University, Stanford, USA')
  assert.deepEqual(p.keywords, ['edge computing', 'inference', 'latency'])
  assert.equal(p.acknowledgments, 'Thanks to the lab.')
})

test('acmart sequences, venue hints and dropped ACM metadata', () => {
  const p = extractPaper(fixture('acmart.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations]), [
    ['Frank Wu', ['a1']],
    ['Grace Kim', ['a2']],
    ['Henry Park', ['a2']],
  ])
  assert.equal(p.authors[0]!.orcid, '0000-0002-1825-0097')
  assert.deepEqual(p.affiliations[1], { id: 'a2', raw: 'School of Computing, KAIST, Daejeon, South Korea', department: 'School of Computing', institution: 'KAIST', city: 'Daejeon', country: 'South Korea' })
  assert.equal(p.hints.venue?.short, "KDD '26")
  assert.ok(!/setcopyright|acmDOI|ccsdesc|CCSXML|shortauthors/.test(p.preamble + p.body))
})

test('elsarticle labels, corresponding author and key=value affiliations', () => {
  const p = extractPaper(fixture('elsarticle.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations, a.email, !!a.corresponding]), [
    ['Ivan Petrov', ['a1'], 'ivan@ethz.ch', true],
    ['Julia Rossi', ['a1', 'a2'], 'julia@polimi.it', false],
  ])
  assert.equal(p.affiliations[0]!.institution, 'ETH Zurich')
  assert.equal(p.hints.journal, 'Pattern Recognition')
  assert.deepEqual(p.keywords, ['clustering', 'outliers', 'robustness'])
})

test('llncs institutes, \\inst numbers, ORCID and keywords inside the abstract', () => {
  const p = extractPaper(fixture('llncs.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations, a.email]), [
    ['Kurt Weber', ['a1'], 'weber@tum.de'],
    ['Lena Fischer', ['a2'], 'lena@ox.ac.uk'],
  ])
  assert.equal(p.abstract, 'We verify compilers.')
  assert.deepEqual(p.keywords, ['verification', 'compilers', 'Coq'])
  assert.equal(p.acknowledgments, 'We thank Inria.')
})

test('a plain \\author with \\and, lines and \\thanks', () => {
  const p = extractPaper(fixture('article-plain.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.email, a.note]), [
    ['Mia Wang', 'mia@pku.edu.cn', 'Corresponding author.'],
    ['Noah Smith', undefined, undefined],
  ])
  assert.deepEqual(p.keywords, ['number theory', 'primes'])
  assert.equal(p.abstract, 'Primes are infinite.')
})

test('citation commands follow the target', () => {
  const natbib = transformTex('\\textcite{a} \\parencite[see][p.~3]{b} \\citet{c}', { natbib: true, twoColumn: false, family: 'acmart' })
  assert.equal(natbib.text, '\\citet{a} \\citep[see][p.~3]{b} \\citet{c}')
  const plain = transformTex('\\citet{a} \\citep[see][p.~3]{b}', { natbib: false, twoColumn: false, family: 'IEEEtran' })
  assert.equal(plain.text, '\\cite{a} \\cite[p.~3]{b}')
  assert.equal(plain.counts.lostCiteDetail, 2)
  const kept = transformTex('\\textcite{a}', { natbib: true, keepCitations: true, twoColumn: false, family: 'article' })
  assert.equal(kept.text, '\\textcite{a}')
})

test('two-column targets narrow single-column figures but not figure*', () => {
  const src = '\\begin{figure}\\includegraphics[width=\\textwidth]{a}\\end{figure}\\begin{figure*}\\includegraphics[width=\\textwidth]{b}\\end{figure*}'
  const t = transformTex(src, { natbib: true, twoColumn: true, family: 'IEEEtran' })
  assert.equal(t.counts.figureWidths, 1)
  assert.ok(t.text.includes('width=\\columnwidth]{a}') && t.text.includes('width=\\textwidth]{b}'))
})

test('IEEE leftovers are adapted for other classes', () => {
  const t = transformTex('\\IEEEPARstart{E}{dge} x\n\\begin{IEEEbiography}{A}bio\\end{IEEEbiography}', { natbib: true, twoColumn: false, family: 'acmart' })
  assert.equal(t.text.trim(), 'Edge x')
})

test('BibTeX compatibility adds year and journal without removing biblatex fields', () => {
  const r = bibtexCompatible(bib)
  assert.equal(r.changed, 2)
  assert.ok(r.text.includes('year = {1984}') && r.text.includes('date = {1984}'))
  assert.ok(r.text.includes('journal = {Communications of the ACM}'))
  assert.equal(bibtexCompatible(r.text).changed, 0)
})

test('every target renders a complete document', () => {
  const src = fixture('article-authblk.tex')
  for (const t of TARGETS) {
    const out = convert(src, t.id, { journal: 'J' })
    const main = out.files['main.tex']!
    assert.ok(main.includes(`{${t.documentClass}}`), t.id)
    assert.ok(main.includes('\\begin{document}') && main.trim().endsWith('\\end{document}'), t.id)
    assert.ok(!main.includes('%%COLTEX'), `${t.id}: marks replaced`)
    assert.ok(!/\\usepackage(\[[^\]]*\])?\{geometry\}/.test(main) || t.id === 'article', `${t.id}: geometry dropped`)
  }
})

test('class-loaded packages pass their options instead of clashing', () => {
  const main = convert(fixture('article-authblk.tex'), 'acm-sigconf').files['main.tex']!
  assert.ok(main.startsWith('% Converted') && main.includes('\\PassOptionsToPackage{table}{xcolor}\n\\documentclass[sigconf]{acmart}'))
  assert.ok(!main.includes('\\usepackage[table]{xcolor}') && !main.includes('{amssymb}'))
})

test('acmart: title notes and missing countries', () => {
  const out = convert(fixture('article-plain.tex').replace('\\title{A Note on Primes}', '\\title{A Note\\thanks{Funded.}}'), 'acm-sigconf')
  const main = out.files['main.tex']!
  assert.ok(main.includes('\\title{A Note}\n\\titlenote{Funded.}'))
  assert.ok(main.includes('\\country{Country}'))
  assert.ok(out.notes.some(n => /country/.test(n.text)))
})

test('converting there and back keeps the metadata', () => {
  const original = extractPaper(fixture('elsarticle.tex'))
  for (const t of TARGETS) {
    const there = convert(fixture('elsarticle.tex'), t.id, { journal: 'Pattern Recognition' }).files['main.tex']!
    const back = extractPaper(there)
    assert.equal(back.title, original.title, t.id)
    assert.deepEqual(back.authors.map(a => a.name), original.authors.map(a => a.name), t.id)
    assert.deepEqual(back.keywords, original.keywords, t.id)
    assert.equal(back.abstract, original.abstract, t.id)
  }
})

test('an unknown country after a city is still the country, but not a state code', () => {
  assert.deepEqual(structureAffiliation('School of Computing, University of Nairobi, Nairobi, Kenya'), {
    country: 'Kenya',
    department: 'School of Computing',
    institution: 'University of Nairobi',
    city: 'Nairobi',
  })
  assert.equal(structureAffiliation('Stanford University, Stanford, CA').country, undefined)
})

test('arXiv-style article: emails inside authblk affiliations, keywords line, appendix after the references', () => {
  const p = extractPaper(fixture('arxiv.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations, a.email]), [
    ['First Author', ['a1'], 'first@example.org'],
    ['Second Author', ['a2'], 'second@example.com'],
  ])
  assert.deepEqual(p.affiliations[0], { id: 'a1', raw: 'Department, University, City, Country', department: 'Department', institution: 'University', city: 'City', country: 'Country' })
  assert.deepEqual(p.keywords, ['first keyword', 'second keyword', 'third keyword'])
  assert.equal(p.acknowledgments, 'Thank the people and funding that supported this work.')
  assert.deepEqual(p.bibliography, { kind: 'bibtex', files: ['refs'], style: 'plainnat' })
  assert.ok(/%%COLTEX:BIBLIOGRAPHY%%\s*\\appendix/.test(p.body))
  assert.ok(!p.notes.length)
})

test('an email shared by several authors of one affiliation is left for the report', () => {
  const src = fixture('arxiv.tex').replace('\\author[2]{Second Author}', '\\author[1]{Second Author}')
  const p = extractPaper(src)
  assert.deepEqual(p.authors.map(a => a.email), [undefined, undefined])
  assert.ok(p.notes.some(n => n.includes('first@example.org')))
})

test('llncs: amsthm and the theorem declarations it already has are dropped', () => {
  const out = convert(fixture('arxiv.tex'), 'lncs')
  const main = out.files['main.tex']!
  assert.ok(main.includes('\\documentclass[runningheads,envcountsame]{llncs}'))
  assert.ok(!/\{amsthm\}|\\newtheorem\{(theorem|lemma|definition)\}|\\theoremstyle|\\qedhere/.test(main))
  assert.ok(main.includes('\\newtheorem{assumption}{Assumption}'))
  assert.ok(main.includes('\\spnewtheorem*{observation}{Observation}{\\bfseries}{\\itshape}'))
  assert.ok(main.includes('1 + 1 = 2. \\qed'))
  assert.ok(/\\bibliography\{refs\}\s*\\appendix/.test(main))
  assert.ok(main.includes('\\institute{Department, University, City, Country\\\\\n\\email{first@example.org}'))
  // Other targets keep amsthm and the declarations as they are.
  for (const t of TARGETS.filter(x => x.id !== 'lncs')) {
    const other = convert(fixture('arxiv.tex'), t.id, { journal: 'J' }).files['main.tex']!
    assert.ok(other.includes('\\newtheorem{lemma}[theorem]{Lemma}') && other.includes('\\qedhere'), t.id)
  }
})

test('theorem environments the source class provided are declared for the target', () => {
  const article = convert(fixture('llncs.tex'), 'article').files['main.tex']!
  assert.ok(article.includes('\\usepackage{amsthm}'))
  assert.ok(article.includes('\\newtheorem{theorem}{Theorem}\n\\newtheorem{remark}{Remark}\n\\newtheorem*{claim}{Claim}'))
  // acmart has theorem and proof but no remark or claim.
  const acm = convert(fixture('llncs.tex'), 'acm-sigconf').files['main.tex']!
  assert.ok(!acm.includes('\\newtheorem{theorem}') && acm.includes('\\newtheorem{remark}{Remark}') && !acm.includes('{amsthm}'))
  const fromAcm = convert(fixture('acmart.tex'), 'ieee-journal').files['main.tex']!
  assert.ok(fromAcm.includes('\\newtheorem{theorem}{Theorem}[section]\n\\newtheorem{lemma}[theorem]{Lemma}'))
  assert.ok(fromAcm.includes('\\usepackage{amsthm}'))
  assert.ok(!convert(fixture('acmart.tex'), 'lncs').files['main.tex']!.includes('\\newtheorem'))
})

test('Springer Nature (sn-jnl): tagged names and affiliations, \\abstract{}, back matter', () => {
  const p = extractPaper(fixture('sn-jnl.tex'))
  assert.equal(p.title, 'Statin Use and Postoperative Delirium in Older Adults: a Cohort Study')
  assert.equal(p.shortTitle, 'Statins and Delirium')
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations, a.email, !!a.corresponding, a.note]), [
    ['Hanna van der Berg', ['a1', 'a2'], 'h.vanderberg@umcg.nl', true, undefined],
    ['Tomás Ortega, MD', ['a2'], 'tortega@ub.edu', false, 'These authors contributed equally to this work.'],
    ['Wei Chen', ['a1'], undefined, false, 'These authors contributed equally to this work.'],
  ])
  assert.deepEqual(p.affiliations[0], {
    id: 'a1',
    raw: 'Department of Anaesthesiology, University Medical Center Groningen, Hanzeplein 1, Groningen, 9713 GZ, Netherlands',
    department: 'Department of Anaesthesiology',
    institution: 'University Medical Center Groningen',
    city: 'Groningen',
    country: 'Netherlands',
  })
  assert.ok(p.abstract.startsWith('\\textbf{Purpose:} To estimate') && p.abstract.endsWith('less postoperative delirium.'))
  assert.ok(p.abstract.includes('\n\n\\textbf{Methods:}'))
  assert.deepEqual(p.keywords, ['delirium', 'statins', 'geriatric surgery', 'cohort study'])
  assert.equal(p.acknowledgments, 'We thank the nursing staff of both hospitals.')
  // The reference style is a class option: Vancouver, numbered, in citation order.
  assert.deepEqual(p.bibliography, { kind: 'bibtex', files: ['refs'], style: 'unsrtnat' })
  assert.deepEqual(p.packages.at(-1), { name: 'natbib', options: 'numbers,sort&compress' })
  assert.ok(p.preamble.includes('\\theoremstyle{plain}') && p.preamble.includes('\\theoremstyle{definition}') && !p.preamble.includes('thmstyle'))
  assert.ok(!/\\(?:email|equalcont|abstract|keywords|pacs|maketitle|affil|author)\b/.test(p.body))
  assert.ok(p.body.includes('\\bmhead{Supplementary information}') && p.body.includes('%%COLTEX:ACKNOWLEDGMENTS%%\n\\section*{Declarations}'))
})

test('Springer Nature constructs other classes lack are adapted', () => {
  const t = transformTex('\\backmatter\n\\bmhead{Data availability}\nOn request.\n\\toprule a\\\\\\botrule', { natbib: true, twoColumn: false, family: 'article' })
  assert.equal(t.text, '\n\\section*{Data availability}\nOn request.\n\\toprule a\\\\\\bottomrule')
  // The widest label sn-jnl's lists take as an option: other classes would print it or choke on it.
  const lists = transformTex('\\begin{enumerate}[1.]\n\\item A\\begin{enumerate}[(a)]\\item B\\end{enumerate}\n\\end{enumerate} \\begin{itemize}\n[x]\\end{itemize}', { natbib: true, twoColumn: false, family: 'article', dropListWidths: true })
  assert.equal(lists.text, '\\begin{enumerate}\n\\item A\\begin{enumerate}\\item B\\end{enumerate}\n\\end{enumerate} \\begin{itemize}\n[x]\\end{itemize}')
  const ieee = transformTex('\\begin{appendices}\n\\section{A}\n\\end{appendices}', { natbib: false, twoColumn: true, family: 'IEEEtran' })
  assert.equal(ieee.text, '\\appendices\n\\section{A}\n')
})

test('an sn-jnl paper converts to every target with its front matter', () => {
  const src = fixture('sn-jnl.tex')
  const original = extractPaper(src)
  for (const t of TARGETS) {
    const main = convert(src, t.id, { journal: 'J' }).files['main.tex']!
    assert.ok(!/\\(?:fnm|sur|orgname|bmhead|backmatter|botrule|equalcont)\b|thmstyle/.test(main), t.id)
    const back = extractPaper(main)
    assert.equal(back.title, original.title, t.id)
    assert.deepEqual(back.authors.map(a => a.name), original.authors.map(a => a.name), t.id)
    assert.deepEqual(back.keywords, original.keywords, t.id)
    assert.ok(back.abstract.includes('Statin use was associated with less postoperative delirium.'), t.id)
  }
  const article = convert(src, 'article').files['main.tex']!
  assert.ok(article.includes('\\usepackage[numbers,sort&compress]{natbib}') && article.includes('\\usepackage{booktabs}'))
  assert.ok(article.includes('\\bibliographystyle{unsrtnat}'))
  assert.ok(article.indexOf('{hyperref}') > article.indexOf('{authblk}'))
  assert.ok(article.includes('\\author[2]{{Tomás Ortega, MD}\\thanks{\\texttt{tortega@ub.edu}}\\thanks{These authors contributed equally to this work.}}'))
})

test('Elsevier CAS target: \\cormark, shared footnotes, keywords before \\maketitle', () => {
  const main = convert(fixture('sn-jnl.tex'), 'elsevier-cas').files['main.tex']!
  assert.ok(main.includes('\\documentclass[a4paper,fleqn]{cas-sc}'))
  assert.ok(main.includes('\\usepackage[numbers,sort&compress]{natbib}'))
  assert.ok(main.includes('\\shortauthors{van der Berg et al.}'))
  assert.ok(main.includes('\\author[1,2]{Hanna van der Berg}\n\\cormark[1]\n\\ead{h.vanderberg@umcg.nl}'))
  assert.ok(main.includes('\\author[2]{Tomás Ortega, MD}\n\\fnmark[1]') && main.includes('\\author[1]{Wei Chen}\n\\fnmark[1]'))
  assert.ok(main.includes('\\cortext[1]{Corresponding author}\n\\fntext[1]{These authors contributed equally to this work.}\n'))
  assert.ok(/\\end\{keywords\}\s*\\maketitle/.test(main))
  assert.ok(main.includes('\\bibliographystyle{cas-model2-names}'))
  // From an article without natbib, the target still gets it for its reference style.
  assert.ok(convert(fixture('article-plain.tex'), 'elsevier-cas').files['main.tex']!.includes('\\usepackage[numbers]{natbib}'))
})

test('OUP target: numbered addresses, corresponding author and a one-paragraph abstract', () => {
  const out = convert(fixture('sn-jnl.tex'), 'oup', { journal: 'Age and Ageing' })
  const main = out.files['main.tex']!
  assert.ok(main.includes('\\documentclass[webpdf,modern,large]{oup-authoring-template}'))
  assert.ok(main.includes('\\journaltitle{Age and Ageing}'))
  assert.ok(main.includes('\\title[Statins and Delirium]{Statin Use'))
  assert.ok(main.includes('\\author[1,2,$\\ast$]{Hanna van der Berg}\n\\author[2]{Tomás Ortega, MD}'))
  assert.ok(main.includes('\\address[2]{Faculty of Medicine, University of Barcelona, Barcelona, 08036, Spain}'))
  assert.ok(main.includes('\\corresp[$\\ast$]{Corresponding author. \\href{mailto:h.vanderberg@umcg.nl}{h.vanderberg@umcg.nl}}'))
  assert.ok(main.includes('of delirium.\\\\\n\\textbf{Methods:}'))
  assert.ok(!/\\usepackage(\[[^\]]*\])?\{appendix\}/.test(main) && main.includes('\\begin{appendices}'))
  assert.ok(out.notes.some(n => n.text.includes('placeholders')))
})

test('OUP and Elsevier CAS sources', () => {
  const oup = extractPaper(`\\documentclass[webpdf,modern,large]{oup-authoring-template}
\\journaltitle{Bioinformatics}
\\begin{document}
\\title[Short]{A Long Title}
\\author[1,$\\ast$]{Ann Lee\\ORCID{0000-0002-1825-0097}}
\\author[2]{Ben Ray}
\\authormark{Lee and Ray}
\\address[1]{\\orgdiv{Department of Genetics}, \\orgname{University of Oxford}, \\orgaddress{\\street{South Parks Road}, \\postcode{OX1 3QU}, \\country{UK}}}
\\address[2]{\\orgname{EMBL}, \\orgaddress{\\city{Heidelberg}, \\country{Germany}}}
\\corresp[$\\ast$]{Corresponding author. \\href{mailto:ann.lee@ox.ac.uk}{ann.lee@ox.ac.uk}}
\\received{Date}{0}{Year}
\\abstract{\\subheading{Motivation} Genomes are long.\\\\ \\subheading{Results} We read them.}
\\keywords[Key words]{genomics, alignment}
\\maketitle
\\section{Introduction}
Text.
\\end{document}`)
  assert.deepEqual(oup.authors.map(a => [a.name, a.affiliations, a.email, !!a.corresponding, a.orcid]), [
    ['Ann Lee', ['a1'], 'ann.lee@ox.ac.uk', true, '0000-0002-1825-0097'],
    ['Ben Ray', ['a2'], undefined, false, undefined],
  ])
  assert.equal(oup.affiliations[0]!.raw, 'Department of Genetics, University of Oxford, South Parks Road, OX1 3QU, UK')
  assert.equal(oup.affiliations[1]!.city, 'Heidelberg')
  assert.equal(oup.abstract, '\\textbf{Motivation} Genomes are long.\\\\ \\textbf{Results} We read them.')
  assert.deepEqual(oup.keywords, ['genomics', 'alignment'])
  assert.equal(oup.hints.journal, 'Bioinformatics')
  assert.equal(oup.body.trim(), '\\section{Introduction}\nText.')

  const cas = extractPaper(`\\documentclass[a4paper,fleqn]{cas-sc}
\\begin{document}
\\shorttitle{Short}
\\shortauthors{Kim et al.}
\\title [mode = title]{Sepsis Prediction}
\\author[1]{Min Kim}[orcid=0000-0001-7511-2910]
\\cormark[1]
\\ead{min.kim@snu.ac.kr}
\\credit{Writing}
\\author[1,2]{Lea Roth}
\\affiliation[1]{organization={Seoul National University Hospital}, city={Seoul}, country={South Korea}}
\\affiliation[2]{organization={Charité}, city={Berlin}, country={Germany}}
\\cortext[1]{Corresponding author}
\\begin{abstract}
We predict sepsis.
\\end{abstract}
\\begin{keywords}
sepsis \\sep prediction
\\end{keywords}
\\maketitle
\\section{Introduction}
Text.
\\end{document}`)
  assert.equal(cas.title, 'Sepsis Prediction')
  assert.deepEqual(cas.authors.map(a => [a.name, a.affiliations, a.email, !!a.corresponding, a.orcid]), [
    ['Min Kim', ['a1'], 'min.kim@snu.ac.kr', true, '0000-0001-7511-2910'],
    ['Lea Roth', ['a1', 'a2'], undefined, false, undefined],
  ])
  assert.equal(cas.affiliations[1]!.institution, 'Charité')
  assert.deepEqual(cas.keywords, ['sepsis', 'prediction'])
  assert.equal(cas.body.trim(), '\\section{Introduction}\nText.')
})

test('BMC (bmcart): key=value authors, \\parttitle abstracts, \\kwd keywords, the backmatter environment', () => {
  const p = extractPaper(fixture('bmcart.tex'))
  assert.deepEqual(p.authors.map(a => [a.name, a.affiliations, a.email, !!a.corresponding]), [
    ['Kwame Osei', ['a1', 'a2'], 'k.osei@ug.edu.gh', true],
    ['Louise Moreau', ['a2'], 'l.moreau@chu-lyon.fr', false],
  ])
  assert.deepEqual(p.affiliations[0], {
    id: 'a1',
    raw: 'Department of Medicine, University of Ghana Medical School, Accra, Ghana',
    department: 'Department of Medicine',
    institution: 'University of Ghana Medical School',
    city: 'Accra',
    country: 'Ghana',
  })
  assert.ok(p.abstract.startsWith('\\textbf{Background}\nReadmission') && p.abstract.includes('\\textbf{Results}'))
  assert.deepEqual(p.keywords, ['heart failure', 'telemonitoring', 'randomised trial'])
  assert.equal(p.acknowledgments, 'We thank the participating patients.')
  assert.equal(p.preamble, '\\newcommand{\\HR}{\\mathrm{HR}}')
  assert.ok(!/fmbox|abstractbox|dochead|frontmatter/.test(p.body))
  const main = convert(fixture('bmcart.tex'), 'article').files['main.tex']!
  assert.ok(!main.includes('backmatter') && main.includes('\\bibliographystyle{plainnat}') && main.includes('\\usepackage{natbib}'))
})

// The built-in templates (apps/server/templates), read as the conversion dialog reads a project.
// scripts/template-matrix.ts compiles every one of them converted to every target.
const templatesDir = new URL('../../../apps/server/templates/', import.meta.url)
function template(id: string) {
  const dir = new URL(`${id}/`, templatesDir)
  const main = fs.readFileSync(new URL('main.tex', dir), 'utf8')
  const refs = fs.existsSync(new URL('references.bib', dir)) ? fs.readFileSync(new URL('references.bib', dir), 'utf8') : ''
  const paper = extractPaper(main)
  const to = (target: Parameters<typeof convertPaper>[1], options = {}) =>
    convertPaper(paper, target, options, { rootFile: 'main.tex', texFiles: { 'main.tex': main }, bibFiles: { 'references.bib': refs } })
  return { paper, to }
}

test('layout commands of packages the target leaves out get definitions before they are used', () => {
  // clinical-study's \doublespacing (setspace) and \linenumbers (lineno), in its preamble.
  const oup = template('clinical-study').to('oup').files['main.tex']!
  assert.ok(!/\\usepackage(\[[^\]]*\])?\{setspace\}/.test(oup), 'setspace is left out')
  const defined = oup.indexOf('\\providecommand{\\doublespacing}')
  assert.ok(defined !== -1 && defined < oup.indexOf('\n\\doublespacing'), 'defined before its use')
  const revtex = template('clinical-study').to('revtex').files['main.tex']!
  assert.ok(!/\\usepackage\{lineno\}/.test(revtex), 'REVTeX numbers lines itself')
  assert.ok(revtex.indexOf('\\providecommand{\\linenumbers}') < revtex.indexOf('\n\\linenumbers'))
})

test('class-specific commands of the sources: jmlr, AMS, Elsevier CAS, Nature, MNRAS', () => {
  const jmlr = template('jmlr').to('article').files['main.tex']!
  assert.ok(!/\\jmlr(volume|year|workshop)|\\editors/.test(jmlr))
  assert.match(jmlr, /\\providecommand\{\\floatconts\}/)
  assert.match(jmlr, /\\newtheorem\{theorem\}/, 'jmlr provided theorem')
  const ams = template('amsart').to('elsevier').files['main.tex']!
  assert.ok(!/\\subjclass/.test(ams))
  assert.match(ams, /\\usepackage\{amsthm\}/, 'amsart had amsthm built in')
  const cas = template('elsevier-cas').to('article').files['main.tex']!
  assert.ok(!/\[pos=/.test(cas), 'CAS float keys become placements')
  assert.match(cas, /\\providecommand\{\\printcredits\}/)
  const nature = template('nature').to('oup').files['main.tex']!
  assert.match(nature, /\\newenvironment\{methods\}/)
  assert.ok(!/\\begin\{description\}/.test(nature.split('\\begin{document}')[0]!), 'OUP has no description environment')
  const mnras = template('amsart').to('mnras').files['main.tex']!
  assert.match(mnras, /\\let\\proof\\relax\n\\let\\endproof\\relax\n\\usepackage\{amsthm\}/, 'mnras keeps its own proof')
  // SPIE's bare \acknowledgments heading is read as the acknowledgments.
  assert.match(template('spie').paper.acknowledgments ?? '', /^Thank the people/)
})

test('authors and affiliations of the classes the new templates use', () => {
  for (const id of ['jmlr', 'apa7', 'mnras', 'nature', 'spie', 'jpsj', 'jacow', 'asme-conference', 'nrc', 'aastex', 'acs-journal', 'annals-math', 'asce', 'aiaa']) {
    const p = template(id).paper
    assert.ok(p.authors.length >= 2, `${id}: ${p.authors.map(a => a.name).join(' / ')}`)
    assert.ok(p.affiliations.length >= 1, `${id} affiliations`)
    assert.ok(p.abstract.length > 20, `${id} abstract`)
  }
  assert.deepEqual(template('mnras').paper.authors.map(a => a.name), ['First Author', 'Second Author'])
  assert.deepEqual(template('nature').paper.authors.map(a => a.affiliations.length), [1, 2, 1])
  assert.deepEqual(template('aastex').paper.keywords, ['Cosmology', 'Type Ia supernovae'])
  assert.equal(template('jmlr').paper.authors[0]!.email, 'first@example.org')
  assert.equal(template('humanities-chicago').paper.bibliography.kind, 'biblatex')
})

test('the new targets: AMS, APA 7, AASTeX, MNRAS, ACS and Elsevier CAS in two columns', () => {
  const t = template('elsevier')
  assert.match(t.to('amsart').files['main.tex']!, /\\documentclass\{amsart\}[\s\S]*\\address\{[\s\S]*\\maketitle/)
  const apa = t.to('apa7').files['main.tex']!
  assert.match(apa, /\\authorsnames\[1,2\]\{First Author, Second Author\}/)
  assert.match(apa, /\\bibliographystyle\{apacite\}/)
  const aas = template('lncs').to('aastex').files['main.tex']!
  assert.equal((aas.match(/\\email\{/g) ?? []).length, 2, 'every author has an email (AASTeX stops otherwise)')
  assert.match(t.to('mnras').files['main.tex']!, /\\author\[[^\]]*\]\{\nFirst Author\$\^\{1\}\$/)
  assert.match(t.to('achemso', { journal: 'jpccck' }).files['main.tex']!, /\\documentclass\[journal=jpccck,manuscript=article\]\{achemso\}/)
  assert.match(t.to('elsevier-cas-dc').files['main.tex']!, /\]\{cas-dc\}/)
  assert.equal(TARGETS.length, 16)
})

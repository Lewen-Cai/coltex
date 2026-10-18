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

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { ConvertError, convertToTemplate, extractPaper, type TemplateInput } from '../src/index.ts'

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const bib = fixture('refs.bib')

/** A template given as its main file (and other files by name). */
function template(main: string, files: Record<string, string> = {}, name = 'Test'): TemplateInput {
  const all: Record<string, string> = { 'main.tex': main, ...files }
  return { name, rootFile: 'main.tex', main, paths: Object.keys(all), read: p => all[p] }
}

function into(sourceName: string, tpl: TemplateInput) {
  const src = fixture(sourceName)
  return convertToTemplate(extractPaper(src), tpl, {}, { rootFile: 'main.tex', texFiles: { 'main.tex': src }, bibFiles: { 'refs.bib': bib } })
}

test('a class nobody knows: authors, affiliations, abstract and keywords written the way its sample is', () => {
  const dir = 'templates/byot-journal/'
  const tpl = template(fixture(`${dir}main.tex`), { 'byot-journal.cls': fixture(`${dir}byot-journal.cls`), 'sn-bibliography.bib': fixture(`${dir}sn-bibliography.bib`) })
  const r = into('ieee-conference.tex', tpl)
  const main = r.files['main.tex']!
  assert.match(main, /\\documentclass\[pdflatex,sn-mathphys-num\]\{byot-journal\}/)
  assert.match(main, /\\author\[1\]\{\\fnm\{Dan\} \\sur\{Brown\}\}\n\\email\{dbrown@stanford\.edu\}/)
  assert.match(main, /\\affil\[1\]\{\\orgdiv\{Dept\. of Electrical Engineering\}, \\orgname\{Stanford University\}, \\orgaddress\{\\city\{Stanford\}, \\country\{USA\}\}\}/)
  assert.match(main, /\\abstract\{Edge devices need fast inference\.\}/)
  assert.match(main, /\\keywords\{edge computing, inference, latency\}/)
  // The class sets the reference style: no \bibliographystyle of ColTex's.
  assert.match(main, /\\bibliography\{refs\}/)
  assert.doesNotMatch(main, /\\bibliographystyle/)
  for (const sample of ['Article Title', 'First} \\sur{Author', 'iauthor@gmail.com', 'The Introduction section']) assert.ok(!main.includes(sample), sample)
  assert.equal(r.documentClass, 'byot-journal')
  assert.deepEqual(r.templateFiles, { 'main.tex': 'main-template.tex', 'byot-journal.cls': 'byot-journal.cls', 'sn-bibliography.bib': 'sn-bibliography.bib' })
  // Its \title can't be trusted with a \thanks: the note is reported instead.
  assert.ok(main.includes('\\title[Fast Edge Inference]{Fast Edge Inference}'))
  assert.ok(r.notes.some(n => n.text.startsWith("The title's note was left out (Supported by NSF grant 123.)")))
  // natbib comes with the class: the paper's cite package would clash with it.
  assert.doesNotMatch(main, /\\usepackage\{cite\}/)
})

test('labelled affiliations follow the sample: numbers or aff1, key=value, and only the tags the class has', () => {
  const elsevier = template(`\\documentclass{elsarticle}
\\begin{document}
\\begin{frontmatter}
\\title{T}
\\author[label1]{A. Author\\corref{cor1}}
\\ead{a@x.org}
\\affiliation[label1]{organization={Org},
  city={City},
  country={Country}}
\\cortext[cor1]{Corresponding author.}
\\begin{abstract}
Sample.
\\end{abstract}
\\begin{keyword}
one \\sep two
\\end{keyword}
\\end{frontmatter}
\\section{Intro}
Sample.
\\end{document}
`)
  const main = into('sn-jnl.tex', elsevier).files['main.tex']!
  assert.match(main, /\\author\[label1,label2\]\{Hanna van der Berg\\corref\{cor1\}\}\n\\ead\{h\.vanderberg@umcg\.nl\}/)
  assert.match(main, /\\affiliation\[label2\]\{organization=\{Faculty of Medicine, University of Barcelona\},\n  city=\{Barcelona\},\n  country=\{Spain\}\}/)
  assert.equal(main.match(/\\cortext/g)?.length, 1, 'the sample \\cortext gives way to ours')
  assert.match(main, /\\begin\{keyword\}\ndelirium \\sep statins \\sep geriatric surgery \\sep cohort study\n\\end\{keyword\}/)
  assert.match(main, /\\end\{frontmatter\}/)

  // OUP's \\orgaddress has \\country but not \\city: the city goes in as text.
  const oup = template(`\\documentclass{oup-authoring-template}
\\begin{document}
\\title[Short]{Title}
\\author[1,$\\ast$]{First Author}
\\address[1]{\\orgdiv{Department}, \\orgname{Organization}, \\orgaddress{\\street{Street}, \\postcode{Postcode}, \\country{Country}}}
\\corresp[$\\ast$]{Corresponding author. \\href{mailto:email@x.org}{email@x.org}}
\\abstract{Sample.}
\\maketitle
\\section{Intro}
\\end{document}
`)
  const o = into('elsarticle.tex', oup).files['main.tex']!
  assert.match(o, /\\author\[1,\$\\ast\$\]\{Ivan Petrov\}/)
  assert.match(o, /\\address\[1\]\{\\orgdiv\{Department of Mathematics\}, \\orgname\{ETH Zurich\}, \\orgaddress\{Zurich, \\country\{Switzerland\}\}\}/)
  assert.match(o, /\\corresp\[\$\\ast\$\]\{Corresponding author\. \\href\{mailto:ivan@ethz\.ch\}\{ivan@ethz\.ch\}\}/)
  assert.match(o, /\\providecommand\{\\appendix\}/)
})

test("the template's places: keywords inside the abstract, one keyword a command, sample text before the first heading", () => {
  const lncs = template(`\\documentclass[runningheads]{llncs}
\\begin{document}
\\title{Contribution Title}
\\author{First Author\\inst{1} \\and Second Author\\inst{2}}
\\authorrunning{F. Author et al.}
\\institute{Princeton University \\and Springer Heidelberg}
\\maketitle
\\begin{abstract}
The abstract.
\\keywords{First keyword \\and Second keyword}
\\end{abstract}
\\section{First Section}
\\end{document}
`)
  const l = into('elsarticle.tex', lncs).files['main.tex']!
  assert.match(l, /\\begin\{abstract\}\nClustering in the presence of outliers\.\n\n\\keywords\{clustering \\and outliers \\and robustness\}\n\\end\{abstract\}/)
  assert.match(l, /\\author\{Ivan Petrov\\inst\{1\} \\and\nJulia Rossi\\inst\{1,2\}\}\n\\authorrunning\{Petrov and Rossi\}\n\\institute\{/)

  const aomart = template(`\\documentclass{aomart}
\\title{Title}
\\author{First Author}
\\address{Department}
\\email{first@example.org}
\\keyword{first keyword}
\\keyword{second keyword}
\\begin{document}
\\begin{abstract}
Sample.
\\end{abstract}
\\maketitle
Sample text without a heading, which goes.
\\section{Introduction}
\\end{document}
`)
  const a = into('elsarticle.tex', aomart).files['main.tex']!
  assert.match(a, /\\keyword\{clustering\}\n\\keyword\{outliers\}\n\\keyword\{robustness\}/)
  assert.ok(!a.includes('Sample text without a heading'))
  assert.match(a, /\\author\{Ivan Petrov\}\n\\address\{Department of Mathematics, ETH Zurich, Zurich, Switzerland\}\n\\email\{ivan@ethz\.ch\}/)
})

test("the preamble: the template's packages and definitions first, the paper's definitions win, biblatex keeps \\citet", () => {
  const tpl = template(`\\documentclass{article}
\\usepackage[style=authoryear]{biblatex}
\\addbibresource{sample.bib}
\\newcommand{\\R}{\\mathbf{R}}
\\newtheorem{theorem}{Theorem}
\\usepackage{hyperref}
\\begin{document}
\\title{T}
\\author{A}
\\maketitle
\\section{S}
\\printbibliography
\\end{document}
`)
  const r = into('article-authblk.tex', tpl)
  const main = r.files['main.tex']!
  assert.doesNotMatch(main, /natbib=true/, 'its biblatex citations need nothing')
  assert.ok(main.indexOf("The paper's packages") < main.indexOf('\\usepackage{hyperref}'), 'hyperref stays last')
  assert.match(main, /\\addbibresource\{refs\.bib\}/)
  assert.ok(!main.includes('sample.bib'))
  assert.equal(main.match(/\\newcommand\{\\R\}/g)?.length, 1, "the paper's \\R replaces the template's")
  assert.ok(main.indexOf('\\newcommand{\\R}{\\mathbb{R}}') < main.indexOf('\\begin{document}'))
  assert.match(main, /\\textcite\{knuth\}/, 'citations stay')
  assert.match(main, /\\printbibliography/)
  assert.ok(r.notes.some(n => n.text.startsWith("The paper's definitions replace the template's: \\R")))
  // natbib's \citet in a BibTeX paper: biblatex's natbib option keeps it.
  const n = into('elsarticle.tex', tpl).files['main.tex']!
  assert.match(n, /^\\PassOptionsToPackage\{natbib=true\}\{biblatex\}$/m)
  assert.match(n, /\\citet\{knuth\}/)
  assert.doesNotMatch(n, /\\usepackage\{natbib\}/)
})

test('a template without a document is refused', () => {
  assert.throws(() => into('article-plain.tex', template('\\documentclass{article}\n')), ConvertError)
})

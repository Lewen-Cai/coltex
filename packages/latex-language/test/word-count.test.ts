// The first two tests are ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/test/frontend/features/word-count-modal/utils/count-words-in-file.test.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root. The rest are ColTex's.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { countProjectWords } from '../src/index'

const fixtures = path.join(import.meta.dirname, 'fixtures/word-count')
const read = (name: string) => readFile(path.join(fixtures, name), 'utf-8')

describe('word count (Overleaf fixtures)', () => {
  const files = new Map<string, string>()
  beforeAll(async () => {
    files.set('word-count.tex', await read('word-count.tex'))
    files.set('word-count-with-ignored-sections.tex', await read('word-count-with-ignored-sections.tex'))
    files.set('extra-words.tex', await read('extra-words.tex'))
    files.set('subfolder/extra-words.tex', await read('extra-words.tex'))
  })

  test('produces correct counts', () => {
    expect(countProjectWords({ files, rootFile: 'word-count.tex', locale: 'en_US' })).toMatchObject({
      abstractCharacters: 8,
      abstractWords: 2,
      captionCharacters: 16,
      captionWords: 4,
      footnoteCharacters: 8,
      footnoteWords: 2,
      headCharacters: 305,
      headWords: 53,
      otherCharacters: 10,
      otherWords: 2,
      textCharacters: 249,
      textWords: 56,
      textCjk: 0,
    })
  })

  test('skips ignored sections', () => {
    expect(countProjectWords({ files, rootFile: 'word-count-with-ignored-sections.tex', locale: 'en_US' })).toMatchObject({
      abstractWords: 0,
      headWords: 0,
      otherWords: 0,
      textCharacters: 10,
      textWords: 3,
    })
  })
})

const doc = (body: string, preamble = '\\documentclass{article}') => `${preamble}\n\\begin{document}\n${body}\n\\end{document}\n`

describe('word count (ColTex)', () => {
  test('follows \\input and \\include across folders, relative to the root and to the including file', () => {
    const files = new Map([
      ['main.tex', doc('One two.\n\\input{sections/intro}\n\\include{chapters/a.tex}')],
      ['sections/intro.tex', 'Three four five.\n\\input{nested}'],
      // Found relative to the including file's folder (sections/).
      ['sections/nested.tex', 'Six.'],
      ['chapters/a.tex', '\\section{Heading here}\nSeven eight.'],
    ])
    const data = countProjectWords({ files, rootFile: 'main.tex', locale: 'en_US' })
    expect(data.textWords).toBe(8)
    expect(data.headWords).toBe(2)
    expect(data.headers).toBe(1)
  })

  test('ignores include cycles and missing files', () => {
    const files = new Map([
      ['main.tex', doc('Alpha.\n\\input{a}\n\\input{missing}')],
      ['a.tex', 'Beta.\n\\input{b}'],
      ['b.tex', 'Gamma.\n\\input{a}\n\\input{main}'],
    ])
    expect(countProjectWords({ files, rootFile: 'main.tex', locale: 'en_US' }).textWords).toBe(3)
  })

  test('counts CJK characters per context in a ctex document', () => {
    const files = new Map([
      [
        'main.tex',
        doc(
          '\\section{引言}\n这是一个测试。Hello world.\n\\begin{abstract}\n摘要内容\n\\end{abstract}\n\\footnote{脚注}\n$x^2$',
          '\\documentclass{ctexart}\n\\title{中文标题}',
        ),
      ],
    ])
    const data = countProjectWords({ files, rootFile: 'main.tex', locale: 'en_US' })
    // 这是一个测试 = 6 (the full stop is punctuation, not a character of a script).
    expect(data.textCjk).toBe(6)
    expect(data.headCjk).toBe(2 + 4) // 引言 + 中文标题
    expect(data.abstractCjk).toBe(4)
    expect(data.footnoteCjk).toBe(2)
    expect(data.mathInline).toBe(1)
    // Latin words are still counted as words alongside the CJK text.
    expect(data.textWords).toBeGreaterThanOrEqual(2)
  })

  test('%TC:ignore blocks are skipped in included files too', () => {
    const files = new Map([
      ['main.tex', doc('Counted.\n\\input{part}')],
      ['part.tex', 'Also counted.\n%TC:ignore\nNot this.\n%TC:endignore\nAnd this.'],
    ])
    expect(countProjectWords({ files, rootFile: 'main.tex', locale: 'en_US' }).textWords).toBe(5)
  })

  test('an unknown root gives zero counts', () => {
    expect(countProjectWords({ files: new Map(), rootFile: 'main.tex' }).textWords).toBe(0)
  })
})

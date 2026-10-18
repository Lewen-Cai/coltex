import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { replacementFor, searchFiles } from '../src/search/project-search.ts'

const files = [
  { path: 'main.tex', content: 'The Colour of colour.\n\\section{Colours}\n颜色和colour' },
  { path: 'refs.bib', content: '@article{colour2020,}' },
]
const opts = { caseSensitive: false, regex: false, wholeWord: false }

describe('project search', () => {
  test('plain search: case, lines and previews', () => {
    const { matches } = searchFiles(files, { ...opts, query: 'colour' })
    assert.deepEqual(
      matches.map(m => [m.path, m.line, m.text]),
      [
        ['main.tex', 1, 'Colour'],
        ['main.tex', 1, 'colour'],
        ['main.tex', 2, 'Colour'],
        ['main.tex', 3, 'colour'],
        ['refs.bib', 1, 'colour'],
      ],
    )
    assert.equal(searchFiles(files, { ...opts, query: 'colour', caseSensitive: true }).matches.length, 3)
    const third = matches[2]!
    assert.equal(files[0]!.content.slice(third.from, third.to), 'Colour')
    assert.equal(third.before, '\\section{')
    assert.equal(third.after, 's}')
  })

  test('whole words work next to CJK text and punctuation', () => {
    const { matches } = searchFiles(files, { ...opts, query: 'colour', wholeWord: true })
    // "Colours" and "colour2020" are other words; in "和colour" it stands on its own.
    assert.deepEqual(
      matches.map(m => [m.line, m.text]),
      [
        [1, 'Colour'],
        [1, 'colour'],
        [3, 'colour'],
      ],
    )
    assert.equal(searchFiles([{ path: 'a', content: 'xcolour' }], { ...opts, query: 'colour', wholeWord: true }).matches.length, 0)
  })

  test('regular expressions, empty matches and limits', () => {
    assert.equal(searchFiles(files, { ...opts, query: 'colou?rs?', regex: true }).matches.length, 5)
    assert.equal(searchFiles(files, { ...opts, query: 'x*', regex: true }).matches.length, 0)
    assert.throws(() => searchFiles(files, { ...opts, query: '(', regex: true }))
    const limited = searchFiles(files, { ...opts, query: 'o' }, 3)
    assert.equal(limited.matches.length, 3)
    assert.equal(limited.truncated, true)
  })

  test('replacements expand groups only for regular expressions', () => {
    const [m] = searchFiles(files, { ...opts, query: '\\\\section\\{(?<title>\\w+)\\}', regex: true }).matches
    const match = m!
    assert.equal(replacementFor(match, '\\chapter{$1} $<title> $& $$ $9', true), '\\chapter{Colours} Colours \\section{Colours} $ $9')
    assert.equal(replacementFor(match, '\\chapter{$1}', false), '\\chapter{$1}')
    assert.equal(replacementFor(match, '$12', true), 'Colours2')
  })
})

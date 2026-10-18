import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { findEditTarget } from '../src/ai/match.ts'

const apply = (text: string, needle: string, replacement: string) => {
  const r = findEditTarget(text, needle)
  if ('error' in r) return r
  return { text: text.slice(0, r.match.start) + replacement + text.slice(r.match.end), kind: r.match.kind }
}

describe('finding the text an edit replaces', () => {
  test('exact matches win and must be unique', () => {
    assert.deepEqual(apply('a \\alpha b', '\\alpha', '\\beta'), { text: 'a \\beta b', kind: 'exact' })
    assert.deepEqual(findEditTarget('x x', 'x'), { error: 'ambiguous', count: 2, kind: 'exact' })
    assert.deepEqual(findEditTarget('abc', 'zzz'), { error: 'not_found' })
  })

  test('curly and TeX quotes match each other, and the replacement covers the original span', () => {
    const tex = "He said ``hello'' and it's `fine'."
    assert.deepEqual(apply(tex, 'said “hello” and it’s', "said ``hi'' and it is"), { text: "He said ``hi'' and it is `fine'.", kind: 'quotes' })
    assert.deepEqual(apply('a\u00A0b c', 'a b', 'X'), { text: 'X c', kind: 'quotes' })
  })

  test('trailing spaces, tabs and runs of spaces are ignored only when needed', () => {
    const tex = '\\begin{itemize}  \n\t\\item  One\n\\end{itemize}\n'
    assert.deepEqual(apply(tex, '\\begin{itemize}\n  \\item One\n', '\\begin{enumerate}\n  \\item One\n'), {
      text: '\\begin{enumerate}\n  \\item One\n\\end{itemize}\n',
      kind: 'whitespace',
    })
    assert.deepEqual(apply('a\r\nb', 'a\nb', 'c'), { text: 'c', kind: 'whitespace' })
  })

  test('several loose matches are an error, not a guess', () => {
    assert.deepEqual(findEditTarget("“x” and ``x''", '"x"'), { error: 'ambiguous', count: 2, kind: 'quotes' })
    assert.deepEqual(findEditTarget('“x” and "x"', '"x"'), { match: { start: 8, end: 11, kind: 'exact' } }, 'an exact match wins')
  })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { excerpt } from '../src/texlive.ts'

const text = Array.from({ length: 600 }, (_, i) => (i === 99 ? '\\DeclareOption{draft}{...}' : `line ${i + 1}`)).join('\n')

test('a query returns numbered matches with context', () => {
  const r = excerpt(text, { kind: 'source', name: 'x', query: 'declareoption' })
  assert.equal(r.totalLines, 600)
  assert.deepEqual(r.text.split('\n'), ['98: line 98', '99: line 99', '100: \\DeclareOption{draft}{...}', '101: line 101', '102: line 102'])
})

test('without a query, pages of lines with a pointer to the next page', () => {
  const r = excerpt(text, { kind: 'doc', name: 'x', fromLine: 251 })
  const lines = r.text.split('\n')
  assert.equal(lines[0], '251: line 251')
  assert.match(lines.at(-1)!, /continue with fromLine 501/)
})

test('a query without matches says so', () => {
  assert.match(excerpt(text, { kind: 'source', name: 'x', query: 'nothing here' }).text, /No lines contain/)
})

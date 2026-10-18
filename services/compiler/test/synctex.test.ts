import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEdit, parseView } from '../src/synctex.ts'

// Captured from `synctex` 1.5 in the compiler image.
const VIEW = `This is SyncTeX command line utility, version 1.5
SyncTeX result begin
Output:/data/outputs/p/b/output.pdf
Page:1
x:162.272629
y:292.146637
h:133.768356
v:294.083801
W:343.711060
H:8.855677
before:
offset:-1
middle:
after:
SyncTeX result end
`

const EDIT = `This is SyncTeX command line utility, version 1.5
SyncTeX result begin
Output:/data/outputs/p/b/output.pdf
Input:/work/aC0j7sz1wgxn/./sec/intro.tex
Line:11
Column:-1
Offset:0
Context:
SyncTeX result end
`

test('parseView reads boxes', () => {
  assert.deepEqual(parseView(VIEW), [{ page: 1, h: 133.768356, v: 294.083801, width: 343.71106, height: 8.855677 }])
  assert.deepEqual(parseView('SyncTeX Warning: No tag for nope.tex\n'), [])
})

test('parseEdit returns project-relative paths', () => {
  assert.deepEqual(parseEdit(EDIT, '/work/aC0j7sz1wgxn'), { file: 'sec/intro.tex', line: 11, column: 0 })
  assert.equal(parseEdit(EDIT.replace('/work/aC0j7sz1wgxn/./sec/intro.tex', '/usr/local/texlive/x.cls'), '/work/aC0j7sz1wgxn'), null)
})

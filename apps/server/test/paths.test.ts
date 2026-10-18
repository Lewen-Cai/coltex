import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanPath } from '../src/storage/paths.ts'

test('cleanPath normalises safe paths', () => {
  assert.equal(cleanPath('main.tex'), 'main.tex')
  assert.equal(cleanPath('/sec/./intro.tex'), 'sec/intro.tex')
  assert.equal(cleanPath('a\\b.tex'), 'a/b.tex')
})

test('cleanPath rejects traversal and metadata paths', () => {
  for (const bad of ['../x', 'a/../../x', '..', 'main.tex.coltex-tmp', '', '.', '.coltex-folder', 'figs/.coltex-folder']) {
    assert.throws(() => cleanPath(bad), `expected ${JSON.stringify(bad)} to be rejected`)
  }
})

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Changeset } from '../src/ai/changeset.ts'
import { NotFoundError } from '../src/errors.ts'
import type { ProjectStore } from '../src/storage/types.ts'

function changeset(files: Record<string, string>) {
  const store = {
    async readFile(_id: string, path: string) {
      if (!(path in files)) throw new NotFoundError(path)
      return Buffer.from(files[path]!)
    },
  } as unknown as ProjectStore
  return new Changeset('p1', store)
}

describe('turns of the draft', () => {
  test('each turn reports what it changed, and the "this turn" base is the draft before it', async () => {
    const c = changeset({ 'main.tex': 'a\nb\nc\n', 'refs.bib': '@x{}\n' })
    c.beginTurn()
    await c.edit('main.tex', 'b', 'B')
    assert.deepEqual(await c.endTurn(), [{ path: 'main.tex', kind: 'modified', added: 1, removed: 1 }])
    assert.deepEqual(c.toJSON().turn, { base: { 'main.tex': 'a\nb\nc\n' } })

    c.beginTurn()
    await c.edit('main.tex', 'c', 'C\nD')
    await c.create('sec.tex', 'new\n')
    assert.deepEqual(await c.endTurn(), [
      { path: 'main.tex', kind: 'modified', added: 2, removed: 1 },
      { path: 'sec.tex', kind: 'created', added: 1, removed: 0 },
    ])
    assert.deepEqual(c.toJSON().turn, { base: { 'main.tex': 'a\nB\nc\n', 'sec.tex': null } }, 'starts from the previous turn')

    c.beginTurn()
    assert.deepEqual(await c.endTurn(), [], 'a turn without edits')
    assert.ok(c.toJSON().turn?.base['sec.tex'] === null, 'keeps the last turn that changed something')

    c.beginTurn()
    c.revert('sec.tex')
    assert.deepEqual(await c.endTurn(), [{ path: 'sec.tex', kind: 'reverted', added: 0, removed: 1 }])
  })
})

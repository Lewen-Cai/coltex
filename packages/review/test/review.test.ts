import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as Y from 'yjs'
import {
  TEXT_KEY,
  acceptChanges,
  changesMap,
  commentsMap,
  lineAt,
  applyTrackedEdits,
  baseText,
  checkSuggestionUpdate,
  rejectChanges,
  relPos,
  resolveReview,
  undoDecision,
  type DecisionUndo,
} from '../src/index.ts'

function setup(initial: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText(TEXT_KEY)
  ytext.insert(0, initial)
  return { doc, ytext }
}

/** Replace [from, to) with `insert` as a tracked edit, the way the editor does. */
function edit(doc: Y.Doc, from: number, to: number, insert: string, userId = 'alice') {
  applyTrackedEdits(doc, [{ fromA: from, toA: to, insert }], userId, Date.now())
}

const summary = (doc: Y.Doc) => resolveReview(doc).changes.map(c => `${c.type}:${c.from}-${c.to}:${c.text}:${c.userId}`)

test('typing a word yields one insertion', () => {
  const { doc, ytext } = setup('Hello world')
  for (const [i, ch] of [...' big'].entries()) edit(doc, 5 + i, 5 + i, ch)
  assert.equal(ytext.toString(), 'Hello big world')
  assert.deepEqual(summary(doc), ['insert:5-9: big:alice'])
})

test('typing before an own insertion extends it', () => {
  const { doc } = setup('ab')
  edit(doc, 1, 1, 'Y')
  edit(doc, 1, 1, 'X')
  assert.deepEqual(summary(doc), ['insert:1-3:XY:alice'])
})

test('backspacing merges into one deletion in reading order', () => {
  const { doc, ytext } = setup('Hello world')
  edit(doc, 10, 11, '')
  edit(doc, 9, 10, '')
  edit(doc, 8, 9, '')
  assert.equal(ytext.toString(), 'Hello wo')
  assert.deepEqual(summary(doc), ['delete:8-8:rld:alice'])
})

test('forward delete merges after the existing deletion', () => {
  const { doc } = setup('abcdef')
  edit(doc, 2, 3, '')
  edit(doc, 2, 3, '')
  assert.deepEqual(summary(doc), ['delete:2-2:cd:alice'])
})

test('deleting tracked insertions removes them without a deletion record', () => {
  const { doc, ytext } = setup('one three')
  edit(doc, 4, 4, 'two ', 'bob')
  // Alice deletes "two three": bob's insertion vanishes, "three" becomes a deletion.
  edit(doc, 4, 13, '')
  assert.equal(ytext.toString(), 'one ')
  assert.deepEqual(summary(doc), ['delete:4-4:three:alice'])
})

test('a deletion spanning an own deletion anchor keeps the text in order', () => {
  const { doc } = setup('abcdefg')
  edit(doc, 3, 4, '') // delete "d" → anchor at 3
  edit(doc, 1, 5, '') // "bcef" with the anchor between c and e
  assert.deepEqual(summary(doc), ['delete:1-1:bcdef:alice'])
})

test('replacing text records a deletion followed by an insertion', () => {
  const { doc, ytext } = setup('the cat sat')
  edit(doc, 4, 7, 'dog')
  assert.equal(ytext.toString(), 'the dog sat')
  assert.deepEqual(summary(doc), ['delete:4-4:cat:alice', 'insert:4-7:dog:alice'])
})

test('reject restores the original text; accept keeps the proposal', () => {
  const { doc, ytext } = setup('the cat sat')
  edit(doc, 4, 7, 'dog')
  const ids = resolveReview(doc).changes.map(c => c.id)
  rejectChanges(doc, ids)
  assert.equal(ytext.toString(), 'the cat sat')
  assert.equal(changesMap(doc).size, 0)

  edit(doc, 8, 11, 'ran')
  acceptChanges(doc, 'all')
  assert.equal(ytext.toString(), 'the cat ran')
  assert.equal(changesMap(doc).size, 0)
})

test('reject all handles many changes whose positions shift', () => {
  const { doc, ytext } = setup('alpha beta gamma delta')
  edit(doc, 0, 5, 'A')
  edit(doc, 2, 6, 'B')
  edit(doc, 15, 15, '!!!', 'bob')
  rejectChanges(doc, 'all')
  assert.equal(ytext.toString(), 'alpha beta gamma delta')
})

test('ranges follow concurrent remote edits', () => {
  const a = setup('Hello world').doc
  const b = new Y.Doc()
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  edit(a, 6, 11, 'there')
  // Meanwhile on b: insert at the start.
  b.getText(TEXT_KEY).insert(0, '>> ')
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  assert.equal(b.getText(TEXT_KEY).toString(), '>> Hello there')
  assert.deepEqual(summary(b), ['delete:9-9:world:alice', 'insert:9-14:there:alice'])
})

test('comment anchors move with the text and do not grow when typing after them', () => {
  const { doc, ytext } = setup('see figure 1 here')
  commentsMap(doc).set('t1', { start: relPos(ytext, 4, 0), end: relPos(ytext, 12, -1) })
  ytext.insert(0, 'Please ')
  ytext.insert(19, '0') // right after "figure 1"
  const [c] = resolveReview(doc).comments
  assert.equal(ytext.toString().slice(c!.from, c!.to), 'figure 1')
})

test('neighbouring deletions by different people restore in order, whichever is rejected first', () => {
  for (const order of [0, 1]) {
    const { doc, ytext } = setup('abcd')
    edit(doc, 1, 2, '', 'alice') // b
    edit(doc, 1, 2, '', 'bob') // c, at the same visible spot
    assert.equal(ytext.toString(), 'ad')
    const [first, second] = resolveReview(doc).changes.map(c => c.id)
    rejectChanges(doc, [order ? second! : first!])
    rejectChanges(doc, [order ? first! : second!])
    assert.equal(ytext.toString(), 'abcd', `order ${order}`)
  }
})

test('rejecting one of several stacked deletions puts only its text back', () => {
  const { doc, ytext } = setup('abcdef')
  edit(doc, 1, 2, '', 'alice') // b
  edit(doc, 2, 3, '', 'bob') // d (now "acdef" → delete "d")
  const bob = resolveReview(doc).changes.find(c => c.userId === 'bob')!
  rejectChanges(doc, [bob.id])
  assert.equal(ytext.toString(), 'acdef')
  rejectChanges(doc, 'all')
  assert.equal(ytext.toString(), 'abcdef')
})

test('the base text ignores every suggestion and leaves the document alone', () => {
  const { doc, ytext } = setup('one two three')
  edit(doc, 4, 7, 'TWO', 'alice')
  edit(doc, 0, 0, '>> ', 'bob')
  assert.equal(baseText(doc), 'one two three')
  assert.equal(ytext.toString(), '>> one TWO three')
})

test('a multi-range edit (several cursors) is tracked per range', () => {
  const { doc, ytext } = setup('a b c')
  applyTrackedEdits(doc, [{ fromA: 0, toA: 1, insert: 'A' }, { fromA: 4, toA: 5, insert: 'C' }], 'alice', 1)
  assert.equal(ytext.toString(), 'A b C')
  assert.equal(baseText(doc), 'a b c')
  assert.deepEqual(summary(doc), ['delete:0-0:a:alice', 'insert:0-1:A:alice', 'delete:4-4:c:alice', 'insert:4-5:C:alice'])
})

test('suggestion-only check: tracked edits pass, untracked ones and tampering fail', () => {
  const server = setup('The cat sat.').doc
  /** A fresh client in sync with the server; returns just the update `fn` makes. */
  const attempt = (fn: (client: Y.Doc, text: Y.Text) => void) => {
    const client = new Y.Doc()
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server))
    const sv = Y.encodeStateVector(client)
    fn(client, client.getText(TEXT_KEY))
    return Y.encodeStateAsUpdate(client, sv)
  }

  const tracked = attempt(c => applyTrackedEdits(c, [{ fromA: 4, toA: 7, insert: 'dog' }], 'rev', 1))
  assert.equal(checkSuggestionUpdate(server, tracked, 'rev'), null)
  Y.applyUpdate(server, tracked)

  // Plain typing is refused.
  assert.match(checkSuggestionUpdate(server, attempt((_, t) => t.insert(0, 'X')), 'rev')!, /not tracked/)
  // Accepting a suggestion (dropping a record) changes the base text: refused.
  const accept = attempt(c => {
    const map = changesMap(c)
    map.delete([...map.keys()].find(id => map.get(id)!.type === 'delete')!)
  })
  assert.match(checkSuggestionUpdate(server, accept, 'rev')!, /not tracked/)
  // Records in someone else's name are refused.
  const forged = attempt(c => applyTrackedEdits(c, [{ fromA: 0, toA: 0, insert: 'Y' }], 'alice', 2))
  assert.match(checkSuggestionUpdate(server, forged, 'rev')!, /own name/)
  // Comment anchors are the server's.
  const anchor = attempt((c, t) => commentsMap(c).set('t', { start: relPos(t, 0, 0), end: relPos(t, 1, -1) }))
  assert.match(checkSuggestionUpdate(server, anchor, 'rev')!, /comment/)
  // Withdrawing one's own suggestion is fine.
  assert.equal(checkSuggestionUpdate(server, attempt(c => void rejectChanges(c, 'all')), 'rev'), null)
  // The server document itself was never touched by the checks.
  assert.equal(server.getText(TEXT_KEY).toString(), 'The dog sat.')
})

test('lineAt counts lines from 1', () => {
  assert.equal(lineAt('a\nb\nc', 0), 1)
  assert.equal(lineAt('a\nb\nc', 2), 2)
  assert.equal(lineAt('a\nb\nc', 4), 3)
})

test('typing back what you deleted restores it instead of adding an insertion', () => {
  const { doc, ytext } = setup('Hello, ColTex!')
  for (let i = 13; i > 7; i--) edit(doc, i - 1, i, '')
  assert.deepEqual(summary(doc), ['delete:7-7:ColTex:alice'])
  for (const [i, ch] of [...'Col'].entries()) edit(doc, 7 + i, 7 + i, ch)
  assert.equal(ytext.toString(), 'Hello, Col!')
  assert.deepEqual(summary(doc), ['delete:10-10:Tex:alice'], 'the rest stays deleted, after the restored part')
  for (const [i, ch] of [...'Tex'].entries()) edit(doc, 10 + i, 10 + i, ch)
  assert.equal(ytext.toString(), 'Hello, ColTex!')
  assert.equal(changesMap(doc).size, 0, 'nothing left to review')
  assert.equal(baseText(doc), 'Hello, ColTex!')
  // Something else is a new insertion; someone else's deletion isn't restored by your typing.
  edit(doc, 7, 13, '', 'bob')
  edit(doc, 7, 7, 'C')
  assert.deepEqual(summary(doc), ['delete:7-7:ColTex:bob', 'insert:7-8:C:alice'])
})

test('accepting and rejecting can be taken back', () => {
  const { doc, ytext } = setup('the cat sat on the mat')
  edit(doc, 4, 7, 'dog') // replace cat → dog
  edit(doc, 15, 19, '') // delete "the "
  const before = summary(doc)
  const text = ytext.toString()

  const undo: DecisionUndo[] = []
  rejectChanges(doc, 'all', undefined, undo)
  assert.equal(ytext.toString(), 'the cat sat on the mat')
  assert.equal(undoDecision(doc, undo), 3)
  assert.equal(ytext.toString(), text)
  assert.deepEqual(summary(doc), before)

  const accepted: DecisionUndo[] = []
  acceptChanges(doc, 'all', undefined, accepted)
  assert.equal(changesMap(doc).size, 0)
  assert.equal(undoDecision(doc, accepted), 3)
  assert.equal(changesMap(doc).size, 3)
  rejectChanges(doc, 'all')
  assert.equal(ytext.toString(), 'the cat sat on the mat', 'the restored records still reject cleanly')
})

import * as Y from 'yjs'

/**
 * Review data (tracked changes and comment anchors) lives inside each file's
 * Yjs document, next to its text, so ranges move with concurrent edits and
 * survive renames. Positions are Yjs relative positions, stored as JSON.
 *
 * The text always holds the *proposed* version: tracked insertions are part of
 * it, tracked deletions are removed from it and kept as records here (like
 * Overleaf). Compiling therefore shows the document with all changes applied.
 */

/** The Y.Text with the file's content (must match the collab server). */
export const TEXT_KEY = 'content'
/** Y.Map<changeId, ChangeRecord> */
export const CHANGES_KEY = 'changes'
/** Y.Map<threadId, AnchorRecord>; thread messages live in the database. */
export const COMMENTS_KEY = 'comments'

export type RelPos = Record<string, unknown>

export type InsertRecord = { type: 'insert'; start: RelPos; end: RelPos; userId: string; ts: number }
export type DeleteRecord = { type: 'delete'; at: RelPos; text: string; userId: string; ts: number }
export type ChangeRecord = InsertRecord | DeleteRecord
export type AnchorRecord = { start: RelPos; end: RelPos }

/** A tracked change at its current position. Deletions are points (`from === to`). */
export type ResolvedChange = {
  id: string
  type: 'insert' | 'delete'
  from: number
  to: number
  /** Inserted text (current) or deleted text. */
  text: string
  userId: string
  ts: number
}
export type ResolvedComment = { id: string; from: number; to: number }
export type ResolvedReview = { changes: ResolvedChange[]; comments: ResolvedComment[] }

export const changesMap = (doc: Y.Doc) => doc.getMap<ChangeRecord>(CHANGES_KEY)
export const commentsMap = (doc: Y.Doc) => doc.getMap<AnchorRecord>(COMMENTS_KEY)

/**
 * Ids are made here rather than with crypto.randomUUID, which browsers only
 * offer in secure contexts (a LAN deployment over plain http is not one).
 */
export function newReviewId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * `assoc >= 0` ties the position to the character at `index` (so it stays
 * before text typed at that point); `assoc < 0` ties it to the character
 * before (it stays after text typed there).
 */
export function relPos(ytext: Y.Text, index: number, assoc: number): RelPos {
  return Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(ytext, index, assoc)) as RelPos
}

export function resolvePos(ytext: Y.Text, rel: RelPos): number | null {
  try {
    const abs = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(rel), ytext.doc!)
    return abs ? Math.min(abs.index, ytext.length) : null
  } catch {
    return null
  }
}

/** Re-encode client-supplied JSON so only the fields Yjs knows are stored. */
export function normalizeRelPos(rel: RelPos): RelPos {
  return Y.relativePositionToJSON(Y.createRelativePositionFromJSON(rel)) as RelPos
}

/** Whether `rel` is a well-formed relative position that resolves inside `ytext`'s document. */
export function isValidRelPos(ytext: Y.Text, rel: unknown): rel is RelPos {
  return typeof rel === 'object' && rel !== null && resolvePos(ytext, rel as RelPos) !== null
}

/** Every change and comment with absolute positions, in document order. Empty insertions are skipped. */
export function resolveReview(doc: Y.Doc): ResolvedReview {
  const ytext = doc.getText(TEXT_KEY)
  const text = ytext.toString()
  const changes: ResolvedChange[] = []
  changesMap(doc).forEach((rec, id) => {
    if (rec.type === 'insert') {
      const from = resolvePos(ytext, rec.start)
      const to = resolvePos(ytext, rec.end)
      if (from === null || to === null || to <= from) return
      changes.push({ id, type: 'insert', from, to, text: text.slice(from, to), userId: rec.userId, ts: rec.ts })
    } else {
      const at = resolvePos(ytext, rec.at)
      if (at === null) return
      changes.push({ id, type: 'delete', from: at, to: at, text: rec.text, userId: rec.userId, ts: rec.ts })
    }
  })
  const comments: ResolvedComment[] = []
  commentsMap(doc).forEach((rec, id) => {
    const from = resolvePos(ytext, rec.start)
    const to = resolvePos(ytext, rec.end)
    if (from === null || to === null) return
    comments.push({ id, from, to: Math.max(from, to) })
  })
  const order = (a: { from: number; to: number }, b: { from: number; to: number }) => a.from - b.from || a.to - b.to
  return { changes: changes.sort(order), comments: comments.sort(order) }
}

/** 1-based line number of an offset. */
export function lineAt(text: string, offset: number): number {
  let line = 1
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) line++
  return line
}

/**
 * How to take back an accept or reject (`undoDecision`), as plain JSON:
 * - `record`: put the record back (accepting only dropped it);
 * - `reinsert`: a rejected insertion: its text back, tracked again;
 * - `redelete`: a rejected deletion: the restored text (starting at `start`) removed again, tracked again.
 */
export type DecisionUndo =
  | { kind: 'record'; id: string; rec: ChangeRecord }
  | { kind: 'reinsert'; id: string; rec: InsertRecord; text: string }
  | { kind: 'redelete'; id: string; rec: DeleteRecord; start: RelPos }

/** Keep the change: drop its record. Returns the ids that existed; `undo` collects how to take it back. */
export function acceptChanges(doc: Y.Doc, ids: readonly string[] | 'all', origin?: unknown, undo?: DecisionUndo[]): string[] {
  const map = changesMap(doc)
  const targets = ids === 'all' ? [...map.keys()] : ids.filter(id => map.has(id))
  doc.transact(() => {
    for (const id of targets) {
      const rec = map.get(id)
      if (rec) undo?.push({ kind: 'record', id, rec })
      map.delete(id)
    }
  }, origin)
  return targets
}

/**
 * Put deleted text back right before the tombstone of its first character.
 * Inserting by index would land after *every* tombstone at that spot (Yjs skips
 * deleted items), which scrambles the order when neighbouring deletions are
 * rejected one by one. Anchoring to the tombstone keeps each restoration next
 * to its own original place, in any order.
 */
function tombstoneAt(transaction: Y.Transaction, ytext: Y.Text, at: RelPos): Y.Item | null {
  const doc = ytext.doc!
  const id = Y.createRelativePositionFromJSON(at).item
  const struct = id && id.clock < Y.getState(doc.store, id.client) ? Y.getItemCleanStart(transaction, id) : null
  return struct instanceof Y.Item && struct.deleted && struct.parent === ytext ? struct : null
}

/** Insert `text` right before the tombstone `at` points to; returns where it now starts. */
function restoreAt(transaction: Y.Transaction, ytext: Y.Text, at: RelPos, text: string): number | null {
  const doc = ytext.doc!
  const struct = tombstoneAt(transaction, ytext, at)
  if (struct) {
    const left = struct.left
    const item = new Y.Item(
      Y.createID(doc.clientID, Y.getState(doc.store, doc.clientID)),
      left,
      left && left.lastId,
      struct,
      struct.id,
      ytext,
      null,
      new Y.ContentString(text),
    )
    item.integrate(transaction, 0)
    // Index lookups cache positions in search markers; ours bypassed them, so drop the cache.
    if (ytext._searchMarker) ytext._searchMarker.length = 0
    return resolvePos(ytext, { item: { client: item.id.client, clock: item.id.clock }, assoc: 0 })
  }
  // Not anchored to a tombstone (shouldn't happen): fall back to the position.
  const index = resolvePos(ytext, at)
  if (index !== null) ytext.insert(index, text)
  return index
}

function restoreDeletion(transaction: Y.Transaction, ytext: Y.Text, rec: DeleteRecord): number | null {
  return restoreAt(transaction, ytext, rec.at, rec.text)
}

/**
 * Typing back the start of your own deletion, where it was: the first `n`
 * characters are restored (not a new insertion) and the deletion keeps the
 * rest, anchored to the tombstone of its next character. False when the
 * deletion isn't anchored to a tombstone.
 */
function restoreDeletionPrefix(transaction: Y.Transaction, ytext: Y.Text, id: string, rec: DeleteRecord, n: number, index: number): boolean {
  const map = changesMap(ytext.doc!)
  const first = tombstoneAt(transaction, ytext, rec.at)
  // The editor put the text at `index`; the restored text must land exactly there.
  if (!first || resolvePos(ytext, rec.at) !== index) return false
  // The rest's anchor: the tombstone n deleted characters on (found before inserting).
  let item: Y.Item | null = first
  let skip = n
  while (item && !(item.deleted && skip < item.length)) {
    if (item.deleted) skip -= item.length
    item = item.right instanceof Y.Item ? item.right : null
  }
  restoreAt(transaction, ytext, rec.at, rec.text.slice(0, n))
  const rest = rec.text.slice(n)
  if (!rest) map.delete(id)
  else if (item) map.set(id, { ...rec, text: rest, at: { item: { client: item.id.client, clock: item.id.clock + skip }, assoc: 0 } })
  else map.set(id, { ...rec, text: rest })
  return true
}

/** Undo the change in the text (remove an insertion, restore a deletion) and drop its record. `undo` collects how to take it back. */
export function rejectChanges(doc: Y.Doc, ids: readonly string[] | 'all', origin?: unknown, undo?: DecisionUndo[]): string[] {
  const map = changesMap(doc)
  const ytext = doc.getText(TEXT_KEY)
  const targets = ids === 'all' ? [...map.keys()] : ids.filter(id => map.has(id))
  doc.transact(transaction => {
    // Resolve one at a time: each rejection shifts the positions of the rest.
    for (const id of targets) {
      const rec = map.get(id)
      if (!rec) continue
      if (rec.type === 'insert') {
        const from = resolvePos(ytext, rec.start)
        const to = resolvePos(ytext, rec.end)
        if (from !== null && to !== null && to > from) {
          undo?.push({ kind: 'reinsert', id, rec, text: ytext.toString().slice(from, to) })
          ytext.delete(from, to - from)
        }
      } else {
        const start = restoreDeletion(transaction, ytext, rec)
        if (start !== null) undo?.push({ kind: 'redelete', id, rec, start: relPos(ytext, start, 0) })
      }
      map.delete(id)
    }
    pruneEmptyInsertions(doc)
  }, origin)
  return targets
}

/**
 * Take back an accept or reject (`undo` from `acceptChanges`/`rejectChanges`),
 * newest first. Parts that no longer fit (the text was edited since) are
 * skipped. Returns how many changes came back.
 */
export function undoDecision(doc: Y.Doc, undo: readonly DecisionUndo[], origin?: unknown): number {
  const map = changesMap(doc)
  const ytext = doc.getText(TEXT_KEY)
  let count = 0
  doc.transact(transaction => {
    for (const u of [...undo].reverse()) {
      if (map.has(u.id)) continue
      if (u.kind === 'record') {
        map.set(u.id, u.rec)
      } else if (u.kind === 'reinsert') {
        const from = restoreAt(transaction, ytext, u.rec.start, u.text)
        if (from === null) continue
        map.set(u.id, { ...u.rec, start: relPos(ytext, from, 0), end: relPos(ytext, from + u.text.length, -1) })
      } else {
        const from = resolvePos(ytext, u.start)
        if (from === null || ytext.toString().slice(from, from + u.rec.text.length) !== u.rec.text) continue
        const at = relPos(ytext, from, 0)
        ytext.delete(from, u.rec.text.length)
        map.set(u.id, { ...u.rec, at })
      }
      count++
    }
  }, origin)
  return count
}

/** The text with every tracked change rejected (the base the suggestions apply to). Leaves `doc` untouched. */
export function baseText(doc: Y.Doc): string {
  const copy = new Y.Doc({ gc: false })
  Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc))
  rejectChanges(copy, 'all')
  const text = copy.getText(TEXT_KEY).toString()
  copy.destroy()
  return text
}

/** Drop insertion records whose text is gone entirely. */
export function pruneEmptyInsertions(doc: Y.Doc): void {
  const map = changesMap(doc)
  const ytext = doc.getText(TEXT_KEY)
  map.forEach((rec, id) => {
    if (rec.type !== 'insert') return
    const from = resolvePos(ytext, rec.start)
    const to = resolvePos(ytext, rec.end)
    if (from === null || to === null || to <= from) map.delete(id)
  })
}

/** One change, as CodeMirror's `iterChanges` reports it, in old-document positions. */
export type TextEdit = { fromA: number; toA: number; insert: string }

/**
 * Apply a user's own edit to the Y.Text *as tracked changes*, text and records
 * in one transaction (one update, so the server can check it as a whole).
 * `edits` are one change set: ascending and non-overlapping, in positions of
 * the document before the edit, which must equal the Y.Text now.
 *
 * Deleted text that was someone's tracked insertion simply vanishes; other
 * deleted text becomes a deletion record anchored to the tombstone of its first
 * character. Adjacent edits by the same person merge: typing a word yields one
 * insertion, and backspacing over a sentence one deletion.
 */
export function applyTrackedEdits(doc: Y.Doc, edits: readonly TextEdit[], userId: string, now: number, origin?: unknown): void {
  const map = changesMap(doc)
  const ytext = doc.getText(TEXT_KEY)
  doc.transact(transaction => {
    // Review state before the edit, in the same (old) positions as `edits`.
    const before = resolveReview(doc).changes
    const inserts = before.filter(c => c.type === 'insert')
    const ownDeletes = before.filter(c => c.type === 'delete' && c.userId === userId)
    const consumed = new Set<string>()
    const text = ytext.toString()
    let adj = 0

    for (const e of edits) {
      const at = e.fromA + adj
      if (e.toA > e.fromA) {
        // Cut points: edit bounds, tracked-insertion bounds inside it, and own deletion anchors in it.
        const anchors = ownDeletes.filter(d => !consumed.has(d.id) && d.from >= e.fromA && d.from <= e.toA)
        const overlapping = inserts.filter(i => i.to > e.fromA && i.from < e.toA)
        const points = new Set([e.fromA, e.toA])
        for (const i of overlapping) {
          if (i.from > e.fromA) points.add(i.from)
          if (i.to < e.toA) points.add(i.to)
        }
        for (const a of anchors) points.add(a.from)
        const sorted = [...points].sort((a, b) => a - b)
        let merged = ''
        let anchor: RelPos | undefined
        const takeAnchored = (p: number) => {
          for (const a of anchors.filter(x => x.from === p).sort((x, y) => x.ts - y.ts)) {
            const rec = map.get(a.id)
            if (rec?.type !== 'delete') continue
            anchor ??= rec.at
            merged += rec.text
          }
        }
        for (let k = 0; k < sorted.length - 1; k++) {
          const a = sorted[k]!
          const b = sorted[k + 1]!
          takeAnchored(a)
          if (!overlapping.some(i => i.from <= a && b <= i.to)) {
            // Tie the deletion to this character before it becomes a tombstone.
            anchor ??= relPos(ytext, a + adj, 0)
            merged += text.slice(a, b)
          }
        }
        takeAnchored(e.toA)
        for (const a of anchors) {
          consumed.add(a.id)
          map.delete(a.id)
        }
        ytext.delete(at, e.toA - e.fromA)
        if (merged && anchor) map.set(newReviewId(), { type: 'delete', at: anchor, text: merged, userId, ts: now })
      }

      // Typing back what you deleted, where it was, restores it instead of adding an insertion.
      if (e.insert && e.toA === e.fromA) {
        const own = ownDeletes.find(d => {
          const rec = map.get(d.id)
          return !consumed.has(d.id) && d.from === e.fromA && rec?.type === 'delete' && rec.text.startsWith(e.insert)
        })
        const rec = own && map.get(own.id)
        if (own && rec?.type === 'delete' && restoreDeletionPrefix(transaction, ytext, own.id, rec, e.insert.length, at)) {
          adj += e.insert.length
          continue
        }
      }

      if (e.insert) {
        ytext.insert(at, e.insert)
        // Own insertions touching the edit grow to cover the new text.
        const touching = inserts.filter(i => i.userId === userId && !consumed.has(i.id) && i.from <= e.toA && e.fromA <= i.to)
        let from = at
        let to = at + e.insert.length
        for (const i of touching) {
          const rec = map.get(i.id)
          if (rec?.type !== 'insert') continue
          const s = resolvePos(ytext, rec.start)
          const t = resolvePos(ytext, rec.end)
          if (s !== null && t !== null && t > s) {
            from = Math.min(from, s)
            to = Math.max(to, t)
          }
        }
        const [keep, ...rest] = touching.map(i => i.id).filter(id => map.has(id))
        for (const id of rest) {
          consumed.add(id)
          map.delete(id)
        }
        const rec = keep ? map.get(keep) : undefined
        const covered = rec?.type === 'insert' && resolvePos(ytext, rec.start) === from && resolvePos(ytext, rec.end) === to
        if (!covered) {
          map.set(keep ?? newReviewId(), { type: 'insert', start: relPos(ytext, from, 0), end: relPos(ytext, to, -1), userId, ts: now })
        }
      }
      adj += e.insert.length - (e.toA - e.fromA)
    }
    pruneEmptyInsertions(doc)
  }, origin)
}

/**
 * Check an update from someone who may only *suggest* (a reviewer): applied to
 * `doc`, it must leave the base text (every suggestion rejected) unchanged,
 * keep comment anchors (the server writes those), and only add or change
 * change records in that person's name. Returns why it is refused, or null.
 * `doc` itself is not modified.
 */
export function checkSuggestionUpdate(doc: Y.Doc, update: Uint8Array, userId: string): string | null {
  const after = new Y.Doc({ gc: false })
  try {
    Y.applyUpdate(after, Y.encodeStateAsUpdate(doc))
    const commentsBefore = JSON.stringify(commentsMap(after).toJSON())
    const recordsBefore = new Map([...changesMap(after).entries()].map(([id, rec]) => [id, JSON.stringify(rec)]))
    Y.applyUpdate(after, update)
    if (JSON.stringify(commentsMap(after).toJSON()) !== commentsBefore) return 'Reviewers cannot change comment anchors'
    for (const [id, rec] of changesMap(after).entries()) {
      if (rec.userId !== userId && recordsBefore.get(id) !== JSON.stringify(rec)) return 'Reviewers can only suggest changes in their own name'
    }
    if (baseText(after) !== baseText(doc)) return 'Reviewers can only suggest changes; this edit was not tracked'
    return null
  } finally {
    after.destroy()
  }
}

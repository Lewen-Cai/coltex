import { diffLines } from 'diff'

export type DiffLine = { type: 'context' | 'del' | 'add'; text: string; oldLine?: number; newLine?: number }
export type Hunk = { id: number; lines: DiffLine[]; oldStart: number; newStart: number }

type Op = { type: 'eq' | 'del' | 'add'; text: string; hunk?: number }

const CONTEXT = 3

/** Split keeping line endings, so joining the pieces gives back the exact text. */
function splitLines(value: string): string[] {
  return value.match(/[^\n]*\n|[^\n]+$/g) ?? []
}

function toOps(base: string, proposed: string): Op[] {
  const ops: Op[] = []
  for (const part of diffLines(base, proposed)) {
    const type = part.added ? 'add' : part.removed ? 'del' : 'eq'
    for (const text of splitLines(part.value)) ops.push({ type, text })
  }
  return ops
}

/**
 * A line diff split into hunks the author can accept one by one. Changes
 * closer than 2×context lines share a hunk (Infinity: one hunk, the whole file).
 */
export function computeHunks(base: string, proposed: string, context = CONTEXT): { hunks: Hunk[]; ops: Op[] } {
  const ops = toOps(base, proposed)
  // Group change runs into hunks.
  let hunk = -1
  let lastChange = -Infinity
  ops.forEach((op, i) => {
    if (op.type === 'eq') return
    if (i - lastChange > 2 * context + 1) hunk++
    op.hunk = hunk
    lastChange = i
  })

  const hunks: Hunk[] = []
  let oldLine = 1
  let newLine = 1
  const numbered = ops.map(op => {
    const n = { op, oldLine: op.type !== 'add' ? oldLine : undefined, newLine: op.type !== 'del' ? newLine : undefined }
    if (op.type !== 'add') oldLine++
    if (op.type !== 'del') newLine++
    return n
  })
  for (let h = 0; h <= hunk; h++) {
    const first = numbered.findIndex(n => n.op.hunk === h)
    let last = first
    numbered.forEach((n, i) => {
      if (n.op.hunk === h) last = i
    })
    const from = Math.max(0, first - context)
    const to = Math.min(numbered.length - 1, last + context)
    const slice = numbered.slice(from, to + 1)
    // Label hunks by their first changed line, not the context above it.
    const firstChange = numbered[first]!
    hunks.push({
      id: h,
      oldStart: firstChange.oldLine ?? numbered.slice(0, first).reverse().find(n => n.oldLine)?.oldLine ?? 1,
      newStart: firstChange.newLine ?? numbered.slice(0, first).reverse().find(n => n.newLine)?.newLine ?? 1,
      lines: slice.map(n => ({
        type: n.op.type === 'eq' ? 'context' : n.op.type,
        text: n.op.text.replace(/\n$/, ''),
        oldLine: n.oldLine,
        newLine: n.newLine,
      })),
    })
  }
  return { hunks, ops }
}

/** The base text with only the accepted hunks applied. */
export function applyHunks(ops: Op[], accepted: Set<number>): string {
  let out = ''
  for (const op of ops) {
    if (op.type === 'eq') out += op.text
    else if (op.type === 'del' && !accepted.has(op.hunk!)) out += op.text
    else if (op.type === 'add' && accepted.has(op.hunk!)) out += op.text
  }
  return out
}

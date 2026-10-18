import diff from 'fast-diff'
import type * as Y from 'yjs'

/**
 * Turn `ytext` into `target` with minimal inserts/deletes, so concurrent
 * editors keep their cursors and nobody's state is replaced wholesale.
 * Used when the file on disk changed outside the editor (upload, import, AI).
 */
export function applyTextDiff(ytext: Y.Text, target: string): void {
  const current = ytext.toString()
  if (current === target) return
  let index = 0
  for (const [op, chunk] of diff(current, target)) {
    if (op === diff.EQUAL) index += chunk.length
    else if (op === diff.DELETE) ytext.delete(index, chunk.length)
    else {
      ytext.insert(index, chunk)
      index += chunk.length
    }
  }
}

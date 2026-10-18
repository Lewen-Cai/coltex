import { Annotation, EditorState, StateEffect, StateField, type Extension, type Range } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType, keymap, showTooltip, type Tooltip } from '@codemirror/view'
import { ySyncAnnotation, ySyncFacet } from 'y-codemirror.next'
import type * as Y from 'yjs'
import {
  TEXT_KEY,
  changesMap,
  commentsMap,
  applyTrackedEdits,
  resolveReview,
  type ResolvedReview,
  type TextEdit,
} from '@coltex/review'
import { t } from './i18n.ts'

export type ReviewFocus = { threadIds: string[]; changeIds: string[] }

export type ReviewConfig = {
  ydoc: Y.Doc
  userId: string
  /** Whether this user's edits are tracked right now. Read on every edit, so it can change without rebuilding. */
  isTracking: () => boolean
  colorOf: (userId: string) => string
  /** Threads that are resolved (not highlighted). Read whenever decorations are rebuilt. */
  isHidden: (threadId: string) => boolean
  canComment: boolean
  /** The user wants to comment on a range (the selection tooltip or ⌘⌥M). */
  onAddComment: (from: number, to: number) => void
  /** The cursor moved onto (or off) comments and changes. */
  onFocus: (focus: ReviewFocus) => void
  /** Fresh positions after any change to the text or the review data. */
  onResolved: (review: ResolvedReview) => void
}

type FieldValue = {
  review: ResolvedReview
  /** The thread or change highlighted from the review panel. */
  active: string | null
  /** The range being commented on while the composer is open. */
  draft: { from: number; to: number } | null
}

const setReview = StateEffect.define<ResolvedReview>()
const setActive = StateEffect.define<string | null>()
const setDraft = StateEffect.define<{ from: number; to: number } | null>()
/** Rebuild decorations (e.g. a thread was resolved) without new positions. */
const refresh = StateEffect.define<null>()

const empty: ResolvedReview = { changes: [], comments: [] }

/** Marks the user's own edits made while tracking is on; this extension, not ySync, writes them to Yjs. */
const trackedEdit = Annotation.define<boolean>()

/**
 * Positions are recomputed from Yjs after every change (see the plugin below).
 * Between an edit and that recompute, map them through the edit so they stay
 * close: insertions don't grow at their edges, matching the anchors' assoc.
 */
function mapReview(r: ResolvedReview, state: { mapPos: (pos: number, assoc: number) => number }): ResolvedReview {
  return {
    changes: r.changes.map(c =>
      c.type === 'insert'
        ? { ...c, from: state.mapPos(c.from, 1), to: Math.max(state.mapPos(c.from, 1), state.mapPos(c.to, -1)) }
        : { ...c, from: state.mapPos(c.from, -1), to: state.mapPos(c.from, -1) },
    ),
    comments: r.comments.map(c => {
      const from = state.mapPos(c.from, 1)
      return { ...c, from, to: Math.max(from, state.mapPos(c.to, -1)) }
    }),
  }
}

const reviewField = StateField.define<FieldValue>({
  create: () => ({ review: empty, active: null, draft: null }),
  update(value, tr) {
    let next = value
    if (tr.docChanged) {
      const changes = tr.changes
      next = {
        ...next,
        review: mapReview(next.review, { mapPos: (p, a) => changes.mapPos(p, a) }),
        draft: next.draft && { from: changes.mapPos(next.draft.from, 1), to: changes.mapPos(next.draft.to, -1) },
      }
    }
    for (const e of tr.effects) {
      if (e.is(setReview)) next = { ...next, review: e.value }
      else if (e.is(setActive)) next = { ...next, active: e.value }
      else if (e.is(setDraft)) next = { ...next, draft: e.value }
      else if (e.is(refresh)) next = { ...next }
    }
    return next
  },
})

/**
 * Deleted text, shown in place. The author's colour is kept under `tint`, not
 * `color`: y-codemirror's remote-caret widget compares widgets by `.color`
 * alone, so a property of that name made CodeMirror take this widget for the
 * author's caret (same colour) and drop it.
 */
class DeletedText extends WidgetType {
  readonly text: string
  readonly tint: string
  readonly id: string
  readonly active: boolean
  constructor(text: string, tint: string, id: string, active: boolean) {
    super()
    this.text = text
    this.tint = tint
    this.id = id
    this.active = active
  }
  eq(other: WidgetType): boolean {
    return other instanceof DeletedText && other.text === this.text && other.tint === this.tint && other.active === this.active
  }
  compare(other: WidgetType): boolean {
    return this.eq(other)
  }
  toDOM() {
    const el = document.createElement('span')
    el.className = `cm-tc-delete${this.active ? ' cm-tc-active' : ''}`
    el.style.setProperty('--tc', this.tint)
    el.dataset.change = this.id
    const flat = this.text.replace(/\n/g, '↵')
    el.textContent = flat.length > 60 ? `${flat.slice(0, 28)}…${flat.slice(-28)}` : flat
    el.title = this.text.length > 300 ? `${this.text.slice(0, 300)}…` : this.text
    return el
  }
  ignoreEvent() {
    return false
  }
}

function buildDecorations(state: EditorState, config: ReviewConfig) {
  const { review, active, draft } = state.field(reviewField)
  const ranges: Range<Decoration>[] = []
  const length = state.doc.length
  for (const c of review.comments) {
    if (c.to <= c.from || c.to > length || config.isHidden(c.id)) continue
    ranges.push(
      Decoration.mark({
        class: `cm-review-comment${active === c.id ? ' cm-review-active' : ''}`,
        attributes: { 'data-thread': c.id },
      }).range(c.from, c.to),
    )
  }
  for (const c of review.changes) {
    if (c.to > length) continue
    const color = config.colorOf(c.userId)
    if (c.type === 'insert') {
      if (c.to <= c.from) continue
      ranges.push(
        Decoration.mark({
          class: `cm-tc-insert${active === c.id ? ' cm-tc-active' : ''}`,
          attributes: { style: `--tc: ${color}`, 'data-change': c.id },
        }).range(c.from, c.to),
      )
    } else {
      ranges.push(Decoration.widget({ widget: new DeletedText(c.text, color, c.id, active === c.id), side: -1 }).range(c.from))
    }
  }
  if (draft && draft.to > draft.from && draft.to <= length) {
    ranges.push(Decoration.mark({ class: 'cm-review-comment cm-review-draft' }).range(draft.from, draft.to))
  }
  return Decoration.set(ranges, true)
}

function focusAt(state: EditorState): ReviewFocus {
  const { from, to } = state.selection.main
  const { review } = state.field(reviewField)
  return {
    threadIds: review.comments.filter(c => c.from <= to && from <= c.to && c.to > c.from).map(c => c.id),
    changeIds: review.changes.filter(c => c.from <= to && from <= c.to).map(c => c.id),
  }
}

const reviewTheme = EditorView.baseTheme({
  '.cm-tc-insert': {
    backgroundColor: 'color-mix(in oklch, var(--tc) 14%, transparent)',
    textDecoration: 'underline 2px',
    textDecorationColor: 'color-mix(in oklch, var(--tc) 70%, transparent)',
    textUnderlineOffset: '3px',
  },
  // Deletions are red whatever the author's colour, so they never read as insertions.
  '.cm-tc-delete': {
    color: 'var(--review-delete)',
    textDecoration: 'line-through 1.5px',
    backgroundColor: 'var(--review-delete-bg)',
    boxShadow: 'inset 2px 0 0 var(--tc)',
    borderRadius: '3px',
    padding: '0 1px',
    margin: '0 1px',
    opacity: '0.85',
    cursor: 'pointer',
  },
  '.cm-tc-active': {
    outline: '1.5px solid var(--tc)',
    outlineOffset: '1px',
    borderRadius: '2px',
  },
  '.cm-review-comment': {
    backgroundColor: 'var(--review-comment-bg)',
    borderBottom: '2px solid var(--review-comment)',
  },
  '.cm-review-active': { backgroundColor: 'var(--review-comment-active)' },
  '.cm-review-draft': { backgroundColor: 'var(--review-comment-draft)', borderBottomStyle: 'dashed' },
  '.cm-tooltip.cm-review-tooltip': {
    border: 'none',
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  '.cm-review-add': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    background: 'var(--popover)',
    color: 'var(--foreground)',
    font: '500 12px/1.4 var(--font-sans, system-ui)',
    boxShadow: 'var(--shadow-popover)',
    cursor: 'pointer',
    animation: 'cm-review-pop 0.14s ease-out',
  },
  '.cm-review-add:hover': { background: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)' },
  '@keyframes cm-review-pop': {
    from: { opacity: '0', transform: 'translateY(4px) scale(0.96)' },
    to: { opacity: '1', transform: 'none' },
  },
})

const COMMENT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/></svg>'

function commentTooltip(config: ReviewConfig): Extension {
  return StateField.define<readonly Tooltip[]>({
    create: () => [],
    update(prev, tr) {
      const { to, empty } = tr.state.selection.main
      if (empty || tr.state.field(reviewField).draft) return []
      // Same spot: keep the tooltip so it isn't rebuilt (and re-animated) on every update.
      if (prev[0]?.pos === to) return prev
      return [
        {
          pos: to,
          above: false,
          strictSide: false,
          arrow: false,
          create: view => {
            const dom = document.createElement('div')
            dom.className = 'cm-review-tooltip'
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'cm-review-add'
            button.innerHTML = COMMENT_ICON
            const label = document.createElement('span')
            label.textContent = t('Comment')
            button.append(label)
            // mousedown, not click: keep the editor selection.
            button.addEventListener('mousedown', e => {
              e.preventDefault()
              const sel = view.state.selection.main
              config.onAddComment(sel.from, sel.to)
            })
            dom.append(button)
            return { dom, offset: { x: 0, y: 6 } }
          },
        },
      ]
    },
    provide: f => showTooltip.computeN([f], state => state.field(f)),
  })
}

/**
 * Comments and tracked changes in the editor: highlights, deleted-text
 * widgets, recording this user's edits as tracked changes while tracking is
 * on, and the selection's "Comment" button.
 */
export function reviewExtension(config: ReviewConfig): Extension {
  const { ydoc } = config
  const plugin = ViewPlugin.define(view => {
    let scheduled = false
    let destroyed = false
    let lastFocus = ''
    const recompute = () => {
      if (scheduled) return
      scheduled = true
      // Never dispatch during an update: Yjs observers fire while ySync applies our own edit.
      queueMicrotask(() => {
        scheduled = false
        if (destroyed) return
        const review = resolveReview(ydoc)
        view.dispatch({ effects: setReview.of(review) })
        config.onResolved(review)
      })
    }
    const ytext = ydoc.getText(TEXT_KEY)
    const changes = changesMap(ydoc)
    const comments = commentsMap(ydoc)
    ytext.observe(recompute)
    changes.observe(recompute)
    comments.observe(recompute)
    recompute()

    const reportFocus = (state: EditorState) => {
      const focus = focusAt(state)
      const key = `${focus.threadIds.join()}|${focus.changeIds.join()}`
      if (key !== lastFocus) {
        lastFocus = key
        config.onFocus(focus)
      }
    }

    return {
      update(update) {
        if (update.selectionSet || update.docChanged) reportFocus(update.state)
        // Text and records go to Yjs in one transaction, so the server sees (and can check)
        // each tracked edit as a whole. ySync's origin makes the undo manager track it.
        const origin = update.state.facet(ySyncFacet)
        for (const tr of update.transactions) {
          if (!tr.annotation(trackedEdit)) continue
          const edits: TextEdit[] = []
          tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            edits.push({ fromA, toA, insert: inserted.sliceString(0, inserted.length, '\n') })
          })
          applyTrackedEdits(ydoc, edits, config.userId, Date.now(), origin)
        }
      },
      destroy() {
        destroyed = true
        ytext.unobserve(recompute)
        changes.unobserve(recompute)
        comments.unobserve(recompute)
      },
    }
  })

  return [
    reviewField,
    reviewTheme,
    // While tracking, claim the user's edits: the ySync annotation makes ySync treat them as
    // already applied (it skips its own Yjs write), and the plugin above applies them tracked.
    EditorState.transactionExtender.of(tr => {
      if (!tr.docChanged || tr.annotation(ySyncAnnotation) || !config.isTracking()) return null
      return { annotations: [ySyncAnnotation.of(tr.startState.facet(ySyncFacet)), trackedEdit.of(true)] }
    }),
    EditorView.decorations.compute([reviewField], state => buildDecorations(state, config)),
    plugin,
    config.canComment ? commentTooltip(config) : [],
    config.canComment
      ? keymap.of([
          {
            key: 'Mod-Alt-m',
            run: view => {
              const { from, to, empty } = view.state.selection.main
              if (empty) return false
              config.onAddComment(from, to)
              return true
            },
          },
        ])
      : [],
  ]
}

export const reviewEffects = {
  /** Highlight a thread or change (from the panel), or clear with null. */
  setActive: (id: string | null) => setActive.of(id),
  /** Show the range being commented on, or clear with null. */
  setDraft: (range: { from: number; to: number } | null) => setDraft.of(range),
  /** Re-run decorations, e.g. after threads were resolved or reopened. */
  refresh: () => refresh.of(null),
}

/** Current positions of the review items (for the panel's "jump to"). */
export function reviewPositions(state: EditorState): ResolvedReview {
  return state.field(reviewField, false)?.review ?? empty
}


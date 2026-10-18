// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/visual/visual.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import {
  Compartment,
  EditorState,
  Extension,
  StateEffect,
  StateField,
  TransactionSpec,
} from '@codemirror/state'
import { visualHighlightStyle, visualTheme } from './visual-theme'
import { atomicDecorations } from './atomic-decorations'
import { markDecorations } from './mark-decorations'
import { EditorView, ViewPlugin } from '@codemirror/view'
import { visualKeymap } from './visual-keymap'
import { mousedown, mouseDownEffect } from './selection'
import { forceParsing, syntaxTree } from '@codemirror/language'
// ColTex: Overleaf's scroll-position extension (lodash, Overleaf storage) isn't ported.
import { visualMode } from '../visual-mode'
import { listItemMarker } from './list-item-marker'
import { pasteHtml } from './paste-html'
import { selectionInTextColumn } from './selection-clip'
import { commandTooltip } from '../command-tooltip'

const visualConf = new Compartment()

export const toggleVisualEffect = StateEffect.define<boolean>()

const visualState = StateField.define<boolean>({
  create() {
    return false
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(toggleVisualEffect)) {
        return effect.value
      }
    }
    return value
  },
})

// ColTex: `visualMode` tells the ported toolbar commands which mode is on.
const configureVisualExtensions = (showVisual: boolean) =>
  showVisual ? [sharedVisualExtensions(), visualMode.of(true)] : []

export const visual = (docName: string, showVisual: boolean): Extension => {
  // ColTex: no module-provided visual editors (Markdown); LaTeX only.
  void docName
  const extensions = latexVisualExtensions()

  return [
    visualState.init(() => showVisual),
    visualConf.of(configureVisualExtensions(showVisual)),
    visualOnly(showVisual, extensions),
  ]
}

export const isVisual = (view: EditorView) => {
  return view.state.field(visualState, false) || false
}

export const setVisual = (showVisual: boolean): TransactionSpec => {
  return {
    effects: [
      toggleVisualEffect.of(showVisual),
      visualConf.reconfigure(configureVisualExtensions(showVisual)),
    ],
  }
}

// Loads `extension` only while the editor is in a particular mode, reacting to
// mode switches via `toggleVisualEffect`. `activeWhenVisual` selects which mode:
// `true` for visual-only, `false` for source-only.
const modeOnly = (
  activeWhenVisual: boolean,
  visual: boolean,
  extension: Extension
) => {
  const conf = new Compartment()
  const configure = (visual: boolean) =>
    visual === activeWhenVisual ? extension : []
  return [
    conf.of(configure(visual)),

    // Respond to switching editor modes
    EditorState.transactionExtender.of(tr => {
      for (const effect of tr.effects) {
        if (effect.is(toggleVisualEffect)) {
          return {
            effects: conf.reconfigure(configure(effect.value)),
          }
        }
      }
      return null
    }),
  ]
}

export const visualOnly = (visual: boolean, extension: Extension) =>
  modeOnly(true, visual, extension)

export const sourceOnly = (visual: boolean, extension: Extension) =>
  modeOnly(false, visual, extension)

const parsedAttributesConf = new Compartment()

/**
 * A view plugin which shows the editor content, makes it focusable,
 * and restores the scroll position, once the initial decorations have been applied.
 */
export const showContentWhenParsed = [
  parsedAttributesConf.of([EditorView.editable.of(false)]),
  ViewPlugin.define(view => {
    const showContent = () => {
      view.dispatch(
        {
          effects: parsedAttributesConf.reconfigure([
            EditorView.editorAttributes.of({
              class: 'ol-cm-parsed',
            }),
            EditorView.editable.of(true),
          ]),
        },
        // ColTex: keep the cursor in view instead of Overleaf's stored scroll position.
        { effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: 'center' }) }
      )
      view.focus()
    }

    // already parsed
    if (syntaxTree(view.state).length === view.state.doc.length) {
      window.setTimeout(showContent)
      return {}
    }

    // ColTex: the language is set up with the editor (there's no "language
    // loaded" effect), so parse the whole document right away, then show it.
    const timer = window.setTimeout(() => {
      forceParsing(view, view.state.doc.length, Infinity)
      // in a timeout so the decorations can build first
      window.setTimeout(showContent)
    })
    return {
      destroy() {
        window.clearTimeout(timer)
      },
    }
  }),
]

/**
 * A transaction extender which scrolls mouse clicks into view, in case decorations have moved the cursor out of view.
 */
const scrollJumpAdjuster = EditorState.transactionExtender.of(tr => {
  // Attach a "scrollIntoView" effect on all mouse selections to adjust for
  // any jumps that may occur when hiding/showing decorations.
  if (!tr.scrollIntoView) {
    for (const effect of tr.effects) {
      if (effect.is(mouseDownEffect) && effect.value === false) {
        return {
          effects: EditorView.scrollIntoView(tr.newSelection.main.head),
        }
      }
    }
  }

  return {}
})

const sharedVisualExtensions = () => [
  visualTheme,
  visualHighlightStyle,
  mousedown,
  scrollJumpAdjuster,
  showContentWhenParsed,
  EditorView.contentAttributes.of({ 'aria-label': 'Visual Editor editing' }),
  selectionInTextColumn, // ColTex
]

const latexVisualExtensions = (): Extension => [
  listItemMarker,
  atomicDecorations,
  markDecorations, // NOTE: must be after atomicDecorations, so that mark decorations wrap inline widgets
  visualKeymap,
  commandTooltip,
  pasteHtml,
]

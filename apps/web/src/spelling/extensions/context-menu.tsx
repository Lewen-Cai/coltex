// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/spelling/context-menu.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { createRoot } from 'react-dom/client'
import {
  StateField,
  StateEffect,
  Prec,
  EditorSelection,
} from '@codemirror/state'
import { EditorView, showTooltip, Tooltip, keymap } from '@codemirror/view'
import { toast } from 'sonner'
import { Word, Mark, getMarkAtPosition } from './spellchecker'
import { getSpellChecker, getSpellCheckLanguage } from './index'
import { SpellingSuggestions } from './spelling-suggestions'
import { addLearnedWord } from './learned-words'
import { closeAllContextMenusEffect } from './close-all-context-menus-effect'
import { api } from '@/lib/api'
import { noteLearnedWord } from '../use-learned-words'

/*
 * The time until which a click event will be ignored, so it doesn't immediately close the spelling menu.
 * Safari emits an additional "click" event when event.preventDefault() is called in the "contextmenu" event listener.
 */
let openingUntil = 0

/*
 * Hide the spelling menu on click
 */
const handleClickEvent = (event: MouseEvent, view: EditorView) => {
  if (Date.now() < openingUntil) {
    return
  }

  if (view.state.field(spellingMenuField, false)) {
    view.dispatch({
      effects: hideSpellingMenu.of(null),
    })
  }
}

/*
 * Detect when the user right-clicks on a misspelled word,
 * and show a menu of suggestions
 */
const handleContextMenuEvent = (event: MouseEvent, view: EditorView) => {
  if (event.shiftKey) {
    view.dispatch({ effects: closeAllContextMenusEffect.of(null) })
    return
  }

  // ColTex: client coordinates (posAtCoords expects viewport coordinates).
  const position = view.posAtCoords(
    {
      x: event.clientX,
      y: event.clientY,
    },
    false
  )
  const targetMark = getMarkAtPosition(view, position)

  if (!targetMark) {
    return
  }

  const { value } = targetMark

  const targetWord = value.spec.word
  if (!targetWord) {
    return
  }

  event.preventDefault()

  openingUntil = Date.now() + 100

  view.dispatch({
    effects: [
      closeAllContextMenusEffect.of(null),
      showSpellingMenu.of({
        mark: targetMark,
        word: targetWord,
      }),
    ],
  })
}

const handleShortcutEvent = (view: EditorView) => {
  const targetMark = getMarkAtPosition(view, view.state.selection.main.from)

  if (!targetMark || !targetMark.value) {
    return false
  }

  view.dispatch({
    effects: [
      closeAllContextMenusEffect.of(null),
      showSpellingMenu.of({
        mark: targetMark,
        word: targetMark.value.spec.word,
      }),
    ],
  })

  return true
}

/*
 * Spelling menu "tooltip" field.
 * Manages the menu of suggestions shown on right-click
 */
export const spellingMenuField = StateField.define<Tooltip | null>({
  create() {
    return null
  },
  update(value, transaction) {
    if (value) {
      value = {
        ...value,
        pos: transaction.changes.mapPos(value.pos),
        end: value.end ? transaction.changes.mapPos(value.end) : undefined,
      }
    }

    for (const effect of transaction.effects) {
      if (effect.is(hideSpellingMenu)) {
        value = null
      } else if (effect.is(showSpellingMenu)) {
        const { mark, word } = effect.value
        // Build a "Tooltip" showing the suggestions
        value = {
          pos: mark.from,
          end: mark.to,
          above: false,
          strictSide: false,
          create: createSpellingSuggestionList(word),
        }
      } else if (effect.is(closeAllContextMenusEffect)) {
        value = null
      }
    }
    return value
  },
  provide: field => {
    return [
      showTooltip.from(field),
      EditorView.domEventHandlers({
        contextmenu: handleContextMenuEvent,
        click: handleClickEvent,
      }),
      Prec.highest(
        keymap.of([
          { key: 'Ctrl-Space', run: handleShortcutEvent },
          { key: 'Alt-Space', run: handleShortcutEvent },
        ])
      ),
    ]
  },
})

const showSpellingMenu = StateEffect.define<{ mark: Mark; word: Word }>()

export const hideSpellingMenu = StateEffect.define()

/*
 * Creates the suggestion menu dom, to be displayed in the
 * spelling menu "tooltip"
 * */
const createSpellingSuggestionList = (word: Word) => (view: EditorView) => {
  const dom = document.createElement('div')
  dom.classList.add('ol-cm-spelling-context-menu-tooltip')

  const root = createRoot(dom)
  root.render(
    <SpellingSuggestions
      word={word}
      spellCheckLanguage={getSpellCheckLanguage(view.state)}
      spellChecker={getSpellChecker(view.state)}
      handleClose={(focus = true) => {
        view.dispatch({
          effects: hideSpellingMenu.of(null),
        })
        if (focus) {
          view.focus()
        }
      }}
      handleLearnWord={() => {
        const tooltip = view.state.field(spellingMenuField)
        if (tooltip) {
          window.setTimeout(() => {
            view.dispatch({
              selection: EditorSelection.cursor(tooltip.end ?? tooltip.pos),
            })
          })
        }
        view.focus()

        // ColTex: the user's dictionary lives on the ColTex server.
        api
          .learnWord(word.text)
          .then(() => {
            noteLearnedWord(word.text, true)
            view.dispatch(addLearnedWord(word.text), {
              effects: hideSpellingMenu.of(null),
            })
          })
          .catch(error => {
            // Error messages stay in English everywhere in ColTex.
            toast.error((error as Error).message)
          })
      }}
      handleCorrectWord={(text: string) => {
        const tooltip = view.state.field(spellingMenuField)
        if (!tooltip) {
          throw new Error('No active tooltip')
        }

        const existingText = view.state.doc.sliceString(
          tooltip.pos,
          tooltip.end
        )
        if (existingText !== word.text) {
          return
        }

        window.setTimeout(() => {
          const changes = view.state.changes([
            { from: tooltip.pos, to: tooltip.end, insert: text },
          ])

          view.dispatch({
            changes,
            effects: [hideSpellingMenu.of(null)],
            selection: EditorSelection.cursor(tooltip.end ?? tooltip.pos).map(
              changes
            ),
            // ColTex: a normal user edit, so Yjs and track changes see it.
            userEvent: 'input.spelling',
          })
        })
        view.focus()
      }}
    />
  )

  const destroy = () => {
    // ColTex: unmount after CodeMirror's update cycle (React warns when a root
    // is unmounted synchronously while rendering).
    window.setTimeout(() => root.unmount())
  }

  return { dom, destroy }
}

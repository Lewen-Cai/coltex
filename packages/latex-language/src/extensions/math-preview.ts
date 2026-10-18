// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/math-preview.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView, keymap, showTooltip, Tooltip, ViewPlugin } from '@codemirror/view'
import {
  Compartment,
  EditorState,
  Extension,
  StateEffect,
  StateField,
  TransactionSpec,
} from '@codemirror/state'
import { declaredMathOperators, renderMath as typesetMath } from './visual/utils/katex'
import { descendantsOfNodeWithType } from '../utils/tree-query'
import {
  MathContainer,
  mathAncestorNode,
  parseMathContainer,
} from '../utils/tree-operations/math'
import { documentCommands } from '../languages/latex/document-commands'
import { nodeHasError } from '../utils/tree-operations/common'
import { documentEnvironments } from '../languages/latex/document-environments'
import { repositionAllTooltips, tooltipsReposition } from './tooltips-reposition'

const HIDE_TOOLTIP_EVENT = 'editor:hideMathTooltip'

// ColTex: Esc hides the preview until the cursor leaves the formula (Overleaf
// puts this in a React menu inside the tooltip; turning it off is a setting).
const hideTooltipKeymap = keymap.of([
  {
    key: 'Escape',
    run(view) {
      const value = view.state.field(mathPreviewStateField, false)
      if (!value?.tooltip) return false
      view.dispatch({ effects: hideTooltipEffect.of(null) })
      return true
    },
  },
])

export const mathPreview = (enabled: boolean): Extension => {
  return [
    mathPreviewTheme,
    tooltipsReposition(),
    mathPreviewConf.of(enabled ? [mathPreviewStateField, hideTooltipKeymap] : []),
  ]
}

export const hideTooltipEffect = StateEffect.define<null>()

const mathPreviewConf = new Compartment()

export const setMathPreview = (enabled: boolean): TransactionSpec => ({
  effects: mathPreviewConf.reconfigure(
    enabled ? [mathPreviewStateField, hideTooltipKeymap] : []
  ),
})

export const mathPreviewStateField = StateField.define<{
  tooltip: Tooltip | null
  hide: boolean
}>({
  create: buildInitialState,

  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(hideTooltipEffect)) {
        return { tooltip: null, hide: true }
      }
    }

    if (tr.docChanged || tr.selection) {
      const mathContainer = getMathContainer(tr.state)

      if (mathContainer) {
        if (state.hide) {
          return { tooltip: null, hide: true }
        } else {
          const mathContent = buildTooltipContent(tr.state, mathContainer)

          return {
            tooltip: buildTooltip(mathContainer, mathContent),
            hide: false,
          }
        }
      }

      return { tooltip: null, hide: false }
    }

    return state
  },

  provide: field => [
    showTooltip.compute([field], state => state.field(field).tooltip),

    ViewPlugin.define(view => {
      const hideTooltip = () => {
        view.dispatch({
          effects: hideTooltipEffect.of(null),
        })
      }

      window.addEventListener(HIDE_TOOLTIP_EVENT, hideTooltip)

      return {
        destroy() {
          window.removeEventListener(HIDE_TOOLTIP_EVENT, hideTooltip)
        },
      }
    }),
  ],
})

function buildInitialState(state: EditorState) {
  const mathContainer = getMathContainer(state)

  if (mathContainer) {
    const mathContent = buildTooltipContent(state, mathContainer)

    return {
      tooltip: buildTooltip(mathContainer, mathContent),
      mathContent,
      hide: false,
    }
  }

  return { tooltip: null, hide: false, mathContent: null }
}

// ColTex: KaTeX (as in the visual editor) instead of MathJax; the definitions
// become KaTeX macros.
const renderMath = async (
  content: string,
  displayMode: boolean,
  element: HTMLElement,
  definitions: string
) => {
  await typesetMath(element, content, displayMode, definitions)
}

function buildTooltip(
  mathContainer: MathContainer,
  mathContent: HTMLDivElement | null
): Tooltip | null {
  if (!mathContent || !mathContainer) {
    return null
  }

  return {
    pos: mathContainer.pos,
    above: true,
    strictSide: true,
    arrow: false,
    create() {
      const dom = document.createElement('div')
      dom.classList.add('ol-cm-math-tooltip-container')
      const innerElt = document.createElement('div')
      innerElt.classList.add('ol-cm-math-tooltip')
      innerElt.id = 'ol-cm-math-tooltip'
      innerElt.appendChild(mathContent)
      dom.appendChild(innerElt)

      return { dom, overlap: true, offset: { x: 0, y: 8 } }
    },
  }
}

const getMathContainer = (state: EditorState) => {
  const range = state.selection.main

  if (!range.empty) {
    return null
  }

  // if anywhere inside Math, find the whole Math node
  const ancestorNode = mathAncestorNode(state, range.from)
  if (!ancestorNode) return null

  const [node] = descendantsOfNodeWithType(ancestorNode, 'Math', 'Math')
  if (!node) return null

  if (nodeHasError(ancestorNode)) return null

  return parseMathContainer(state, node, ancestorNode)
}

const buildTooltipContent = (
  state: EditorState,
  math: MathContainer | null
): HTMLDivElement | null => {
  if (!math || !math.content.length) return null

  const element = document.createElement('div')
  element.style.opacity = '0'
  element.textContent = math.content

  // ColTex: KaTeX needs \DeclareMathOperator lines too (MathJax didn't).
  let definitions = declaredMathOperators(
    state.sliceDoc(0, Math.min(state.doc.length, 100_000))
  )
  if (definitions) definitions += '\n'

  const environmentState = state.field(documentEnvironments, false)
  if (environmentState?.items) {
    for (const environment of environmentState.items) {
      if (environment.type === 'definition') {
        definitions += `${environment.raw}\n`
      }
    }
  }

  const commandState = state.field(documentCommands, false)
  if (commandState?.items) {
    for (const command of commandState.items) {
      if (command.type === 'definition' && command.raw) {
        definitions += `${command.raw}\n`
      }
    }
  }

  renderMath(withoutAutoNumbers(math.content), math.displayMode, element, definitions)
    .then(() => {
      element.style.opacity = '1'
      repositionAllTooltips()
    })
    .catch(() => {
      // KaTeX renders its own errors in place; a failure here is a load error.
    })

  return element
}

// ColTex: the preview renders one equation on its own, so KaTeX would number
// every one (1). The real number depends on the document (class, counters,
// earlier equations), so the preview shows none: numbered environments become
// their starred forms. An explicit \tag{…} still shows.
const NUMBERED = /\\(begin|end)\{(equation|align|gather|alignat)\}/g

export const withoutAutoNumbers = (content: string) => content.replace(NUMBERED, (_, which, env) => `\\${which}{${env}*}`)

/**
 * Styles for the preview tooltip
 */
// ColTex: the app's theme variables (the tooltip frame comes from the editor theme).
const mathPreviewTheme = EditorView.baseTheme({
  '.cm-tooltip:has(> .ol-cm-math-tooltip-container)': {
    border: 'none !important',
    background: 'transparent !important',
    boxShadow: 'none !important',
  },
  '.ol-cm-math-tooltip': {
    padding: '6px 10px',
    maxWidth: 'min(640px, 80vw)',
    overflowX: 'auto',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    boxShadow: 'var(--shadow-popover)',
  },
  '.ol-cm-math-tooltip .katex-display': {
    margin: '0',
  },
  // KaTeX pins equation numbers to the right edge of the display, which in a
  // tooltip as wide as the formula puts them on top of its end: keep them in
  // the line after the formula instead.
  '.ol-cm-math-tooltip .katex-display > .katex > .katex-html': {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  '.ol-cm-math-tooltip .katex-display > .katex > .katex-html > .katex-tag': {
    position: 'static',
    marginLeft: '2em',
  },
})

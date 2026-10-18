// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/command-tooltip.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// and the tooltip contents in components/command-tooltip/*.tsx (href, url, ref, include, input, subfile).
// See NOTICE at the repository root.
//
// ColTex: the contents are plain DOM built here (Overleaf renders React into
// the tooltip through a portal); opening files, labels in other files and
// links goes through the web app (commandTooltipActions in visual-options.ts).

import {
  Decoration,
  EditorView,
  getTooltip,
  keymap,
  showTooltip,
  Tooltip,
  TooltipView,
  ViewUpdate,
} from '@codemirror/view'
import {
  EditorSelection,
  EditorState,
  Prec,
  SelectionRange,
  StateEffect,
  StateField,
} from '@codemirror/state'
import { ancestorOfNodeWithType } from '../utils/tree-query'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import {
  FilePathArgument,
  LiteralArgContent,
  RefArgument,
  ShortArg,
  ShortTextArgument,
  UrlArgument,
} from '../lezer-latex/latex.terms.mjs'
import {
  hasNextSnippetField,
  selectedCompletion,
} from '@codemirror/autocomplete'
import { SyntaxNode } from '@lezer/common'
import {
  LabelArgument,
  ShortArg as ShortArgTerm,
} from '../lezer-latex/latex.terms.mjs'
import { commandTooltipActionsFacet } from './visual/visual-options'

type ActiveTooltip = {
  range: SelectionRange
  tooltip: Tooltip
  command: string
} | null

const createTooltipView = (
  view: EditorView,
  command: string,
  update?: (update: ViewUpdate) => void
): TooltipView => {
  const dom = document.createElement('div')
  dom.role = 'menu'
  dom.classList.add('ol-cm-command-tooltip')
  dom.append(tooltipContent(view, command)) // ColTex
  return { dom, update }
}

const buildTooltip = (
  command: string,
  pos: number,
  value: ActiveTooltip,
  commandNode: SyntaxNode,
  argumentNode?: SyntaxNode | null,
  update?: (update: ViewUpdate) => void
): ActiveTooltip => {
  if (!argumentNode) {
    return null
  }

  const { from, to } = commandNode

  // if the node still matches the range (i.e. this is the same node),
  // re-use the tooltip by supplying the same create function
  if (value && from === value.range.from && to === value.range.to) {
    return {
      ...value,
      tooltip: { ...value.tooltip, pos },
    }
  }

  return {
    command,
    range: EditorSelection.range(from, to),
    tooltip: {
      create: view => createTooltipView(view, command, update), // ensure a new create function
      arrow: true,
      pos,
    },
  }
}

const createTooltipState = (
  state: EditorState,
  value: ActiveTooltip
): ActiveTooltip => {
  // NOTE: only handling the main selection
  const { main } = state.selection
  const pos = main.head
  const node = syntaxTree(state).resolveInner(pos, 0)
  const commandNode = ancestorOfNodeWithType(node, '$CommandTooltipCommand')
  if (!commandNode) {
    return null
  }
  // only show the tooltip when the selection is completely inside the node
  if (main.from < commandNode.from || main.to > commandNode.to) {
    return null
  }
  const commandName = commandNode.name

  switch (commandName) {
    // a hyperlink (\href)
    case 'HrefCommand': {
      const argumentNode = commandNode
        .getChild(UrlArgument)
        ?.getChild(LiteralArgContent)

      if (
        argumentNode &&
        state.sliceDoc(argumentNode.from, argumentNode.to).includes('\n')
      ) {
        return null
      }

      const update = (update: ViewUpdate) => {
        const tooltipState = commandTooltipState(update.state)
        const input =
          tooltipState && firstInteractiveElement(update.view, tooltipState)
        if (input && document.activeElement !== input) {
          const commandNode = resolveCommandNode(update.state)
          const argumentNode = commandNode
            ?.getChild(UrlArgument)
            ?.getChild(LiteralArgContent)

          if (argumentNode) {
            const url = update.state.sliceDoc(
              argumentNode.from,
              argumentNode.to
            )
            if (url !== input.value) {
              input.dispatchEvent(
                new CustomEvent('value-update', {
                  detail: url,
                })
              )
            }
          }
        }
      }

      return buildTooltip(
        commandName,
        pos,
        value,
        commandNode,
        argumentNode,
        update
      )
    }

    // a URL (\url)
    case 'UrlCommand': {
      const argumentNode = commandNode
        .getChild(UrlArgument)
        ?.getChild(LiteralArgContent)

      if (argumentNode) {
        const content = state
          .sliceDoc(argumentNode.from, argumentNode.to)
          .trim()

        if (
          !content ||
          content.includes('\n') ||
          !/^https?:\/\/\w+/.test(content)
        ) {
          return null
        }
      }

      return buildTooltip(commandName, pos, value, commandNode, argumentNode)
    }

    // a cross-reference (\ref)
    case 'Ref': {
      const argumentNode = commandNode
        .getChild(RefArgument)
        ?.getChild(ShortTextArgument)
        ?.getChild(ShortArg)

      return buildTooltip(commandName, pos, value, commandNode, argumentNode)
    }

    // an included file (\include)
    case 'Include': {
      const argumentNode = commandNode
        .getChild('IncludeArgument')
        ?.getChild(FilePathArgument)
        ?.getChild(LiteralArgContent)

      return buildTooltip(commandName, pos, value, commandNode, argumentNode)
    }

    // an input file (\input)
    case 'Input': {
      const argumentNode = commandNode
        .getChild('InputArgument')
        ?.getChild(FilePathArgument)
        ?.getChild(LiteralArgContent)

      return buildTooltip(commandName, pos, value, commandNode, argumentNode)
    }

    // a subfile file (\subfile)
    case 'Subfile': {
      const argumentNode = commandNode
        .getChild('SubfileArgument')
        ?.getChild(FilePathArgument)
        ?.getChild(LiteralArgContent)

      return buildTooltip(commandName, pos, value, commandNode, argumentNode)
    }
  }

  return null
}

// ColTex: drawn with the app's theme tokens (index.css) instead of Overleaf's.
const commandTooltipTheme = EditorView.baseTheme({
  '.cm-tooltip.ol-cm-command-tooltip': {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
  },
  '.cm-tooltip.ol-cm-command-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'var(--border)',
    borderBottomColor: 'var(--border)',
  },
  '.cm-tooltip.ol-cm-command-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: 'var(--popover)',
    borderBottomColor: 'var(--popover)',
  },
  '.ol-cm-command-tooltip-content': {
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
  },
  '.ol-cm-command-tooltip-link': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 12px',
    border: 'none',
    background: 'none',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    '&:hover:not(:disabled)': { background: 'var(--accent)' },
    '&:disabled': { color: 'var(--muted-foreground)', cursor: 'default' },
  },
  '.ol-cm-command-tooltip-form': {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px 12px 6px',
  },
  '.ol-cm-command-tooltip-form label': {
    color: 'var(--muted-foreground)',
    fontSize: '12px',
  },
  '.ol-cm-command-tooltip-form input': {
    width: '22rem',
    maxWidth: '70vw',
    padding: '4px 8px',
    border: '1px solid var(--input)',
    borderRadius: '6px',
    background: 'var(--background)',
    color: 'var(--foreground)',
    font: 'inherit',
    outline: 'none',
    '&:focus': { borderColor: 'var(--ring)' },
  },
  '.ol-cm-command-tooltip-detail': {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--muted-foreground)',
  },
})

export const resolveCommandNode = (state: EditorState) => {
  const tooltipState = commandTooltipState(state)
  if (tooltipState) {
    const pos = tooltipState.range.from
    const tree = ensureSyntaxTree(state, pos)
    if (tree) {
      return tree.resolveInner(pos, 1).parent
    }
  }
}

const closeCommandTooltipEffect = StateEffect.define()

export const closeCommandTooltip = () => {
  return {
    effects: closeCommandTooltipEffect.of(null),
  }
}

export const commandTooltipStateField = StateField.define<ActiveTooltip>({
  create(state) {
    return createTooltipState(state, null)
  },
  update(value, tr) {
    if (tr.effects.some(effect => effect.is(closeCommandTooltipEffect))) {
      // close the tooltip if this effect is present
      value = null
    } else if (selectedCompletion(tr.state)) {
      // don't show tooltip if autocomplete is open
      value = null
    } else {
      if (value) {
        // map the stored range through changes
        value.range = value.range.map(tr.changes)
      }
      if (tr.docChanged || tr.selection) {
        // create/update the tooltip
        value = createTooltipState(tr.state, value)
      }
    }

    return value
  },
  provide(field) {
    return [
      // show the tooltip when defined
      showTooltip.from(field, field => (field ? field.tooltip : null)),

      // set attributes on the node with the popover
      EditorView.decorations.from(field, field => {
        if (!field) {
          return Decoration.none
        }

        return Decoration.set(
          Decoration.mark({
            attributes: {
              'aria-haspopup': 'menu',
            },
          }).range(field.range.from, field.range.to)
        )
      }),
    ]
  },
})

export const commandTooltipState = (
  state: EditorState
): ActiveTooltip | undefined => state.field(commandTooltipStateField, false)

const firstInteractiveElement = (
  view: EditorView,
  tooltipState: NonNullable<ActiveTooltip>
) =>
  getTooltip(view, tooltipState.tooltip)?.dom.querySelector<
    HTMLInputElement | HTMLButtonElement
  >('input, button')

const commandTooltipKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      // Tab to focus the first element in the tooltip, if open
      run(view) {
        const tooltipState = commandTooltipState(view.state)
        if (tooltipState) {
          const element = firstInteractiveElement(view, tooltipState)
          if (element) {
            // continue to the next snippet if there's already a URL filled in
            if (
              element.type === 'url' &&
              element.value &&
              hasNextSnippetField(view.state)
            ) {
              return false
            }
            element.focus()
            return true
          }
        }

        return false
      },
    },
    {
      key: 'Escape',
      // Escape to close the tooltip, if open
      run(view) {
        const tooltipState = commandTooltipState(view.state)
        if (tooltipState) {
          view.dispatch(closeCommandTooltip())
        }

        return false
      },
    },
  ])
)

export const commandTooltip = [
  commandTooltipStateField,
  commandTooltipKeymap,
  commandTooltipTheme,
]

// ColTex: the tooltips' contents, after Overleaf's components/command-tooltip/*.

const linkButton = (label: string, onClick: () => void, detail?: string) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ol-cm-command-tooltip-link'
  button.textContent = label
  if (detail) {
    const span = document.createElement('span')
    span.className = 'ol-cm-command-tooltip-detail'
    span.textContent = detail
    button.append(span)
  }
  // Keep the editor's selection (and so the tooltip) while clicking.
  button.addEventListener('mousedown', event => event.preventDefault())
  button.addEventListener('click', onClick)
  return button
}

const argumentText = (state: EditorState, node: SyntaxNode | null | undefined) =>
  node ? state.sliceDoc(node.from, node.to) : undefined

const readUrl = (state: EditorState) =>
  argumentText(state, resolveCommandNode(state)?.getChild(UrlArgument)?.getChild(LiteralArgContent))

const openUrl = (view: EditorView, url: string | undefined) => {
  if (!url) return
  const open = view.state.facet(commandTooltipActionsFacet)?.openUrl
  if (open) open(url)
  // Only web and mail links: anything else could run script in this page.
  else if (/^(https?:|mailto:)/i.test(url.trim())) window.open(url.trim(), '_blank', 'noopener,noreferrer')
}

/** The \label{target} in this file, if there is one (upstream's findTargetLabel). */
const findTargetLabel = (state: EditorState, target: string) => {
  let labelNode: SyntaxNode | undefined
  syntaxTree(state).iterate({
    enter(nodeRef) {
      if (labelNode) {
        return false
      }
      if (nodeRef.type.is(LabelArgument)) {
        const argumentNode = nodeRef.node.getChild('ShortTextArgument')?.getChild('ShortArg')
        if (argumentNode && state.sliceDoc(argumentNode.from, argumentNode.to) === target) {
          labelNode = argumentNode
        }
      }
    },
  })
  return labelNode
}

const filePathArgument: Record<string, string> = {
  Include: 'IncludeArgument',
  Input: 'InputArgument',
  Subfile: 'SubfileArgument',
}

function tooltipContent(view: EditorView, command: string): HTMLElement {
  const content = document.createElement('div')
  content.className = 'ol-cm-command-tooltip-content'
  const { state } = view
  const actions = state.facet(commandTooltipActionsFacet)

  switch (command) {
    case 'HrefCommand': {
      const form = document.createElement('form')
      form.className = 'ol-cm-command-tooltip-form'
      const label = document.createElement('label')
      label.textContent = 'URL'
      const input = document.createElement('input')
      input.type = 'url'
      input.placeholder = 'https://…'
      input.autocomplete = 'off'
      input.value = readUrl(state) ?? ''
      input.disabled = state.readOnly
      label.append(input)
      form.append(label)
      // Typing edits the URL in the document as you go (as in Overleaf).
      input.addEventListener('input', () => {
        const node = resolveCommandNode(view.state)?.getChild(UrlArgument)?.getChild(LiteralArgContent)
        if (node) view.dispatch({ changes: { from: node.from, to: node.to, insert: input.value } })
      })
      // The URL changed in the document while not editing it here.
      input.addEventListener('value-update', event => {
        input.value = (event as CustomEvent<string>).detail
      })
      form.addEventListener('submit', event => {
        event.preventDefault()
        view.dispatch(closeCommandTooltip())
        view.focus()
      })
      content.append(form)
      content.append(linkButton(view.state.phrase('open_link'), () => openUrl(view, readUrl(view.state))))
      if (!state.readOnly) {
        content.append(
          linkButton(view.state.phrase('remove_link'), () => {
            const commandNode = resolveCommandNode(view.state)
            const text = commandNode?.getChild(ShortTextArgument)?.getChild(ShortArgTerm)
            if (commandNode && text) {
              view.dispatch({
                changes: { from: commandNode.from, to: commandNode.to, insert: view.state.sliceDoc(text.from, text.to) },
              })
              view.focus()
            }
          })
        )
      }
      // Focus the URL when the link was just made from a selection and has none yet.
      if (view.hasFocus && !state.selection.main.empty && !input.value) {
        window.setTimeout(() => input.focus())
      }
      break
    }

    case 'UrlCommand':
      content.append(linkButton(view.state.phrase('open_link'), () => openUrl(view, readUrl(view.state))))
      break

    case 'Ref': {
      const target = argumentText(
        state,
        resolveCommandNode(state)?.getChild(RefArgument)?.getChild(ShortTextArgument)?.getChild(ShortArg)
      )
      const here = target ? findTargetLabel(state, target) : undefined
      const button = linkButton(view.state.phrase('open_target'), () => {
        const label = target ? findTargetLabel(view.state, target) : undefined
        if (label) {
          const selection = EditorSelection.range(label.from, label.to)
          view.dispatch({ selection, effects: EditorView.scrollIntoView(selection, { y: 'center' }) })
          view.focus()
        } else if (target) {
          actions?.openLabel?.(target)
        }
      }, target)
      // A label in another file needs the web app to find it.
      if (!target || (!here && !actions?.openLabel)) button.disabled = true
      content.append(button)
      break
    }

    case 'Include':
    case 'Input':
    case 'Subfile': {
      const path = argumentText(
        state,
        resolveCommandNode(state)?.getChild(filePathArgument[command])?.getChild(FilePathArgument)?.getChild(LiteralArgContent)
      )?.trim()
      const button = linkButton(view.state.phrase('open_file'), () => path && actions?.openFile?.(path), path)
      if (!path || !actions?.openFile) button.disabled = true
      content.append(button)
      break
    }
  }
  return content
}


// ColTex: what a position is on, for the editor's context menu ("Go to
// label", "Open file"), in code and visual mode alike.
export type CommandTarget = { kind: 'label'; name: string; local?: { from: number; to: number } } | { kind: 'file'; path: string }

export const commandTargetAt = (state: EditorState, pos: number): CommandTarget | undefined => {
  const tree = ensureSyntaxTree(state, pos, 200) ?? syntaxTree(state)
  const commandNode = ancestorOfNodeWithType(tree.resolveInner(pos, 0), '$CommandTooltipCommand')
  if (!commandNode) return undefined
  if (commandNode.name === 'Ref') {
    const name = argumentText(state, commandNode.getChild(RefArgument)?.getChild(ShortTextArgument)?.getChild(ShortArg))?.trim()
    if (!name) return undefined
    const label = findTargetLabel(state, name)
    return { kind: 'label', name, local: label ? { from: label.from, to: label.to } : undefined }
  }
  const argument = filePathArgument[commandNode.name]
  if (argument) {
    const path = argumentText(state, commandNode.getChild(argument)?.getChild(FilePathArgument)?.getChild(LiteralArgContent))?.trim()
    return path ? { kind: 'file', path } : undefined
  }
  return undefined
}

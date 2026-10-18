// Adapted from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/figure-modal/figure-modal.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// (its insert and delete callbacks). See NOTICE at the repository root.
//
// ColTex: plain functions on the editor (the modal is the web app's), and
// the caption and label take their text from the modal instead of
// placeholders, so an existing caption or label can be changed there too.

import { ChangeSpec, EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { editFigureDataEffect, FigureData } from '../../extensions/figure-modal'
import { ensureEmptyLine } from '../../extensions/toolbar/commands'
import { prepareLines } from '../../utils/prepare-lines'
import { isSvgFile } from '../../utils/file'

export type FigureOptions = {
  /** The image's path as \includegraphics takes it (from the project root). */
  path: string
  /** A fraction of \linewidth; undefined leaves the size alone (or out). */
  width?: number
  /** The caption's text, or null for none. */
  caption: string | null
  /** The label's key (e.g. fig:results), or null for none. */
  label: string | null
}

/** The last top-level {…} group in `text`, as offsets of its content. */
function lastGroup(text: string): { from: number; to: number } | null {
  let depth = 0
  let open = -1
  let found: { from: number; to: number } | null = null
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\') {
      i++
    } else if (ch === '{') {
      if (depth++ === 0) open = i
    } else if (ch === '}' && depth > 0 && --depth === 0) {
      found = { from: open + 1, to: i }
    }
  }
  return found
}

/** The text of a \caption{…} or \label{…} command, or null. */
function argumentText(state: EditorState, range: { from: number; to: number } | null) {
  if (!range) return null
  const text = state.sliceDoc(range.from, range.to)
  const group = lastGroup(text)
  return group ? text.slice(group.from, group.to) : null
}

/** What the modal starts from when editing a figure: its caption and label text. */
export function figureTexts(state: EditorState, figure: FigureData) {
  return {
    caption: argumentText(state, figure.caption),
    label: argumentText(state, figure.label),
  }
}

/** A label key made from an image's file name: plots/My Result.png → fig:my-result. */
export function labelForPath(path: string) {
  const stem = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
  const key = stem
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return `fig:${key || 'figure'}`
}

/**
 * ColTex: \usepackage{graphicx} for a document that doesn't load it, when
 * this file holds the preamble (a figure in a chapter file can't see it; the
 * compile log's hint covers that). Classes like beamer load it themselves.
 */
function graphicxChange(state: EditorState): ChangeSpec | null {
  const text = state.doc.toString()
  const begin = text.indexOf('\\begin{document}')
  const docclass = /^[^%\n]*\\documentclass(\[[^\]]*\])?\{([^}]*)\}.*$/m.exec(text)
  if (begin < 0 || !docclass || docclass.index > begin) return null
  const preamble = text.slice(0, begin)
  if (/^\s*(beamer|ctexbeamer|tikzposter|a0poster)\s*$/.test(docclass[2])) return null
  const loads = /^[^%\n]*\\(usepackage|RequirePackage)\s*(\[[^\]]*\])?\s*\{[^}]*\bgraphicx?\b[^}]*\}/m
  if (loads.test(preamble)) return null
  // Before hyperref (which wants to come last), else after the last \usepackage
  // line, else after \documentclass.
  const hyperref = /^[^%\n]*\\usepackage\s*(\[[^\]]*\])?\s*\{[^}]*\bhyperref\b[^}]*\}/m.exec(preamble)
  if (hyperref) {
    const lineStart = preamble.lastIndexOf('\n', hyperref.index) + 1
    return { from: lineStart, insert: '\\usepackage{graphicx}\n' }
  }
  const packages = [...preamble.matchAll(/^[^%\n]*\\usepackage\b.*$/gm)]
  const last = packages.at(-1) ?? docclass
  const at = last.index + last[0].length
  return { from: at, insert: '\n\\usepackage{graphicx}' }
}

/** `key`, or key-2, key-3… when the document already has a \label{key}. */
export function uniqueLabel(state: EditorState, key: string) {
  const text = state.doc.toString()
  const taken = (k: string) => text.includes(`\\label{${k}}`)
  if (!taken(key)) return key
  let n = 2
  while (taken(`${key}-${n}`)) n++
  return `${key}-${n}`
}

const widthArgument = (width: number | undefined) =>
  width !== undefined ? `[width=${width}\\linewidth]` : ''

const graphicsCommandFor = (path: string) => {
  const isSvg = isSvgFile(path)
  // \includesvg takes the path without .svg
  return { name: isSvg ? 'includesvg' : 'includegraphics', path: isSvg ? path.replace(/\.svg$/i, '') : path }
}

/** Insert a new figure environment on an empty line at the cursor. */
export function insertFigure(view: EditorView, options: FigureOptions) {
  const { state } = view
  const { pos } = ensureEmptyLine(state, state.selection.main)
  const command = graphicsCommandFor(options.path)
  const lines = [
    '\\begin{figure}',
    '\t\\centering',
    `\t\\${command.name}${widthArgument(options.width)}{${command.path}}`,
    options.caption !== null ? `\t\\caption{${options.caption}}` : null,
    options.label !== null ? `\t\\label{${options.label}}` : null,
    '\\end{figure}',
  ].filter(line => line !== null)
  // ColTex: the figure gets lines of its own, and the cursor an empty line
  // after it (outside the environment, so the visual editor shows the figure).
  // On the last line ensureEmptyLine points at its end.
  const prefix = state.doc.lineAt(pos).text.trim() && pos === state.doc.lineAt(pos).to ? '\n' : ''
  const followedByText = pos < state.doc.length && state.doc.lineAt(pos).text.trim() !== '' && !prefix
  const figure = prefix + lines.join('\n') + '\n'
  const graphicx = graphicxChange(state)
  const changes = state.changes([{ from: pos, insert: figure + (followedByText ? '\n' : '') }, ...(graphicx ? [graphicx] : [])])
  view.dispatch({
    changes,
    // Where the figure starts once the package line (above it) is in.
    selection: EditorSelection.cursor(changes.mapPos(pos, -1) + figure.length),
    scrollIntoView: true,
    userEvent: 'input',
  })
}

/** Apply the modal's options to an existing figure (the one being edited). */
export function updateFigure(view: EditorView, figure: FigureData, options: FigureOptions) {
  const { state } = view
  const changes: ChangeSpec[] = []

  // The image and its width.
  const command = graphicsCommandFor(options.path)
  const wasSvg = isSvgFile(figure.file.path)
  if (isSvgFile(options.path) !== wasSvg) {
    // Replace the entire graphics command when switching between SVG and non-SVG
    const args = figure.unknownGraphicsArguments
      ? `[${figure.unknownGraphicsArguments}]`
      : widthArgument(options.width ?? figure.width)
    changes.push({
      from: figure.graphicsCommand.from,
      to: figure.graphicsCommand.to,
      insert: `\\${command.name}${args}{${command.path}}`,
    })
  } else {
    if (!figure.unknownGraphicsArguments && options.width !== undefined && options.width !== figure.width) {
      // We understood the arguments, and should update the width
      if (figure.graphicsCommandArguments !== null) {
        changes.push({
          from: figure.graphicsCommandArguments.from,
          to: figure.graphicsCommandArguments.to,
          insert: `width=${options.width}\\linewidth`,
        })
      } else {
        changes.push({ from: figure.file.from - 1, insert: widthArgument(options.width) })
      }
    }
    if (command.path !== state.sliceDoc(figure.file.from, figure.file.to)) {
      changes.push({ from: figure.file.from, to: figure.file.to, insert: command.path })
    }
  }

  // The caption and the label: removed, inserted, or their text changed.
  const current = figureTexts(state, figure)
  const replaceArgument = (range: { from: number; to: number }, text: string) => {
    const group = lastGroup(state.sliceDoc(range.from, range.to))
    if (group) changes.push({ from: range.from + group.from, to: range.from + group.to, insert: text })
  }
  if (figure.caption) {
    if (options.caption === null) changes.push({ from: figure.caption.from, to: figure.caption.to, insert: '' })
    else if (options.caption !== current.caption) replaceArgument(figure.caption, options.caption)
  } else if (options.caption !== null) {
    changes.push({
      from: figure.graphicsCommand.to,
      insert: prepareLines(['', `\\caption{${options.caption}}`], state, figure.graphicsCommand.to),
    })
  }
  const labelInsideCaption =
    figure.caption && figure.label && figure.label.from >= figure.caption.from && figure.label.to <= figure.caption.to
  if (figure.label) {
    if (options.label === null) {
      // A label inside a caption that is removed goes with it.
      if (!(labelInsideCaption && options.caption === null)) {
        changes.push({ from: figure.label.from, to: figure.label.to, insert: '' })
      }
    } else if (options.label !== current.label) {
      replaceArgument(figure.label, options.label)
    }
  } else if (options.label !== null) {
    const from = figure.caption && options.caption !== null ? figure.caption.to : figure.graphicsCommand.to
    changes.push({ from, insert: prepareLines(['', `\\label{${options.label}}`], state, from) })
  }

  view.dispatch({
    changes: state.changes(changes),
    effects: editFigureDataEffect.of(null),
    userEvent: 'input',
  })
}

/** Remove the figure being edited. */
export function deleteFigure(view: EditorView, figure: FigureData) {
  view.dispatch({
    effects: editFigureDataEffect.of(null),
    changes: view.state.changes({ from: figure.from, to: figure.to, insert: '' }),
    userEvent: 'delete',
  })
}

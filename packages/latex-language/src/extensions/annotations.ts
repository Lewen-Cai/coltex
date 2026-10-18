// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/annotations.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView, ViewUpdate } from '@codemirror/view'
import { Diagnostic, linter, lintGutter } from '@codemirror/lint'
import {
  Compartment,
  EditorState,
  Extension,
  Line,
  RangeSet,
  RangeValue,
  StateEffect,
  StateField,
} from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// ColTex: Overleaf's types/annotation.ts (a compile log entry placed on a line of the open file).
export type Annotation = {
  /** 0-based line; -1 means the whole document. */
  row: number
  type: 'error' | 'warning' | 'info'
  text: string
  ruleId?: string
  command?: string
  id?: string
  entryIndex: number
  source?: string
  firstOnLine?: boolean
}

interface CompileLogDiagnostic extends Diagnostic {
  compile?: true
  ruleId?: string
  id?: string
  entryIndex: number
  firstOnLine?: boolean
}

type RenderedDiagnostic = Pick<
  CompileLogDiagnostic,
  | 'message'
  | 'severity'
  | 'ruleId'
  | 'compile'
  | 'source'
  | 'id'
  | 'firstOnLine'
>

const compileLintSourceConf = new Compartment()

export const annotations = () => [
  compileDiagnosticsState,
  compileLintSourceConf.of(compileLogLintSource()),
  /**
   * The built-in lint gutter extension, configured with zero hover delay.
   */
  lintGutter({
    hoverTime: 0,
  }),
  annotationsTheme,
]

/**
 * A theme which moves the lint gutter outside the line numbers.
 */
const annotationsTheme = EditorView.baseTheme({
  '.cm-gutter-lint': {
    order: -1,
  },
})

export const lintSourceConfig = {
  delay: 100,
  // Show highlights only for errors
  markerFilter(diagnostics: readonly Diagnostic[]) {
    return diagnostics.filter(d => d.severity === 'error')
  },
  // Do not show any tooltips for highlights within the editor content
  tooltipFilter() {
    return []
  },
  needsRefresh(update: ViewUpdate) {
    return update.selectionSet
  },
}

/**
 * A lint source using the compile log diagnostics
 */
const compileLogLintSource = (): Extension =>
  linter(view => {
    const items: CompileLogDiagnostic[] = []
    // NOTE: iter() changes the order of diagnostics on the same line
    const cursor = view.state.field(compileDiagnosticsState).iter()
    while (cursor.value !== null) {
      const { diagnostic } = cursor.value
      items.push({
        ...diagnostic,
        from: cursor.from,
        to: cursor.to,
        renderMessage: () => renderMessage(diagnostic),
      })
      cursor.next()
    }
    // restore the original order of items
    items.sort((a, b) => a.from - b.from || a.entryIndex - b.entryIndex)
    return items
  }, lintSourceConfig)

class CompileLogDiagnosticRangeValue extends RangeValue {
  constructor(public diagnostic: CompileLogDiagnostic) {
    super()
  }
}

const setCompileDiagnosticsEffect = StateEffect.define<CompileLogDiagnostic[]>()

/**
 * A state field for the compile log diagnostics
 */
export const compileDiagnosticsState = StateField.define<
  RangeSet<CompileLogDiagnosticRangeValue>
>({
  create() {
    return RangeSet.empty
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setCompileDiagnosticsEffect)) {
        return RangeSet.of(
          effect.value.map(diagnostic =>
            new CompileLogDiagnosticRangeValue(diagnostic).range(
              diagnostic.from,
              diagnostic.to
            )
          ),
          true
        )
      }
    }

    if (transaction.docChanged) {
      value = value.map(transaction.changes)
    }

    return value
  },
})

export const setAnnotations = (
  state: EditorState,
  annotations: Annotation[]
) => {
  const diagnostics: CompileLogDiagnostic[] = []

  for (const annotation of annotations) {
    // ignore "whole document" (row: -1) annotations
    if (annotation.row !== -1) {
      try {
        diagnostics.push(...convertAnnotationToDiagnostic(state, annotation))
      } catch {
        // ignore invalid annotations (ColTex: e.g. a line that no longer exists)
      }
    }
  }

  return {
    effects: setCompileDiagnosticsEffect.of(diagnostics),
  }
}

export const showCompileLogDiagnostics = (show: boolean) => {
  return {
    effects: [
      // reconfigure the compile log lint source
      compileLintSourceConf.reconfigure(show ? compileLogLintSource() : []),
    ],
  }
}

const commandRanges = (state: EditorState, line: Line, command: string) => {
  const ranges: { from: number; to: number }[] = []

  syntaxTree(state).iterate({
    enter(nodeRef) {
      if (nodeRef.type.is('CtrlSeq')) {
        const { from, to } = nodeRef
        if (command === state.sliceDoc(from, to)) {
          ranges.push({ from, to })
        }
      }
    },
    from: line.from,
    to: line.to,
  })

  return ranges.slice(0, 1) // NOTE: only highlighting the first match on a line, to avoid duplicate messages
}

const chooseHighlightRanges = (
  state: EditorState,
  line: Line,
  annotation: Annotation
) => {
  const ranges: { from: number; to: number }[] = []

  if (annotation.command) {
    ranges.push(...commandRanges(state, line, annotation.command))
  }

  // default to highlighting the whole line
  if (ranges.length === 0) {
    ranges.push(line)
  }

  return ranges
}

const convertAnnotationToDiagnostic = (
  state: EditorState,
  annotation: Annotation
): CompileLogDiagnostic[] => {
  if (annotation.row < 0) {
    throw new Error(`Invalid annotation row ${annotation.row}`)
  }

  // NOTE: highlight whole line by default, as synctex doesn't output column number
  const line = state.doc.line(annotation.row + 1)

  const highlightRanges = chooseHighlightRanges(state, line, annotation)

  return highlightRanges.map(location => ({
    from: location.from,
    to: location.to,
    severity: annotation.type,
    message: annotation.text,
    ruleId: annotation.ruleId,
    compile: true,
    id: annotation.id,
    entryIndex: annotation.entryIndex,
    source: annotation.source,
    firstOnLine: annotation.firstOnLine,
  }))
}

// ColTex: no diagnostic actions (Overleaf modules) or analytics.
export const renderMessage = (diagnostic: RenderedDiagnostic) => {
  const div = document.createElement('div')
  div.classList.add('ol-cm-diagnostic-message')
  div.append(diagnostic.message)
  return div
}

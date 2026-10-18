import { describe, expect, test } from 'vitest'
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { EditorView, type DecorationSet } from '@codemirror/view'
import {
  BorderTheme,
  insertColumn,
  insertRow,
  latex,
  mergeCells,
  removeRowOrColumns,
  setAlignment,
  setBorders,
  TableSelection,
  visual,
  visualOptions,
  type TableRenderer,
} from '../src/index'
import { generateTable, parseColumnSpecifications, validateParsedTable } from '../src/components/table-generator/utils'

const THESIS = String.raw`\documentclass{article}
\usepackage{booktabs,tabularx,array}
\newcolumntype{Y}{>{\raggedright\arraybackslash}X}
\begin{document}
\begin{table}[htbp]
\centering
\caption{Tasks}
\label{tab:tasks}
\begin{tabularx}{\textwidth}{@{}lYY@{}}
\toprule
Task & Setting & Requirement \\
\midrule
A & one & $v$ \\
B & two & --- \\
\bottomrule
\end{tabularx}
\end{table}
\end{document}
`

const renderer: TableRenderer = { render() {}, destroy() {} }

function stateFor(doc: string, withRenderer = true) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(doc.length),
    extensions: [
      latex(),
      visual('main.tex', true),
      visualOptions({ previewByPath: () => null, ...(withRenderer ? { renderTable: renderer } : {}) }),
    ],
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  return state.update({}).state
}

function widgets(state: EditorState): string[] {
  const names: string[] = []
  for (const source of state.facet(EditorView.decorations)) {
    if (typeof source === 'function') continue
    ;(source as DecorationSet).between(0, state.doc.length, (_from, _to, deco) => {
      const widget = (deco.spec as { widget?: object }).widget
      if (widget) names.push(widget.constructor.name)
    })
  }
  return names
}

function tabularNode(state: EditorState) {
  let node = null as ReturnType<typeof syntaxTree>['topNode'] | null
  syntaxTree(state).iterate({
    enter(n) {
      if (!node && n.type.is('TabularEnvironment')) node = n.node
    },
  })
  return node!
}

/** Just enough of an EditorView for the table commands. */
function fakeView(doc: string) {
  const view = {
    state: stateFor(doc),
    dispatch(spec: TransactionSpec) {
      view.state = view.state.update(spec).state
      ensureSyntaxTree(view.state, view.state.doc.length, 5000)
    },
  }
  return view
}

function parse(view: { state: EditorState }) {
  const node = tabularNode(view.state)
  const data = generateTable(node, view.state)
  return {
    data,
    positions: {
      cells: data.cellPositions,
      columnDeclarations: data.specification,
      rowPositions: data.rowPositions,
      tabular: { from: node.from, to: node.to },
    },
  }
}

function tabularSource(state: EditorState) {
  const node = tabularNode(state)
  return state.sliceDoc(node.from, node.to)
}

describe('table editor (ColTex port)', () => {
  test('reads tabularx with a \\newcolumntype column and booktabs rules', () => {
    const state = stateFor(THESIS)
    const data = generateTable(tabularNode(state), state)
    expect(validateParsedTable(data)).toBe(true)
    const { table } = data
    expect(table.columns.map(c => [c.alignment, c.isParagraphColumn])).toEqual([
      ['left', false],
      ['left', true],
      ['left', true],
    ])
    expect(table.rows.map(r => r.cells.map(c => c.content.trim()))).toEqual([
      ['Task', 'Setting', 'Requirement'],
      ['A', 'one', '$v$'],
      ['B', 'two', '---'],
    ])
    expect(table.getBorderTheme()).toBe(BorderTheme.BOOKTABS)
    expect(widgets(state)).toContain('TabularWidget')
  })

  test('tables stay as source without a renderer; unsupported ones get a notice', () => {
    expect(widgets(stateFor(THESIS, false))).not.toContain('TabularWidget')
    const broken = String.raw`\begin{document}
\begin{tabular}{cc}
a & b & c \\
\end{tabular}
\end{document}`
    const names = widgets(stateFor(broken))
    expect(names).toContain('TableRenderingErrorWidget')
    expect(names).not.toContain('TabularWidget')
  })

  test('column specifications: repeats, X, <{…} and unknown types with arguments', () => {
    expect(parseColumnSpecifications('*{3}{c}|').map(c => c.content)).toEqual(['c', 'c', 'c'])
    const cols = parseColumnSpecifications('lX>{\\centering\\arraybackslash}X<{\\hfill}S[table-format=1.2]')
    expect(cols.map(c => [c.alignment, c.content])).toEqual([
      ['left', 'l'],
      ['paragraph', 'X'],
      ['center', 'X<{\\hfill}'],
      ['left', 'S[table-format=1.2]'],
    ])
    const types = new Map([['P', { definition: '>{\\centering\\arraybackslash}p{#1}', args: 1 }]])
    expect(parseColumnSpecifications('P{2cm}c', types).map(c => [c.alignment, c.isParagraphColumn, c.content])).toEqual([
      ['center', true, 'P{2cm}'],
      ['center', false, 'c'],
    ])
  })

  test('partial rules at the start of a row are skipped', () => {
    const doc = String.raw`\begin{document}
\begin{tabular}{ll}
\toprule
a & b \\
\cmidrule(lr){1-2} \cline{1-1}
c & d \\
\addlinespace[3pt]
\bottomrule
\end{tabular}
\end{document}`
    const state = stateFor(doc)
    const data = generateTable(tabularNode(state), state)
    expect(validateParsedTable(data)).toBe(true)
    expect(data.table.rows.map(r => r.cells.map(c => c.content.trim()))).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  test('aligning a \\newcolumntype column writes the type it builds on', () => {
    const view = fakeView(THESIS)
    const { data, positions } = parse(view)
    const column = new TableSelection({ row: 0, cell: 1 }, { row: 2, cell: 1 })
    setAlignment(view as unknown as EditorView, column, 'center', positions, data.table)
    expect(tabularSource(view.state)).toContain('{@{}l>{\\centering\\arraybackslash}XY@{}}')
  })

  test('rows, columns, borders and merging edit the source', () => {
    const view = fakeView(THESIS)
    let { data, positions } = parse(view)
    insertRow(view as unknown as EditorView, new TableSelection({ row: 1, cell: 0 }), positions, true, data.rowSeparators, data.table)
    ;({ data, positions } = parse(view))
    expect(data.table.rows).toHaveLength(4)
    expect(data.table.getBorderTheme()).toBe(BorderTheme.BOOKTABS)

    insertColumn(view as unknown as EditorView, new TableSelection({ row: 0, cell: 0 }), positions, true, data.table)
    ;({ data, positions } = parse(view))
    expect(data.table.columns).toHaveLength(4)
    expect(validateParsedTable(data)).toBe(true)

    setBorders(view as unknown as EditorView, BorderTheme.FULLY_BORDERED, positions, data.rowSeparators, data.table)
    ;({ data, positions } = parse(view))
    expect(data.table.getBorderTheme()).toBe(BorderTheme.FULLY_BORDERED)

    mergeCells(view as unknown as EditorView, new TableSelection({ row: 0, cell: 0 }, { row: 0, cell: 1 }), data.table)
    ;({ data, positions } = parse(view))
    expect(data.table.rows[0].cells[0].multiColumn?.columnSpan).toBe(2)
    expect(validateParsedTable(data)).toBe(true)

    const lastColumn = new TableSelection({ row: 0, cell: 3 }, { row: data.table.rows.length - 1, cell: 3 })
    removeRowOrColumns(view as unknown as EditorView, lastColumn, positions, data.cellSeparators, data.table)
    ;({ data } = parse(view))
    expect(data.table.columns).toHaveLength(3)
    expect(validateParsedTable(data)).toBe(true)
  })
})

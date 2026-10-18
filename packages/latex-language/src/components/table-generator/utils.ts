// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/utils.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorState } from '@codemirror/state'
import { SyntaxNode } from '@lezer/common'
import { CellData, ColumnDefinition, TableData } from './tabular'
import {
  ABSOLUTE_SIZE_REGEX,
  AbsoluteWidthUnits,
  RELATIVE_SIZE_REGEX,
  RelativeWidthCommand,
  WidthSelection,
} from './toolbar/column-width-modal/column-width'

const COMMIT_CHARACTERS = ['c', 'l', 'r', 'p', 'm', 'b', '>']

// ColTex: moved here from contexts/table-context.tsx (React) so commands can use it.
export type TableEnvironmentData = {
  table: { from: number; to: number }
  caption?: { from: number; to: number }
  label?: { from: number; to: number }
}

// ColTex: column types defined with \newcolumntype (letter → definition and
// number of arguments), read from the document.
export type ColumnTypes = Map<string, { definition: string; args: number }>

const columnTypesCache = new WeakMap<object, ColumnTypes>()

/** ColTex: the \newcolumntype definitions in the document. */
export function columnTypesFor(state: EditorState): ColumnTypes {
  let types = columnTypesCache.get(state.doc)
  if (!types) {
    types = new Map()
    const text = state.doc.toString()
    const re = /\\newcolumntype\s*\{?\s*([A-Za-z])\s*\}?\s*(?:\[\s*(\d)\s*\])?\s*(?=\{)/g
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const end = matchingBrace(text, m.index + m[0].length)
      if (end < 0) continue
      types.set(m[1], { definition: text.slice(m.index + m[0].length + 1, end), args: Number(m[2] ?? 0) })
      re.lastIndex = end
    }
    columnTypesCache.set(state.doc, types)
  }
  return types
}

/** ColTex: the index of the brace closing the group that opens at `start`, or -1. */
function matchingBrace(text: string, start: number, open = '{', close = '}'): number {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === open) depth++
    else if (text[i] === close && --depth === 0) return i
  }
  return -1
}

/** ColTex: `*{3}{c}` written out as `ccc` (the regenerated specification keeps it that way). */
function expandRepeats(specification: string): string {
  for (let i = specification.indexOf('*'); i >= 0; i = specification.indexOf('*', i)) {
    const countEnd = matchingBrace(specification, i + 1)
    if (specification[i + 1] !== '{' || countEnd < 0 || specification[countEnd + 1] !== '{') {
      i++
      continue
    }
    const bodyEnd = matchingBrace(specification, countEnd + 1)
    if (bodyEnd < 0) break
    const count = Math.min(Number.parseInt(specification.slice(i + 2, countEnd)) || 0, 100)
    const body = specification.slice(countEnd + 2, bodyEnd)
    specification = specification.slice(0, i) + body.repeat(count) + specification.slice(bodyEnd + 1)
  }
  return specification
}

/**
 * ColTex: how a column type other than l/c/r/p/m/b displays (from its
 * \newcolumntype definition when there is one).
 */
function customColumn(
  letter: string,
  args: string[],
  columnTypes: ColumnTypes,
  depth: number
): Pick<ColumnDefinition, 'alignment' | 'isParagraphColumn' | 'customType'> {
  if (letter === 'X') {
    return { alignment: 'paragraph', isParagraphColumn: true, customType: { base: 'X' } }
  }
  const type = columnTypes.get(letter)
  if (!type || depth > 4) {
    return { alignment: 'left', isParagraphColumn: false, customType: {} }
  }
  const definition = type.definition.replace(/#(\d)/g, (_, n) => args[Number(n) - 1] ?? '')
  const [column] = parseColumnSpecifications(definition, columnTypes, depth + 1)
  if (!column) {
    return { alignment: 'left', isParagraphColumn: false, customType: {} }
  }
  return {
    alignment: column.alignment,
    isParagraphColumn: column.isParagraphColumn,
    customType: { base: column.isParagraphColumn ? (column.customType?.base ?? column.content.trim()) : undefined },
  }
}

export type CellPosition = { from: number; to: number }
export type RowPosition = {
  from: number
  to: number
  hlines: { from: number; to: number }[]
}

function parseArgument(spec: string, startIndex: number): number {
  if (spec.charAt(startIndex) !== '{') {
    throw new Error('Missing opening brace')
  }
  let depth = 0
  for (let i = startIndex; i < spec.length; i++) {
    if (spec.charAt(i) === '{') {
      depth++
    } else if (spec.charAt(i) === '}') {
      depth--
    }
    if (depth === 0) {
      return i
    }
  }
  throw new Error('Missing closing brace')
}

export function parseColumnSpecifications(
  specification: string,
  columnTypes: ColumnTypes = new Map(), // ColTex
  depth = 0 // ColTex
): ColumnDefinition[] {
  specification = expandRepeats(specification) // ColTex
  const columns: ColumnDefinition[] = []
  let currentAlignment: ColumnDefinition['alignment'] | undefined
  let currentBorderLeft = 0
  let currentBorderRight = 0
  let currentContent = ''
  let currentCellSpacingLeft = ''
  let currentCellSpacingRight = ''
  let currentCustomCellDefinition = ''
  let currentIsParagraphColumn = false
  let currentSize: WidthSelection | undefined
  let currentCustomType: ColumnDefinition['customType'] // ColTex
  function maybeCommit() {
    if (currentAlignment !== undefined) {
      columns.push({
        alignment: currentAlignment,
        borderLeft: currentBorderLeft,
        borderRight: currentBorderRight,
        content: currentContent,
        cellSpacingLeft: currentCellSpacingLeft,
        cellSpacingRight: currentCellSpacingRight,
        customCellDefinition: currentCustomCellDefinition,
        isParagraphColumn: currentIsParagraphColumn,
        size: currentSize,
        ...(currentCustomType ? { customType: currentCustomType } : {}), // ColTex
      })
      currentAlignment = undefined
      currentBorderLeft = 0
      currentBorderRight = 0
      currentContent = ''
      currentCellSpacingLeft = ''
      currentCellSpacingRight = ''
      currentCustomCellDefinition = ''
      currentIsParagraphColumn = false
      currentSize = undefined
      currentCustomType = undefined
    }
  }
  for (let i = 0; i < specification.length; i++) {
    if (
      COMMIT_CHARACTERS.includes(specification.charAt(i)) ||
      /[A-Za-z]/.test(specification.charAt(i)) // ColTex: any column type
    ) {
      maybeCommit()
    }
    const hasAlignment = currentAlignment !== undefined
    const char = specification.charAt(i)
    switch (char) {
      case '|': {
        if (hasAlignment) {
          currentBorderRight++
        } else {
          currentBorderLeft++
        }
        break
      }
      case 'c':
        currentAlignment = 'center'
        currentContent += 'c'
        break
      case 'l':
        currentAlignment = 'left'
        currentContent += 'l'
        break
      case 'r':
        currentAlignment = 'right'
        currentContent += 'r'
        break
      case 'p':
      case 'm':
      case 'b': {
        currentIsParagraphColumn = true
        currentAlignment = 'paragraph'
        if (currentCustomCellDefinition !== '') {
          // Maybe we have another alignment hidden in here
          const match = currentCustomCellDefinition.match(
            />\{\s*\\(raggedleft|raggedright|centering)\s*\\arraybackslash\s*\}/
          )
          if (match) {
            switch (match[1]) {
              case 'raggedleft':
                currentAlignment = 'right'
                break
              case 'raggedright':
                currentAlignment = 'left'
                break
              case 'centering':
                currentAlignment = 'center'
                break
            }
          }
        }
        currentContent += char
        const argumentEnd = parseArgument(specification, i + 1)
        const columnDefinition = specification.slice(i, argumentEnd + 1)
        const absoluteSizeMatch = columnDefinition.match(ABSOLUTE_SIZE_REGEX)
        const relativeSizeMatch = columnDefinition.match(RELATIVE_SIZE_REGEX)
        if (absoluteSizeMatch) {
          currentSize = {
            unit: absoluteSizeMatch[2] as AbsoluteWidthUnits,
            width: parseFloat(absoluteSizeMatch[1]),
          }
        } else if (relativeSizeMatch) {
          const widthAsFraction = parseFloat(relativeSizeMatch[1]) || 0
          currentSize = {
            unit: '%',
            width: widthAsFraction * 100,
            command: relativeSizeMatch[2] as RelativeWidthCommand,
          }
        } else {
          currentSize = {
            unit: 'custom',
            width: columnDefinition.slice(2, -1),
          }
        }
        // Don't include the p twice
        currentContent += columnDefinition.slice(1)
        i = argumentEnd
        break
      }
      case '@':
      case '!': {
        const argumentEnd = parseArgument(specification, i + 1)
        // Include the @/!
        const argument = specification.slice(i, argumentEnd + 1)
        i = argumentEnd
        if (currentAlignment) {
          // We have a cell, so this is right cell spacing
          currentCellSpacingRight = argument
        } else {
          currentCellSpacingLeft = argument
        }
        break
      }
      case '>': {
        const argumentEnd = parseArgument(specification, i + 1)
        // Include the >
        const argument = specification.slice(i, argumentEnd + 1)
        i = argumentEnd
        currentCustomCellDefinition = argument
        break
      }
      case ' ':
      case '\n':
      case '\t':
        currentContent += char
        break
      case '<': {
        // ColTex: kept with its column (upstream drops it).
        const argumentEnd = parseArgument(specification, i + 1)
        currentContent += specification.slice(i, argumentEnd + 1)
        i = argumentEnd
        break
      }
      default: {
        // ColTex: X and column types defined with \newcolumntype (or unknown ones).
        if (!/[A-Za-z]/.test(char)) break
        let content = char
        const args: string[] = []
        const wanted = columnTypes.get(char)?.args ?? 0
        while (specification[i + 1] === '[' || (specification[i + 1] === '{' && (args.length < wanted || !columnTypes.has(char)))) {
          const bracket = specification[i + 1] === '['
          const end = bracket ? matchingBrace(specification, i + 1, '[', ']') : parseArgument(specification, i + 1)
          if (end < 0) throw new Error('Missing closing bracket')
          if (!bracket) args.push(specification.slice(i + 2, end))
          content += specification.slice(i + 1, end + 1)
          i = end
          if (!bracket && !columnTypes.has(char)) break
        }
        const custom = customColumn(char, args, columnTypes, depth)
        currentAlignment = custom.alignment
        currentIsParagraphColumn = custom.isParagraphColumn
        currentCustomType = custom.customType
        if (currentIsParagraphColumn && currentCustomCellDefinition) {
          const match = currentCustomCellDefinition.match(
            />\{\s*\\(raggedleft|raggedright|centering)\s*\\arraybackslash\s*\}/
          )
          if (match) {
            currentAlignment = match[1] === 'raggedleft' ? 'right' : match[1] === 'raggedright' ? 'left' : 'center'
          }
        }
        currentContent += content
      }
    }
  }
  maybeCommit()
  return columns
}

const isRowSeparator = (node: SyntaxNode) =>
  node.type.is('Command') &&
  Boolean(node.getChild('KnownCtrlSym')?.getChild('LineBreak'))

const isHLine = (node: SyntaxNode) =>
  node.type.is('Command') &&
  Boolean(node.getChild('KnownCommand')?.getChild('HorizontalLine'))

// ColTex: rules and spacing between rows that aren't borders; skipped like
// whitespace at the start of a row, with their arguments.
const PARTIAL_RULES = new Set(['\\cline', '\\cmidrule', '\\addlinespace', '\\specialrule', '\\morecmidrules', '\\hhline', '\\rowcolor'])

const isPartialRule = (node: SyntaxNode, state: EditorState) => {
  const ctrlSeq = node.type.is('Command') ? node.getChild('UnknownCommand')?.getChild('CtrlSeq') : null
  return Boolean(ctrlSeq && PARTIAL_RULES.has(state.sliceDoc(ctrlSeq.from, ctrlSeq.to)))
}

const isRuleArgument = (node: SyntaxNode, state: EditorState) =>
  node.type.is('Group') ||
  node.type.is('OptionalArgument') ||
  (node.type.is('Normal') && /^\s*(\([^()]*\)|\[[^\]]*\])+\s*$/.test(state.sliceDoc(node.from, node.to)))

const isMultiColumn = (node: SyntaxNode) =>
  node.type.is('Command') &&
  Boolean(node.getChild('KnownCommand')?.getChild('MultiColumn'))

type Position = {
  from: number
  to: number
}

type HLineData = {
  position: Position
  atBottom: boolean
}

type ParsedCell = {
  content: string
  position: Position
  multiColumn?: {
    columnSpecification: {
      position: Position
      specification: ColumnDefinition[]
    }
    span: number
    position: Position
    preamble: Position
    postamble: Position
  }
}

export type CellSeparator = Position
export type RowSeparator = Position

type ParsedRow = {
  position: Position
  cells: ParsedCell[]
  cellSeparators: CellSeparator[]
  hlines: HLineData[]
}

type ParsedTableBody = {
  rows: ParsedRow[]
  rowSeparators: RowSeparator[]
}

function parseTabularBody(
  node: SyntaxNode,
  state: EditorState
): ParsedTableBody {
  const firstChild = node.firstChild
  const body: ParsedTableBody = {
    rows: [
      {
        cells: [],
        hlines: [],
        cellSeparators: [],
        position: { from: node.from, to: node.from },
      },
    ],
    rowSeparators: [],
  }
  getLastRow().cells.push({
    content: '',
    position: { from: node.from, to: node.from },
  })
  function getLastRow() {
    return body.rows[body.rows.length - 1]
  }
  function getLastCell(): ParsedCell | undefined {
    return getLastRow().cells[getLastRow().cells.length - 1]
  }
  let afterRule = false // ColTex
  for (
    let currentChild: SyntaxNode | null = firstChild;
    currentChild;
    currentChild = currentChild.nextSibling
  ) {
    // ColTex: a partial rule, or an argument of one, at the start of a row.
    const startOfRow: boolean = getLastRow().cells.length === 1 && !getLastCell()?.content.trim()
    const rule: boolean = startOfRow && (isPartialRule(currentChild, state) || (afterRule && isRuleArgument(currentChild, state)))
    afterRule = rule || (afterRule && (currentChild.type.is('Whitespace') || currentChild.type.is('NewLine')))
    if (rule) {
      const lastCell = getLastCell()!
      lastCell.position.from = currentChild.to
      lastCell.position.to = currentChild.to
    } else if (isRowSeparator(currentChild)) {
      const lastRow = getLastRow()
      body.rows.push({
        cells: [],
        hlines: [],
        cellSeparators: [],
        position: { from: currentChild.to, to: currentChild.to },
      })
      lastRow.position.to = currentChild.to
      body.rowSeparators.push({ from: currentChild.from, to: currentChild.to })
      getLastRow().cells.push({
        content: '',
        position: { from: currentChild.to, to: currentChild.to },
      })
      continue
    } else if (currentChild.type.is('Ampersand')) {
      // Add another cell
      getLastRow().cells.push({
        content: '',
        position: { from: currentChild.to, to: currentChild.to },
      })
      getLastRow().cellSeparators.push({
        from: currentChild.from,
        to: currentChild.to,
      })
    } else if (isMultiColumn(currentChild)) {
      // do stuff
      const multiColumn = currentChild
        .getChild('KnownCommand')!
        .getChild('MultiColumn')!
      const columnArgument = multiColumn
        .getChild('ColumnArgument')
        ?.getChild('ShortTextArgument')
        ?.getChild('ShortArg')
      const spanArgument = multiColumn
        .getChild('SpanArgument')
        ?.getChild('ShortTextArgument')
        ?.getChild('ShortArg')
      const tabularArgument = multiColumn
        .getChild('TabularArgument')
        ?.getChild('TabularContent')
      if (!columnArgument) {
        throw new Error(
          'Invalid multicolumn definition: missing column specification argument'
        )
      }
      if (!spanArgument) {
        throw new Error(
          'Invalid multicolumn definition: missing colspan argument'
        )
      }
      if (!tabularArgument) {
        throw new Error('Invalid multicolumn definition: missing cell content')
      }
      if (getLastCell()?.content.trim()) {
        throw new Error(
          'Invalid multicolumn definition: multicolumn must be at the start of a cell'
        )
      }
      const columnSpecification = parseColumnSpecifications(
        state.sliceDoc(columnArgument.from, columnArgument.to),
        columnTypesFor(state) // ColTex
      )
      const span = parseInt(state.sliceDoc(spanArgument.from, spanArgument.to))
      const cellContent = state.sliceDoc(
        tabularArgument.from,
        tabularArgument.to
      )
      if (!getLastCell()) {
        getLastRow().cells.push({
          content: '',
          position: { from: currentChild.from, to: currentChild.from },
        })
      }
      const lastCell = getLastCell()!
      lastCell.multiColumn = {
        columnSpecification: {
          position: { from: columnArgument.from, to: columnArgument.to },
          specification: columnSpecification,
        },
        span,
        preamble: {
          from: currentChild.from,
          to: tabularArgument.from,
        },
        postamble: {
          from: tabularArgument.to,
          to: currentChild.to,
        },
        position: { from: currentChild.from, to: currentChild.to },
      }
      lastCell.content = cellContent
      lastCell.position.from = tabularArgument.from
      lastCell.position.to = tabularArgument.to
      // Don't update position at the end of the loop
      continue
    } else if (
      currentChild.type.is('NewLine') ||
      currentChild.type.is('Whitespace') ||
      currentChild.type.is('Comment') ||
      currentChild.type.is('BlankLine')
    ) {
      const lastCell = getLastCell()
      if (!lastCell?.multiColumn) {
        if (lastCell) {
          if (lastCell.content.trim() === '') {
            lastCell.position.from = currentChild.to
            lastCell.position.to = currentChild.to
          } else {
            lastCell.content += state.sliceDoc(
              currentChild.from,
              currentChild.to
            )
            lastCell.position.to = currentChild.to
          }
        }
      }
      // Try to preserve whitespace by skipping past it when locating cells
    } else if (isHLine(currentChild)) {
      const lastCell = getLastCell()
      if (lastCell?.content.trim()) {
        throw new Error('\\hline must be at the start of a row')
      }
      // push start of cell past the hline
      if (lastCell) {
        lastCell.position.from = currentChild.to
        lastCell.position.to = currentChild.to
      }
      const lastRow = getLastRow()
      lastRow.hlines.push({
        position: { from: currentChild.from, to: currentChild.to },
        // They will always be at the top, we patch the bottom border later.
        atBottom: false,
      })
    } else {
      // Add to the last cell
      if (!getLastCell()) {
        getLastRow().cells.push({
          content: '',
          position: { from: currentChild.from, to: currentChild.from },
        })
      }
      const lastCell = getLastCell()!
      lastCell.content += state.sliceDoc(currentChild.from, currentChild.to)
      lastCell.position.to = currentChild.to
    }
    getLastRow().position.to = currentChild.to
  }
  const lastRow = getLastRow()
  if (
    body.rows.length > 1 &&
    lastRow.cells.length === 1 &&
    lastRow.cells[0].content.trim() === ''
  ) {
    // Remove the last row if it's empty, but move hlines up to previous row
    const hlines = lastRow.hlines.map(hline => ({ ...hline, atBottom: true }))
    body.rows.pop()
    getLastRow().hlines.push(...hlines)
    const lastLineContents = state.sliceDoc(
      lastRow.position.from,
      lastRow.position.to
    )
    const lastLineOffset =
      lastLineContents.length - lastLineContents.trimEnd().length
    getLastRow().position.to = lastRow.position.to - lastLineOffset
  }
  return body
}

export type ParsedTableData = {
  table: TableData
  cellPositions: CellPosition[][]
  specification: { from: number; to: number }
  rowPositions: RowPosition[]
  rowSeparators: RowSeparator[]
  cellSeparators: CellSeparator[][]
}

export function generateTable(
  node: SyntaxNode,
  state: EditorState
): ParsedTableData {
  // ColTex: tabularx and xltabular take the width first, the columns second.
  const beginEnv = node.getChild('BeginEnv')
  const envName = beginEnv?.getChild('EnvNameGroup')
  const textArguments = beginEnv?.getChildren('TextArgument') ?? []
  const specification = textArguments[
    envName && /^(tabularx|xltabular)$/.test(state.sliceDoc(envName.from + 1, envName.to - 1).trim()) ? 1 : 0
  ]?.getChild('LongArg')

  if (!specification) {
    throw new Error('Missing column specification')
  }
  const columns = parseColumnSpecifications(
    state.sliceDoc(specification.from, specification.to),
    columnTypesFor(state) // ColTex
  )
  const body = node.getChild('Content')?.getChild('TabularContent')
  if (!body) {
    throw new Error('Missing table body')
  }
  const tableData = parseTabularBody(body, state)
  const cellPositions = tableData.rows.map(row =>
    row.cells.map(cell => cell.multiColumn?.position ?? cell.position)
  )
  const cellSeparators = tableData.rows.map(row => row.cellSeparators)
  const rowPositions = tableData.rows.map(row => ({
    ...row.position,
    hlines: row.hlines.map(hline => hline.position),
  }))
  const rows = tableData.rows.map(row => ({
    cells: row.cells.map(cell => {
      const cellData: CellData = {
        content: cell.content,
        from: cell.position.from,
        to: cell.position.to,
      }
      if (cell.multiColumn) {
        cellData.multiColumn = {
          columns: {
            specification: cell.multiColumn.columnSpecification.specification,
            from: cell.multiColumn.columnSpecification.position.from,
            to: cell.multiColumn.columnSpecification.position.to,
          },
          columnSpan: cell.multiColumn.span,
          from: cell.multiColumn.position.from,
          to: cell.multiColumn.position.to,
          preamble: {
            from: cell.multiColumn.preamble.from,
            to: cell.multiColumn.preamble.to,
          },
          postamble: {
            from: cell.multiColumn.postamble.from,
            to: cell.multiColumn.postamble.to,
          },
        }
      }
      return cellData
    }),
    borderTop: row.hlines.filter(hline => !hline.atBottom).length,
    borderBottom: row.hlines.filter(hline => hline.atBottom).length,
  }))
  const table = new TableData(rows, columns)
  return {
    table,
    cellPositions,
    specification,
    rowPositions,
    rowSeparators: tableData.rowSeparators,
    cellSeparators,
  }
}

export const validateParsedTable = (parseResult: ParsedTableData) => {
  for (const row of parseResult.table.rows) {
    const rowLength = row.cells.reduce(
      (acc, cell) => acc + (cell.multiColumn?.columnSpan ?? 1),
      0
    )
    for (const cell of row.cells) {
      if (
        cell.multiColumn?.columns.specification &&
        cell.multiColumn.columns.specification.length !== 1
      ) {
        return false
      }
    }
    if (rowLength !== parseResult.table.columns.length) {
      return false
    }
  }
  return true
}

export function parseTableEnvironment(tableNode: SyntaxNode) {
  const tableEnvironment: TableEnvironmentData = {
    table: { from: tableNode.from, to: tableNode.to },
  }
  tableNode.cursor().iterate(({ type, from, to }) => {
    if (tableEnvironment.caption && tableEnvironment.label) {
      // Stop looking once we've found both caption and label
      return false
    }
    if (type.is('Caption')) {
      tableEnvironment.caption = { from, to }
    } else if (type.is('Label')) {
      tableEnvironment.label = { from, to }
    }
  })
  return tableEnvironment
}

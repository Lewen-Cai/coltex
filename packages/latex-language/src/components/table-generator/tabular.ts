// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/tabular.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: only the table model (types and TableData); the React components are in
// apps/web/src/table-generator/tabular.tsx.

import type { TableSelection } from './contexts/selection-context'
import { BorderTheme } from './toolbar/commands'
import type { WidthSelection } from './toolbar/column-width-modal/column-width'
import type { CellPosition, RowPosition } from './utils'

export type ColumnDefinition = {
  alignment: 'left' | 'center' | 'right' | 'paragraph'
  borderLeft: number
  borderRight: number
  content: string
  cellSpacingLeft: string
  cellSpacingRight: string
  customCellDefinition: string
  isParagraphColumn: boolean
  size?: WidthSelection
  // ColTex: a column type other than l, c, r, p, m and b (X, or one defined
  // with \newcolumntype), and the type it is built on: changing the
  // alignment of a paragraph-like one writes `base` (X, p{…}) instead.
  customType?: { base?: string }
}

export type CellData = {
  content: string
  from: number
  to: number
  multiColumn?: {
    columnSpan: number
    columns: {
      specification: ColumnDefinition[]
      from: number
      to: number
    }
    from: number
    to: number
    preamble: {
      from: number
      to: number
    }
    postamble: {
      from: number
      to: number
    }
  }
}

export type RowData = {
  cells: CellData[]
  borderTop: number
  borderBottom: number
}

export class TableData {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    public readonly rows: RowData[],
    public readonly columns: ColumnDefinition[]
  ) {}

  getCellIndex(row: number, column: number): number {
    let cellIndex = 0
    for (let i = 0; i < this.rows[row].cells.length; i++) {
      cellIndex += this.rows[row].cells[i].multiColumn?.columnSpan ?? 1
      if (column < cellIndex) {
        return i
      }
    }
    return this.rows[row].cells.length - 1
  }

  iterateCells(
    minRow: number,
    maxRow: number,
    minColumn: number,
    maxColumn: number,
    callback: (cell: CellData, row: number, column: number) => void
  ) {
    for (let row = minRow; row <= maxRow; ++row) {
      let currentCellOffset = this.getCellBoundaries(row, minColumn).from
      const minX = this.getCellIndex(row, minColumn)
      const maxX = this.getCellIndex(row, maxColumn)
      for (let column = minX; column <= maxX; ++column) {
        const currentCell = this.rows[row].cells[column]
        const skip = currentCell.multiColumn?.columnSpan ?? 1
        callback(currentCell, row, currentCellOffset)
        currentCellOffset += skip
      }
    }
  }

  iterateSelection(
    selection: TableSelection,
    callback: (cell: CellData, row: number, column: number) => void
  ) {
    const { minX, maxX, minY, maxY } = selection.normalized()
    this.iterateCells(minY, maxY, minX, maxX, callback)
  }

  getCell(row: number, column: number): CellData {
    return this.rows[row].cells[this.getCellIndex(row, column)]
  }

  getCellBoundaries(row: number, cell: number) {
    let currentCellOffset = 0
    for (let index = 0; index < this.rows[row].cells.length; ++index) {
      const currentCell = this.rows[row].cells[index]
      const skip = currentCell.multiColumn?.columnSpan ?? 1
      if (currentCellOffset + skip > cell) {
        return { from: currentCellOffset, to: currentCellOffset + skip - 1 }
      }
      currentCellOffset += skip
    }
    throw new Error("Couldn't find cell boundaries")
  }

  getBorderTheme(): BorderTheme | null {
    if (this.rows.length === 0 || this.columns.length === 0) {
      return null
    }
    const hasTopRule = this.rows[0].borderTop === 1
    const hasMidRule =
      this.rows[1]?.borderTop === 1 &&
      (this.rows.length === 2 || this.rows[1]?.borderBottom === 0)
    const hasBottomRule =
      this.rows[this.rows.length - 1].borderBottom === 1 &&
      (this.rows.length === 2 ||
        this.rows[this.rows.length - 1].borderTop === 0)

    if (hasTopRule && hasMidRule && hasBottomRule) {
      let isBooktabs = true
      // Check for no other borders
      for (const row of this.rows.slice(2, -1)) {
        if (row.borderTop > 0 || row.borderBottom > 0) {
          isBooktabs = false
        }
      }
      for (const column of this.columns) {
        if (column.borderLeft > 0 || column.borderRight > 0) {
          isBooktabs = false
        }
      }
      if (isBooktabs) {
        return BorderTheme.BOOKTABS
      }
    }

    const lastRow = this.rows[this.rows.length - 1]
    const hasBottomBorder = lastRow.borderBottom > 0
    const firstColumn = this.columns[0]
    const hasLeftBorder = firstColumn.borderLeft > 0
    for (const row of this.rows) {
      if (hasBottomBorder === (row.borderTop === 0)) {
        return null
      }
    }
    // If we had the first, we have verified that we have the rest
    const hasAllRowBorders = hasBottomBorder

    for (const column of this.columns) {
      if (hasLeftBorder === (column.borderRight === 0)) {
        return null
      }
    }

    for (const row of this.rows) {
      for (const cell of row.cells) {
        if (cell.multiColumn) {
          if (cell.multiColumn.columns.specification.length === 0) {
            return null
          }
          const firstCell = cell.multiColumn.columns.specification[0]
          if (hasLeftBorder === (firstCell.borderLeft === 0)) {
            return null
          }
          for (const column of cell.multiColumn.columns.specification) {
            if (hasLeftBorder === (column.borderRight === 0)) {
              return null
            }
          }
        }
      }
    }
    // If we had the first, we have verified that we have the rest
    const hasAllColumnBorders = hasLeftBorder

    if (hasAllRowBorders && hasAllColumnBorders) {
      return BorderTheme.FULLY_BORDERED
    } else if (!hasAllRowBorders && !hasAllColumnBorders) {
      return BorderTheme.NO_BORDERS
    } else {
      return null
    }
  }
}

export type Positions = {
  cells: CellPosition[][]
  columnDeclarations: { from: number; to: number }
  rowPositions: RowPosition[]
  tabular: { from: number; to: number }
}


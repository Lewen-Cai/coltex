// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/row.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { FC } from 'react'
import type { ColumnDefinition, RowData } from '@coltex/latex-language'
import { Cell } from './cell'
import { RowSelector } from './selectors'

const normalizedCellIndex = (row: RowData, index: number) => {
  let normalized = 0
  for (let i = 0; i < index; ++i) {
    normalized += row.cells[i].multiColumn?.columnSpan ?? 1
  }
  return normalized
}

export const Row: FC<{
  rowIndex: number
  row: RowData
  columnSpecifications: ColumnDefinition[]
}> = ({ columnSpecifications, row, rowIndex }) => {
  return (
    <tr>
      <RowSelector index={rowIndex} />
      {row.cells.map((cell, cellIndex) => (
        <Cell
          key={cellIndex}
          cellData={cell}
          rowIndex={rowIndex}
          row={row}
          columnIndex={normalizedCellIndex(row, cellIndex)}
          columnSpecification={
            columnSpecifications[normalizedCellIndex(row, cellIndex)]
          }
        />
      ))}
    </tr>
  )
}

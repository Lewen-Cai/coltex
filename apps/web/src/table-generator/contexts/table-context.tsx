// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/contexts/table-context.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { FC, createContext, useContext } from 'react'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import {
  parseTableEnvironment,
  type CellPosition,
  type CellSeparator,
  type ParsedTableData,
  type Positions,
  type RowPosition,
  type RowSeparator,
  type TableData,
  type TableEnvironmentData,
} from '@coltex/latex-language'
import { TableRenderingError } from '../tabular'

const TableContext = createContext<
  | {
      table: TableData
      cellPositions: CellPosition[][]
      specification: { from: number; to: number }
      rowPositions: RowPosition[]
      rowSeparators: RowSeparator[]
      cellSeparators: CellSeparator[][]
      positions: Positions
      tableEnvironment?: TableEnvironmentData
      rows: number
      columns: number
      directTableChild?: boolean
    }
  | undefined
>(undefined)

export const TableProvider: FC<
  React.PropsWithChildren<{
    tableData: ParsedTableData
    tableNode: SyntaxNode | null
    tabularNode: SyntaxNode
    view: EditorView
    directTableChild?: boolean
  }>
> = ({
  tableData,
  children,
  tableNode,
  tabularNode,
  view,
  directTableChild,
}) => {
  try {
    const positions: Positions = {
      cells: tableData.cellPositions,
      columnDeclarations: tableData.specification,
      rowPositions: tableData.rowPositions,
      tabular: { from: tabularNode.from, to: tabularNode.to },
    }

    const tableEnvironment = tableNode
      ? parseTableEnvironment(tableNode)
      : undefined

    return (
      <TableContext.Provider
        value={{
          ...tableData,
          positions,
          tableEnvironment,
          rows: tableData.table.rows.length,
          columns: tableData.table.columns.length,
          directTableChild,
        }}
      >
        {children}
      </TableContext.Provider>
    )
  } catch {
    return <TableRenderingError view={view} codePosition={tabularNode.from} />
  }
}

export const useTableContext = () => {
  const context = useContext(TableContext)
  if (context === undefined) {
    throw new Error('useTableContext must be used within a TableProvider')
  }
  return context
}

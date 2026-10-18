// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/tabular.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: the table model (TableData, ColumnDefinition, …) is in
// @coltex/latex-language; the notice uses ColTex's Button, and a small error
// boundary stands in for react-error-boundary.

import { Component, type FC, type ReactNode, useEffect } from 'react'
import type { SyntaxNode } from '@lezer/common'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import type { ParsedTableData } from '@coltex/latex-language'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { Toolbar } from './toolbar/toolbar'
import { Table } from './table'
import { SelectionContextProvider, useSelectionContext } from './contexts/selection-context'
import { EditingContextProvider, useEditingContext } from './contexts/editing-context'
import { CodeMirrorViewContext, useCodeMirrorViewContext } from './contexts/host-context'
import { TableProvider } from './contexts/table-context'
import { TabularProvider, useTabularContext } from './contexts/tabular-context'
import { TableGeneratorHelpModal } from './help-modal'
import { ColumnWidthModal } from './toolbar/column-width-modal/modal'

/** Popups (menus, tooltips, dialogs) render outside the table; clicks in them keep the selection. */
export const POPUP_CLASS = 'table-generator-popup'

export const TableRenderingError: FC<{
  view: EditorView
  codePosition?: number
}> = ({ view, codePosition }) => {
  return (
    <div className="table-generator-error" role="alert">
      <strong>{t("Sorry, this table can't be displayed at the moment.")}</strong>
      <div>{t('This could be because it uses something the table editor does not support yet.')}</div>
      {codePosition !== undefined && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            view.dispatch({
              selection: EditorSelection.cursor(codePosition),
            })
          }
        >
          {t('View code')}
        </Button>
      )}
    </div>
  )
}

class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export const Tabular: FC<{
  tabularNode: SyntaxNode
  view: EditorView
  tableNode: SyntaxNode | null
  parsedTableData: ParsedTableData
  directTableChild?: boolean
}> = ({ tabularNode, view, tableNode, parsedTableData, directTableChild }) => {
  return (
    <ErrorBoundary
      fallback={<TableRenderingError view={view} codePosition={tabularNode.from} />}
    >
      <CodeMirrorViewContext.Provider value={view}>
        <TabularProvider>
          <TableProvider
            tabularNode={tabularNode}
            tableData={parsedTableData}
            tableNode={tableNode}
            directTableChild={directTableChild}
            view={view}
          >
            <SelectionContextProvider>
              <EditingContextProvider>
                <TabularWrapper />
              </EditingContextProvider>
              <ColumnWidthModal />
            </SelectionContextProvider>
          </TableProvider>
          <TableGeneratorHelpModal />
        </TabularProvider>
      </CodeMirrorViewContext.Provider>
    </ErrorBoundary>
  )
}

const TabularWrapper: FC<React.PropsWithChildren> = () => {
  const { setSelection, selection } = useSelectionContext()
  const { commitCellData, cellData } = useEditingContext()
  const { ref } = useTabularContext()
  const view = useCodeMirrorViewContext()
  useEffect(() => {
    const listener: (event: MouseEvent) => void = event => {
      if (
        !ref.current?.contains(event.target as Node) &&
        // ColTex: one class for every popup (upstream checks its two modals by class).
        !(event.target as HTMLElement).closest(`.${POPUP_CLASS}`)
      ) {
        if (selection) {
          setSelection(null)
        }
        if (cellData) {
          commitCellData()
        }
      } else {
        view.dispatch() // trigger a state update when clicking inside the table
      }
    }
    window.addEventListener('mousedown', listener)

    return () => {
      window.removeEventListener('mousedown', listener)
    }
  }, [cellData, commitCellData, selection, setSelection, ref, view])
  return (
    <div className="table-generator" ref={ref}>
      {!view.state.readOnly && <Toolbar />}
      <Table />
    </div>
  )
}

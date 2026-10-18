// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/toolbar/toolbar.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: strings through t() (keyed by English text), lucide icons, and the
// alignment menu is a ToolbarDropdown.

import { memo, useMemo } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  CircleHelp,
  Grid2x2X,
  MoveHorizontal,
  Plus,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  WrapText,
} from 'lucide-react'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { plural, t } from '@/lib/i18n'
import { cn as classNames } from '@/lib/utils'
import { useSelectionContext } from '../contexts/selection-context'
import { ToolbarButton } from './toolbar-button'
import { ToolbarDropdown, ToolbarDropdownItem } from './toolbar-dropdown'
import {
  BorderTheme,
  insertColumn,
  insertRow,
  mergeCells,
  moveCaption,
  removeCaption,
  removeColumnWidths,
  removeNodes,
  removeRowOrColumns,
  setAlignment,
  setBorders,
  unmergeCells,
} from '@coltex/latex-language'
import { useCodeMirrorViewContext } from '../contexts/host-context'
import { useTableContext } from '../contexts/table-context'
import { useTabularContext } from '../contexts/tabular-context'

type CaptionPosition = 'no_caption' | 'above' | 'below'

export const Toolbar = memo(function Toolbar() {
  const { selection, setSelection } = useSelectionContext()
  const view = useCodeMirrorViewContext()
  const {
    positions,
    rowSeparators,
    cellSeparators,
    tableEnvironment,
    table,
    directTableChild,
  } = useTableContext()
  const { showHelp, openColumnWidthModal } = useTabularContext()

  const borderDropdownLabel = useMemo(() => {
    switch (table.getBorderTheme()) {
      case BorderTheme.FULLY_BORDERED:
        return t('All borders')
      case BorderTheme.NO_BORDERS:
        return t('No borders')
      case BorderTheme.BOOKTABS:
        return t('Booktabs')
      default:
        return t('Custom borders')
    }
  }, [table, t])

  const captionPosition: CaptionPosition = useMemo(() => {
    if (!tableEnvironment?.caption) {
      return 'no_caption'
    }
    if (tableEnvironment.caption.from < positions.tabular.from) {
      return 'above'
    }
    return 'below'
  }, [tableEnvironment, positions])

  const captionLabel = useMemo(() => {
    switch (captionPosition) {
      case 'no_caption':
        return t('No caption')
      case 'above':
        return t('Caption above')
      case 'below':
        return t('Caption below')
    }
  }, [t, captionPosition])

  const currentAlignment = useMemo(() => {
    if (!selection) {
      return undefined
    }
    if (selection.isMergedCellSelected(table)) {
      const cell = table.getCell(selection.from.row, selection.from.cell)
      if (cell.multiColumn) {
        // NOTE: Assumes merged columns can only have one internal column
        return cell.multiColumn.columns.specification[0].alignment
      }
    }
    const { minX, maxX } = selection.normalized()
    const alignment = table.columns[minX].alignment
    for (let x = minX + 1; x <= maxX; x++) {
      if (table.columns[x].alignment !== alignment) {
        return undefined
      }
    }
    return alignment
  }, [selection, table])

  const alignmentIcon = useMemo(() => {
    switch (currentAlignment) {
      case 'left':
        return AlignLeft
      case 'center':
        return AlignCenter
      case 'right':
        return AlignRight
      case 'paragraph':
        return AlignJustify
      default:
        return AlignLeft
    }
  }, [currentAlignment])

  const hasCustomSizes = useMemo(
    () => table.columns.some(x => x.size),
    [table.columns]
  )

  if (!selection) {
    return null
  }
  const columnsToInsert = selection.maximumCellWidth(table)
  const rowsToInsert = selection.height()

  const onlyFixedWidthColumnsSelected = selection.isOnlyFixedWidthColumns(table)
  const onlyNonFixedWidthColumnsSelected =
    selection.isOnlyNonFixedWidthColumns(table)

  return (
    <div
      className={classNames('table-generator-floating-toolbar', {
        'table-generator-toolbar-floating-custom-sizes': hasCustomSizes,
      })}
    >
      <div className="table-generator-button-group">
        <ToolbarDropdown
          id="table-generator-caption-dropdown"
          label={captionLabel}
          disabled={!tableEnvironment || !directTableChild}
          disabledTooltip={t('To add or move a caption, put the tabular directly inside a table environment')}
        >
          <ToolbarDropdownItem
            id="table-generator-caption-none"
            command={() => {
              removeCaption(view, tableEnvironment)
            }}
            active={captionPosition === 'no_caption'}
          >
            {t('No caption')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-caption-above"
            command={() => {
              moveCaption(view, positions, 'above', tableEnvironment)
            }}
            active={captionPosition === 'above'}
          >
            {t('Caption above')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-caption-below"
            command={() => {
              moveCaption(view, positions, 'below', tableEnvironment)
            }}
            active={captionPosition === 'below'}
          >
            {t('Caption below')}
          </ToolbarDropdownItem>
        </ToolbarDropdown>
        <ToolbarDropdown
          id="table-generator-borders-dropdown"
          label={borderDropdownLabel}
        >
          <ToolbarDropdownItem
            id="table-generator-borders-fully-bordered"
            command={() => {
              setBorders(
                view,
                BorderTheme.FULLY_BORDERED,
                positions,
                rowSeparators,
                table
              )
            }}
            active={table.getBorderTheme() === BorderTheme.FULLY_BORDERED}
          >
            {t('All borders')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-borders-no-borders"
            command={() => {
              setBorders(
                view,
                BorderTheme.NO_BORDERS,
                positions,
                rowSeparators,
                table
              )
            }}
            active={table.getBorderTheme() === BorderTheme.NO_BORDERS}
          >
            {t('No borders')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-borders-booktabs"
            command={() => {
              setBorders(
                view,
                BorderTheme.BOOKTABS,
                positions,
                rowSeparators,
                table
              )
            }}
            active={table.getBorderTheme() === BorderTheme.BOOKTABS}
          >
            {t('Booktabs')}
          </ToolbarDropdownItem>
        </ToolbarDropdown>
      </div>
      <div className="table-generator-button-group">
        <ToolbarDropdown
          tooltip={t('Alignment')}
          icon={alignmentIcon}
          showCaret
          id="table-generator-align-dropdown"
          disabledTooltip={t('Select a column or a merged cell to align')}
          disabled={
            !selection.isColumnSelected(selection.from.cell, table) &&
            !selection.isMergedCellSelected(table)
          }
        >
          <ToolbarDropdownItem
            icon={AlignLeft}
            id="table-generator-align-left"
            command={() => {
              setAlignment(view, selection, 'left', positions, table)
            }}
            active={currentAlignment === 'left'}
          >
            {t('Left')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            icon={AlignCenter}
            id="table-generator-align-center"
            command={() => {
              setAlignment(view, selection, 'center', positions, table)
            }}
            active={currentAlignment === 'center'}
          >
            {t('Center')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            icon={AlignRight}
            id="table-generator-align-right"
            command={() => {
              setAlignment(view, selection, 'right', positions, table)
            }}
            active={currentAlignment === 'right'}
          >
            {t('Right')}
          </ToolbarDropdownItem>
          {onlyFixedWidthColumnsSelected &&
            !selection.isMergedCellSelected(table) && (
              <ToolbarDropdownItem
                icon={AlignJustify}
                id="table-generator-align-justify"
                command={() => {
                  setAlignment(view, selection, 'paragraph', positions, table)
                }}
                active={currentAlignment === 'paragraph'}
              >
                {t('Justify')}
              </ToolbarDropdownItem>
            )}
        </ToolbarDropdown>
        <ToolbarDropdown
          id="format_text_wrap"
          icon={selection.isOnlyParagraphCells(table) ? WrapText : MoveHorizontal}
          tooltip={t('Adjust column width')}
          disabled={!selection.isAnyColumnSelected(table)}
          disabledTooltip={t('Select a column to adjust its width')}
          showCaret
        >
          <ToolbarDropdownItem
            id="table-generator-unwrap-text"
            icon={MoveHorizontal}
            active={onlyNonFixedWidthColumnsSelected}
            command={() =>
              removeColumnWidths(view, selection, positions, table)
            }
            disabled={!selection.isAnyColumnSelected(table)}
          >
            {t('Stretch width to text')}
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-wrap-text"
            icon={WrapText}
            active={onlyFixedWidthColumnsSelected}
            command={openColumnWidthModal}
            disabled={!selection.isAnyColumnSelected(table)}
          >
            {onlyFixedWidthColumnsSelected
              ? t('Fixed width')
              : t('Fixed width, wrap text')}
          </ToolbarDropdownItem>
          {onlyFixedWidthColumnsSelected && (
            <>
              <DropdownMenuSeparator />
              <ToolbarDropdownItem
                id="table-generator-resize"
                command={openColumnWidthModal}
              >
                {t('Set column width')}
              </ToolbarDropdownItem>
            </>
          )}
        </ToolbarDropdown>
        <ToolbarButton
          icon={selection.isMergedCellSelected(table) ? TableCellsSplit : TableCellsMerge}
          id="table-generator-merge-cells"
          label={
            selection.isMergedCellSelected(table)
              ? t('Unmerge cells')
              : t('Merge cells')
          }
          active={selection.isMergedCellSelected(table)}
          disabled={
            !selection.isMergedCellSelected(table) &&
            !selection.isMergeableCells(table)
          }
          disabledLabel={t('Select cells in a single row to merge')}
          command={() => {
            if (selection.isMergedCellSelected(table)) {
              unmergeCells(view, selection, table)
            } else {
              mergeCells(view, selection, table)
            }
          }}
        />
        <ToolbarButton
          icon={Trash2}
          id="table-generator-remove-column-row"
          label={t('Delete row or column')}
          disabledLabel={t('Select a row or a column to delete')}
          disabled={
            (!selection.isAnyRowSelected(table) &&
              !selection.isAnyColumnSelected(table)) ||
            !selection.eq(selection.explode(table))
          }
          command={() =>
            setSelection(
              removeRowOrColumns(
                view,
                selection,
                positions,
                cellSeparators,
                table
              )
            )
          }
        />
        <ToolbarDropdown
          id="table-generator-add-dropdown"
          icon={Plus}
          tooltip={t('Insert')}
          disabled={!selection}
        >
          <ToolbarDropdownItem
            id="table-generator-insert-column-left"
            command={() => {
              setSelection(
                insertColumn(view, selection, positions, false, table)
              )
            }}
          >
            <span className="table-generator-button-label">
              {plural(columnsToInsert, 'Insert column left', 'Insert {n} columns left')}
            </span>
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-insert-column-right"
            command={() => {
              setSelection(
                insertColumn(view, selection, positions, true, table)
              )
            }}
          >
            <span className="table-generator-button-label">
              {plural(columnsToInsert, 'Insert column right', 'Insert {n} columns right')}
            </span>
          </ToolbarDropdownItem>
          <DropdownMenuSeparator />
          <ToolbarDropdownItem
            id="table-generator-insert-row-above"
            command={() => {
              setSelection(
                insertRow(
                  view,
                  selection,
                  positions,
                  false,
                  rowSeparators,
                  table
                )
              )
            }}
          >
            <span className="table-generator-button-label">
              {plural(rowsToInsert, 'Insert row above', 'Insert {n} rows above')}
            </span>
          </ToolbarDropdownItem>
          <ToolbarDropdownItem
            id="table-generator-insert-row-below"
            command={() => {
              setSelection(
                insertRow(
                  view,
                  selection,
                  positions,
                  true,
                  rowSeparators,
                  table
                )
              )
            }}
          >
            <span className="table-generator-button-label">
              {plural(rowsToInsert, 'Insert row below', 'Insert {n} rows below')}
            </span>
          </ToolbarDropdownItem>
        </ToolbarDropdown>
      </div>
      <div className="table-generator-button-group">
        <ToolbarButton
          icon={Grid2x2X}
          id="table-generator-remove-table"
          label={t('Delete table')}
          command={() => {
            removeNodes(view, tableEnvironment?.table ?? positions.tabular)
            view.focus()
          }}
        />
        <ToolbarButton
          icon={CircleHelp}
          id="table-generator-show-help"
          label={t('Help')}
          command={showHelp}
        />
      </div>
    </div>
  )
})

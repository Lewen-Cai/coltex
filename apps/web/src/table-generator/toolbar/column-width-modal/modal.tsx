// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/toolbar/column-width-modal/modal.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: drawn with ColTex's Dialog, Input, Label and Select; strings through t().

import { type FormEventHandler, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setColumnWidth, UNITS, type WidthSelection, type WidthUnit } from '@coltex/latex-language'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { copyText } from '@/lib/clipboard'
import { t, tr } from '@/lib/i18n'
import { useTabularContext } from '../../contexts/tabular-context'
import { useSelectionContext } from '../../contexts/selection-context'
import { useTableContext } from '../../contexts/table-context'
import { useCodeMirrorViewContext } from '../../contexts/host-context'
import { POPUP_CLASS } from '../../tabular'

type UnitDescription = { label: string; tooltip?: string } | undefined

const USE_ARRAY = '\\usepackage{array} % required for text wrapping in tables'

export const ColumnWidthModal = memo(function ColumnWidthModal() {
  const { columnWidthModalShown } = useTabularContext()
  if (!columnWidthModalShown) {
    return null
  }
  return <ColumnWidthModalBody />
})

const ColumnWidthModalBody = () => {
  const { columnWidthModalShown, closeColumnWidthModal } = useTabularContext()
  const view = useCodeMirrorViewContext()
  const { selection } = useSelectionContext()
  const { positions, table } = useTableContext()
  const [currentUnit, setCurrentUnit] = useState<WidthUnit | undefined | null>(
    '%'
  )
  const [currentWidth, setCurrentWidth] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const unitHelp: UnitDescription = useMemo(() => {
    switch (currentUnit) {
      case '%':
        return {
          label: t('% is the percentage of the line width.'),
          tooltip: t('The line width is the width of a line in the current environment, e.g. a full page or a column.'),
        }
      case 'custom':
        return {
          label: t('Enter any size, with units, or a valid LaTeX command.'),
        }
      default:
        return undefined
    }
  }, [currentUnit])

  useEffect(() => {
    if (columnWidthModalShown) {
      inputRef.current?.focus()
      if (
        !selection ||
        selection.width() !== 1 ||
        !table.columns[selection.to.cell].isParagraphColumn ||
        !table.columns[selection.to.cell].size
      ) {
        setCurrentUnit('%')
        setCurrentWidth('')
        return
      }
      const { to } = selection
      const columnIndexToReadWidthAndUnit = to.cell
      const column = table.columns[columnIndexToReadWidthAndUnit]
      const size = column.size!
      if (size.unit === '%') {
        setCurrentUnit('%')
        const widthWithUpToTwoDecimalPlaces = Math.round(size.width * 100) / 100
        setCurrentWidth(widthWithUpToTwoDecimalPlaces.toString())
      } else if (size.unit === 'custom') {
        setCurrentUnit('custom')
        // Slice off p{ and }
        setCurrentWidth(column.content.slice(2, -1))
      } else {
        setCurrentUnit(size.unit)
        setCurrentWidth(size.width.toString())
      }
    }
  }, [columnWidthModalShown, selection, table])

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    e => {
      e.preventDefault()
      if (selection && currentUnit) {
        const currentWidthNumber = parseFloat(currentWidth)
        let newWidth: WidthSelection
        if (currentUnit === 'custom') {
          newWidth = { unit: 'custom', width: currentWidth }
        } else {
          newWidth = { unit: currentUnit, width: currentWidthNumber }
        }
        setColumnWidth(view, selection, newWidth, positions, table)
      }
      closeColumnWidthModal()
      return false
    },
    [
      closeColumnWidthModal,
      currentUnit,
      currentWidth,
      positions,
      selection,
      table,
      view,
    ]
  )

  return (
    <Dialog open={columnWidthModalShown} onOpenChange={open => !open && closeColumnWidthModal()}>
      <DialogContent className={POPUP_CLASS}>
        <DialogHeader>
          <DialogTitle>{t('Set column width')}</DialogTitle>
        </DialogHeader>
        <form id="table-generator-width-form" onSubmit={onSubmit} className="grid gap-3">
          <div className="grid grid-cols-[1fr_7rem] items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="column-width-modal-width">{t('Column width')}</Label>
              <Input
                id="column-width-modal-width"
                value={currentWidth}
                required
                onChange={e => setCurrentWidth(e.target.value)}
                type={currentUnit === 'custom' ? 'text' : 'number'}
                step="any"
                ref={inputRef}
              />
            </div>
            <Select value={currentUnit ?? '%'} onValueChange={value => setCurrentUnit(value as WidthUnit)}>
              <SelectTrigger className="w-full" aria-label={t('Length unit')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={POPUP_CLASS}>
                {UNITS.map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unit === 'custom' ? t('Custom') : unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unitHelp && (
            <p className="text-muted-foreground">
              {unitHelp.label} {unitHelp.tooltip}
            </p>
          )}
          <p>{tr('To wrap text in a table, include the {package} package in the preamble:', { package: <b>array</b> })}</p>
          <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1">
            <code className="flex-1 font-mono text-xs">\usepackage{'{'}array{'}'}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('Copy')}
              onClick={async () => {
                if (await copyText(USE_ARRAY)) toast.success(t('Copied'))
              }}
            >
              <Copy />
            </Button>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={closeColumnWidthModal}>
            {t('Cancel')}
          </Button>
          <Button form="table-generator-width-form" type="submit">
            {t('OK')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

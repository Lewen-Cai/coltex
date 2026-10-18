// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/column-size-indicator.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: ColTex's Tooltip and a lucide icon; strings through t().

import { useMemo } from 'react'
import { WrapText } from 'lucide-react'
import type { WidthSelection } from '@coltex/latex-language'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import { useSelectionContext } from './contexts/selection-context'
import { POPUP_CLASS } from './tabular'

function roundIfNeeded(width: number) {
  return width.toFixed(2).replace(/\.0+$/, '')
}

export const ColumnSizeIndicator = ({
  size,
  onClick,
}: {
  size: WidthSelection
  onClick: () => void
}) => {
  const { selection } = useSelectionContext()
  const { unit, width } = size
  const formattedWidth = useMemo(() => {
    if (unit === 'custom') {
      return width
    }
    return `${roundIfNeeded(width)}${unit}`
  }, [unit, width])

  if (!selection) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="table-generator-column-indicator-button"
          onClick={onClick}
        >
          <WrapText className="size-3.5" />
          <span className="table-generator-column-indicator-label">
            {formattedWidth}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={POPUP_CLASS}>
        {unit === 'custom'
          ? t('Column width is custom. Click to resize')
          : t('Column width is {width}. Click to resize', { width: String(formattedWidth) })}
      </TooltipContent>
    </Tooltip>
  )
}

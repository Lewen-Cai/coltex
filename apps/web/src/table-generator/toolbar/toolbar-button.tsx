// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/toolbar/toolbar-button.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: drawn with ColTex's Button and Tooltip and lucide icons; no analytics.

import { memo, useCallback } from 'react'
import type { EditorView } from '@codemirror/view'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useCodeMirrorViewContext } from '../contexts/host-context'
import { POPUP_CLASS } from '../tabular'

export const ToolbarButton = memo<{
  id: string
  className?: string
  label: string
  command?: (view: EditorView) => void
  active?: boolean
  disabled?: boolean
  disabledLabel?: string
  icon: LucideIcon
  hidden?: boolean
}>(function ToolbarButton({
  id,
  className,
  label,
  command,
  active = false,
  disabled,
  icon: Icon,
  hidden = false,
  disabledLabel,
}) {
  const view = useCodeMirrorViewContext()
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
  }, [])

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (command) {
        event.preventDefault()
        command(view)
      }
    },
    [command, view]
  )

  if (hidden) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button gets no pointer events; the span still shows why it is disabled. */}
        <span id={id} className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn('table-generator-toolbar-button', active && 'bg-accent text-accent-foreground', className)}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={handleMouseDown}
            onClick={!disabled ? handleClick : undefined}
            disabled={disabled}
          >
            <Icon />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={POPUP_CLASS}>
        {disabled && disabledLabel ? disabledLabel : label}
      </TooltipContent>
    </Tooltip>
  )
})

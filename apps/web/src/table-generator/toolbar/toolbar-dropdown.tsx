// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/toolbar/toolbar-dropdown.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: a ColTex DropdownMenu (Radix) instead of Overleaf's overlay and
// popover; it also serves for the alignment menu (toolbar-button-menu.tsx).
// No analytics.

import type { FC, ReactNode } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { POPUP_CLASS } from '../tabular'

export const ToolbarDropdown: FC<
  React.PropsWithChildren<{
    id: string
    label?: string
    icon?: LucideIcon
    tooltip?: string
    disabled?: boolean
    disabledTooltip?: string
    showCaret?: boolean
  }>
> = ({ id, label, children, icon: Icon, tooltip, disabled, disabledTooltip, showCaret }) => {
  const description = disabled && disabledTooltip ? disabledTooltip : tooltip
  const trigger = (
    <span className="inline-flex">
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="ghost"
          size={label ? 'sm' : 'icon-sm'}
          className={cn('table-generator-toolbar-dropdown-toggle', !label && showCaret && 'w-auto gap-0.5 px-1.5')}
          aria-label={tooltip ?? label}
          disabled={disabled}
          onMouseDown={event => event.stopPropagation()}
        >
          {label && <span>{label}</span>}
          {Icon ? <Icon /> : <ChevronDown />}
          {Icon && showCaret && <ChevronDown className="size-3!" />}
        </Button>
      </DropdownMenuTrigger>
    </span>
  )
  return (
    // Not modal: a modal menu would lock the page around the editor.
    <DropdownMenu modal={false}>
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" className={POPUP_CLASS}>
            {description}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        align="start"
        className={cn(POPUP_CLASS, 'w-auto min-w-40')}
        onCloseAutoFocus={event => event.preventDefault()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const ToolbarDropdownItem: FC<{
  command: () => void
  id: string
  icon?: LucideIcon
  active?: boolean
  disabled?: boolean
  children: ReactNode
}> = ({ children, command, id, icon: Icon, active, disabled }) => {
  return (
    <DropdownMenuItem id={id} disabled={disabled} onSelect={command}>
      {Icon && <Icon />}
      <span className="flex-1">{children}</span>
      {active && <Check className="ml-2" />}
    </DropdownMenuItem>
  )
}

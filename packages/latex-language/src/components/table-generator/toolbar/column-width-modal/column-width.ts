// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/toolbar/column-width-modal/column-width.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

export const ABSOLUTE_SIZE_REGEX = /[pbm]\{\s*(\d*[.]?\d+)\s*(mm|cm|pt|in)\s*\}/

export const RELATIVE_SIZE_REGEX =
  /[pbm]\{\s*(\d*[.]?\d+)\s*\\(linewidth|textwidth|columnwidth)\s*\}/

export type AbsoluteWidthUnits = 'mm' | 'cm' | 'in' | 'pt'
export type RelativeWidthCommand = 'linewidth' | 'textwidth' | 'columnwidth'
export type WidthUnit = AbsoluteWidthUnits | '%' | 'custom'

const ABSOLUTE_UNITS = ['mm', 'cm', 'in', 'pt'] as const
export const UNITS: WidthUnit[] = ['%', ...ABSOLUTE_UNITS, 'custom']

type PercentageWidth = {
  unit: '%'
  width: number
  command?: RelativeWidthCommand
}

type CustomWidth = {
  unit: 'custom'
  width: string
}

type AbsoluteWidth = {
  unit: Exclude<WidthUnit, '%' | 'custom'>
  width: number
}

export type WidthSelection = PercentageWidth | CustomWidth | AbsoluteWidth

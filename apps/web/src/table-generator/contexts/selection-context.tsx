// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/contexts/selection-context.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
// ColTex: TableSelection itself is in @coltex/latex-language.

import {
  Dispatch,
  FC,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from 'react'
import { TableSelection } from '@coltex/latex-language'

export { TableSelection }

const SelectionContext = createContext<
  | {
      selection: TableSelection | null
      setSelection: Dispatch<SetStateAction<TableSelection | null>>
      dragging: boolean
      setDragging: Dispatch<SetStateAction<boolean>>
    }
  | undefined
>(undefined)

export const useSelectionContext = () => {
  const context = useContext(SelectionContext)

  if (context === undefined) {
    throw new Error(
      'useSelectionContext is only available inside SelectionContext.Provider'
    )
  }

  return context
}

export const SelectionContextProvider: FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [selection, setSelection] = useState<TableSelection | null>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <SelectionContext.Provider
      value={{ selection, setSelection, dragging, setDragging }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

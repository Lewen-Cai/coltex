// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/contexts/tabular-context.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import {
  FC,
  RefObject,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'

const TabularContext = createContext<
  | {
      ref: RefObject<HTMLDivElement | null>
      showHelp: () => void
      hideHelp: () => void
      helpShown: boolean
      columnWidthModalShown: boolean
      openColumnWidthModal: () => void
      closeColumnWidthModal: () => void
    }
  | undefined
>(undefined)

export const TabularProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [helpShown, setHelpShown] = useState(false)
  const [columnWidthModalShown, setColumnWidthModalShown] = useState(false)
  const showHelp = useCallback(() => setHelpShown(true), [])
  const hideHelp = useCallback(() => setHelpShown(false), [])
  const openColumnWidthModal = useCallback(
    () => setColumnWidthModalShown(true),
    []
  )
  const closeColumnWidthModal = useCallback(
    () => setColumnWidthModalShown(false),
    []
  )
  return (
    <TabularContext.Provider
      value={{
        ref,
        helpShown,
        showHelp,
        hideHelp,
        columnWidthModalShown,
        openColumnWidthModal,
        closeColumnWidthModal,
      }}
    >
      {children}
    </TabularContext.Provider>
  )
}

export const useTabularContext = () => {
  const tabularContext = useContext(TabularContext)
  if (!tabularContext) {
    throw new Error('TabularContext must be used within TabularProvider')
  }
  return tabularContext
}

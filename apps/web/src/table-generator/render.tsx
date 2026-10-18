// ColTex: renders the table editor into the visual editor's table widgets
// (TableRenderer in @coltex/latex-language). Overleaf's widget creates the
// React roots itself; here they live in the web app, one per widget element.

import { createRoot, type Root } from 'react-dom/client'
import type { TableRenderer } from '@coltex/latex-language'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TableHostContext, type TableHost } from './contexts/host-context'
import { Tabular } from './tabular'

export function createTableRenderer(host: TableHost): TableRenderer {
  const roots = new WeakMap<HTMLElement, Root>()
  return {
    render(element, props) {
      let root = roots.get(element)
      if (!root) {
        root = createRoot(element)
        roots.set(element, root)
      }
      root.render(
        // Its own React root: the app's providers don't reach it.
        <TooltipProvider delayDuration={300}>
          <TableHostContext.Provider value={host}>
            <Tabular {...props} />
          </TableHostContext.Provider>
        </TooltipProvider>
      )
    },
    destroy(element) {
      const root = roots.get(element)
      if (root) {
        roots.delete(element)
        // Unmounting synchronously inside CodeMirror's update would warn; defer it.
        queueMicrotask(() => root.unmount())
      }
    },
  }
}

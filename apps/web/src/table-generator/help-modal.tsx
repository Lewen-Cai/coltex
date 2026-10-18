// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/help-modal.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: ColTex's Dialog; the text is ColTex's own (Overleaf's links to its
// documentation pages and mentions its plans).

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { t, tr } from '@/lib/i18n'
import { useTabularContext } from './contexts/tabular-context'
import { POPUP_CLASS } from './tabular'

export const TableGeneratorHelpModal = () => {
  const { helpShown, hideHelp } = useTabularContext()
  if (!helpShown) return null

  return (
    <Dialog open={helpShown} onOpenChange={open => !open && hideHelp()}>
      <DialogContent className={`${POPUP_CLASS} sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle>{t('Help')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p>{t('The table editor lets you edit simple tables without writing LaTeX.')}</p>
          <div>
            <b>{t('How it works')}</b>
            <p>
              {t(
                'Click a cell to select it, drag or shift-click to select more, and double-click or start typing to edit. Use the bars above the columns and left of the rows to select whole columns or rows. Every change is written to the LaTeX source.'
              )}
            </p>
          </div>
          <div>
            <b>{t('Customizing tables')}</b>
            <p>{t('For anything the toolbar does not cover, switch to the source editor and edit the table there.')}</p>
          </div>
          <div>
            <b>{t('Changing the position of your table')}</b>
            <p>
              {tr('LaTeX places tables where they fit best. The placement option, e.g. {option}, gives it a preference.', {
                option: <code className="font-mono text-xs">\begin{'{table}'}[htbp]</code>,
              })}
            </p>
          </div>
          <div>
            <b>{t('Understanding labels')}</b>
            <p>
              {tr('A label lets you refer to the table in the text: {ref} prints its number.', {
                ref: <code className="font-mono text-xs">\ref{'{tab:…}'}</code>,
              })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideHelp}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

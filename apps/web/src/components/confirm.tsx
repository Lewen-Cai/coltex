import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { t } from '@/lib/i18n'

type ConfirmOptions = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  destructive?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

let show: ((p: Pending) => void) | undefined

/** A styled replacement for window.confirm(). Resolves true when confirmed. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (!show) return resolve(window.confirm(options.title))
    show({ ...options, resolve })
  })
}

/** Mount once near the root. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending>()
  useEffect(() => {
    show = setPending
    return () => {
      show = undefined
    }
  }, [])

  const finish = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(undefined)
  }

  return (
    <AlertDialog open={!!pending} onOpenChange={open => !open && finish(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          {pending?.description && <AlertDialogDescription>{pending.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => finish(true)}
            variant={pending?.destructive ? 'destructive' : 'default'}
            // Solid red: irreversible actions should stand out from the default subtle style.
            className={pending?.destructive ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
          >
            {pending?.confirmLabel ?? t('Continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

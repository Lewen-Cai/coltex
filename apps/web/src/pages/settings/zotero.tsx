import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ZoteroStatus } from '@coltex/shared'
import { PageHeader } from '@/components/shell/app-shell'
import { confirmDialog } from '@/components/confirm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { t, tr } from '@/lib/i18n'

const NEW_KEY_URL = 'https://www.zotero.org/settings/keys/new'

/** The person's Zotero connection, used to import their libraries into projects as .bib files. */
export function ZoteroSettingsPage() {
  const [status, setStatus] = useState<ZoteroStatus>()
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.zoteroStatus().then(setStatus, e => toast.error((e as Error).message))
  }, [])

  const connect = async () => {
    setBusy(true)
    try {
      setStatus(await api.connectZotero(apiKey.trim()))
      setApiKey('')
      toast.success(t('Zotero connected'))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    const ok = await confirmDialog({
      title: t('Disconnect Zotero?'),
      description: t('Files you linked from Zotero stay in their projects, but nobody can refresh them until you connect again.'),
      confirmLabel: t('Disconnect'),
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.disconnectZotero()
      setStatus({ connected: false })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={t('Zotero')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('Connection')}</CardTitle>
          <CardDescription>
            {status?.connected
              ? tr('Connected as {name}.', { name: <b>{status.username}</b> })
              : tr('Create a key at {link} with read access to your library (and to groups, if you use them), then paste it here.', {
                  link: (
                    <a href={NEW_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                      zotero.org/settings/keys
                    </a>
                  ),
                })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!status ? (
            <Spinner className="size-5 text-muted-foreground" />
          ) : status.connected ? (
            <Button variant="outline" disabled={busy} onClick={() => void disconnect()}>
              {t('Disconnect')}
            </Button>
          ) : (
            <form
              className="flex max-w-xl flex-wrap items-end gap-2"
              onSubmit={e => {
                e.preventDefault()
                void connect()
              }}
            >
              <div className="grid min-w-64 flex-1 gap-1.5">
                <Label htmlFor="zotero-key">{t('API key')}</Label>
                <Input id="zotero-key" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono" />
              </div>
              <Button type="submit" disabled={busy || apiKey.trim().length < 10}>
                {busy && <Spinner />}
                {t('Connect')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  )
}

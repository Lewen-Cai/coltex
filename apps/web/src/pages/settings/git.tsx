import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import type { CreatedGitToken, GitToken } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { Button } from '@/components/ui/button'
import { GitLogo, ServiceTile } from '@/components/service-icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { copyText } from '@/lib/clipboard'
import { api } from '@/lib/api'
import { intlLocale, t } from '@/lib/i18n'

const when = (iso: string) => new Date(iso).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })

/** Personal access tokens for the Git bridge (git clone/pull/push of projects; Settings → Sync services). */
export function GitTokensCard() {
  const [tokens, setTokens] = useState<GitToken[]>()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatedGitToken>()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.gitTokens().then(setTokens, e => toast.error((e as Error).message))
  }, [])

  const create = async () => {
    setBusy(true)
    try {
      const token = await api.createGitToken(name.trim())
      setCreated(token)
      setCopied(false)
      setName('')
      setTokens(list => [token, ...(list ?? [])])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (token: GitToken) => {
    const ok = await confirmDialog({
      title: t('Revoke “{name}”?', { name: token.name }),
      description: t('Git clients using this token can no longer pull or push.'),
      confirmLabel: t('Revoke'),
    })
    if (!ok) return
    try {
      await api.revokeGitToken(token.id)
      setTokens(list => list?.filter(x => x.id !== token.id))
      if (created?.id === token.id) setCreated(undefined)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <ServiceTile>
          <GitLogo />
        </ServiceTile>
        <CardTitle>{t('Git')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="flex max-w-xl flex-wrap items-end gap-2"
          onSubmit={e => {
            e.preventDefault()
            void create()
          }}
        >
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label htmlFor="git-token-name">{t('Token name')}</Label>
            <Input id="git-token-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. My laptop')} />
          </div>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy && <Spinner />}
            {t('Create token')}
          </Button>
        </form>

        {created && (
          <div className="grid gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <p className="text-sm font-medium">{t('Copy the token now: it won’t be shown again.')}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1 font-mono text-xs">{created.token}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (await copyText(created.token)) setCopied(true)
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? t('Copied') : t('Copy')}
              </Button>
            </div>
          </div>
        )}

        {!tokens ? (
          <Spinner className="size-5 text-muted-foreground" />
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No tokens yet.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tokens.map(token => (
              <li key={token.id} className="flex items-center gap-3 px-3 py-2">
                <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{token.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('Created {date}', { date: when(token.createdAt) })} ·{' '}
                    {token.lastUsedAt ? t('last used {date}', { date: when(token.lastUsedAt) }) : t('never used')}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void revoke(token)}>
                  {t('Revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

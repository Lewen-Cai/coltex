import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreatedGitToken } from '@coltex/shared'
import { CreateTokenDialog, NewToken, TokenList, useTokens } from '@/components/access-tokens'
import { GitLogo, ServiceTile } from '@/components/service-icons'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/lib/i18n'

/** Personal access tokens for the Git bridge (git clone/pull/push of projects; Settings → Sync services). */
export function GitTokensCard() {
  const [tokens, changeTokens] = useTokens()
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedGitToken>()

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <ServiceTile>
          <GitLogo />
        </ServiceTile>
        <CardTitle>{t('Git')}</CardTitle>
        <CardAction className="ml-auto self-center">
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus />
            {t('Create token')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {created && <NewToken token={created} />}
        <TokenList
          tokens={tokens}
          use="git"
          onRevoked={id => {
            changeTokens(list => list.filter(x => x.id !== id))
            if (created?.id === id) setCreated(undefined)
          }}
        />
      </CardContent>
      <CreateTokenDialog
        open={creating}
        onOpenChange={setCreating}
        use="git"
        onCreated={token => {
          setCreated(token)
          changeTokens(list => [token, ...list])
        }}
      />
    </Card>
  )
}

import { useEffect, useState } from 'react'
import type { InviteInfo } from '@coltex/shared'
import { api } from '../../lib/api.ts'
import { authErrorText } from '../../lib/auth-errors.ts'
import { intlLocale, t } from '../../lib/i18n.ts'
import { AuthLayout } from './AuthLayout.tsx'
import { AccountForm } from './AccountForm.tsx'

export function AcceptInvitePage({ token, onDone }: { token: string; onDone: () => void }) {
  const [info, setInfo] = useState<InviteInfo>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    api.inviteInfo(token).then(setInfo, e => setError(authErrorText((e as Error).message)))
  }, [token])

  if (error) {
    return (
      <AuthLayout title={t('Invitation unavailable')}>
        <p className="text-sm text-muted-foreground">{error}</p>
        <a href="#/" className="mt-4 block text-sm font-medium text-primary hover:underline">
          {t('Go to sign in')}
        </a>
      </AuthLayout>
    )
  }
  if (!info) return null

  return (
    <AuthLayout
      title={t('Join ColTex')}
      subtitle={
        info.role === 'manager'
          ? t('You were invited as an admin. Expires {date}.', { date: new Date(info.expiresAt).toLocaleDateString(intlLocale()) })
          : t('You were invited. Expires {date}.', { date: new Date(info.expiresAt).toLocaleDateString(intlLocale()) })
      }
    >
      <AccountForm
        submitLabel={t('Create account')}
        fixedEmail={info.email}
        onSubmit={async input => {
          await api.acceptInvite(token, input)
          onDone()
        }}
      />
    </AuthLayout>
  )
}

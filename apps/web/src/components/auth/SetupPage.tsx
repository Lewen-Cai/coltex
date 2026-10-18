import { api } from '../../lib/api.ts'
import { t } from '../../lib/i18n.ts'
import { AuthLayout } from './AuthLayout.tsx'
import { AccountForm } from './AccountForm.tsx'

export function SetupPage({ onDone }: { onDone: () => void }) {
  return (
    <AuthLayout title={t('Set up ColTex')} subtitle={t('Create the administrator account for this server. You can invite your group next.')}>
      <AccountForm
        submitLabel={t('Create administrator')}
        onSubmit={async input => {
          await api.setup(input)
          onDone()
        }}
      />
    </AuthLayout>
  )
}

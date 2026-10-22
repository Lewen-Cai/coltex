import { PageHeader } from '@/components/shell/app-shell'
import { t } from '@/lib/i18n'
import { GitTokensCard } from './git'
import { ZoteroCard } from './zotero'

/** What connects ColTex to the person's other tools: Zotero for references, git tokens for their projects. */
export function SyncSettingsPage() {
  return (
    <>
      <PageHeader title={t('Sync services')} />
      <div className="grid gap-6">
        <ZoteroCard />
        <GitTokensCard />
      </div>
    </>
  )
}

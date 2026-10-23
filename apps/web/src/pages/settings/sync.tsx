import { GitTokensCard } from './git'
import { ZoteroCard } from './zotero'

/** What connects ColTex to the person's other tools: Zotero for references, git tokens for their projects. */
export function SyncSettingsPage() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <GitTokensCard />
      <ZoteroCard />
    </div>
  )
}

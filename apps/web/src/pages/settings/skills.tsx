import { useState } from 'react'
import { PageHeader } from '@/components/shell/app-shell'
import { SkillChat } from '@/components/skills/skill-chat'
import { SkillLibrary } from '@/components/skills/skill-library'
import { Card, CardContent } from '@/components/ui/card'
import { t } from '@/lib/i18n'

/**
 * The person's own AI skills, with the skills chat beside them (the page
 * shows only for people who have the AI agent).
 */
export function SkillsSettingsPage() {
  // Bumped when the chat saves a skill, so the list shows it.
  const [saved, setSaved] = useState(0)
  return (
    <>
      <PageHeader title={t('AI skills')} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <Card>
          <CardContent>
            <SkillLibrary base="/api/me/ai/skills" canEdit refreshKey={saved} />
          </CardContent>
        </Card>
        <Card className="h-[min(720px,calc(100dvh-9rem))] gap-0 overflow-hidden py-0 lg:sticky lg:top-4">
          <SkillChat onSaved={() => setSaved(n => n + 1)} />
        </Card>
      </div>
    </>
  )
}

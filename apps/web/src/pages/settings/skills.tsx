import { useState, type ReactNode } from 'react'
import { ArrowLeft, Sparkles, Upload } from 'lucide-react'
import type { AiSkill } from '@coltex/shared'
import { SkillActions } from '@/components/skills/skill-actions'
import { SkillChat } from '@/components/skills/skill-chat'
import { SkillDetail, SkillMeta } from '@/components/skills/skill-detail'
import { SkillEditor } from '@/components/skills/skill-editor'
import { useSkills } from '@/components/skills/use-skills'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/lib/i18n'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

const BASE = '/api/me/ai/skills'
/** The chat, or the name of the skill shown. */
type Selection = { kind: 'chat' } | { kind: 'skill'; name: string }

/**
 * The person's own AI skills: the list on the left, and beside it the
 * selected skill or the skills chat (the page shows only for people who
 * have the AI agent). Narrow screens show one side at a time.
 */
export function SkillsSettingsPage() {
  // Bumped when the chat saves a skill, so the list shows it.
  const [saved, setSaved] = useState(0)
  const skills = useSkills(BASE, saved)
  const [selection, setSelection] = useState<Selection>({ kind: 'chat' })
  // Narrow screens: whether the right side (chat or skill) is showing instead of the list.
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<AiSkill>()
  const [prefill, setPrefill] = useState<{ text: string; key: number }>()
  const wide = useMediaQuery('(min-width: 1024px)')

  const list = skills.skills
  const mine = list?.filter(s => s.scope !== 'builtin') ?? []
  const builtin = list?.filter(s => s.scope === 'builtin') ?? []
  const current = selection.kind === 'skill' ? list?.find(s => s.name === selection.name) : undefined

  const select = (next: Selection) => {
    setSelection(next)
    setOpened(true)
  }

  const improve = (skill: AiSkill) => {
    const text = t('Help me improve my skill “{name}”: ', { name: skill.name })
    setPrefill(p => ({ text, key: (p?.key ?? 0) + 1 }))
    select({ kind: 'chat' })
  }

  const showList = wide || !opened
  const showPane = wide || opened

  return (
    <>
      <div className="flex h-[calc(100dvh-6.25rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card">
        {showList && (
          <nav className={cn('flex min-h-0 flex-col overflow-y-auto p-2', wide ? 'w-72 shrink-0 border-r' : 'w-full')}>
            <ListButton selected={wide && selection.kind === 'chat'} onClick={() => select({ kind: 'chat' })}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" /> {t('Create with AI')}
              </span>
            </ListButton>
            <SkillActions
              skills={skills}
              trigger={
                <button type="button" className="w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {skills.importing ? <Spinner className="size-4" /> : <Upload className="size-4 text-primary" />} {t('Import')}
                  </span>
                </button>
              }
            />

            <GroupLabel>{t('My skills')}</GroupLabel>
            {!list ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Spinner />
              </div>
            ) : mine.length === 0 ? (
              <p className="px-2.5 py-1.5 text-sm text-muted-foreground">{t('No skills yet')}</p>
            ) : (
              mine.map(skill => <SkillRow key={skill.id} skill={skill} selected={wide && current?.id === skill.id} onSelect={select} />)
            )}

            {builtin.length > 0 && (
              <>
                <GroupLabel>{t('Built-in')}</GroupLabel>
                {builtin.map(skill => (
                  <SkillRow key={skill.id} skill={skill} selected={wide && current?.id === skill.id} onSelect={select} />
                ))}
              </>
            )}
          </nav>
        )}

        {showPane && (
          <section className="flex min-w-0 flex-1 flex-col">
            {!wide && (
              <div className="shrink-0 border-b px-2 py-1.5">
                <Button variant="ghost" size="sm" onClick={() => setOpened(false)}>
                  <ArrowLeft /> {t('All skills')}
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1">
              {/* The chat stays mounted, so a reply keeps streaming while a skill is shown. */}
              <div className={cn('h-full', current && 'hidden')}>
                <SkillChat onSaved={() => setSaved(n => n + 1)} prefill={prefill} />
              </div>
              {current && (
                <SkillDetail
                  base={BASE}
                  skill={current}
                  canEdit
                  onEdit={() => setEditing(current)}
                  onDelete={() => void skills.remove(current).then(gone => gone && select({ kind: 'chat' }))}
                  onImprove={() => improve(current)}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <SkillEditor
        open={!!editing}
        onOpenChange={open => !open && setEditing(undefined)}
        title={t('Edit skill')}
        initial={editing}
        files={editing?.files}
        onSave={async body => {
          const skill = await skills.save(body, editing?.name)
          select({ kind: 'skill', name: skill.name })
        }}
      />
    </>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pt-4 pb-1 text-xs font-medium text-muted-foreground">{children}</div>
}

function ListButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn('w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent', selected && 'bg-accent')}
    >
      {children}
    </button>
  )
}

function SkillRow({ skill, selected, onSelect }: { skill: AiSkill; selected: boolean; onSelect: (s: Selection) => void }) {
  return (
    <ListButton selected={selected} onClick={() => onSelect({ kind: 'skill', name: skill.name })}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{skill.name}</span>
        <SkillMeta skill={skill} />
      </span>
      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{skill.description}</span>
    </ListButton>
  )
}

import { useState } from 'react'
import { motion } from 'motion/react'
import { Download, Ellipsis, Pencil, Sparkles, Trash2 } from 'lucide-react'
import type { AiSkill } from '@coltex/shared'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { SkillActions } from './skill-actions'
import { SkillEditor } from './skill-editor'
import { SkillMeta } from './skill-detail'
import { useSkills } from './use-skills'

type Props = {
  /** `/api/me/ai/skills` or `/api/projects/:id/ai/skills`. */
  base: string
  /** Project skills: only editors change them; everyone else can read them. */
  canEdit: boolean
}

/** A list of skills with new, import, edit, download and delete (the project settings' AI skills). */
export function SkillLibrary({ base, canEdit }: Props) {
  const skills = useSkills(base)
  const [editing, setEditing] = useState<AiSkill | 'new'>()
  const list = skills.skills

  return (
    <div className="grid gap-3">
      {canEdit && <SkillActions skills={skills} onNew={() => setEditing('new')} />}
      {!list ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      ) : list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>{t('No skills yet')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.map((skill, i) => {
            // Built-in skills ship with ColTex: they can be read and downloaded, not changed.
            const editable = canEdit && skill.scope !== 'builtin'
            return (
              <motion.li
                key={skill.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: Math.min(i, 20) * 0.02 } }}
                className="flex items-center gap-2 py-1 pr-2 pl-1"
              >
                <button
                  type="button"
                  className="grid min-w-0 flex-1 gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                  onClick={() => setEditing(skill)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{skill.name}</span>
                    <SkillMeta skill={skill} />
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{skill.description}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Actions')}>
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(skill)}>
                      <Pencil /> {editable ? t('Edit') : t('View')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={api.skillDownloadUrl(base, skill.name)} download>
                        <Download /> {t('Download')}
                      </a>
                    </DropdownMenuItem>
                    {editable && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => void skills.remove(skill)}>
                          <Trash2 /> {t('Delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.li>
            )
          })}
        </ul>
      )}
      <SkillEditor
        open={!!editing}
        onOpenChange={open => !open && setEditing(undefined)}
        title={editing === 'new' ? t('New skill') : canEdit && editing?.scope !== 'builtin' ? t('Edit skill') : t('Skill')}
        initial={editing === 'new' ? undefined : editing}
        files={editing === 'new' ? undefined : editing?.files}
        readOnly={!canEdit || (editing !== 'new' && editing?.scope === 'builtin')}
        onSave={async body => void (await skills.save(body, editing === 'new' ? undefined : editing?.name))}
      />
    </div>
  )
}

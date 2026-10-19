import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'motion/react'
import { Download, Ellipsis, FileUp, FolderUp, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { AiSkill, AiSkillBody } from '@coltex/shared'
import { ApiError, api } from '@/lib/api'
import { plural, t, translateServerMessage } from '@/lib/i18n'
import { confirmDialog } from '@/components/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { SkillEditor } from './skill-editor'

type Props = {
  /** `/api/me/ai/skills` or `/api/projects/:id/ai/skills`. */
  base: string
  /** Project skills: only editors change them; everyone else can read them. */
  canEdit: boolean
  /** Changes when skills were saved elsewhere (the skills chat), to list them again. */
  refreshKey?: unknown
}

/** A list of skills with new, import, edit, download and delete. */
export function SkillLibrary({ base, canEdit, refreshKey }: Props) {
  const [skills, setSkills] = useState<AiSkill[]>()
  const [editing, setEditing] = useState<AiSkill | 'new'>()
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const load = useCallback(() => api.skills(base).then(setSkills, e => toast.error((e as Error).message)), [base])
  useEffect(() => void load(), [load, refreshKey])

  const save = async (body: AiSkillBody) => {
    if (editing === 'new') await api.createSkill(base, body)
    else if (editing) await api.updateSkill(base, editing.name, body)
    await load()
  }

  const remove = async (skill: AiSkill) => {
    const ok = await confirmDialog({
      title: t('Delete the skill “{name}”?', { name: skill.name }),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.deleteSkill(base, skill.name)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const importFiles = async (files: File[]) => {
    setImporting(true)
    try {
      let result
      try {
        result = await api.importSkills(base, files, false)
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 409) throw e
        const ok = await confirmDialog({
          title: t('Replace skills with the same name?'),
          description: e.message,
          confirmLabel: t('Replace'),
        })
        if (!ok) return
        result = await api.importSkills(base, files, true)
      }
      toast.success(plural(result.skills.length, 'Imported {n} skill', 'Imported {n} skills'))
      for (const w of result.warnings) toast.warning(translateServerMessage(w))
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) void importFiles(files)
  }

  return (
    <div className="grid gap-3">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> {t('New skill')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={importing}>
                {importing ? <Spinner /> : <Upload />} {t('Import')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
                <FileUp /> {t('Upload files')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => folderInput.current?.click()}>
                <FolderUp /> {t('Upload folder')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* A SKILL.md with its reference files, a zip, or a folder of one or more skills. */}
          <input ref={fileInput} type="file" multiple className="hidden" onChange={pick} />
          <input ref={folderInput} type="file" className="hidden" onChange={pick} {...{ webkitdirectory: '' }} />
        </div>
      )}
      {!skills ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      ) : skills.length === 0 ? (
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
          {skills.map((skill, i) => {
            // Built-in skills ship with ColTex: they can be read and downloaded, not changed.
            const editable = canEdit && skill.scope !== 'builtin'
            return (
              <motion.li
                key={skill.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: Math.min(i, 20) * 0.02 } }}
                className="flex items-start gap-3 px-3 py-2.5"
              >
                <button type="button" className="grid min-w-0 flex-1 gap-0.5 text-left" onClick={() => setEditing(skill)}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">{skill.name}</span>
                    {skill.files.length > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {plural(skill.files.length, '{n} file', '{n} files')}
                      </Badge>
                    )}
                    {skill.scope === 'builtin' && (
                      <Badge variant="outline" className="font-normal">
                        {t('Built-in')}
                      </Badge>
                    )}
                    {skill.author && <span className="text-xs text-muted-foreground">{skill.author}</span>}
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</span>
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
                        <DropdownMenuItem variant="destructive" onSelect={() => void remove(skill)}>
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
        onSave={save}
      />
    </div>
  )
}

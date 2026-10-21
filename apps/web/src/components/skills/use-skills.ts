import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AiSkill, AiSkillBody } from '@coltex/shared'
import { ApiError, api } from '@/lib/api'
import { plural, t, translateServerMessage } from '@/lib/i18n'
import { confirmDialog } from '@/components/confirm'

/**
 * A list of skills (`base` is `/api/me/ai/skills` or
 * `/api/projects/:id/ai/skills`) and the changes made to it. `refreshKey`
 * changes when skills were saved elsewhere (the skills chat).
 */
export function useSkills(base: string, refreshKey?: unknown) {
  const [skills, setSkills] = useState<AiSkill[]>()
  const [importing, setImporting] = useState(false)

  const reload = useCallback(() => api.skills(base).then(setSkills, e => toast.error((e as Error).message)), [base])
  useEffect(() => void reload(), [reload, refreshKey])

  /** A new skill (`previous` unset) or a change to one; resolves to the saved skill. */
  const save = async (body: AiSkillBody, previous?: string): Promise<AiSkill> => {
    const saved = previous ? await api.updateSkill(base, previous, body) : await api.createSkill(base, body)
    await reload()
    return saved
  }

  /** Asks first; resolves to whether it was deleted. */
  const remove = async (skill: AiSkill): Promise<boolean> => {
    const ok = await confirmDialog({
      title: t('Delete the skill “{name}”?', { name: skill.name }),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (!ok) return false
    try {
      await api.deleteSkill(base, skill.name)
      await reload()
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
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
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return { skills, importing, reload, save, remove, importFiles }
}

export type SkillsHandle = ReturnType<typeof useSkills>

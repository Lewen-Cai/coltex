import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { TemplateField, UserMatch } from '@coltex/shared'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { TEMPLATE_FIELDS } from '@/lib/template-fields'
import { PersonPicker } from './person-picker'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Field, FieldLabel } from './ui/field'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export type AudienceDraft = { everyone: boolean; groups: { id: string; name: string }[]; users: UserMatch[] }

export const NO_AUDIENCE: AudienceDraft = { everyone: false, groups: [], users: [] }

export const audienceBody = (a: AudienceDraft) => ({ everyone: a.everyone, groupIds: a.groups.map(g => g.id), userIds: a.users.map(u => u.id) })
export const hasAudience = (a: AudienceDraft) => a.everyone || a.groups.length > 0 || a.users.length > 0

/** Sharing templates is for administrators (the server checks it too). */
export function useCanShareTemplates(): { canShare: boolean; systemAdmin: boolean } {
  const role = authClient.useSession().data?.user.role
  return { canShare: role === 'admin' || role === 'manager', systemAdmin: role === 'admin' }
}

export function FieldSelect({ value, onChange }: { value: TemplateField; onChange: (f: TemplateField) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor="template-field">{t('Field')}</FieldLabel>
      <Select value={value} onValueChange={v => onChange(v as TemplateField)}>
        <SelectTrigger id="template-field" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_FIELDS.map(f => (
            <SelectItem key={f.id} value={f.id}>
              {t(f.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/**
 * Who a template is for: everyone on the server (the system administrator
 * only), the groups the person is in, and people picked one by one.
 */
export function AudienceEditor({ value, onChange }: { value: AudienceDraft; onChange: (a: AudienceDraft) => void }) {
  const { systemAdmin } = useCanShareTemplates()
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [text, setText] = useState('')
  const exclude = useMemo(() => new Set(value.users.map(u => u.id)), [value.users])

  useEffect(() => {
    api.myGroups().then(
      gs => setGroups(gs.filter(g => g.status === 'joined').map(g => ({ id: g.id, name: g.name }))),
      () => setGroups([]),
    )
  }, [])

  const toggleGroup = (g: { id: string; name: string }, on: boolean) =>
    onChange({ ...value, groups: on ? [...value.groups, g] : value.groups.filter(x => x.id !== g.id) })

  return (
    <Field>
      <FieldLabel>{t('Shared with')}</FieldLabel>
      <div className="grid gap-3 rounded-md border p-3">
        {systemAdmin && (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={value.everyone} onCheckedChange={c => onChange({ ...value, everyone: c === true })} />
            {t('Everyone on this server')}
          </Label>
        )}
        {!value.everyone && (
          <>
            {groups.length > 0 && (
              <div className="grid gap-2">
                {groups.map(g => (
                  <Label key={g.id} className="flex items-center gap-2 font-normal">
                    <Checkbox checked={value.groups.some(x => x.id === g.id)} onCheckedChange={c => toggleGroup(g, c === true)} />
                    {g.name}
                  </Label>
                ))}
              </div>
            )}
            <PersonPicker
              value={text}
              onChange={setText}
              required={false}
              exclude={exclude}
              placeholder={t('Add someone by name or email')}
              onPick={p => {
                if (p.kind !== 'user') return
                setText('')
                onChange({ ...value, users: [...value.users, p.user] })
              }}
            />
            {value.users.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {value.users.map(u => (
                  <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                    {u.name}
                    <button
                      type="button"
                      aria-label={t('Remove {name}', { name: u.name })}
                      className="rounded-sm opacity-70 hover:opacity-100"
                      onClick={() => onChange({ ...value, users: value.users.filter(x => x.id !== u.id) })}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Field>
  )
}

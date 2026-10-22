import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { McpMode, McpSettings as Settings } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { t, tk, tr } from '../lib/i18n.ts'
import { LinkList } from './link-list.tsx'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from './ui/field.tsx'
import { RadioGroup, RadioGroupItem } from './ui/radio-group.tsx'
import { Spinner } from './ui/spinner.tsx'

const MODES: { mode: McpMode; title: string; description: string }[] = [
  { mode: 'manual', title: tk('Manual'), description: tk('Edits become your suggestions, to accept or reject in Review.') },
  { mode: 'auto', title: tk('Auto'), description: tk('Edits are applied directly, as your own.') },
  { mode: 'full', title: tk('Full access'), description: tk('Edits are applied directly, and files can be deleted, moved and renamed.') },
]

/**
 * The project's MCP address for AI agents (Claude Code, Codex, …) and what
 * this person's agents may change in it. The mode is the person's own.
 */
export function McpSettings({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<Settings>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    api.mcpSettings(projectId).then(
      s => live && setSettings(s),
      err => toast.error((err as Error).message),
    )
    return () => {
      live = false
    }
  }, [projectId])

  const choose = async (mode: McpMode) => {
    setSaving(true)
    try {
      setSettings(await api.setMcpMode(projectId, mode))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 px-2">
      <div className="grid min-w-0 gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{t('Address')}</span>
        <LinkList format={base => `${base}/api/projects/${projectId}/mcp`} />
        <p className="text-xs text-muted-foreground">
          {tr('Agents sign in with a Git token as a Bearer token ({settings}).', {
            settings: (
              <a href="#/settings/sync" className="text-primary underline-offset-4 hover:underline">
                {t('Settings → Sync services')}
              </a>
            ),
          })}
        </p>
      </div>

      <div className="grid gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {t('What your agents may change')}
          {saving && <Spinner className="size-3.5" />}
        </span>
        {!settings ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          <>
            <RadioGroup value={settings.mode ?? ''} onValueChange={v => void choose(v as McpMode)} disabled={saving} aria-label={t('What your agents may change')}>
              {MODES.map(m => {
                const allowed = settings.modes.includes(m.mode)
                return (
                  <FieldLabel key={m.mode} htmlFor={`mcp-${m.mode}`}>
                    <Field orientation="horizontal" data-disabled={!allowed || undefined}>
                      <FieldContent>
                        <FieldTitle>{t(m.title)}</FieldTitle>
                        <FieldDescription>{t(m.description)}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem id={`mcp-${m.mode}`} value={m.mode} disabled={!allowed} />
                    </Field>
                  </FieldLabel>
                )
              })}
            </RadioGroup>
            {settings.modes.length === 1 && <p className="text-sm text-muted-foreground">{t('As a reviewer, your agents can only suggest changes.')}</p>}
            {settings.modes.length === 0 && <p className="text-sm text-muted-foreground">{t('As a viewer, your agents can only read and comment.')}</p>}
          </>
        )}
      </div>
    </div>
  )
}

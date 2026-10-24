import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { t } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'

/**
 * The project's name in the editor's header. Owners and editors click it to rename the project
 * in place: Enter or leaving the field saves, Esc cancels.
 */
export function ProjectName({
  name,
  canEdit,
  onRename,
}: {
  name: string | undefined
  canEdit: boolean
  onRename: (name: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<string>()
  // Esc unmounts the field, which may still fire its blur: that one must not save.
  const cancelled = useRef(false)

  if (!canEdit || name === undefined) return <span className="truncate font-semibold">{name ?? ' '}</span>

  if (draft === undefined) {
    return (
      <button
        type="button"
        aria-label={t('Rename project')}
        className="min-w-0 truncate rounded-md px-1.5 py-0.5 font-semibold hover:bg-accent"
        onClick={() => {
          cancelled.current = false
          setDraft(name)
        }}
      >
        {name}
      </button>
    )
  }

  const save = async () => {
    const next = draft.trim()
    setDraft(undefined)
    if (cancelled.current) return
    if (!next || next === name) return
    try {
      await onRename(next)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <input
      autoFocus
      aria-label={t('Project name')}
      maxLength={200}
      size={Math.max(draft.length, 8)}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={() => void save()}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          setDraft(undefined)
        }
      }}
      className={cn(
        'min-w-0 max-w-full rounded-md border bg-background px-1.5 py-0.5 font-semibold outline-none',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )}
    />
  )
}

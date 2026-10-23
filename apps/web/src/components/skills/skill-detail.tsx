import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Download, Ellipsis, FileText, Paperclip, Pencil, Sparkles, Trash2 } from 'lucide-react'
import type { AiSkill } from '@coltex/shared'
import { api } from '@/lib/api'
import { formatBytes, timeAgo } from '@/lib/format'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'

/** Beside a skill's name in lists: how many reference files it has. */
export function SkillMeta({ skill }: { skill: AiSkill }) {
  if (!skill.files.length) return null
  return (
    <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
      <Paperclip className="size-3" />
      {skill.files.length}
    </span>
  )
}

type Props = {
  base: string
  skill: AiSkill
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  /** Continue with this skill in the skills chat (not for built-in skills: they can't be changed). */
  onImprove: () => void
}

/** One skill as the skills page shows it: what it is for, its instructions, and its reference files. */
export function SkillDetail({ base, skill, canEdit, onEdit, onDelete, onImprove }: Props) {
  const editable = canEdit && skill.scope !== 'builtin'
  return (
    <motion.div
      key={skill.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.15 } }}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex shrink-0 flex-wrap items-start gap-x-4 gap-y-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{skill.name}</h2>
            {skill.scope === 'builtin' && (
              <Badge variant="secondary" className="shrink-0 font-normal">
                {t('Built-in')}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editable && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil /> {t('Edit')}
            </Button>
          )}
          {editable && (
            <Button size="sm" variant="outline" onClick={onImprove}>
              <Sparkles /> {t('Improve in chat')}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('Actions')}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={api.skillDownloadUrl(base, skill.name)} download>
                  <Download /> {t('Download')}
                </a>
              </DropdownMenuItem>
              {editable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 /> {t('Delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t('Instructions')}</h3>
          <div className="rounded-lg border bg-background/50 px-4 py-3">
            <Markdown text={skill.body} className="text-sm" />
          </div>
        </section>
        {skill.files.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t('Reference files')}</h3>
            <ul className="divide-y rounded-lg border">
              {skill.files.map(f => (
                <ReferenceFile key={f.path} base={base} skill={skill.name} file={f} />
              ))}
            </ul>
          </section>
        )}
        {skill.scope !== 'builtin' && (
          <p className="text-xs text-muted-foreground">
            {skill.author ? t('Added by {name}', { name: skill.author }) + ' · ' : ''}
            {t('Updated {time}', { time: timeAgo(skill.updatedAt) })}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/** A reference file, opened in place to read it. */
function ReferenceFile({ base, skill, file }: { base: string; skill: string; file: { path: string; size: number } }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open || text !== undefined) return
    api.skillFile(base, skill, file.path).then(setText, e => setError((e as Error).message))
  }, [open, text, base, skill, file.path])

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
      >
        <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{file.path}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(file.size)}</span>
      </button>
      {open && (
        <div className="border-t bg-muted/40 px-4 py-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : text === undefined ? (
            <Spinner className="text-muted-foreground" />
          ) : /\.(md|markdown)$/i.test(file.path) ? (
            <Markdown text={text} className="max-h-96 overflow-auto text-sm" />
          ) : (
            <pre className="max-h-96 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
          )}
        </div>
      )}
    </li>
  )
}

import { useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type RefObject } from 'react'
import { t } from '@/lib/i18n'
import { matchPeople, mentionQuery, rememberPick, splitMentions, type Mentionable } from '@/lib/mentions'
import { cn } from '@/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover.tsx'
import { Textarea } from './ui/textarea.tsx'
import { UserAvatar } from './user-avatar.tsx'

/** A mention in a message: @Name, highlighted when it is you. */
export function Mention({ name, self, onPrimary }: { name: string; self?: boolean; onPrimary?: boolean }) {
  return (
    <span
      className={cn(
        'rounded px-0.5 font-medium',
        self
          ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100'
          : onPrimary
            ? 'bg-primary-foreground/20'
            : 'bg-primary/10 text-primary',
      )}
    >
      @{name}
    </span>
  )
}

/** Plain text with mentions, as comments show it. */
export function MentionText({ content, names, selfId }: { content: string; names: ReadonlyMap<string, string>; selfId?: string }) {
  return (
    <>
      {splitMentions(content).map((part, i) =>
        'text' in part ? (
          part.text
        ) : (
          <Mention key={i} name={names.get(part.userId) ?? t('Someone')} self={part.userId === selfId} />
        ),
      )}
    </>
  )
}

/** One line of text for previews: mentions as @Name. */
export function mentionPreview(content: string, names: ReadonlyMap<string, string>): string {
  return splitMentions(content)
    .map(part => ('text' in part ? part.text : `@${names.get(part.userId) ?? t('Someone')}`))
    .join('')
}

type Props = Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (value: string) => void
  /** Who can be mentioned (the project's members, without the writer). */
  people: readonly Mentionable[]
  /** The textarea itself, for callers that size it (useComposerHeight). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

/**
 * A textarea that offers the project's members after an `@`. Picking one
 * inserts `@Name `; the caller turns that into a mention with
 * `textToMentions` when it sends. While the list is open, arrow keys, Enter,
 * Tab and Escape belong to it.
 */
export function MentionTextarea({ value, onValueChange, people, onKeyDown, className, textareaRef, ...rest }: Props) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = textareaRef ?? own
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState<number | null>(null)
  const nextCaret = useRef<number | null>(null)

  const query = mentionQuery(value, caret)
  const matches = query ? matchPeople(people, query.query) : []
  const open = !!query && matches.length > 0 && dismissed !== query.start

  useLayoutEffect(() => {
    if (nextCaret.current === null || !ref.current) return
    ref.current.setSelectionRange(nextCaret.current, nextCaret.current)
    setCaret(nextCaret.current)
    nextCaret.current = null
  }, [value])

  const pick = (person: Mentionable) => {
    if (!query) return
    rememberPick(person)
    const insert = `@${person.name} `
    const end = query.start + 1 + query.query.length
    nextCaret.current = query.start + insert.length
    onValueChange(value.slice(0, query.start) + insert + value.slice(end))
    setActive(0)
  }

  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && !e.nativeEvent.isComposing) {
      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      if (step) {
        e.preventDefault()
        setActive(i => (i + step + matches.length) % matches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pick(matches[Math.min(active, matches.length - 1)]!)
        return
      }
      if (e.key === 'Escape') {
        // Close the list, not whatever the Escape would close otherwise (an edit, a draft comment).
        e.preventDefault()
        e.stopPropagation()
        setDismissed(query!.start)
        return
      }
    }
    onKeyDown?.(e)
  }

  const track = () => setCaret(ref.current?.selectionStart ?? 0)

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <Textarea
          {...rest}
          ref={ref}
          value={value}
          className={className}
          onChange={e => {
            onValueChange(e.target.value)
            setCaret(e.target.selectionStart)
            setActive(0)
          }}
          onKeyDown={keyDown}
          onKeyUp={track}
          onClick={track}
          onSelect={track}
          onBlur={e => {
            setDismissed(query?.start ?? null)
            rest.onBlur?.(e)
          }}
          onFocus={e => {
            setDismissed(null)
            rest.onFocus?.(e)
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-1"
        onOpenAutoFocus={e => e.preventDefault()}
        onCloseAutoFocus={e => e.preventDefault()}
      >
        <p className="px-2 py-1 text-[13px] text-muted-foreground">{t('Mention someone')}</p>
        {matches.map((p, i) => (
          <button
            key={p.userId}
            type="button"
            // Keep the focus (and the caret) in the textarea.
            onMouseDown={e => e.preventDefault()}
            onClick={() => pick(p)}
            onMouseEnter={() => setActive(i)}
            className={cn('flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm', i === active && 'bg-accent text-accent-foreground')}
          >
            <UserAvatar id={p.userId} name={p.name} className="size-6 text-[11px]" />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.email && <span className="max-w-24 truncate text-[13px] text-muted-foreground">{p.email}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Search, Users } from 'lucide-react'
import type { UserMatch } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { plural } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group.tsx'
import { UserAvatar } from './user-avatar.tsx'

export type PickedGroup = { id: string; name: string; members: number }
export type Picked = { kind: 'user'; user: UserMatch } | { kind: 'group'; group: PickedGroup }

/**
 * Find someone with an account here by part of their name or email, or one
 * of the given groups by name (the share dialog offers the person's groups).
 */
export function PersonPicker({
  value,
  onChange,
  onPick,
  exclude,
  groups = [],
  placeholder,
  required = true,
}: {
  value: string
  onChange: (text: string) => void
  onPick: (picked: Picked) => void
  /** User and group ids not to offer. */
  exclude: Set<string>
  groups?: PickedGroup[]
  placeholder: string
  required?: boolean
}) {
  const [people, setPeople] = useState<UserMatch[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const picked = useRef(false)

  useEffect(() => {
    const q = value.trim()
    // Picking fills in the text; that shouldn't search again.
    if (!q || picked.current) {
      picked.current = false
      setPeople([])
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      api.searchUsers(q).then(
        found => {
          if (!live) return
          setPeople(found.filter(u => !exclude.has(u.id)))
          setActive(0)
        },
        () => live && setPeople([]),
      )
    }, 200)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [value, exclude])

  const q = value.trim().toLowerCase()
  const groupMatches = q && !picked.current ? groups.filter(g => !exclude.has(g.id) && g.name.toLowerCase().includes(q)) : []
  const matches: Picked[] = [...groupMatches.map(group => ({ kind: 'group' as const, group })), ...people.map(user => ({ kind: 'user' as const, user }))]

  const pick = (p: Picked) => {
    picked.current = true
    onPick(p)
    setOpen(false)
  }

  const shown = open && matches.length > 0
  return (
    <div className="relative min-w-0 flex-1">
      <InputGroup>
        <InputGroupInput
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={shown}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={e => {
            if (!shown) return
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setActive(i => (i + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(matches[Math.min(active, matches.length - 1)]!)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
            }
          }}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      {shown && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 grid max-h-64 gap-0.5 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {matches.map((m, i) => (
            <li
              key={m.kind === 'user' ? m.user.id : m.group.id}
              role="option"
              aria-selected={i === active}
              // Keep the focus in the input; pick before it blurs.
              onMouseDown={e => {
                e.preventDefault()
                pick(m)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5', i === active && 'bg-accent text-accent-foreground')}
            >
              {m.kind === 'user' ? (
                <>
                  <UserAvatar id={m.user.id} name={m.user.name} className="size-6 text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.user.email}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.group.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{plural(m.group.members, '{n} member', '{n} members')}</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

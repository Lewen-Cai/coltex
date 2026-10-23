import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Ellipsis, Plus, Search, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectMember, ProjectRole, ShareRole, UserMatch } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { inSentence, t, tk } from '../lib/i18n.ts'
import { cn } from '../lib/utils.ts'
import { confirmDialog } from './confirm.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx'
import { UserAvatar } from './user-avatar.tsx'

// Translated at render with t().
const ROLE_TEXT: Record<ProjectRole, string> = { owner: tk('Owner'), editor: tk('Can edit'), reviewer: tk('Can review'), viewer: tk('Can view') }
const ROLE_HELP: Record<ShareRole, string> = {
  editor: tk('Edit files and settings, accept or reject suggestions.'),
  reviewer: tk('Comment, and suggest edits that are always tracked.'),
  viewer: tk('Read, compile and comment.'),
}

function RoleSelect({ value, onChange, size = 'default' }: { value: ShareRole; onChange: (r: ShareRole) => void; size?: 'sm' | 'default' }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as ShareRole)}>
      <SelectTrigger size={size} className="w-32 shrink-0" aria-label={t('Permission')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(['editor', 'reviewer', 'viewer'] as const).map(r => (
          <SelectItem key={r} value={r}>
            {t(ROLE_TEXT[r])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Small labelled select used by the link form. */
/**
 * Who to add: type part of a name or email and pick one of the accounts on
 * this server (sharing is only with people who have an account).
 */
function PersonPicker({ value, onChange, exclude }: { value: string; onChange: (email: string) => void; exclude: Set<string> }) {
  const [matches, setMatches] = useState<UserMatch[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const picked = useRef(false)

  useEffect(() => {
    const q = value.trim()
    // Picking fills in the email; that shouldn't search again.
    if (!q || picked.current) {
      picked.current = false
      setMatches([])
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      api.searchUsers(q).then(
        found => {
          if (!live) return
          setMatches(found.filter(u => !exclude.has(u.id)))
          setActive(0)
        },
        () => live && setMatches([]),
      )
    }, 200)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [value, exclude])

  const pick = (u: UserMatch) => {
    picked.current = true
    onChange(u.email)
    setOpen(false)
  }

  const shown = open && matches.length > 0
  return (
    <div className="relative min-w-0 flex-1">
      <InputGroup>
        <InputGroupInput
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={shown}
          aria-autocomplete="list"
          placeholder={t('Name or email of someone with an account')}
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
              pick(matches[active]!)
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
          {matches.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === active}
              // Keep the focus in the input; pick before it blurs.
              onMouseDown={e => {
                e.preventDefault()
                pick(u)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5', i === active && 'bg-accent text-accent-foreground')}
            >
              <UserAvatar id={u.id} name={u.name} className="size-6 text-[11px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{u.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ShareDialog({
  projectId,
  projectName,
  userId,
  canManage,
  open,
  onOpenChange,
  onChanged,
}: {
  projectId: string
  projectName?: string
  userId: string
  canManage: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Membership or ownership changed (the caller may need to reload its role). */
  onChanged?: () => void
}) {
  const [members, setMembers] = useState<ProjectMember[]>()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('editor')
  const memberIds = useMemo(() => new Set(members?.map(m => m.userId)), [members])

  const load = useCallback(async () => {
    setMembers(await api.listMembers(projectId))
  }, [projectId])
  useEffect(() => {
    if (open) load().catch(e => toast.error((e as Error).message))
  }, [load, open])

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    try {
      await fn()
      if (success) toast.success(success)
      await load()
      return true
    } catch (err) {
      toast.error((err as Error).message)
      return false
    }
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (await run(() => api.addMember(projectId, address, role), t('Added {email}', { email: address }))) setEmail('')
  }

  const makeOwner = async (m: ProjectMember) => {
    const ok = await confirmDialog({
      title: t('Make {name} the owner?', { name: m.name }),
      description: t('They can then share, rename and delete the project. You stay on as an editor.'),
      confirmLabel: t('Transfer ownership'),
    })
    if (ok && (await run(() => api.transferOwnership(projectId, m.userId), t('{name} now owns the project', { name: m.name })))) onChanged?.()
  }

  const remove = async (m: ProjectMember) => {
    const ok = await confirmDialog({
      title: t('Remove {name}?', { name: m.name }),
      description: t('They lose access to this project right away.'),
      confirmLabel: t('Remove'),
      destructive: true,
    })
    if (ok) await run(() => api.removeMember(projectId, m.userId), t('Removed {name}', { name: m.name }))
  }

  const memberList = (
    <div className="grid gap-1">
      <AnimatePresence initial={false}>
        {members?.map(m => (
          <motion.div
            key={m.userId}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="flex items-center gap-3 rounded-lg px-1 py-1.5"
          >
            <UserAvatar id={m.userId} name={m.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {m.name}
                {m.userId === userId && <span className="font-normal text-muted-foreground"> {t('(you)')}</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            {m.role === 'owner' || !canManage ? (
              <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{t(ROLE_TEXT[m.role])}</Badge>
            ) : (
              <>
                <RoleSelect
                  size="sm"
                  value={m.role as ShareRole}
                  onChange={r => void run(() => api.setMemberRole(projectId, m.userId, r), t('{name}: {role}', { name: m.name, role: inSentence(t(ROLE_TEXT[r])) }))}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Actions for {name}', { name: m.name })}>
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => void makeOwner(m)}>
                      <Crown /> {t('Make owner')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => void remove(m)}>
                      <UserMinus /> {t('Remove')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> {projectName ? t('Share “{name}”', { name: projectName }) : t('Share project')}
          </DialogTitle>
          {!canManage && <DialogDescription>{t('Only the owner can invite people or change access.')}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-3">
          {canManage && (
            <form onSubmit={add} className="flex gap-2">
              <PersonPicker value={email} onChange={setEmail} exclude={memberIds} />
              <RoleSelect value={role} onChange={setRole} />
              <Button type="submit" size="icon" aria-label={t('Add')}>
                <Plus />
              </Button>
            </form>
          )}
          {memberList}
        </div>
      </DialogContent>
    </Dialog>
  )
}

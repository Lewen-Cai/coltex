import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Ellipsis, Plus, UserMinus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectGroupShare, ProjectMember, ProjectRole, ShareRole } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { inSentence, plural, t, tk } from '../lib/i18n.ts'
import { confirmDialog } from './confirm.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx'
import { PersonPicker, type PickedGroup } from './person-picker.tsx'
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
  const [shares, setShares] = useState<ProjectGroupShare[]>([])
  const [myGroups, setMyGroups] = useState<PickedGroup[]>([])
  const [text, setText] = useState('')
  const [group, setGroup] = useState<PickedGroup>()
  const [role, setRole] = useState<ShareRole>('editor')
  const exclude = useMemo(() => new Set([...(members ?? []).map(m => m.userId), ...shares.map(s => s.groupId)]), [members, shares])

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([api.listMembers(projectId), api.projectGroups(projectId)])
    setMembers(m)
    setShares(s)
  }, [projectId])
  useEffect(() => {
    // The groups the owner can share with: those they have joined.
    if (open && canManage)
      api.myGroups().then(
        gs => setMyGroups(gs.filter(g => g.status === 'joined').map(g => ({ id: g.id, name: g.name, members: g.members.filter(m => m.status === 'joined').length }))),
        () => setMyGroups([]),
      )
  }, [open, canManage])
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
    if (group && text === group.name) {
      const g = group
      if (await run(() => api.shareWithGroup(projectId, g.id, role), t('Shared with {group}', { group: g.name }))) {
        setText('')
        setGroup(undefined)
      }
      return
    }
    const address = text.trim()
    if (await run(() => api.addMember(projectId, address, role), t('Added {email}', { email: address }))) setText('')
  }

  const unshare = async (s: ProjectGroupShare) => {
    const ok = await confirmDialog({
      title: t('Stop sharing with {group}?', { group: s.name }),
      description: t('Its members lose access to this project right away, unless they were added on their own.'),
      confirmLabel: t('Stop sharing'),
      destructive: true,
    })
    if (ok) await run(() => api.unshareGroup(projectId, s.groupId), t('No longer shared with {group}', { group: s.name }))
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

  const groupList = shares.length > 0 && (
    <div className="grid gap-1">
      {shares.map(s => (
        <div key={s.groupId} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{s.name}</div>
            <div className="truncate text-xs text-muted-foreground">{plural(s.members, '{n} member', '{n} members')}</div>
          </div>
          {canManage ? (
            <>
              <RoleSelect
                size="sm"
                value={s.role}
                onChange={r => void run(() => api.shareWithGroup(projectId, s.groupId, r), t('{name}: {role}', { name: s.name, role: inSentence(t(ROLE_TEXT[r])) }))}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('Actions for {name}', { name: s.name })}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => void unshare(s)}>
                    <UserMinus /> {t('Stop sharing')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Badge variant="secondary">{t(ROLE_TEXT[s.role])}</Badge>
          )}
        </div>
      ))}
    </div>
  )

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
              <div className="truncate text-xs text-muted-foreground">
                {m.viaGroup ? t('{email} · through {group}', { email: m.email, group: m.viaGroup.name }) : m.email}
              </div>
            </div>
            {m.role === 'owner' || !canManage || m.viaGroup ? (
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
              <PersonPicker
                value={text}
                onChange={v => {
                  setText(v)
                  if (group && v !== group.name) setGroup(undefined)
                }}
                onPick={p => {
                  if (p.kind === 'group') {
                    setGroup(p.group)
                    setText(p.group.name)
                  } else {
                    setGroup(undefined)
                    setText(p.user.email)
                  }
                }}
                exclude={exclude}
                groups={myGroups}
                placeholder={myGroups.length ? t('Name or email of someone with an account, or a group') : t('Name or email of someone with an account')}
              />
              <RoleSelect value={role} onChange={setRole} />
              <Button type="submit" size="icon" aria-label={t('Add')}>
                <Plus />
              </Button>
            </form>
          )}
          {groupList}
          {memberList}
        </div>
      </DialogContent>
    </Dialog>
  )
}

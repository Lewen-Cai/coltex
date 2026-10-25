import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Check, Crown, Ellipsis, LogOut, Pencil, Plus, Trash2, UserMinus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Group, GroupMember } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { PersonPicker } from '@/components/person-picker'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import type { SessionUser } from '@/lib/auth'
import { plural, t } from '@/lib/i18n'

/** A group's name, for a new group or a new name. */
function NameDialog({ open, title, initial, onOpenChange, onSave }: { open: boolean; title: string; initial: string; onOpenChange: (o: boolean) => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setName(initial)
  }, [open, initial])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave(name.trim())
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <form onSubmit={e => void submit(e)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-5">
            <Field>
              <FieldLabel htmlFor="group-name">{t('Name of the group')}</FieldLabel>
              <Input id="group-name" autoFocus maxLength={80} value={name} onChange={e => setName(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <Spinner />} {t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GroupCard({ group, me, index, reload }: { group: Group; me: string; index: number; reload: () => Promise<void> }) {
  const owner = group.role === 'owner'
  const [text, setText] = useState('')
  const [renaming, setRenaming] = useState(false)
  const exclude = useMemo(() => new Set(group.members.map(m => m.userId)), [group.members])
  const joined = group.members.filter(m => m.status === 'joined').length

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn()
      if (done) toast.success(done)
      await reload()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const leave = async () => {
    const ok = await confirmDialog({
      title: t('Leave {group}?', { group: group.name }),
      description: t('You lose the projects shared with this group, unless you were added to them on your own.'),
      confirmLabel: t('Leave'),
      destructive: true,
    })
    if (ok) await run(() => api.removeFromGroup(group.id, me), t('You left {group}', { group: group.name }))
  }

  const remove = async () => {
    const ok = await confirmDialog({
      title: t('Delete {group}?', { group: group.name }),
      description: t('Its members lose the projects shared with it, unless they were added to them on their own.'),
      confirmLabel: t('Delete'),
      destructive: true,
    })
    if (ok) await run(() => api.deleteGroup(group.id), t('Deleted {group}', { group: group.name }))
  }

  const removeMember = async (m: GroupMember) => {
    if (m.status === 'invited') return run(() => api.removeFromGroup(group.id, m.userId), t('Invitation withdrawn'))
    const ok = await confirmDialog({
      title: t('Remove {name}?', { name: m.name }),
      description: t('They lose the projects shared with this group, unless they were added to them on their own.'),
      confirmLabel: t('Remove'),
      destructive: true,
    })
    if (ok) await run(() => api.removeFromGroup(group.id, m.userId), t('Removed {name}', { name: m.name }))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card>
        <CardHeader className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{group.name}</CardTitle>
            <div className="text-xs text-muted-foreground">{plural(joined, '{n} member', '{n} members')}</div>
          </div>
          <CardAction className="ml-auto self-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('Actions for {name}', { name: group.name })}>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {owner && (
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <Pencil /> {t('Rename')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void leave()}>
                  <LogOut /> {t('Leave group')}
                </DropdownMenuItem>
                {owner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => void remove()}>
                      <Trash2 /> {t('Delete group')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {owner && (
            <PersonPicker
              value={text}
              onChange={setText}
              required={false}
              exclude={exclude}
              placeholder={t('Invite someone by name or email')}
              onPick={p => {
                if (p.kind !== 'user') return
                setText('')
                void run(() => api.inviteToGroup(group.id, p.user.id), t('Invited {name}', { name: p.user.name }))
              }}
            />
          )}
          <div className="grid gap-1">
            {group.members.map(m => (
              <div key={m.userId} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <UserAvatar id={m.userId} name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {m.name}
                    {m.userId === me && <span className="font-normal text-muted-foreground"> {t('(you)')}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                {m.status === 'invited' ? <Badge variant="outline">{t('Invited')}</Badge> : m.role === 'owner' && <Badge>{t('Owner')}</Badge>}
                {owner && m.userId !== me && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Actions for {name}', { name: m.name })}>
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.status === 'joined' && (
                        <DropdownMenuItem onSelect={() => void run(() => api.setGroupRole(group.id, m.userId, m.role === 'owner' ? 'member' : 'owner'))}>
                          <Crown /> {m.role === 'owner' ? t('Make member') : t('Make owner')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem variant="destructive" onSelect={() => void removeMember(m)}>
                        <UserMinus /> {m.status === 'invited' ? t('Withdraw invitation') : t('Remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title={t('Rename group')}
        initial={group.name}
        onSave={async name => {
          await api.renameGroup(group.id, name)
          await reload()
        }}
      />
    </motion.div>
  )
}

/** Settings → Groups: the groups someone is in, invitations to answer, and new groups. */
export function GroupsSettingsPage({ user }: { user: SessionUser }) {
  const [groups, setGroups] = useState<Group[]>()
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setGroups(await api.myGroups())
  }, [])
  useEffect(() => {
    reload().catch(err => toast.error((err as Error).message))
  }, [reload])

  const answer = async (g: Group, accept: boolean) => {
    try {
      if (accept) await api.acceptGroup(g.id)
      else await api.removeFromGroup(g.id, user.id)
      toast.success(accept ? t('You joined {group}', { group: g.name }) : t('Invitation declined'))
      await reload()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const invitations = groups?.filter(g => g.status === 'invited') ?? []
  const joined = groups?.filter(g => g.status === 'joined') ?? []

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> {t('Create group')}
          </Button>
        }
      />
      {invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('Invitations')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {invitations.map(g => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
                <Users className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{g.name}</div>
                  {g.invitedBy && <div className="truncate text-xs text-muted-foreground">{t('Invited by {name}', { name: g.invitedBy.name })}</div>}
                </div>
                <Button size="sm" variant="outline" onClick={() => void answer(g, false)}>
                  <X /> {t('Decline')}
                </Button>
                <Button size="sm" onClick={() => void answer(g, true)}>
                  <Check /> {t('Join')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {!groups ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : joined.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t('No groups yet')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {joined.map((g, i) => (
            <GroupCard key={g.id} group={g} me={user.id} index={i} reload={reload} />
          ))}
        </div>
      )}
      <NameDialog
        open={creating}
        onOpenChange={setCreating}
        title={t('Create group')}
        initial=""
        onSave={async name => {
          await api.createGroup(name)
          await reload()
        }}
      />
    </>
  )
}

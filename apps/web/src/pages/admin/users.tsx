import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, KeyRound, MoreHorizontal, Search, ShieldCheck, Trash2, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { passwordProblem, type InviteRole, type ManagedUser } from '@coltex/shared'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { confirmDialog } from '@/components/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import type { SessionUser } from '@/lib/auth'
import { timeAgo } from '@/lib/format'
import { plural, t, tk } from '@/lib/i18n'
import { ROLE_NAME } from '@/lib/roles'
import { COLUMN } from '@/lib/table'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'manager' | 'suspended'

/**
 * Manage users: the system administrator sees everyone, changes roles and
 * moves members between teams; an admin sees themselves and their team, and
 * resets passwords, suspends and removes only those members.
 */
export function AdminUsersPage({ user: me }: { user: SessionUser }) {
  const system = me.role === 'admin'
  const [users, setUsers] = useState<ManagedUser[]>()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [resetting, setResetting] = useState<ManagedUser>()

  const load = useCallback(() => api.managedUsers().then(setUsers, e => toast.error((e as Error).message)), [])
  useEffect(() => {
    void load()
  }, [load])

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn()
      toast.success(success)
    } catch (e) {
      toast.error((e as Error).message)
    }
    await load()
  }

  const byId = useMemo(() => new Map((users ?? []).map(u => [u.id, u])), [users])
  const managers = useMemo(() => (users ?? []).filter(u => u.role === 'manager'), [users])
  const teamSize = useMemo(() => {
    const sizes = new Map<string, number>()
    for (const u of users ?? []) if (u.managerId) sizes.set(u.managerId, (sizes.get(u.managerId) ?? 0) + 1)
    return sizes
  }, [users])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? []).filter(
      u =>
        (filter === 'all' || (filter === 'manager' ? u.role === 'manager' : u.banned)) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [users, query, filter])

  const remove = async (u: ManagedUser) => {
    const ok = await confirmDialog({
      title: t('Delete {name}?', { name: u.name }),
      description: t('{email} loses access, and projects they own are deleted with their files and history. This cannot be undone.', { email: u.email }),
      confirmLabel: t('Delete user'),
      destructive: true,
    })
    if (ok) await act(() => api.deleteUser(u.id), t('Deleted {email}', { email: u.email }))
  }

  const team = (u: ManagedUser) => {
    if (u.role === 'manager') {
      const n = teamSize.get(u.id) ?? 0
      return n ? plural(n, '{n} member', '{n} members') : t('No members yet')
    }
    return u.managerId ? (byId.get(u.managerId)?.name ?? '—') : '—'
  }
  const columns = system ? 7 : 6

  return (
    <>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <InputGroup className="w-full max-w-xs bg-card">
          <InputGroupInput placeholder={t('Search name or email')} value={query} onChange={e => setQuery(e.target.value)} />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">
              {t('All')}
              {users ? ` (${users.length})` : ''}
            </TabsTrigger>
            {system && <TabsTrigger value="manager">{t('Admins')}</TabsTrigger>}
            <TabsTrigger value="suspended">{t('Suspended')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Columns follow the card's width (container queries), not the window's; on wide cards they sit
          next to the name and the spare width goes to the end. */}
      <Card className="@container gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn('pl-4', COLUMN.first)}>{t('User')}</TableHead>
              <TableHead className={COLUMN.gap}>{t('Role')}</TableHead>
              {system && <TableHead className={cn(COLUMN.gap, COLUMN.person, '@max-3xl:hidden')}>{t('Team')}</TableHead>}
              <TableHead className={cn(COLUMN.gap, '@max-md:hidden')}>{t('Status')}</TableHead>
              <TableHead className={cn(COLUMN.gap, '@max-2xl:hidden')}>{t('Joined')}</TableHead>
              <TableHead className="w-full @max-xl:hidden" />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users &&
              Array.from({ length: 3 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            <AnimatePresence initial={false}>
              {shown.map((u, i) => {
                const self = u.id === me.id
                // Your own account is changed in Settings → Account; the system administrator's only there.
                const manageable = !self && u.role !== 'admin'
                return (
                  <motion.tr
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell className={cn('w-full max-w-0 pl-4', COLUMN.first)}>
                      <div className="flex items-center gap-3">
                        <UserAvatar id={u.id} name={u.name} className="shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {u.name}
                            {self && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t('(you)')}</span>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                          {u.banned && (
                            <Badge variant="destructive" className="mt-1 @md:hidden">
                              {t('Suspended')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={COLUMN.gap}>
                      {u.role === 'admin' ? (
                        <Badge className="gap-1">
                          <ShieldCheck /> {t('System admin')}
                        </Badge>
                      ) : (
                        <Badge variant={u.role === 'manager' ? 'outline' : 'secondary'}>{t(ROLE_NAME[u.role] ?? 'Member')}</Badge>
                      )}
                    </TableCell>
                    {system && <TableCell className={cn(COLUMN.gap, COLUMN.person, 'text-sm whitespace-nowrap text-muted-foreground @max-3xl:hidden')}>{team(u)}</TableCell>}
                    <TableCell className={cn(COLUMN.gap, '@max-md:hidden')}>
                      {u.banned ? (
                        <Badge variant="destructive">{t('Suspended')}</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> {t('Active')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn(COLUMN.gap, 'text-sm whitespace-nowrap text-muted-foreground @max-2xl:hidden')}>{timeAgo(u.createdAt)}</TableCell>
                    <TableCell className="@max-xl:hidden" />
                    <TableCell>
                      {manageable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t('Actions for {email}', { email: u.email })}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{u.email}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setResetting(u)}>
                              <KeyRound /> {t('Reset password')}
                            </DropdownMenuItem>
                            {system &&
                              ROLE_CHOICES.filter(c => c.role !== u.role).map(c => (
                                <DropdownMenuItem key={c.role} onSelect={() => void act(() => api.setUserRole(u.id, c.role), t(c.done, { name: u.name }))}>
                                  {c.role === 'manager' ? <UserPlus /> : <UserMinus />}
                                  {t(c.label)}
                                </DropdownMenuItem>
                              ))}
                            {system && u.role === 'user' && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Users /> {t('Team')}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48">
                                  {[{ id: null, name: t('No team') }, ...managers].map(m => (
                                    <DropdownMenuItem
                                      key={m.id ?? ''}
                                      onSelect={() =>
                                        m.id !== u.managerId &&
                                        void act(() => api.setUserTeam(u.id, m.id), m.id ? t('{name} is in {team}’s team', { name: u.name, team: m.name }) : t('{name} is in no team', { name: u.name }))
                                      }
                                    >
                                      <Check className={m.id === u.managerId ? '' : 'invisible'} />
                                      <span className="truncate">{m.name}</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            <DropdownMenuItem
                              onSelect={() =>
                                void act(
                                  () => api.suspendUser(u.id, !u.banned),
                                  u.banned ? t('Reactivated {name}', { name: u.name }) : t('Suspended {name}', { name: u.name }),
                                )
                              }
                            >
                              {u.banned ? <UserCheck /> : <Ban />}
                              {u.banned ? t('Reactivate') : t('Suspend')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => void remove(u)}>
                              <Trash2 /> {t('Delete user')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
            {users && shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-sm text-muted-foreground">
                  {t('No users match.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(undefined)}
        onSubmit={async password => {
          const u = resetting!
          setResetting(undefined)
          await act(() => api.setUserPassword(u.id, password), t('Password changed for {email}', { email: u.email }))
        }}
      />
    </>
  )
}

/** Changing someone's role (the current one is left out of the menu). There is one system administrator. */
const ROLE_CHOICES: { role: InviteRole; label: string; done: string }[] = [
  { role: 'user', label: tk('Make member'), done: tk('{name} is now a member') },
  { role: 'manager', label: tk('Make admin'), done: tk('{name} is now an admin') },
]

function ResetPasswordDialog({ user, onClose, onSubmit }: { user?: ManagedUser; onClose: () => void; onSubmit: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  useEffect(() => setPassword(''), [user])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!passwordProblem(password)) void onSubmit(password)
  }
  return (
    <Dialog open={!!user} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t('Reset password')}</DialogTitle>
            <DialogDescription>{t('Set a new password for {email}. Tell them through a channel you trust.', { email: user?.email ?? '' })}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="new-password">{t('New password')}</FieldLabel>
            <Input id="new-password" type="password" autoComplete="new-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
            <PasswordStrength password={password} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!!passwordProblem(password)}>
              {t('Set password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

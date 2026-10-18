import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link2, MailPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AiGroup, Invite, InviteRole } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { LinkList } from '@/components/link-list'
import { timeAgo } from '@/lib/format'
import type { SessionUser } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { ROLE_NAME } from '@/lib/roles'

const NO_GROUP = '__none__'

function status(i: Invite): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (i.usedAt) return { label: t('Accepted'), variant: 'secondary' }
  if (new Date(i.expiresAt) < new Date()) return { label: t('Expired'), variant: 'outline' }
  return { label: t('Pending'), variant: 'default' }
}

export function AdminInvitesPage({ user }: { user: SessionUser }) {
  // Admins invite members into their own team; admins and AI access are the system administrator's to give.
  const isAdmin = user.role === 'admin'
  const [groups, setGroups] = useState<AiGroup[]>([])
  const [aiGroup, setAiGroup] = useState(NO_GROUP)
  useEffect(() => {
    if (isAdmin) api.aiGroups().then(setGroups, () => setGroups([]))
  }, [isAdmin])
  const [invites, setInvites] = useState<Invite[]>()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('user')
  const [days, setDays] = useState('7')
  const [busy, setBusy] = useState(false)
  /** The invitation whose links are open (the one just created opens by itself). */
  const [linksFor, setLinksFor] = useState<string>()

  const load = useCallback(
    () =>
      api.listInvites().then(
        list => {
          setInvites(list)
          return list
        },
        e => {
          toast.error((e as Error).message)
          return undefined
        },
      ),
    [],
  )
  useEffect(() => void load(), [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { token } = await api.createInvite({
        email: email.trim() || undefined,
        role: isAdmin ? role : 'user',
        expiresInDays: Number(days),
        aiGroupId: isAdmin && aiGroup !== NO_GROUP ? aiGroup : null,
      })
      setEmail('')
      const list = await load()
      setLinksFor(list?.find(i => i.token === token)?.id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (i: Invite) => {
    const ok = await confirmDialog({
      title: t('Revoke this invitation?'),
      description: t('The link stops working immediately.'),
      confirmLabel: t('Revoke'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.revokeInvite(i.id)
      toast.success(t('Invitation revoked'))
    } catch (e) {
      toast.error((e as Error).message)
    }
    await load()
  }

  return (
    <>
      <PageHeader
        title={t('Invitations')}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="grid h-fit gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MailPlus className="size-4 text-primary" /> {t('New invitation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="invite-email">{t('Email (optional)')}</FieldLabel>
                  <Input id="invite-email" type="email" placeholder="name@university.edu" value={email} onChange={e => setEmail(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  {isAdmin && (
                    <Field>
                      <FieldLabel>{t('Role')}</FieldLabel>
                      <Select value={role} onValueChange={v => setRole(v as InviteRole)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">{t('Member')}</SelectItem>
                          <SelectItem value="manager">{t('Admin')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>{t('Expires')}</FieldLabel>
                    <Select value={days} onValueChange={setDays}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('In 1 day')}</SelectItem>
                        <SelectItem value="7">{t('In 7 days')}</SelectItem>
                        <SelectItem value="30">{t('In 30 days')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {isAdmin && (
                  <Field>
                    <FieldLabel>{t('AI group')}</FieldLabel>
                    <Select value={aiGroup} onValueChange={setAiGroup}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_GROUP}>{t('None (no AI agent)')}</SelectItem>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? <Spinner /> : <Link2 />} {t('Create link')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Columns follow the card's width (container queries), not the window's. */}
        <Card className="@container gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">{t('For')}</TableHead>
                <TableHead className="@max-md:hidden">{t('Role')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="@max-2xl:hidden">{t('Created')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t('No invitations yet.')}
                  </TableCell>
                </TableRow>
              )}
              {invites?.map(i => {
                const s = status(i)
                return (
                  <TableRow key={i.id}>
                    <TableCell className="w-full max-w-0 pl-4">
                      <div className="truncate font-medium">{i.email ?? t('Anyone with the link')}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        <span className="@md:hidden">{t(ROLE_NAME[i.role] ?? 'Member')} · </span>
                        {i.usedAt ? t('Used by {email}', { email: i.usedByEmail ?? t('a deleted user') }) : t('Expires {when}', { when: timeAgo(i.expiresAt) })}
                      </div>
                    </TableCell>
                    <TableCell className="@max-md:hidden">{t(ROLE_NAME[i.role] ?? 'Member')}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground @max-2xl:hidden">{timeAgo(i.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        {i.token && (
                          <Popover open={linksFor === i.id} onOpenChange={open => setLinksFor(open ? i.id : undefined)}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={t('Invitation link')}>
                                <Link2 /> <span className="@max-md:hidden">{t('Link')}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="grid w-[30rem] max-w-[calc(100vw-2rem)] gap-2">
                              <p className="text-sm font-medium">{t('Invitation link')}</p>
                              <LinkList format={base => `${base}/#/invite/${i.token}`} copiedMessage={t('Invitation link copied')} />
                            </PopoverContent>
                          </Popover>
                        )}
                        {!i.usedAt && (
                          <Button variant="ghost" size="icon-sm" onClick={() => void revoke(i)} aria-label={t('Revoke')}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  )
}

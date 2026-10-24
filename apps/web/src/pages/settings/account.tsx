import { useEffect, useState, type FormEvent } from 'react'
import { Check, KeyRound, Mail, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { passwordProblem } from '@coltex/shared'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { UserAvatar } from '@/components/user-avatar'
import { api } from '@/lib/api'
import { authClient, type SessionUser } from '@/lib/auth'
import { defaultHue, hueColor, showOwnAvatarHue } from '@/lib/avatar-colors'
import { authErrorText } from '@/lib/auth-errors'
import { t } from '@/lib/i18n'
import { ROLE_NAME } from '@/lib/roles'
import { cn } from '@/lib/utils'

/** The hues offered for avatars: around the wheel, each dark enough for white initials. */
const AVATAR_HUES = [0, 25, 45, 90, 145, 170, 190, 215, 240, 265, 290, 325]

/** The person's avatar (and cursor) colour: the one made from their id, or one they pick; saved at once. */
function AvatarColorPicker({ user }: { user: SessionUser }) {
  // undefined while loading; null: the one made from their id.
  const [hue, setHue] = useState<number | null>()

  useEffect(() => {
    api.preferences().then(p => setHue(p.avatarHue), () => setHue(null))
  }, [])

  const choose = (next: number | null) => {
    const before = hue ?? null
    setHue(next)
    showOwnAvatarHue(user.id, next)
    api.setPreferences({ avatarHue: next }).catch((e: Error) => {
      setHue(before)
      showOwnAvatarHue(user.id, before)
      toast.error(e.message)
    })
  }

  const swatch = (value: number | null, label?: string) => {
    const selected = hue === value
    return (
      <button
        key={value ?? 'auto'}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={label ?? `${value}°`}
        disabled={hue === undefined}
        onClick={() => choose(value)}
        className={cn(
          'flex h-8 items-center gap-2 rounded-full border-2 border-transparent transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          selected && 'border-primary',
          label ? 'pr-3 pl-0.5' : 'w-8 justify-center',
        )}
      >
        <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ background: hueColor(value ?? defaultHue(user.id)) }}>
          {selected && <Check className="size-3.5" />}
        </span>
        {label && <span className="text-sm">{label}</span>}
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-labelledby="settings-avatar-colour" className="flex flex-wrap items-center gap-1.5">
      {swatch(null, t('Automatic'))}
      {AVATAR_HUES.map(h => swatch(h))}
    </div>
  )
}

function ProfileCard({ user }: { user: SessionUser }) {
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState(false)
  const changed = name.trim() !== user.name && name.trim() !== ''

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await authClient.updateUser({ name: name.trim() })
    setBusy(false)
    if (error) return void toast.error(error.message ?? 'Could not save your name')
    toast.success(t('Name updated'))
  }

  return (
    <Card>
      <form onSubmit={save} className="contents">
        <CardHeader>
          <CardTitle>{t('Profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex items-center gap-3">
            <UserAvatar id={user.id} name={name || user.name} className="size-12 rounded-xl text-base" />
            <div className="grid text-sm">
              <span className="font-medium">{user.name}</span>
              <span className="text-muted-foreground">{user.email}</span>
            </div>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="ml-auto">
              {user.role === 'admin' && <ShieldCheck />}
              {t(ROLE_NAME[user.role ?? 'user'] ?? 'Member')}
            </Badge>
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-name">{t('Name')}</FieldLabel>
              <InputGroup>
                <InputGroupInput id="settings-name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} />
                <InputGroupAddon>
                  <User />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="settings-email">{t('Email')}</FieldLabel>
              <InputGroup data-disabled>
                <InputGroupInput id="settings-email" value={user.email} readOnly disabled />
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel id="settings-avatar-colour">{t('Avatar colour')}</FieldLabel>
              <AvatarColorPicker user={user} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-auto justify-end border-t">
          <Button type="submit" disabled={!changed || busy}>
            {busy && <Spinner />}
            {t('Save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [revoke, setRevoke] = useState(true)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const problem = passwordProblem(next)
    if (problem) return void toast.error(authErrorText(problem))
    if (next !== confirm) return void toast.error(authErrorText('Passwords do not match'))
    setBusy(true)
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: revoke })
    setBusy(false)
    if (error) {
      const message = error.code === 'INVALID_PASSWORD' ? 'The current password is wrong' : (error.message ?? 'Could not change the password')
      return void toast.error(authErrorText(message))
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    toast.success(revoke ? t('Password changed. Other devices were signed out.') : t('Password changed'))
  }

  return (
    <Card>
      <form onSubmit={save} className="contents">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" /> {t('Password')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-current">{t('Current password')}</FieldLabel>
              <PasswordInput id="settings-current" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-new">{t('New password')}</FieldLabel>
              <PasswordInput id="settings-new" autoComplete="new-password" required value={next} onChange={e => setNext(e.target.value)} />
              <PasswordStrength password={next} />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-confirm">{t('Confirm password')}</FieldLabel>
              <PasswordInput id="settings-confirm" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="settings-revoke" checked={revoke} onCheckedChange={v => setRevoke(v === true)} />
              <Label htmlFor="settings-revoke" className="font-normal">
                {t('Sign out on my other devices')}
              </Label>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-auto justify-end border-t">
          <Button type="submit" disabled={busy || !current || !next}>
            {busy && <Spinner />}
            {t('Change password')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function AccountSettingsPage({ user }: { user: SessionUser }) {
  return (
    <>
      {/* Side by side, one height: the shorter card keeps its button at the bottom. */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <ProfileCard user={user} />
        <PasswordCard />
      </div>
    </>
  )
}

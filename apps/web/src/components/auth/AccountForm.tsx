import { useState, type FormEvent } from 'react'
import { ArrowRight, Mail, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { passwordProblem } from '@coltex/shared'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { authErrorText } from '@/lib/auth-errors'
import { t } from '@/lib/i18n'
import { PasswordInput } from './PasswordInput'
import { PasswordStrength } from './PasswordStrength'

export type AccountInput = { name: string; email: string; password: string }

/** Name/email/password form shared by first-run setup and invite acceptance. */
export function AccountForm({
  submitLabel,
  fixedEmail,
  onSubmit,
}: {
  submitLabel: string
  fixedEmail?: string | null
  onSubmit: (input: AccountInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(fixedEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = passwordProblem(password)
    if (problem) return setError(authErrorText(problem))
    if (password !== confirm) return setError(authErrorText('Passwords do not match'))
    setBusy(true)
    setError(undefined)
    try {
      await onSubmit({ name, email, password })
    } catch (err) {
      setError(authErrorText((err as Error).message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t('Name')}</FieldLabel>
          <InputGroup className="h-10 bg-card">
            <InputGroupInput id="name" autoComplete="name" required placeholder={t('Your full name')} value={name} onChange={e => setName(e.target.value)} />
            <InputGroupAddon>
              <User />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
          <InputGroup className="h-10 bg-card" data-disabled={!!fixedEmail}>
            <InputGroupInput
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={!!fixedEmail}
              onChange={e => setEmail(e.target.value)}
            />
            <InputGroupAddon>
              <Mail />
            </InputGroupAddon>
          </InputGroup>
          {fixedEmail && <FieldDescription>{t('This invitation is for this address.')}</FieldDescription>}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t('Password')}</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">{t('Confirm password')}</FieldLabel>
          <PasswordInput id="confirm" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={busy} className="h-10 w-full shadow-md shadow-primary/25">
          {busy ? <Spinner /> : null} {submitLabel} {!busy && <ArrowRight />}
        </Button>
      </FieldGroup>
    </form>
  )
}

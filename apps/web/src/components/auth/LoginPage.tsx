import { useState, type FormEvent } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth'
import { authErrorText } from '@/lib/auth-errors'
import { t } from '@/lib/i18n'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  return (
    <AuthLayout title={t('Welcome back')} subtitle={t('Sign in to your ColTex workspace.')}>
      <LoginForm onSignedIn={onSignedIn} hint={t('No account? Ask an administrator for an invitation link.')} />
    </AuthLayout>
  )
}

/** Email and password sign-in, shared by the login and join pages. */
export function LoginForm({ onSignedIn, hint, submitLabel }: { onSignedIn: () => void; hint?: string; submitLabel?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    const { error } = await authClient.signIn.email({ email, password })
    setBusy(false)
    if (error) return setError(authErrorText(error.message || 'Sign-in failed'))
    onSignedIn()
  }

  return (
      <form onSubmit={submit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
            <InputGroup className="h-10 bg-card">
              <InputGroupInput id="email" type="email" autoComplete="email" required placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} />
              <InputGroupAddon>
                <Mail />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t('Password')}</FieldLabel>
            <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" size="lg" disabled={busy} className="h-10 w-full shadow-md shadow-primary/25">
            {busy ? <Spinner /> : null} {submitLabel ?? t('Sign in')} {!busy && <ArrowRight />}
          </Button>
          {hint && <p className="text-center text-xs text-muted-foreground">{hint}</p>}
        </FieldGroup>
      </form>
  )
}

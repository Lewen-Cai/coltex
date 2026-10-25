import { useState, type FormEvent } from 'react'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth'
import { authErrorText } from '@/lib/auth-errors'
import { t } from '@/lib/i18n'

/** The second step of a sign-in with two-step verification: a code from the app, or a recovery code. */
export function TwoFactorStep({ onSignedIn, onBack }: { onSignedIn: () => void; onBack: () => void }) {
  const [recovery, setRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [trust, setTrust] = useState(false)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    const value = code.trim()
    const { error } = recovery
      ? await authClient.twoFactor.verifyBackupCode({ code: value, trustDevice: trust })
      : await authClient.twoFactor.verifyTotp({ code: value.replace(/\s/g, ''), trustDevice: trust })
    setBusy(false)
    if (error) {
      const message = error.message || 'Sign-in failed'
      // The sign-in itself ran out (too many tries, or ten minutes): back to the password.
      if (message === 'Invalid two factor cookie' || message.startsWith('Too many attempts')) onBack()
      return setError(authErrorText(message))
    }
    onSignedIn()
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="two-factor-code">{recovery ? t('Recovery code') : t('Code from your authenticator app')}</FieldLabel>
          <InputGroup className="h-10 bg-card">
            <InputGroupInput
              id="two-factor-code"
              key={recovery ? 'recovery' : 'totp'}
              autoFocus
              required
              autoComplete="one-time-code"
              inputMode={recovery ? 'text' : 'numeric'}
              maxLength={recovery ? 32 : 7}
              placeholder={recovery ? 'xxxxx-xxxxx' : '123456'}
              value={code}
              onChange={e => setCode(e.target.value)}
              className="font-mono tracking-widest"
            />
            <InputGroupAddon>{recovery ? <KeyRound /> : <ShieldCheck />}</InputGroupAddon>
          </InputGroup>
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox id="two-factor-trust" checked={trust} onCheckedChange={v => setTrust(v === true)} />
          <Label htmlFor="two-factor-trust" className="font-normal">
            {t('Don’t ask again on this device for 30 days')}
          </Label>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={busy || !code.trim()} className="h-10 w-full shadow-md shadow-primary/25">
          {busy ? <Spinner /> : null} {t('Verify')} {!busy && <ArrowRight />}
        </Button>
        <div className="flex justify-between text-xs">
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onBack}>
            {t('Back')}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setRecovery(r => !r)
              setCode('')
              setError(undefined)
            }}
          >
            {recovery ? t('Use the authenticator app') : t('Use a recovery code')}
          </button>
        </div>
      </FieldGroup>
    </form>
  )
}

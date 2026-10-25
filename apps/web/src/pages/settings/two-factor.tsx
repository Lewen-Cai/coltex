import { useState, type FormEvent } from 'react'
import { Copy, Download, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { QrCode } from '@/components/qr-code'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authClient, type SessionUser } from '@/lib/auth'
import { authErrorText } from '@/lib/auth-errors'
import { copyText } from '@/lib/clipboard'
import { t } from '@/lib/i18n'

type Step =
  | { kind: 'password'; purpose: 'enable' | 'codes' | 'disable' }
  | { kind: 'scan'; uri: string; codes: string[] }
  | { kind: 'codes'; codes: string[] }

/** The key inside an otpauth:// address, in groups of four, for typing into an app by hand. */
function setupKey(uri: string): string {
  return (new URL(uri).searchParams.get('secret') ?? '').replace(/(.{4})/g, '$1 ').trim()
}

/** Recovery codes: shown once, to copy or save as a file. */
function RecoveryCodes({ codes }: { codes: string[] }) {
  const text = codes.join('\n')
  const download = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`${text}\n`], { type: 'text/plain' }))
    link.download = 'coltex-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <div className="grid gap-4">
      <Alert>
        <AlertDescription>{t('Save these codes somewhere safe. Each one signs you in once if you lose your phone; they are not shown again.')}</AlertDescription>
      </Alert>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
        {codes.map(c => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void copyText(text).then(() => toast.success(t('Copied')))}>
          <Copy /> {t('Copy')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download /> {t('Download')}
        </Button>
      </div>
    </div>
  )
}

/** Turning on, renewing the recovery codes and turning off, each after the password. */
function TwoFactorDialog({ step, onStep, onClose }: { step?: Step; onStep: (s: Step) => void; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = (e: FormEvent) => {
    e.preventDefault()
    if (step?.kind !== 'password') return
    void run(async () => {
      if (step.purpose === 'enable') {
        const { data, error } = await authClient.twoFactor.enable({ password })
        if (error || !data || !('totpURI' in data)) return setError(authErrorText(error?.message || 'Could not turn on two-step verification'))
        onStep({ kind: 'scan', uri: data.totpURI!, codes: data.backupCodes ?? [] })
      } else if (step.purpose === 'codes') {
        const { data, error } = await authClient.twoFactor.generateBackupCodes({ password })
        if (error || !data) return setError(authErrorText(error?.message || 'Could not make new recovery codes'))
        onStep({ kind: 'codes', codes: data.backupCodes })
      } else {
        const { error } = await authClient.twoFactor.disable({ password })
        if (error) return setError(authErrorText(error.message || 'Could not turn off two-step verification'))
        toast.success(t('Two-step verification is off'))
        onClose()
      }
      setPassword('')
    })
  }

  const submitCode = (e: FormEvent) => {
    e.preventDefault()
    if (step?.kind !== 'scan') return
    void run(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') })
      if (error) return setError(authErrorText(error.message || 'Invalid code'))
      setCode('')
      onStep({ kind: 'codes', codes: step.codes })
    })
  }

  const title =
    step?.kind === 'password'
      ? step.purpose === 'enable'
        ? t('Turn on two-step verification')
        : step.purpose === 'codes'
          ? t('New recovery codes')
          : t('Turn off two-step verification')
      : step?.kind === 'scan'
        ? t('Scan with your authenticator app')
        : t('Recovery codes')

  return (
    <Dialog
      open={!!step}
      onOpenChange={open => {
        if (open) return
        setPassword('')
        setCode('')
        setError(undefined)
        onClose()
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {step?.kind === 'password' && (
          <form onSubmit={submitPassword} className="grid gap-5">
            <Field>
              <FieldLabel htmlFor="two-factor-password">{t('Password')}</FieldLabel>
              <PasswordInput id="two-factor-password" autoComplete="current-password" autoFocus required value={password} onChange={e => setPassword(e.target.value)} />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant={step.purpose === 'disable' ? 'destructive' : 'default'} disabled={busy || !password}>
                {busy && <Spinner />} {step.purpose === 'disable' ? t('Turn off') : t('Continue')}
              </Button>
            </DialogFooter>
          </form>
        )}
        {step?.kind === 'scan' && (
          <form onSubmit={submitCode} className="grid gap-5">
            <div className="flex flex-col items-center gap-3">
              <QrCode text={step.uri} className="size-48" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{t('Setup key')}</div>
                <code className="font-mono text-sm select-all">{setupKey(step.uri)}</code>
              </div>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="two-factor-confirm">{t('Code from your authenticator app')}</FieldLabel>
                <Input
                  id="two-factor-confirm"
                  autoFocus
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="123456"
                  className="font-mono tracking-widest"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </Field>
            </FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={busy || code.replace(/\s/g, '').length < 6}>
                {busy && <Spinner />} {t('Turn on')}
              </Button>
            </DialogFooter>
          </form>
        )}
        {step?.kind === 'codes' && (
          <div className="grid gap-5">
            <RecoveryCodes codes={step.codes} />
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                {t('Done')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Settings → Account: two-step verification with an authenticator app (each person's own choice). */
export function TwoFactorCard({ user }: { user: SessionUser }) {
  const on = !!(user as SessionUser & { twoFactorEnabled?: boolean | null }).twoFactorEnabled
  const [step, setStep] = useState<Step>()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" /> {t('Two-step verification')}
          <Badge variant={on ? 'default' : 'secondary'} className="ml-auto">
            {on ? t('On') : t('Off')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {on ? t('Signing in asks for a code from your authenticator app after the password.') : t('Signing in asks only for your password.')}
      </CardContent>
      <CardFooter className="mt-auto justify-end gap-2 border-t">
        {on ? (
          <>
            <Button variant="outline" onClick={() => setStep({ kind: 'password', purpose: 'codes' })}>
              {t('New recovery codes')}
            </Button>
            <Button variant="outline" onClick={() => setStep({ kind: 'password', purpose: 'disable' })}>
              {t('Turn off')}
            </Button>
          </>
        ) : (
          <Button onClick={() => setStep({ kind: 'password', purpose: 'enable' })}>{t('Turn on')}</Button>
        )}
      </CardFooter>
      <TwoFactorDialog step={step} onStep={setStep} onClose={() => setStep(undefined)} />
    </Card>
  )
}

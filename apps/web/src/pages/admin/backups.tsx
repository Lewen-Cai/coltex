import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import type { BackupConfig, BackupConfigPatch, BackupRun, BackupSchedule, BackupState } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { PageHeader } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { intlLocale, plural, t, tk } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const KEEP = [3, 7, 14, 30, 60, 90]
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

function weekdayName(day: number): string {
  // 2026-10-18 was a Sunday.
  return new Date(2026, 9, 18 + day).toLocaleDateString(intlLocale(), { weekday: 'long' })
}

function hourLabel(hour: number): string {
  return new Date(2026, 0, 1, hour).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
}

const dateTime = (iso: string) => new Date(iso).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })

/** The form: what the admin typed, compared with the saved config when saving. */
type Form = { url: string; username: string; password: string; encryption: string; schedule: BackupSchedule; hour: number; weekday: number; keep: number }

function formFrom(c: BackupConfig): Form {
  return { url: c.url, username: c.username, password: '', encryption: '', schedule: c.schedule, hour: c.hour, weekday: c.weekday, keep: c.keep }
}

/** Only what changed. Times are re-anchored to this browser's zone when the schedule is edited. */
function patchFrom(f: Form, c: BackupConfig): BackupConfigPatch {
  const patch: BackupConfigPatch = {}
  if (f.url.trim() !== c.url) patch.url = f.url.trim()
  if (f.username !== c.username) patch.username = f.username
  if (f.password) patch.password = f.password
  if (f.encryption) patch.encryptionPassword = f.encryption
  if (f.keep !== c.keep) patch.keep = f.keep
  if (f.schedule !== c.schedule || f.hour !== c.hour || f.weekday !== c.weekday) {
    Object.assign(patch, { schedule: f.schedule, hour: f.hour, weekday: f.weekday, timeZone: browserZone() })
  }
  return patch
}

const TRIGGER = { manual: tk('Manual'), schedule: tk('Scheduled') }

export function AdminBackupsPage() {
  const [state, setState] = useState<BackupState>()
  const [form, setForm] = useState<Form>()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    const s = await api.backup()
    setState(s)
    return s
  }, [])

  useEffect(() => {
    load().then(s => setForm(formFrom(s.config)), e => toast.error((e as Error).message))
  }, [load])

  // Follow a running backup until it ends.
  const running = state?.runs.some(r => r.status === 'running')
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      load()
        .then(s => {
          const latest = s.runs[0]
          if (latest && latest.status === 'success' && !s.runs.some(r => r.status === 'running')) toast.success(t('Backup finished'))
          if (latest && latest.status === 'failed' && !s.runs.some(r => r.status === 'running')) toast.error(latest.error ?? 'Backup failed')
        })
        .catch(() => {})
    }, 2000)
    return () => clearInterval(timer)
  }, [running, load])

  if (!state || !form) {
    return (
      <>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)]">
          <Skeleton className="h-[34rem] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </>
    )
  }

  const config = state.config
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => f && { ...f, [key]: value })
  const patch = patchFrom(form, config)
  const dirty = Object.keys(patch).length > 0

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await api.saveBackup(patch)
      setForm(formFrom(saved))
      await load()
      toast.success(t('Backup settings saved'))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      await api.testBackup(patch)
      toast.success(t('Connected: ColTex can write to this folder'))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  const runNow = async () => {
    setStarting(true)
    try {
      await api.runBackup()
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setStarting(false)
    }
  }

  const turnOffEncryption = async () => {
    const ok = await confirmDialog({
      title: t('Turn off encryption?'),
      description: t('Later backups are stored unencrypted, and without the instance secret. Backups already made stay encrypted.'),
      confirmLabel: t('Turn off'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.saveBackup({ encryptionPassword: null })
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const zoneNote = config.schedule !== 'off' && config.timeZone !== browserZone() && !patch.timeZone

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => void runNow()} disabled={!config.url || running || starting || dirty}>
            {(running || starting) && <Spinner />} {running ? t('Backing up…') : t('Back up now')}
          </Button>
        }
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('WebDAV backup')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={e => void save(e)} className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="dav-url">{t('Folder URL')}</FieldLabel>
                <Input
                  id="dav-url"
                  type="url"
                  placeholder="https://cloud.example.org/remote.php/dav/files/me/ColTex/"
                  value={form.url}
                  onChange={e => set('url', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="dav-user">{t('User name')}</FieldLabel>
                  <Input id="dav-user" autoComplete="off" value={form.username} onChange={e => set('username', e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dav-password">{t('Password')}</FieldLabel>
                  <Input
                    id="dav-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasPassword ? t('Saved') : ''}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="dav-encryption">{t('Encryption password')}</FieldLabel>
                <Input
                  id="dav-encryption"
                  type="password"
                  autoComplete="new-password"
                  placeholder={config.encrypted ? t('Saved; type a new one to change it') : t('Optional, at least 8 characters')}
                  value={form.encryption}
                  onChange={e => set('encryption', e.target.value)}
                />
                <FieldDescription>
                  {t('Encrypted backups (AES-256) also contain the instance secret, so connected AI providers keep working after a restore. Keep this password somewhere else: without it a backup can’t be opened.')}
                  {config.encrypted && (
                    <>
                      {' '}
                      <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => void turnOffEncryption()}>
                        {t('Turn off encryption')}
                      </button>
                    </>
                  )}
                </FieldDescription>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>{t('Schedule')}</FieldLabel>
                  <Select value={form.schedule} onValueChange={v => set('schedule', v as BackupSchedule)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">{t('Only when started')}</SelectItem>
                      <SelectItem value="daily">{t('Every day')}</SelectItem>
                      <SelectItem value="weekly">{t('Every week')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t('Keep')}</FieldLabel>
                  <Select value={String(form.keep)} onValueChange={v => set('keep', Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KEEP.map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {plural(n, 'Latest backup', 'Latest {n} backups')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {form.schedule !== 'off' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-2 gap-3">
                  {form.schedule === 'weekly' && (
                    <Field>
                      <FieldLabel>{t('Day')}</FieldLabel>
                      <Select value={String(form.weekday)} onValueChange={v => set('weekday', Number(v))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 0].map(d => (
                            <SelectItem key={d} value={String(d)}>
                              {weekdayName(d)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>{t('Time')}</FieldLabel>
                    <Select value={String(form.hour)} onValueChange={v => set('hour', Number(v))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, h) => (
                          <SelectItem key={h} value={String(h)}>
                            {hourLabel(h)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </motion.div>
              )}
              {zoneNote && <p className="-mt-2 text-[13px] text-muted-foreground">{t('Times are in {zone}.', { zone: config.timeZone })}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" disabled={testing || !form.url.trim()} onClick={() => void test()}>
                  {testing && <Spinner />} {t('Test connection')}
                </Button>
                <Button type="submit" disabled={saving || !dirty}>
                  {saving && <Spinner />} {t('Save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* As tall as the settings beside it: the list of backups takes the rest. */}
        <div className="flex flex-col gap-6">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>{t('Project files')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 text-muted-foreground">{t('Storage')}</span>
                <span>{state.storage.driver === 's3' ? t('S3-compatible bucket') : t('Local disk')}</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 text-muted-foreground">{t('Location')}</span>
                <span className="min-w-0 font-mono text-[13px] break-all">{state.storage.location}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 gap-0 overflow-hidden pb-0">
            <CardHeader className="pb-4">
              <CardTitle>{t('Recent backups')}</CardTitle>
              <CardDescription>
                {state.nextRun ? t('Next scheduled backup: {when}.', { when: dateTime(state.nextRun) }) : t('No backups are scheduled.')}{' '}
                {t('To restore one, see “Backups” in docs/operations.md.')}
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">{t('Started')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="max-md:hidden">{t('Size')}</TableHead>
                  <TableHead className="max-md:hidden">{t('File')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      {t('No backups yet.')}
                    </TableCell>
                  </TableRow>
                )}
                {state.runs.map(r => (
                  <RunRow key={r.id} run={r} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  )
}

function RunRow({ run }: { run: BackupRun }) {
  const seconds = run.finishedAt ? Math.max(1, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000)) : null
  return (
    <TableRow className="align-top">
      <TableCell className="pl-6">
        <div>{dateTime(run.startedAt)}</div>
        <div className="text-[13px] text-muted-foreground">
          {t(TRIGGER[run.trigger])}
          {seconds !== null && ` · ${seconds < 60 ? t('{n} s', { n: seconds }) : t('{n} min', { n: Math.round(seconds / 60) })}`}
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-medium',
            run.status === 'success' && 'text-emerald-600 dark:text-emerald-400',
            run.status === 'failed' && 'text-destructive',
          )}
        >
          {run.status === 'running' ? <Spinner className="size-3.5" /> : <span className="size-2 rounded-full bg-current" />}
          {run.status === 'success' ? t('Done') : run.status === 'failed' ? t('Failed') : t('Running')}
        </span>
        {run.error && <div className="mt-1 max-w-md text-[13px] break-words text-destructive">{run.error}</div>}
        {run.projects !== null && <div className="text-[13px] text-muted-foreground">{plural(run.projects, '{n} project', '{n} projects')}</div>}
      </TableCell>
      <TableCell className="tabular-nums max-md:hidden">{run.bytes !== null ? formatBytes(run.bytes) : '—'}</TableCell>
      <TableCell className="font-mono text-[13px] text-muted-foreground max-md:hidden">{run.file ?? '—'}</TableCell>
    </TableRow>
  )
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  FileArchive,
  FolderOpen,
  Info,
  LayoutTemplate,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BuildSummary, ConvertAffiliation, ConvertAnalysis, ConvertAuthor, ConvertInto, ConvertMetadata, ConvertOptions, ConvertReport, ConvertTarget, ProjectSummary, TemplateInfo } from '@coltex/shared'
import { useAiStatus } from '../lib/ai.ts'
import { api } from '../lib/api.ts'
import { inSentence, intlLocale, plural, t, tk, translateServerMessage } from '../lib/i18n.ts'
import { navigate } from '../lib/router.ts'
import { cn } from '../lib/utils.ts'
import { sharingTag } from './shell/project-dialogs.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Checkbox } from './ui/checkbox.tsx'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.tsx'
import { Input } from './ui/input.tsx'
import { Label } from './ui/label.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'
import { Spinner } from './ui/spinner.tsx'
import { Switch } from './ui/switch.tsx'
import { Textarea } from './ui/textarea.tsx'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group.tsx'

const OPEN_EVENT = 'coltex:convert'
/** The editor picks this up to start the assistant on the converted project. */
export const AI_START_KEY = (projectId: string) => `coltex:ai-start:${projectId}`

/** Open the conversion wizard for a project (from the editor or the project list). */
export function openConvert(projectId: string, projectName: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { projectId, projectName } }))
}

/** Mounted once at the app root. */
export function ConvertDialogHost() {
  const [target, setTarget] = useState<{ projectId: string; projectName: string }>()
  const [open, setOpen] = useState(false)
  // Each opening starts over (choosing a template), even right after a conversion.
  const [session, setSession] = useState(0)
  useEffect(() => {
    const onOpen = (e: Event) => {
      setTarget((e as CustomEvent).detail)
      setSession(n => n + 1)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])
  return target ? <ConvertDialog key={session} {...target} open={open} onOpenChange={setOpen} /> : null
}

type Step = 'target' | 'details' | 'result'

/** What the paper goes into: a built-in conversion, or a template the author brings. */
type Into = { kind: 'builtin'; target: ConvertTarget } | { kind: 'template'; into: Exclude<ConvertInto, string>; name: string; key: string }

/** The built-in skill the AI agent follows to finish a conversion. */
const CONVERSION_SKILL = 'template-conversion'

function ConvertDialog({ projectId, projectName, open, onOpenChange }: { projectId: string; projectName: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [analysis, setAnalysis] = useState<ConvertAnalysis>()
  const [error, setError] = useState<string>()
  const [step, setStep] = useState<Step>('target')
  const [into, setInto] = useState<Into>()
  const [meta, setMeta] = useState<ConvertMetadata>()
  const [options, setOptions] = useState<ConvertOptions>({})
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ConvertReport>()

  useEffect(() => {
    if (!open || analysis) return
    api.analyzeConvert(projectId).then(
      a => {
        setAnalysis(a)
        setMeta(a.metadata)
        setOptions(a.hints)
      },
      e => setError((e as Error).message),
    )
  }, [open, analysis, projectId])

  const target = into?.kind === 'builtin' ? into.target : undefined
  const intoLabel = into ? (into.kind === 'builtin' ? t(into.target.label) : into.name) : ''
  useEffect(() => {
    if (intoLabel) setName(`${projectName} – ${intoLabel}`)
  }, [intoLabel, projectName])

  const missing = useMemo(() => {
    if (!meta || !into) return []
    const out: string[] = []
    if (!meta.title.trim()) out.push(t('a title'))
    if (!meta.authors.length) out.push(t('at least one author'))
    for (const f of target?.fields ?? []) if (f.required && !getField(options, f.key)?.trim()) out.push(inSentence(t(f.label)))
    return out
  }, [meta, target, options])

  const run = async () => {
    if (!meta || !into) return
    setBusy(true)
    setStep('result')
    setReport(undefined)
    try {
      const r = await api.convert(projectId, { target: into.kind === 'builtin' ? into.target.id : into.into, name: name.trim(), metadata: meta, options })
      setReport(r)
      window.dispatchEvent(new Event('coltex:projects-changed'))
    } catch (e) {
      toast.error((e as Error).message)
      setStep('details')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl" aria-describedby={undefined}>
        <DialogHeader className="border-b p-5 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-primary" /> {t('Convert to a journal template')}
          </DialogTitle>
          <Steps step={step} />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
            </div>
          ) : !analysis || !meta ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Spinner /> {t('Reading the project…')}
            </div>
          ) : step === 'target' ? (
            <TargetStep analysis={analysis} projectId={projectId} value={into} onChange={setInto} />
          ) : step === 'details' && into ? (
            <DetailsStep analysis={analysis} target={target} label={intoLabel} meta={meta} setMeta={setMeta} options={options} setOptions={setOptions} name={name} setName={setName} />
          ) : (
            <ResultStep report={report} label={intoLabel} options={options} sourceClass={analysis.sourceClass} onClose={() => onOpenChange(false)} />
          )}
        </div>

        {analysis && step !== 'result' && (
          <div className="flex items-center gap-2 border-t bg-muted/30 px-5 py-3">
            {step === 'details' && (
              <Button variant="ghost" onClick={() => setStep('target')}>
                <ArrowLeft /> {t('Template')}
              </Button>
            )}
            {step === 'details' && missing.length > 0 && (
              <span className="text-xs text-muted-foreground">{t('Still needed: {list}', { list: new Intl.ListFormat(intlLocale()).format(missing) })}</span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              {step === 'target' ? (
                <Button disabled={!into} onClick={() => setStep('details')}>
                  {t('Next')} <ArrowRight />
                </Button>
              ) : (
                <Button disabled={missing.length > 0 || !name.trim() || busy} onClick={() => void run()}>
                  <LayoutTemplate /> {t('Convert')}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getField(o: ConvertOptions, key: string): string | undefined {
  if (key === 'journal') return o.journal
  if (key.startsWith('venue.')) return o.venue?.[key.slice(6) as keyof NonNullable<ConvertOptions['venue']>]
  return undefined
}

function setField(o: ConvertOptions, key: string, value: string): ConvertOptions {
  if (key === 'journal') return { ...o, journal: value }
  if (key.startsWith('venue.')) return { ...o, venue: { ...o.venue, [key.slice(6)]: value } }
  return o
}

function Steps({ step }: { step: Step }) {
  const steps: [Step, string][] = [
    ['target', t('Template')],
    ['details', t('Check details')],
    ['result', t('Result')],
  ]
  const index = steps.findIndex(s => s[0] === step)
  return (
    <ol className="mt-3 flex items-center gap-2 text-xs">
      {steps.map(([key, label], i) => (
        <li key={key} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
              i < index && 'border-primary bg-primary text-primary-foreground',
              i === index && 'border-primary text-primary',
              i > index && 'text-muted-foreground',
            )}
          >
            {i < index ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={i === index ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
          {i < steps.length - 1 && <span className="h-px w-8 bg-border" />}
        </li>
      ))}
    </ol>
  )
}

function TargetStep({ analysis, projectId, value, onChange }: { analysis: ConvertAnalysis; projectId: string; value?: Into; onChange: (into: Into) => void }) {
  const [mode, setMode] = useState<Into['kind']>(value?.kind ?? 'builtin')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{t('Detected:')}</span>
        <Badge variant="secondary" className="font-mono">
          {analysis.sourceClass}
        </Badge>
        <Badge variant="secondary">{plural(analysis.metadata.authors.length, '{n} author', '{n} authors')}</Badge>
        <Badge variant="secondary">
          {analysis.bibliography === 'none' ? t('no bibliography') : analysis.bibliography === 'inline' ? t('inline bibliography') : analysis.bibliography}
        </Badge>
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={v => v && setMode(v as Into['kind'])} className="ml-auto">
          <ToggleGroupItem value="builtin">{t('Journals')}</ToggleGroupItem>
          <ToggleGroupItem value="template">{t('Templates')}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {mode === 'builtin' ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {analysis.targets.map((target, i) => (
            <motion.button
              key={target.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onChange({ kind: 'builtin', target })}
              aria-pressed={value?.kind === 'builtin' && value.target.id === target.id}
              className={cn(
                'flex flex-col rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50',
                value?.kind === 'builtin' && value.target.id === target.id && 'border-primary bg-primary/5 ring-1 ring-primary',
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{t(target.label)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{target.publisher}</span>
              </span>
              <span className="mt-1 text-xs leading-snug text-muted-foreground">{t(target.description)}</span>
              <span className="mt-1.5 text-[11px] text-muted-foreground">
                <span className="font-mono">{target.documentClass}.cls</span> · {target.twoColumn ? t('Two columns') : t('One column')}
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <TemplatePicker projectId={projectId} value={value?.kind === 'template' ? value : undefined} onChange={onChange} />
      )}
    </div>
  )
}

/** Any template as the target: one from the list, one of the person's projects, or a journal's zip. */
function TemplatePicker({ projectId, value, onChange }: { projectId: string; value?: Extract<Into, { kind: 'template' }>; onChange: (into: Into) => void }) {
  const [templates, setTemplates] = useState<TemplateInfo[]>()
  const [projects, setProjects] = useState<ProjectSummary[]>()
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [picking, setPicking] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => {
    api.listTemplates().then(setTemplates, e => {
      setTemplates([])
      toast.error((e as Error).message)
    })
  }, [])
  useEffect(() => {
    if (picking && !projects) api.listProjects().then(list => setProjects(list.filter(p => p.id !== projectId)), e => toast.error((e as Error).message))
  }, [picking, projects, projectId])

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const name = f.name.replace(/\.zip$/i, '')
      const held = await api.convertUpload(projectId, f, name)
      onChange({ kind: 'template', into: { upload: held.upload }, name, key: `upload:${held.upload}` })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const label = (tpl: TemplateInfo) => (tpl.kind === 'builtin' ? translateServerMessage(tpl.name) : tpl.name)
  const all = [...(templates?.filter(x => x.kind === 'shared') ?? []), ...(templates?.filter(x => x.kind === 'builtin') ?? [])]
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter(x => `${label(x)} ${x.name} ${x.description}`.toLowerCase().includes(q)) : all
  const own = value && !('template' in value.into) ? value : undefined
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={file}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void upload(f)
          }}
        />
        <Button variant="outline" disabled={uploading} onClick={() => file.current?.click()}>
          {uploading ? <Spinner /> : <FileArchive />} {t('Upload a template (.zip)')}
        </Button>
        <Popover open={picking} onOpenChange={setPicking}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <FolderOpen /> {t('One of my projects')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command>
              <CommandInput placeholder={t('Search projects…')} />
              <CommandList className="max-h-72">
                {!projects ? (
                  <div className="flex justify-center p-4">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>{t('No project found.')}</CommandEmpty>
                    <CommandGroup>
                      {projects.map(p => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.id}`}
                          onSelect={() => {
                            setPicking(false)
                            onChange({ kind: 'template', into: { project: p.id }, name: p.name, key: `project:${p.id}` })
                          }}
                        >
                          <span className="truncate">{p.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search templates…')} className="min-w-40 flex-1" />
      </div>
      {own && (
        <div className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 p-3 text-sm ring-1 ring-primary">
          {'upload' in own.into ? <FileArchive className="size-4 text-primary" /> : <FolderOpen className="size-4 text-primary" />}
          <span className="font-medium">{own.name}</span>
        </div>
      )}
      {!templates ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {shown.map(tpl => {
            const on = value?.key === `template:${tpl.id}`
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onChange({ kind: 'template', into: { template: tpl.id }, name: label(tpl), key: `template:${tpl.id}` })}
                aria-pressed={on}
                className={cn('grid content-start gap-0.5 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50', on && 'border-primary bg-primary/5 ring-1 ring-primary')}
              >
                <span className="text-sm font-medium">{label(tpl)}</span>
                {tpl.description && <span className="text-xs leading-snug text-muted-foreground">{tpl.kind === 'builtin' ? translateServerMessage(tpl.description) : tpl.description}</span>}
                <span className="mt-1.5 flex">
                  <Badge variant={tpl.sharing === 'builtin' ? 'secondary' : 'outline'} className="max-w-full truncate font-normal">
                    {sharingTag(tpl)}
                  </Badge>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, action, children }: { icon: typeof Info; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  )
}

function DetailsStep(props: {
  analysis: ConvertAnalysis
  target?: ConvertTarget
  label: string
  meta: ConvertMetadata
  setMeta: (m: ConvertMetadata) => void
  options: ConvertOptions
  setOptions: (o: ConvertOptions) => void
  name: string
  setName: (n: string) => void
}) {
  const { analysis, target, meta, setMeta, options, setOptions } = props
  const needsCountry = target?.documentClass === 'acmart'
  const patchAuthor = (i: number, p: Partial<ConvertAuthor>) => setMeta({ ...meta, authors: meta.authors.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const patchAff = (i: number, p: Partial<ConvertAffiliation>) =>
    setMeta({
      ...meta,
      affiliations: meta.affiliations.map((a, j) => {
        if (j !== i) return a
        const next = { ...a, ...p }
        // Keep the free-text form in step with the fields the templates use.
        next.raw = [next.department, next.institution, next.city, next.country].filter(Boolean).join(', ') || next.raw
        return next
      }),
    })
  const addAffiliation = () => {
    const id = `a${Math.max(0, ...meta.affiliations.map(a => Number(a.id.slice(1)) || 0)) + 1}`
    setMeta({ ...meta, affiliations: [...meta.affiliations, { id, raw: '' }] })
  }
  const removeAffiliation = (id: string) =>
    setMeta({ ...meta, affiliations: meta.affiliations.filter(a => a.id !== id), authors: meta.authors.map(a => ({ ...a, affiliations: a.affiliations.filter(x => x !== id) })) })

  return (
    <div className="space-y-6">
      {analysis.notes.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {analysis.notes.map(n => (
            <div key={n} className="flex gap-1.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {translateServerMessage(n)}
            </div>
          ))}
        </div>
      )}

      <Section icon={Info} title={t('Paper')}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label={t('Title')}>
            <Input value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <Field label={t('Short title (running head)')}>
            <Input value={meta.shortTitle ?? ''} onChange={e => setMeta({ ...meta, shortTitle: e.target.value || undefined })} />
          </Field>
        </div>
        <Field label={t('Abstract')}>
          <Textarea value={meta.abstract} onChange={e => setMeta({ ...meta, abstract: e.target.value })} className="max-h-40 min-h-20 font-mono text-xs" />
        </Field>
        <Field label={t('Keywords (comma-separated)')}>
          <Input
            value={meta.keywords.join(', ')}
            onChange={e => setMeta({ ...meta, keywords: e.target.value.split(/[,，]/).map(k => k.trim()).filter(Boolean) })}
          />
        </Field>
      </Section>

      <Section
        icon={UserRound}
        title={t('Authors ({n})', { n: meta.authors.length })}
        action={
          <Button size="xs" variant="outline" onClick={() => setMeta({ ...meta, authors: [...meta.authors, { name: '', affiliations: [] }] })}>
            <Plus /> {t('Author')}
          </Button>
        }
      >
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {meta.authors.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border bg-card p-2.5">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Input placeholder={t('Name')} value={a.name} onChange={e => patchAuthor(i, { name: e.target.value })} />
                  <Input placeholder={t('Email (optional)')} value={a.email ?? ''} onChange={e => patchAuthor(i, { email: e.target.value || undefined })} />
                  <Button variant="ghost" size="icon" aria-label={t('Remove author')} onClick={() => setMeta({ ...meta, authors: meta.authors.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">{t('Affiliations:')}</span>
                  {meta.affiliations.map((af, k) => {
                    const on = a.affiliations.includes(af.id)
                    return (
                      <button
                        key={af.id}
                        type="button"
                        title={af.raw}
                        onClick={() => patchAuthor(i, { affiliations: on ? a.affiliations.filter(x => x !== af.id) : [...a.affiliations, af.id] })}
                        className={cn('max-w-48 truncate rounded-full border px-2 py-0.5 transition-colors', on ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                      >
                        {k + 1}. {af.institution || af.raw || t('New affiliation')}
                      </button>
                    )
                  })}
                  <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                    <Checkbox checked={!!a.corresponding} onCheckedChange={c => patchAuthor(i, { corresponding: c === true || undefined })} />
                    {t('Corresponding')}
                  </label>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Section>

      <Section
        icon={Building2}
        title={t('Affiliations ({n})', { n: meta.affiliations.length })}
        action={
          <Button size="xs" variant="outline" onClick={addAffiliation}>
            <Plus /> {t('Affiliation')}
          </Button>
        }
      >
        <div className="space-y-2">
          {meta.affiliations.map((af, i) => (
            <div key={af.id} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
              <span className="mt-2 w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <div className="grid flex-1 gap-2 sm:grid-cols-4">
                <Input placeholder={t('Department')} value={af.department ?? ''} onChange={e => patchAff(i, { department: e.target.value || undefined })} />
                <Input placeholder={t('Institution')} value={af.institution ?? ''} onChange={e => patchAff(i, { institution: e.target.value || undefined })} />
                <Input placeholder={t('City')} value={af.city ?? ''} onChange={e => patchAff(i, { city: e.target.value || undefined })} />
                <Input
                  placeholder={needsCountry ? t('Country (required by ACM)') : t('Country')}
                  aria-invalid={needsCountry && !af.country}
                  value={af.country ?? ''}
                  onChange={e => patchAff(i, { country: e.target.value || undefined })}
                />
              </div>
              <Button variant="ghost" size="icon" aria-label={t('Remove affiliation')} onClick={() => removeAffiliation(af.id)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={LayoutTemplate} title={t('{template} options', { template: props.label })}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {(target?.fields ?? []).map(f => (
            <Field key={f.key} label={`${t(f.label)}${f.required ? ' *' : ''}`}>
              <Input placeholder={f.placeholder} value={getField(options, f.key) ?? ''} onChange={e => setOptions(setField(options, f.key, e.target.value))} />
            </Field>
          ))}
          <Field label={t('New project name')}>
            <Input value={props.name} onChange={e => props.setName(e.target.value)} />
          </Field>
        </div>
        {target?.review && (
          <label className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
            <Switch checked={!!options.review} onCheckedChange={v => setOptions({ ...options, review: v })} />
            {t('Review version')}
            <span className="text-xs text-muted-foreground">
              {target.documentClass === 'acmart'
                ? t('(anonymous, with line numbers)')
                : target.documentClass === 'elsarticle' || target.documentClass === 'cas-sc'
                  ? t('(double-spaced)')
                  : t('(the template’s submission layout)')}
            </span>
          </label>
        )}
      </Section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

const ROWS: [keyof BuildSummary, string][] = [
  ['errors', tk('Errors')],
  ['undefinedReferences', tk('Undefined references')],
  ['undefinedCitations', tk('Undefined citations')],
  ['overfull', tk('Overfull boxes')],
  ['warnings', tk('Warnings')],
]

const STATUS: Record<NonNullable<ConvertReport['build']>['status'], string> = {
  success: tk('success'),
  failure: tk('failure'),
  timeout: tk('timeout'),
  error: tk('error'),
}

function ResultStep({ report, label, options, sourceClass, onClose }: { report?: ConvertReport; label: string; options: ConvertOptions; sourceClass: string; onClose: () => void }) {
  const { status: ai } = useAiStatus()
  if (!report) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
        <Spinner className="size-6" />
        {t('Converting and compiling both versions…')}
      </div>
    )
  }
  const b = report.build
  const base = report.baseline
  const worse = (k: keyof BuildSummary) => !!b && typeof b[k] === 'number' && (b[k] as number) > ((base?.[k] as number | undefined) ?? 0)
  const problems = !b || b.status !== 'success' || ROWS.slice(0, 3).some(([k]) => worse(k))
  const warnings = report.notes.filter(n => n.level === 'warning')
  const infos = report.notes.filter(n => n.level === 'info')

  const fixWithAi = () => {
    // The prompt is the user's first chat message, so it follows the interface language.
    const counts = b
      ? t('{errors} error(s), {refs} undefined reference(s) and {cites} undefined citation(s)', {
          errors: b.errors,
          refs: b.undefinedReferences,
          cites: b.undefinedCitations,
        })
      : t('a failed build')
    const vars = { source: sourceClass, template: label || report.target, counts }
    const prompt = [
      base
        ? t('ColTex converted this project from {source} to the {template} template. The build now has {counts} (the original had {errors}, {refs} and {cites}).', {
            ...vars,
            errors: base.errors,
            refs: base.undefinedReferences,
            cites: base.undefinedCitations,
          })
        : t('ColTex converted this project from {source} to the {template} template. The build now has {counts}.', vars),
      t('Fix these problems with minimal LaTeX changes so it compiles cleanly with the new template. Do not change the paper’s wording or content.'),
      options.journal || options.venue?.name ? t('The paper is to be submitted to {venue}.', { venue: options.journal || options.venue?.name || '' }) : '',
      warnings.length ? `${t('Things the converter flagged:')}\n${warnings.map(w => `- ${translateServerMessage(w.text)}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    try {
      sessionStorage.setItem(AI_START_KEY(report.projectId), JSON.stringify({ text: prompt, skill: CONVERSION_SKILL }))
    } catch {}
    onClose()
    navigate(`/project/${report.projectId}`)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'rounded-xl p-2.5',
            problems ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
          )}
        >
          {problems ? <TriangleAlert className="size-6" /> : <CircleCheck className="size-6" />}
        </span>
        <div>
          <div className="font-semibold">{problems ? t('Converted, with things to fix') : t('Converted and compiling cleanly')}</div>
          <div className="text-sm text-muted-foreground">
            {plural(report.changedFiles.length, '“{name}” · {n} file adapted ({files})', '“{name}” · {n} files adapted ({files})', {
              name: report.name,
              files: report.changedFiles.join(', '),
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('Build')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('Original')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('Converted')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-3 py-2">{t('Status')}</td>
              <td className="px-3 py-2 text-right">{base ? t(STATUS[base.status]) : '—'}</td>
              <td className={cn('px-3 py-2 text-right font-medium', b?.status === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive')}>
                {b ? t(STATUS[b.status]) : t('not built')}
              </td>
            </tr>
            {ROWS.map(([k, label]) => (
              <tr key={k}>
                <td className="px-3 py-2">{t(label)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{(base?.[k] as number | undefined) ?? '—'}</td>
                <td className={cn('px-3 py-2 text-right tabular-nums', worse(k) && 'font-semibold text-destructive')}>{(b?.[k] as number | undefined) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(warnings.length > 0 || infos.length > 0) && (
        <div className="space-y-1.5">
          <div className="text-sm font-semibold">{t('What the converter did')}</div>
          {[...warnings, ...infos].map((n, i) => (
            <div key={i} className={cn('flex gap-2 rounded-md px-2.5 py-1.5 text-xs', n.level === 'warning' ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-muted/50 text-muted-foreground')}>
              {n.level === 'warning' ? <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> : <Info className="mt-0.5 size-3.5 shrink-0" />}
              {translateServerMessage(n.text)}
            </div>
          ))}
        </div>
      )}

      {/* Why the AI hand-off below can't be used (no provider connected, or no model allowed). */}
      {(problems || warnings.length > 0) && ai && !ai.available && (
        <p className="flex items-start gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          {ai.reason ? translateServerMessage(ai.reason) : t('The AI agent is not available.')}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          {t('Close')}
        </Button>
        {(problems || warnings.length > 0) && (
          <Button variant="outline" onClick={fixWithAi} disabled={!ai?.available} className="border-primary/40 text-primary">
            <Sparkles /> {t('Open and fix with AI')}
          </Button>
        )}
        <Button
          onClick={() => {
            onClose()
            navigate(`/project/${report.projectId}`)
          }}
        >
          <ExternalLink /> {t('Open new project')}
        </Button>
      </div>
    </motion.div>
  )
}

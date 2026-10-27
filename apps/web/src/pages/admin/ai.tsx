import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  ChevronsUpDown,
  CircleCheck,
  ExternalLink,
  Globe,
  KeyRound,
  LogIn,
  MoreHorizontal,
  Plus,
  Power,
  Server,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  AiAdminState,
  AiLoginState,
  AiModelInfo,
  AiProviderStatus,
  AiSettingsPatch,
  CustomAiProvider,
  WebSearchService,
} from '@coltex/shared'
import { WEB_SEARCH_SERVICES } from '@coltex/shared'
import { confirmDialog } from '@/components/confirm'
import { ProviderIcon, ToolIcon } from '@/components/provider-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { plural, t, tr, translateServerMessage } from '@/lib/i18n'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'endpoint'

function methodLabel(p: AiProviderStatus): string {
  if (p.configured?.type === 'oauth') return t('Subscription')
  if (p.configured?.source === 'no key') return t('No key needed')
  if (p.configured?.source && !['stored credential', 'OAuth'].includes(p.configured.source)) return t('From {source}', { source: p.configured.source })
  return t('API key')
}

export function AdminAiPage() {
  const [state, setState] = useState<AiAdminState>()
  const [models, setModels] = useState<AiModelInfo[]>([])
  const [login, setLogin] = useState<AiLoginState>()
  const [connecting, setConnecting] = useState(false)
  const [addingEndpoint, setAddingEndpoint] = useState(false)

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([api.aiAdmin(), api.aiModels()])
    setState(s)
    setModels(m)
  }, [])

  useEffect(() => {
    load().catch(e => toast.error((e as Error).message))
  }, [load])

  const save = async (patch: AiSettingsPatch, message?: string) => {
    try {
      await api.aiUpdateSettings(patch)
      if (message) toast.success(message)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const startLogin = async (provider: string, type: 'api_key' | 'oauth') => {
    setConnecting(false)
    try {
      setLogin(await api.aiLogin(provider, type))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async (p: AiProviderStatus) => {
    const ok = await confirmDialog({
      title: t('Disconnect {name}?', { name: p.name }),
      description: t('The stored credential is deleted. People using its models move to another model they may use.'),
      confirmLabel: t('Disconnect'),
      destructive: true,
    })
    if (!ok) return
    await api.aiLogout(p.id).catch(e => toast.error((e as Error).message))
    toast.success(t('Disconnected {name}', { name: p.name }))
    await load()
  }

  /** Send a tiny request to one of the provider's models (Auto's, if it uses one). */
  const testProvider = async (p: AiProviderStatus) => {
    const auto = state?.settings.auto
    const used = [auto?.strong, auto?.light, auto?.judge].find(r => r?.provider === p.id)
    const model = used ?? models.find(m => m.provider === p.id)
    if (!model) return toast.error(`No models available from ${p.name}`)
    const id = toast.loading(t('Testing {name}…', { name: p.name }))
    try {
      const r = await api.aiTest({ provider: model.provider, id: model.id })
      if (r.ok) toast.success(t('{model} replied “{reply}” in {seconds} s', { model: model.id, reply: r.message, seconds: (r.ms / 1000).toFixed(1) }), { id })
      else toast.error(r.message, { id })
    } catch (e) {
      toast.error((e as Error).message, { id })
    }
    await load()
  }

  if (!state) {
    return (
      <>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }

  const { settings, providers } = state
  const connected = providers.filter(p => p.configured)
  const providerName = (id: string) => providers.find(p => p.id === id)?.name ?? id
  const inAuto = (id: string) => [settings.auto.judge, settings.auto.light, settings.auto.strong].some(r => r?.provider === id)

  return (
    <>
      {/* Providers and the auto choice side by side (one height); the endpoints below, full width. */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="grid lg:col-span-2 [&>[data-slot=card]]:h-full">
          {/* Providers */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Providers')}</CardTitle>
              <CardAction>
                <Button onClick={() => setConnecting(true)}>
                  <Plus /> {t('Connect')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {connected.length === 0 ? (
                <button
                  onClick={() => setConnecting(true)}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="flex -space-x-2">
                    {['anthropic', 'openai', 'deepseek', 'google'].map(id => (
                      <span key={id} className="rounded-full border-2 border-card bg-card p-1.5 shadow-sm">
                        <ProviderIcon provider={id} className="size-5" />
                      </span>
                    ))}
                  </span>
                  {t('Connect your first provider')}
                </button>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {connected.map((p, i) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md"
                      >
                        <span className="rounded-lg border bg-background p-2">
                          <ProviderIcon provider={p.id} hint={state.settings.customProviders.find(c => c.id === p.id)?.baseUrl} className="size-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {p.name}
                            {inAuto(p.id) && <Badge className="h-4 px-1.5 text-[11px]">{t('Used by Auto')}</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                p.health.state === 'healthy' ? 'bg-emerald-500' : p.health.state === 'open' ? 'bg-red-500' : 'bg-amber-500',
                              )}
                            />
                            {methodLabel(p)} · {plural(p.modelCount, '{n} model', '{n} models')}
                          </div>
                          {p.health.state !== 'healthy' && p.health.lastError && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="mt-1 truncate text-xs text-red-600 dark:text-red-400">
                                  {p.health.state === 'open'
                                    ? t('Failing; requests go to other models for now')
                                    : plural(p.health.failures, '{n} failed request in a row', '{n} failed requests in a row')}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">{p.health.lastError}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t('{name} actions', { name: p.name })}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => void testProvider(p)}>
                              <Zap /> {t('Test')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {p.oauth && (
                              <DropdownMenuItem onSelect={() => void startLogin(p.id, 'oauth')}>
                                <LogIn /> {t('Sign in again')}
                              </DropdownMenuItem>
                            )}
                            {p.apiKey && (
                              <DropdownMenuItem onSelect={() => void startLogin(p.id, 'api_key')}>
                                <KeyRound /> {p.custom ? t('Set API key') : t('Change API key')}
                              </DropdownMenuItem>
                            )}
                            {p.stored && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => void remove(p)}>
                                  <Trash2 /> {t('Disconnect')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid [&>[data-slot=card]]:h-full">
          <AutoRoutingCard settings={settings} models={models} providerName={providerName} onSave={save} />
        </div>
        <div className="grid lg:col-span-2 [&>[data-slot=card]]:h-full">
          <WebSearchCard state={state} providerName={providerName} onSave={save} onChanged={load} />
        </div>
        <div className="grid [&>[data-slot=card]]:h-full">
          {/* Self-hosted */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-4 text-muted-foreground" /> {t('Self-hosted endpoints')}
              </CardTitle>
              <CardAction>
                <Button variant="outline" onClick={() => setAddingEndpoint(true)}>
                  <Plus /> {t('Add')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid content-start gap-2">
              {settings.customProviders.length === 0 ? (
                <button
                  onClick={() => setAddingEndpoint(true)}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="flex -space-x-2">
                    {['ollama', 'vllm', 'lmstudio'].map(id => (
                      <span key={id} className="rounded-full border-2 border-card bg-card p-1.5 shadow-sm">
                        <ToolIcon logo={id} className="size-5" />
                      </span>
                    ))}
                  </span>
                  {t('Add a self-hosted endpoint')}
                </button>
              ) : (
                settings.customProviders.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <span className="rounded-lg border bg-background p-2">
                      <ProviderIcon provider={p.id} hint={`${p.name} ${p.baseUrl}`} className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {p.baseUrl} · {p.models.map(m => m.id).join(', ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('Remove {name}', { name: p.name })}
                      onClick={async () => {
                        if (await confirmDialog({ title: t('Remove {name}?', { name: p.name }), confirmLabel: t('Remove'), destructive: true })) {
                          void save({ customProviders: settings.customProviders.filter(x => x.id !== p.id) }, t('Removed {name}', { name: p.name }))
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConnectDialog open={connecting} onOpenChange={setConnecting} providers={providers.filter(p => !p.custom)} onConnect={startLogin} />
      <EndpointDialog
        open={addingEndpoint}
        onOpenChange={setAddingEndpoint}
        existing={settings.customProviders}
        onAdd={async provider => {
          setAddingEndpoint(false)
          await save({ customProviders: [...settings.customProviders, provider] }, t('Added {name}', { name: provider.name }))
        }}
      />
      {login && (
        <LoginDialog
          initial={login}
          providerName={providerName(login.providerId)}
          onClose={() => {
            setLogin(undefined)
            void load()
          }}
        />
      )}
    </>
  )
}

/** Searchable model picker grouped by provider (OpenRouter alone lists hundreds). */
function ModelPicker(props: {
  models: AiModelInfo[]
  value?: AiModelInfo
  providerName: (id: string) => string
  onChange: (m: AiModelInfo) => void
}) {
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => {
    const map = new Map<string, AiModelInfo[]>()
    for (const m of props.models) map.set(m.provider, [...(map.get(m.provider) ?? []), m])
    return [...map]
  }, [props.models])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={!props.models.length} className="h-12 w-full justify-start gap-3 px-3">
          {props.value ? (
            <>
              <ProviderIcon provider={props.value.provider} className="size-6" />
              <span className="grid text-left leading-tight">
                <span className="font-medium">{props.value.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {props.value.contextWindow
                    ? t('{provider} · {context} context', {
                        provider: props.providerName(props.value.provider),
                        context: formatNumber(props.value.contextWindow),
                      })
                    : props.providerName(props.value.provider)}
                  {props.value.reasoning ? ` · ${t('reasoning')}` : ''}
                </span>
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{props.models.length ? t('Choose a model…') : t('Connect a provider first')}</span>
          )}
          <ChevronsUpDown className="ml-auto text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search models…')} />
          <CommandList className="max-h-80">
            <CommandEmpty>{t('No model found.')}</CommandEmpty>
            {groups.map(([provider, list]) => (
              <CommandGroup
                key={provider}
                heading={
                  <span className="flex items-center gap-1.5">
                    <ProviderIcon provider={provider} className="size-3.5" /> {props.providerName(provider)}
                  </span>
                }
              >
                {list.map(m => (
                  <CommandItem
                    key={`${m.provider}/${m.id}`}
                    value={`${props.providerName(provider)} ${m.name} ${m.id}`}
                    onSelect={() => {
                      setOpen(false)
                      props.onChange(m)
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    {m.reasoning && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[11px]">
                        {t('reasoning')}
                      </Badge>
                    )}
                    <Check className={cn('size-4', props.value === m ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Pick a provider, then how to connect it. */
function ConnectDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: AiProviderStatus[]
  onConnect: (provider: string, type: 'api_key' | 'oauth') => void
}) {
  const [picked, setPicked] = useState<AiProviderStatus>()
  useEffect(() => {
    if (props.open) setPicked(undefined)
  }, [props.open])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>{picked ? t('Connect {name}', { name: picked.name }) : t('Connect a provider')}</DialogTitle>
          {picked && <DialogDescription>{t('Choose how to sign in.')}</DialogDescription>}
        </DialogHeader>
        <AnimatePresence mode="wait" initial={false}>
          {!picked ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Command className="rounded-none border-t">
                <CommandInput placeholder={t('Search providers…')} />
                <CommandList className="max-h-96">
                  <CommandEmpty>{t('No provider found.')}</CommandEmpty>
                  <CommandGroup>
                    {props.providers.map(p => (
                      <CommandItem key={p.id} value={`${p.name} ${p.id}`} onSelect={() => setPicked(p)} className="gap-3 py-2">
                        <ProviderIcon provider={p.id} className="size-5" />
                        <span className="flex-1">{p.name}</span>
                        {p.oauth?.subscription && <Badge variant="secondary">{t('Subscription')}</Badge>}
                        {p.configured && (
                          <Badge variant="outline" className="gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" /> {t('Connected')}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </motion.div>
          ) : (
            <motion.div key="method" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="grid gap-3 border-t p-5">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                <ProviderIcon provider={picked.id} className="size-8" />
                <div className="text-sm">
                  <div className="font-medium">{picked.name}</div>
                  <div className="text-xs text-muted-foreground">{plural(picked.modelCount, '{n} model', '{n} models')}</div>
                </div>
              </div>
              {picked.oauth && (
                <button
                  onClick={() => props.onConnect(picked.id, 'oauth')}
                  className="flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary hover:bg-accent/40"
                >
                  <span className="rounded-lg bg-primary p-2 text-primary-foreground">
                    <LogIn className="size-4" />
                  </span>
                  <span className="grid">
                    <span className="text-sm font-medium">{picked.oauth.name}</span>
                    <span className="text-xs text-muted-foreground">{picked.oauth.subscription ? t('Sign in with an account (uses its subscription)') : t('Sign in with an account')}</span>
                  </span>
                </button>
              )}
              {picked.apiKey && (
                <button
                  onClick={() => props.onConnect(picked.id, 'api_key')}
                  className="flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary hover:bg-accent/40"
                >
                  <span className="rounded-lg bg-muted p-2 text-foreground">
                    <KeyRound className="size-4" />
                  </span>
                  <span className="grid">
                    <span className="text-sm font-medium">{picked.apiKey}</span>
                    <span className="text-xs text-muted-foreground">{t('Paste a key from the provider’s console')}</span>
                  </span>
                </button>
              )}
              <Button variant="ghost" className="justify-self-start" onClick={() => setPicked(undefined)}>
                ← {t('All providers')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function EndpointDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: CustomAiProvider[]
  onAdd: (p: CustomAiProvider) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelIds, setModelIds] = useState('')

  useEffect(() => {
    if (props.open) {
      setName('')
      setBaseUrl('')
      setModelIds('')
    }
  }, [props.open])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let id = `custom-${slug(name)}`
    for (let n = 2; props.existing.some(p => p.id === id); n++) id = `custom-${slug(name)}-${n}`
    // The context window and answer length are the server's settings, not ColTex's.
    const models = modelIds
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(m => ({ id: m, contextWindow: 128_000, maxTokens: 16_384, reasoning: false }))
    void props.onAdd({ id, name: name.trim(), baseUrl: baseUrl.trim(), models })
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t('Add a self-hosted endpoint')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ep-name">{t('Endpoint name')}</FieldLabel>
              <Input id="ep-name" required placeholder={t('Lab GPU')} value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-url">{t('Base URL')}</FieldLabel>
              <Input id="ep-url" required type="url" placeholder="http://gpu.lab:11434/v1" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-models">{t('Models')}</FieldLabel>
              <Input id="ep-models" required placeholder="qwen3:32b, llama3.3" value={modelIds} onChange={e => setModelIds(e.target.value)} />
              <FieldDescription>{t('Model ids as the server names them, comma-separated.')}</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Add endpoint')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Drives a provider login: shows links and codes, and answers the flow's questions. */
function LoginDialog({ initial, providerName, onClose }: { initial: AiLoginState; providerName: string; onClose: () => void }) {
  const [login, setLogin] = useState(initial)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (login.status !== 'running') return
    const timer = setInterval(() => {
      api.aiLoginState(login.id).then(setLogin, e => setError((e as Error).message))
    }, 1000)
    return () => clearInterval(timer)
  }, [login.id, login.status])

  useEffect(() => {
    if (login.status === 'done') {
      toast.success(t('Connected {name}', { name: providerName }))
      const timer = setTimeout(onClose, 600)
      return () => clearTimeout(timer)
    }
  }, [login.status, onClose, providerName])

  const submit = async (value = answer) => {
    if (!login.prompt) return
    setError(undefined)
    try {
      setLogin(await api.aiLoginAnswer(login.id, login.prompt.id, value))
      setAnswer('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const close = async () => {
    if (login.status === 'running') await api.aiLoginCancel(login.id).catch(() => {})
    onClose()
  }

  const prompt = login.prompt
  return (
    <Dialog open onOpenChange={open => !open && void close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ProviderIcon provider={login.providerId} className="size-5" />
            {login.type === 'oauth' ? t('Sign in to {name}', { name: providerName }) : t('{name} API key', { name: providerName })}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          {login.events.map((e, i) => {
            if (e.type === 'auth_url') {
              return (
                <div key={i} className="grid gap-2 rounded-xl border bg-muted/40 p-3">
                  <Button asChild className="justify-self-start">
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {t('Open the sign-in page')} <ExternalLink />
                    </a>
                  </Button>
                  {e.instructions && <p className="text-muted-foreground">{translateServerMessage(e.instructions)}</p>}
                  {/redirect_uri=https?%3A%2F%2F(localhost|127\.0\.0\.1)/i.test(e.url) && (
                    <p className="text-xs text-muted-foreground">
                      {t('If the page then redirects to a localhost address that doesn’t load, copy that full address from the address bar and paste it below.')}
                    </p>
                  )}
                </div>
              )
            }
            if (e.type === 'device_code') {
              return (
                <div key={i} className="rounded-xl border bg-muted/40 p-3">
                  {tr('Enter {code} at {url}', {
                    code: <span className="rounded bg-background px-2 py-0.5 font-mono text-base font-semibold">{e.userCode}</span>,
                    url: (
                      <a href={e.verificationUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {e.verificationUri}
                      </a>
                    ),
                  })}
                </div>
              )
            }
            if (e.type === 'info') {
              return (
                <p key={i} className="text-muted-foreground">
                  {translateServerMessage(e.message)}{' '}
                  {e.links?.map(l => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {l.label ?? l.url}
                    </a>
                  ))}
                </p>
              )
            }
            return (
              <p key={i} className="text-muted-foreground">
                {translateServerMessage(e.message)}
              </p>
            )
          })}

          {prompt && login.status === 'running' && (
            <div className="grid gap-2">
              <Label>{translateServerMessage(prompt.message)}</Label>
              {prompt.type === 'select' ? (
                <div className="grid gap-2">
                  {prompt.options?.map(o => (
                    <button
                      key={o.id}
                      onClick={() => void submit(o.id)}
                      className="rounded-xl border p-3 text-left transition-all hover:border-primary hover:bg-accent/40"
                    >
                      <div className="font-medium">{translateServerMessage(o.label)}</div>
                      {o.description && <div className="text-xs text-muted-foreground">{translateServerMessage(o.description)}</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    void submit()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    autoFocus
                    type={prompt.type === 'secret' ? 'password' : 'text'}
                    placeholder={prompt.placeholder}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    autoComplete="off"
                  />
                  <Button type="submit">{t('Connect')}</Button>
                </form>
              )}
            </div>
          )}

          {login.status === 'running' && !prompt && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Spinner /> {t('Waiting…')}
            </p>
          )}
          {login.status === 'done' && (
            <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-4" /> {t('Connected.')}
            </p>
          )}
          {login.status === 'error' && login.error && <p className="text-destructive">{login.error}</p>}
          {error && <p className="text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => void close()}>
            {login.status === 'running' ? t('Cancel') : t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Auto model choice: a cheap judge reads each message and sends quick
 * questions to the light model and real work to the strong one. People turn
 * it on in the editor ("Auto") when all three are set.
 */
function AutoRoutingCard({
  settings,
  models,
  providerName,
  onSave,
}: {
  settings: AiAdminState['settings']
  models: AiModelInfo[]
  providerName: (id: string) => string
  onSave: (patch: AiSettingsPatch, message?: string) => Promise<void>
}) {
  const auto = settings.auto
  const find = (ref: { provider: string; id: string } | null) => (ref ? models.find(m => m.provider === ref.provider && m.id === ref.id) : undefined)
  const set = (key: 'judge' | 'light' | 'strong', m: AiModelInfo | null) =>
    void onSave({ auto: { ...auto, [key]: m && { provider: m.provider, id: m.id } } }, t('Auto model choice updated'))
  const ready = !!(find(auto.judge) && find(auto.light) && find(auto.strong))
  const rows = [
    ['judge', t('Judge model')],
    ['light', t('Light model')],
    ['strong', t('Strong model')],
  ] as const
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-4 text-muted-foreground" /> {t('Auto model choice')}
          <Badge variant="secondary" className="font-normal">
            {ready ? t('On') : t('Off until all three are set')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label>{label}</Label>
              {auto[key] && (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => set(key, null)}>
                  {t('Clear')}
                </button>
              )}
            </div>
            <ModelPicker models={models} value={find(auto[key])} providerName={providerName} onChange={m => set(key, m)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const SERVICE_NAMES: Record<WebSearchService, string> = { deepseek: 'DeepSeek', tavily: 'Tavily', exa: 'Exa', brave: 'Brave Search' }
const ServiceIcon = ({ service, className }: { service: WebSearchService; className?: string }) =>
  service === 'deepseek' ? <ProviderIcon provider="deepseek" className={className} /> : <ToolIcon logo={service} className={className} />

/**
 * The AI agent on the web, laid out like the providers: models with a
 * built-in search use it (each provider can be switched off, as some
 * accounts must first allow it), and a search service, optional, serves the
 * other models. Everyone with the AI agent gets the web once one is there.
 */
function WebSearchCard({
  state,
  providerName,
  onSave,
  onChanged,
}: {
  state: AiAdminState
  providerName: (id: string) => string
  onSave: (patch: AiSettingsPatch, message?: string) => Promise<void>
  onChanged: () => Promise<void>
}) {
  const web = state.settings.web
  const [connecting, setConnecting] = useState<{ service?: WebSearchService }>()

  const remove = async (service: WebSearchService) => {
    if (!(await confirmDialog({ title: t('Remove {name}?', { name: SERVICE_NAMES[service] }), confirmLabel: t('Remove'), destructive: true }))) return
    try {
      if (state.web.keys.includes(service)) await api.aiDeleteWebKey(service)
      const services = web.services.filter(s => s !== service)
      // Removing the service in use hands the search to the next one connected.
      await onSave({ web: { ...web, services, search: web.search === service ? (services[0] ?? null) : web.search } }, t('Removed {name}', { name: SERVICE_NAMES[service] }))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const test = async (service: WebSearchService) => {
    const id = toast.loading(t('Testing {name}…', { name: SERVICE_NAMES[service] }))
    try {
      const r = await api.aiTestWebSearch(service)
      if (r.ok) toast.success(plural(r.results, '{n} result in {seconds} s', '{n} results in {seconds} s', { seconds: (r.ms / 1000).toFixed(1) }), { id, description: r.message })
      else toast.error(r.message, { id })
    } catch (err) {
      toast.error((err as Error).message, { id })
    }
  }

  const use = (service: WebSearchService) => void onSave({ web: { ...web, search: service } }, t('{name} is used for search', { name: SERVICE_NAMES[service] }))

  const setNative = (provider: string, on: boolean) =>
    void onSave({ web: { ...web, nativeOff: on ? web.nativeOff.filter(p => p !== provider) : [...web.nativeOff, provider] } }, t('Web search updated'))

  const tiles = state.web.native.length + web.services.length
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" /> {t('Web search')}
        </CardTitle>
        <CardAction>
          <Button variant="outline" onClick={() => setConnecting({})}>
            <Plus /> {t('Connect')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {tiles === 0 ? (
          <button
            onClick={() => setConnecting({})}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            <span className="flex -space-x-2">
              {WEB_SEARCH_SERVICES.map(s => (
                <span key={s} className="rounded-full border-2 border-card bg-card p-1.5 shadow-sm">
                  <ServiceIcon service={s} className="size-5" />
                </span>
              ))}
            </span>
            {t('Connect a search service')}
          </button>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
            {state.web.native.map(id => {
              const on = !web.nativeOff.includes(id)
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md">
                  <span className="rounded-lg border bg-background p-2">
                    <ProviderIcon provider={id} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{providerName(id)}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn('size-1.5 rounded-full', on ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                      {on ? t('Built-in search') : t('Built-in search off')}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('{name} actions', { name: providerName(id) })}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setNative(id, !on)}>
                        <Power /> {on ? t('Turn off built-in search') : t('Turn on built-in search')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
            {web.services.map(service => {
              const stored = state.web.keys.includes(service)
              const fromProvider = service === 'deepseek' && !stored && state.web.deepseekConnected
              const ready = stored || fromProvider
              const inUse = web.search === service
              return (
                <div
                  key={service}
                  className={cn('flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md', inUse && 'border-primary ring-1 ring-primary/30')}
                >
                  <span className="rounded-lg border bg-background p-2">
                    <ServiceIcon service={service} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{SERVICE_NAMES[service]}</span>
                      {inUse && (
                        <Badge variant="outline" className="shrink-0 border-primary/40 text-primary">
                          {t('In use')}
                        </Badge>
                      )}
                    </div>
                    <div className={cn('flex items-center gap-1.5 text-xs', ready ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
                      <span className={cn('size-1.5 shrink-0 rounded-full', !ready ? 'bg-amber-500' : inUse ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                      <span className="truncate">{stored ? t('API key') : fromProvider ? t('Uses the DeepSeek provider’s key') : t('No API key')}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('{name} actions', { name: SERVICE_NAMES[service] })}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!inUse && (
                        <DropdownMenuItem onSelect={() => use(service)}>
                          <Check /> {t('Use for search')}
                        </DropdownMenuItem>
                      )}
                      {ready && (
                        <DropdownMenuItem onSelect={() => void test(service)}>
                          <Zap /> {t('Test')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setConnecting({ service })}>
                        <KeyRound /> {stored ? t('Change API key') : t('Set API key')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => void remove(service)}>
                        <Trash2 /> {t('Remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <SearchConnectDialog
        open={!!connecting}
        initial={connecting?.service}
        state={state}
        onOpenChange={open => !open && setConnecting(undefined)}
        onConnected={async name => {
          setConnecting(undefined)
          toast.success(t('Connected {name}', { name }))
          await onChanged()
        }}
      />
    </Card>
  )
}

/** Connects a search service with its key, like connecting a provider; the first one connected is used. */
function SearchConnectDialog(props: {
  open: boolean
  initial?: WebSearchService
  state: AiAdminState
  onOpenChange: (open: boolean) => void
  onConnected: (name: string) => Promise<void>
}) {
  const [picked, setPicked] = useState<WebSearchService>()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (props.open) {
      setPicked(props.initial)
      setKey('')
    }
  }, [props.open, props.initial])
  const web = props.state.settings.web

  const connect = async (withKey: boolean) => {
    if (!picked) return
    setBusy(true)
    try {
      if (withKey) await api.aiSetWebKey(picked, key.trim())
      // Another service joins the connected ones; the one in use stays until the admin picks another.
      await api.aiUpdateSettings({ web: { ...web, services: [...new Set([...web.services, picked])], search: web.search ?? picked } })
      await props.onConnected(SERVICE_NAMES[picked])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>{picked ? t('Connect {name}', { name: SERVICE_NAMES[picked] }) : t('Connect a search service')}</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait" initial={false}>
          {!picked ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Command className="rounded-none border-t">
                <CommandList className="max-h-96">
                  <CommandGroup>
                    {WEB_SEARCH_SERVICES.map(s => (
                      <CommandItem key={s} value={SERVICE_NAMES[s]} onSelect={() => setPicked(s)} className="gap-3 py-2">
                        <ServiceIcon service={s} className="size-5" />
                        <span className="flex-1">{SERVICE_NAMES[s]}</span>
                        {web.services.includes(s) && (
                          <Badge variant="outline" className="gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" /> {t('Connected')}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </motion.div>
          ) : (
            <motion.div key="key" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="grid gap-3 border-t p-5">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                <ServiceIcon service={picked} className="size-8" />
                <div className="text-sm font-medium">{SERVICE_NAMES[picked]}</div>
              </div>
              {picked === 'deepseek' && props.state.web.deepseekConnected && (
                <button
                  disabled={busy}
                  onClick={() => void connect(false)}
                  className="flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary hover:bg-accent/40"
                >
                  <span className="rounded-lg bg-primary p-2 text-primary-foreground">
                    <LogIn className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{t('Use the DeepSeek provider’s key')}</span>
                </button>
              )}
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (key.trim()) void connect(true)
                }}
                className="flex gap-2"
              >
                <Input
                  autoFocus
                  type="password"
                  autoComplete="off"
                  aria-label={t('{name} API key', { name: SERVICE_NAMES[picked] })}
                  placeholder={t('{name} API key', { name: SERVICE_NAMES[picked] })}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                />
                <Button type="submit" disabled={busy || !key.trim()}>
                  {busy && <Spinner />} {t('Connect')}
                </Button>
              </form>
              {!props.initial && (
                <Button variant="ghost" className="justify-self-start" onClick={() => setPicked(undefined)}>
                  ← {t('All search services')}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, GitBranch, Languages, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { LogoMark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LOCALES, setLocale, t, tk, useLocale } from '@/lib/i18n'

const FEATURES = [
  { icon: Users, title: tk('Write together, live'), text: tk('Real-time editing with cursors, presence and per-user undo.') },
  { icon: Sparkles, title: tk('An agent that compiles'), text: tk('Fixes errors as a reviewable diff, verified by a real build.') },
  { icon: GitBranch, title: tk('Every version kept'), text: tk('Automatic history with labels, compare and one-click restore.') },
  { icon: ShieldCheck, title: tk('Your server, your data'), text: tk('Self-hosted, invitation-only, with a sandboxed TeX Live.') },
]

// LaTeX source, shown as is in every language.
const SNIPPET = [
  String.raw`\documentclass{article}`,
  String.raw`\usepackage{amsmath}`,
  String.raw`\begin{document}`,
  String.raw`\section{Results}`,
  'We find that', // i18n-ignore
  String.raw`\begin{equation}`,
  '  E = mc^2',
  String.raw`\end{equation}`,
  String.raw`\end{document}`,
]

/**
 * The typing, frame by frame: [line, characters shown]. Lines are typed in
 * order, except that a finished \begin{…} brings its \end{…} at once, the
 * way the editor closes environments.
 */
const FRAMES: [number, number][] = (() => {
  const frames: [number, number][] = []
  const typed = SNIPPET.map(() => false)
  SNIPPET.forEach((line, i) => {
    if (typed[i]) return
    for (let n = 1; n <= line.length; n++) frames.push([i, n])
    typed[i] = true
    const env = /^\\begin\{(\w+)\}/.exec(line)?.[1]
    const close = env ? SNIPPET.findIndex((l, j) => j > i && l === `\\end{${env}}`) : -1
    if (close >= 0) {
      frames.push([close, SNIPPET[close]!.length])
      typed[close] = true
    }
  })
  return frames
})()

/** Types the snippet out once, like someone writing, in a panel that keeps its size. */
function TypedSnippet() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= FRAMES.length) return
    const prev = FRAMES[step - 1]
    // A pause before starting, and after each line, as when writing.
    const delay = step === 0 ? 500 : prev && prev[1] === SNIPPET[prev[0]]!.length ? 260 : 32
    const timer = setTimeout(() => setStep(step + 1), delay)
    return () => clearTimeout(timer)
  }, [step])
  const shown = SNIPPET.map(() => 0)
  for (const [line, n] of FRAMES.slice(0, step)) shown[line] = n
  const cursor = step < FRAMES.length ? FRAMES[step]![0] : FRAMES.at(-1)![0]
  return (
    <pre className="font-mono text-[13px] leading-[1.35rem] text-white/90" aria-label={SNIPPET.join('\n')}>
      {SNIPPET.map((full, i) => {
        const line = full.slice(0, shown[i])
        return (
          <div key={i} className="flex h-[1.35rem] gap-3" aria-hidden>
            <span className="w-4 shrink-0 select-none text-right text-white/30">{i + 1}</span>
            <span className="whitespace-pre">
              {line.split(/(\\[a-zA-Z]+)/).map((part, j) =>
                part.startsWith('\\') ? (
                  <span key={j} className="text-sky-200">
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
              {i === cursor && <span className="ml-px inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-white" />}
            </span>
          </div>
        )
      })}
    </pre>
  )
}

/** These pages are seen before signing in, so the language can be picked here too. */
function LanguageMenu() {
  const locale = useLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label={t('Language')}>
          <Languages /> {LOCALES.find(x => x.id === locale)?.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map(x => (
          <DropdownMenuItem key={x.id} onSelect={() => setLocale(x.id)}>
            {x.label}
            {locale === x.id && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The form's card. */
function AuthCard({ children }: { children: ReactNode }) {
  return <div className="relative w-full max-w-[420px] rounded-2xl border bg-card p-8 text-card-foreground shadow-2xl shadow-blue-950/40 max-sm:p-6">{children}</div>
}

/** Sign-in, first-run setup and invitations: the introduction and the form's card side by side, on blue. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-primary text-white dark:bg-blue-950">
      {/* Grid paper */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <header className="relative flex items-center justify-between p-4 lg:px-10 lg:pt-8 [@media(max-height:820px)]:lg:pt-5">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10 rounded-lg bg-white/15 ring-1 ring-white/30" />
          <span className="text-2xl font-semibold tracking-tight">ColTex</span>
        </div>
      </header>

      {/* The intro beside the card fits the window's height as well: shorter windows get a
          tighter heading, feature titles without their text, and below 700 px no code panel. */}
      <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-24 [@media(max-height:820px)]:py-4">
        <aside className="hidden lg:block">
          <div className="grid gap-8 [@media(max-height:860px)]:gap-5">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md text-4xl leading-tight font-semibold tracking-tight [@media(max-height:860px)]:text-3xl"
            >
              {t('LaTeX for your whole group, on your own server.')}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 shadow-2xl shadow-indigo-950/30 backdrop-blur [@media(max-height:700px)]:hidden"
            >
              <div className="mb-2.5 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-white/30" />
                <span className="size-2.5 rounded-full bg-white/30" />
                <span className="size-2.5 rounded-full bg-white/30" />
                <span className="ml-2 text-xs text-white/60">main.tex</span>
              </div>
              <TypedSnippet />
            </motion.div>

            <div className="grid max-w-md gap-4 sm:grid-cols-2 [@media(max-height:820px)]:gap-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 [@media(max-height:820px)]:items-center"
                >
                  <span className="h-fit rounded-lg bg-white/15 p-2">
                    <f.icon className="size-4" />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{t(f.title)}</span>
                    <span className="text-xs leading-relaxed text-white/70 [@media(max-height:820px)]:hidden">{t(f.text)}</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

        </aside>

        <div className="flex justify-center">
          <AuthCard>
            <div className="absolute top-5 right-5 max-sm:top-3 max-sm:right-3">
              <LanguageMenu />
            </div>
            <h1 className="pr-24 text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </AuthCard>
        </div>
      </main>

      <footer className="relative p-4 text-center text-sm text-white/70 lg:pb-8 [@media(max-height:820px)]:lg:pb-4">{t('Open source under AGPL-3.0')}</footer>
    </div>
  )
}

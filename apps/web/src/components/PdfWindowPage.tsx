import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crosshair, Download, PanelRightClose, Play, ScrollText } from 'lucide-react'
import { OUTPUT, type CompileResult } from '@coltex/shared'
import { api } from '../lib/api.ts'
import { t } from '../lib/i18n.ts'
import { PING_MS, pdfChannel, type EditorMessage, type PdfWindowMessage } from '../lib/pdf-window.ts'
import { LogPanel } from './LogPanel.tsx'
import { PdfViewer, type PdfViewerHandle } from './PdfViewer.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Spinner } from './ui/spinner.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

type State = Extract<EditorMessage, { type: 'state' }>

/**
 * The PDF on its own (`#/project/<id>/pdf`), driven by the project's editor
 * window: it builds, and this window shows the result, asks for builds and
 * sends double-clicks back as SyncTeX jumps.
 */
export function PdfWindowPage({ projectId }: { projectId: string }) {
  const [state, setState] = useState<State>()
  const [connected, setConnected] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const pdf = useRef<PdfViewerHandle>(null)
  const channel = useRef<BroadcastChannel>(null)
  const send = (message: PdfWindowMessage) => channel.current?.postMessage(message)

  /** False once the editor took the PDF back (if this window couldn't close itself). */
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (!active) return
    const ch = pdfChannel(projectId)
    channel.current = ch
    let lastHeard = 0
    ch.onmessage = (e: MessageEvent<EditorMessage>) => {
      const m = e.data
      if (m.type === 'close') {
        setActive(false)
        window.close()
        return
      }
      if (m.type === 'closing') {
        setConnected(false)
        return
      }
      lastHeard = Date.now()
      setConnected(true)
      if (m.type === 'state') setState(m)
      if (m.type === 'positions') {
        setShowLogs(false)
        pdf.current?.showPositions(m.positions)
      }
    }
    ch.postMessage({ type: 'hello' } satisfies PdfWindowMessage)
    const timer = window.setInterval(() => {
      ch.postMessage({ type: 'ping' } satisfies PdfWindowMessage)
      // An editor that stopped answering (closed, reloaded) shows as disconnected.
      if (Date.now() - lastHeard > PING_MS * 2.5) setConnected(false)
    }, PING_MS)
    const bye = () => ch.postMessage({ type: 'bye' } satisfies PdfWindowMessage)
    window.addEventListener('pagehide', bye)
    return () => {
      bye()
      window.removeEventListener('pagehide', bye)
      window.clearInterval(timer)
      ch.close()
      channel.current = null
    }
  }, [projectId, active])

  useEffect(() => {
    document.title = state ? `${state.name} – PDF` : 'PDF'
  }, [state?.name])

  const result: CompileResult | undefined = state?.result
  const pdfUrl = state?.pdfBuild ? api.buildUrl(projectId, state.pdfBuild.buildId, OUTPUT.pdf) : undefined
  const logUrl = result?.outputFiles.includes(OUTPUT.log) ? api.buildUrl(projectId, result.buildId, OUTPUT.log) : undefined
  const errorCount = result?.diagnostics.filter(d => d.level === 'error').length ?? 0
  const compiling = !!state?.compiling

  if (!active) {
    return (
      <div className="grid h-full place-content-center justify-items-center gap-3 bg-muted/40 text-sm text-muted-foreground">
        {t('The PDF is back in the editor window.')}
        <Button variant="outline" size="sm" onClick={() => setActive(true)}>
          {t('Show it here')}
        </Button>
      </div>
    )
  }

  return (
    <section className="flex h-full min-w-0 flex-col bg-muted/40">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b bg-card px-2">
        <Button size="sm" onClick={() => send({ type: 'compile' })} disabled={compiling || !connected} className="min-w-24">
          {compiling ? <Spinner /> : <Play className="fill-current" />}
          {compiling ? t('Compiling…') : t('Recompile')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!result}
          onClick={() => setShowLogs(v => !v)}
          aria-pressed={showLogs && !!result}
          className={showLogs && result ? 'bg-accent text-accent-foreground hover:bg-accent' : ''}
        >
          <ScrollText /> {t('Logs')}
          {result && (
            <Badge variant={errorCount ? 'destructive' : 'secondary'} className="h-4 min-w-4 px-1 text-[11px] tabular-nums">
              {errorCount}
            </Badge>
          )}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => send({ type: 'sync-to-pdf' })} disabled={!pdfUrl || !connected} aria-label={t('Go to PDF')}>
              <Crosshair />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Go to PDF')}</TooltipContent>
        </Tooltip>
        <span className="min-w-0 flex-1 truncate px-2 text-center text-sm text-muted-foreground">
          {connected ? state?.name : t('The editor window is closed')}
        </span>
        {pdfUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={pdfUrl} download={`${state?.name ?? 'output'}.pdf`} aria-label={t('Download PDF')}>
                  <Download />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('Download PDF')}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => window.close()} aria-label={t('Back to the editor window')}>
              <PanelRightClose />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Back to the editor window')}</TooltipContent>
        </Tooltip>
      </div>
      {state?.error && <p className="border-b bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{state.error}</p>}
      <div className="relative min-h-0 flex-1">
        <PdfViewer ref={pdf} url={pdfUrl} compiling={compiling} onSyncToCode={pos => send({ type: 'sync-to-code', pos })} />
        <AnimatePresence>
          {showLogs && result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-background"
            >
              <LogPanel result={result} rawLogUrl={logUrl} onJump={(file, line) => send({ type: 'open', file, line })} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

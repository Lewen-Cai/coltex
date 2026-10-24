import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import 'pdfjs-dist/web/pdf_viewer.css'
import { FileText, FileWarning } from 'lucide-react'
import type { PdfPosition } from '@coltex/shared'
import { t } from '../lib/i18n.ts'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const HIGHLIGHT_MS = 2500

/**
 * The parts of pdf.js's PDFPageView we rely on. `PDFViewer.getPageView` is
 * typed `any` upstream; naming the shape here surfaces API drift at typecheck.
 */
type PageView = {
  div: HTMLDivElement
  pdfPage?: { view: number[] }
  viewport: pdfjs.PageViewport
}

function pageViewOf(viewer: PDFViewer, pageNumber: number): PageView | undefined {
  return viewer.getPageView(pageNumber - 1) as PageView | undefined
}

export type PdfViewerHandle = {
  /** Scroll to and briefly highlight SyncTeX boxes. */
  showPositions: (positions: PdfPosition[]) => void
}

type Props = {
  url?: string
  /** A compile is running: show progress over the current PDF. */
  compiling?: boolean
  /** Double-click on the PDF: page (1-based) and point in big points from the page's top-left. */
  onSyncToCode?: (pos: { page: number; h: number; v: number }) => void
}

export const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer({ url, compiling, onSyncToCode }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const viewer = useRef<PDFViewer>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const loadingTask = useRef<pdfjs.PDFDocumentLoadingTask>(null)
  const onSync = useRef(onSyncToCode)
  onSync.current = onSyncToCode

  useEffect(() => {
    const eventBus = new EventBus()
    const v = new PDFViewer({
      container: container.current!,
      viewer: container.current!.firstElementChild as HTMLDivElement,
      eventBus,
    })
    eventBus.on('pagesinit', () => {
      v.currentScaleValue = 'page-width'
    })
    viewer.current = v
    // Fit the width whenever the pane changes size (window or panel resize).
    let lastWidth = 0
    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.round(entry?.contentRect.width ?? 0)
      // Hidden (e.g. while the history view is open): nothing to fit, and pdf.js can't scroll.
      if (width === 0 || width === lastWidth) return
      lastWidth = width
      if (v.pdfDocument) v.currentScaleValue = 'page-width'
    })
    resizeObserver.observe(container.current!)

    const onDoubleClick = (e: MouseEvent) => {
      const pageEl = (e.target as HTMLElement).closest<HTMLElement>('.page')
      const pageNumber = Number(pageEl?.dataset.pageNumber)
      if (!pageEl || !pageNumber) return
      const pageView = pageViewOf(v, pageNumber)
      if (!pageView?.pdfPage) return
      // Position inside the page's content box (the page has a border).
      const rect = pageEl.getBoundingClientRect()
      const x = e.clientX - rect.left - pageEl.clientLeft
      const y = e.clientY - rect.top - pageEl.clientTop
      const [pdfX, pdfY] = pageView.viewport.convertToPdfPoint(x, y) as number[]
      const pageHeight = pageView.pdfPage.view[3]!
      onSync.current?.({ page: pageNumber, h: pdfX!, v: pageHeight - pdfY! })
    }
    container.current!.addEventListener('dblclick', onDoubleClick)
    const el = container.current!
    return () => {
      resizeObserver.disconnect()
      el.removeEventListener('dblclick', onDoubleClick)
    }
  }, [])

  useEffect(() => {
    const v = viewer.current
    setFailed(null)
    if (!v || !url) return
    let cancelled = false
    // Preserve the reading position across recompiles.
    const scrollTop = container.current!.scrollTop
    const task = pdfjs.getDocument({
      url,
      // Needed for CJK and other non-embedded encodings; served by the Vite plugin / server.
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      wasmUrl: '/pdfjs/wasm/',
      iccUrl: '/pdfjs/iccs/',
    })
    task.promise.then(
      doc => {
        if (cancelled) return void task.destroy()
        const previous = loadingTask.current
        loadingTask.current = task
        v.setDocument(doc)
        v.eventBus.on(
          'pagesloaded',
          () => {
            container.current!.scrollTop = scrollTop
          },
          { once: true },
        )
        void previous?.destroy()
      },
      // Not a PDF pdf.js can read (a broken or misnamed file): say so instead of a blank pane.
      err => {
        if (cancelled) return
        console.error('Failed to load PDF', err)
        setFailed((err as Error).message || String(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [url])

  useImperativeHandle(ref, () => ({
    showPositions(positions) {
      const v = viewer.current
      const scroller = container.current
      if (!v || !scroller || positions.length === 0) return
      let first: { top: number; pageEl: HTMLElement } | undefined
      for (const p of positions) {
        const pageView = pageViewOf(v, p.page)
        if (!pageView?.pdfPage) continue
        const pageHeight = pageView.pdfPage.view[3]!
        // SyncTeX boxes extend `height` above the baseline at v; PDF space has its origin bottom-left.
        const [x1, y1] = pageView.viewport.convertToViewportPoint(p.h, pageHeight - p.v + p.height) as number[]
        const [x2, y2] = pageView.viewport.convertToViewportPoint(p.h + p.width, pageHeight - p.v) as number[]
        const box = document.createElement('div')
        box.className = 'coltex-synctex-highlight'
        Object.assign(box.style, {
          left: `${Math.min(x1!, x2!)}px`,
          top: `${Math.min(y1!, y2!)}px`,
          width: `${Math.abs(x2! - x1!)}px`,
          height: `${Math.abs(y2! - y1!)}px`,
        })
        pageView.div.appendChild(box)
        setTimeout(() => box.remove(), HIGHLIGHT_MS)
        first ??= { top: Math.min(y1!, y2!), pageEl: pageView.div }
      }
      if (first) {
        scroller.scrollTo({ top: first.pageEl.offsetTop + first.top - scroller.clientHeight / 3, behavior: 'smooth' })
      }
    },
  }))

  return (
    <>
      <div ref={container} className="absolute inset-0 overflow-auto bg-muted">
        <div className="pdfViewer" />
        {url && failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center text-sm text-muted-foreground">
            <span className="rounded-2xl bg-card p-4 shadow-sm">
              <FileWarning className="size-8 text-amber-600 dark:text-amber-400" />
            </span>
            {`Can't display this PDF: ${failed}`}
          </div>
        )}
        {!url && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-2xl bg-card p-4 shadow-sm">
              <FileText className="size-8 text-primary/60" />
            </span>
            {compiling ? t('Compiling…') : t('Compile to see the PDF')}
            {!compiling && <span className="text-xs">{t('Press ⌘S or ⌘↵ in the editor')}</span>}
          </div>
        )}
      </div>
      {compiling && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/15">
          <div className="h-full w-1/3 animate-[coltex-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      )}
    </>
  )
})

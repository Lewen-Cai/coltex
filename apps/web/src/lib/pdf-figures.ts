import type { PdfDocumentLike } from '@coltex/latex-language'

/**
 * Loads a PDF figure for the visual editor (it draws the first page). pdf.js
 * is imported on first use with the same worker and assets as the PDF viewer.
 */
export async function loadPdfFigure(url: string): Promise<PdfDocumentLike> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({
    url,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
  })
  const doc = await task.promise
  // pdf.js 6 frees a document through its loading task.
  return {
    getPage: n => doc.getPage(n) as unknown as ReturnType<PdfDocumentLike['getPage']>,
    destroy: () => task.destroy(),
  }
}

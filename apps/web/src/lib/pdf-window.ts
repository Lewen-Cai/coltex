import type { CompileResult, PdfPosition } from '@coltex/shared'

/**
 * The PDF in a window of its own (Overleaf's "Open PDF in separate tab"),
 * for a second screen. The editor keeps compiling; the two windows talk over
 * a BroadcastChannel per project (same browser, same origin only).
 */

/** Editor → PDF window. */
export type EditorMessage =
  | { type: 'state'; name: string; result?: CompileResult; pdfBuild?: CompileResult; compiling: boolean; error?: string }
  | { type: 'positions'; positions: PdfPosition[] }
  | { type: 'pong' }
  /** The editor window is going away. */
  | { type: 'closing' }
  /** The editor shows the PDF itself again: close this window. */
  | { type: 'close' }

/** PDF window → editor. */
export type PdfWindowMessage =
  | { type: 'hello' }
  | { type: 'ping' }
  | { type: 'bye' }
  | { type: 'compile' }
  | { type: 'sync-to-pdf' }
  | { type: 'sync-to-code'; pos: { page: number; h: number; v: number } }
  | { type: 'open'; file: string; line: number }

export const pdfChannel = (projectId: string) => new BroadcastChannel(`coltex:pdf:${projectId}`)

/** How often the PDF window says it is still there, and when the editor stops believing it. */
export const PING_MS = 2000
export const PING_TIMEOUT_MS = 6000

export const pdfWindowRoute = (projectId: string) => `/project/${projectId}/pdf`

/** Open (or bring forward) the project's PDF window. */
export function openPdfWindow(projectId: string) {
  const url = `${window.location.pathname}#${pdfWindowRoute(projectId)}`
  const win = window.open(url, `coltex-pdf-${projectId}`, 'popup,width=900,height=1000')
  win?.focus()
  return win
}

// ColTex: what the visual editor needs from the web app, passed in as facets:
// file URLs for graphics (Overleaf's file-preview facet), a PDF loader for
// PDF figures (Overleaf imports its pdf.js wrapper directly), and the table
// editor (React components in the web app; Overleaf renders them from the widget).

import { Facet, type Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import { filePreview, type PreviewByPath } from '../file-preview'
import type { ParsedTableData } from '../../components/table-generator/utils'

/** The parts of pdf.js's PDFDocumentProxy the graphics widget uses. */
export type PdfDocumentLike = {
  getPage(n: number): Promise<{
    getViewport(options: { scale: number }): { width: number; height: number }
    render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; canvas?: HTMLCanvasElement }): unknown
  }>
  destroy(): Promise<void>
}

export type PdfLoader = (url: string) => Promise<PdfDocumentLike>

export const pdfLoaderFacet = Facet.define<PdfLoader, PdfLoader | null>({
  combine: values => values[0] ?? null,
})

/** What the table editor is rendered with (Overleaf's <Tabular> props). */
export type TabularProps = {
  view: EditorView
  tabularNode: SyntaxNode
  tableNode: SyntaxNode | null
  parsedTableData: ParsedTableData
  directTableChild: boolean
}

/** Renders the table editor into a widget's element (again on every update) and tears it down. */
export type TableRenderer = {
  render(element: HTMLElement, props: TabularProps): void
  destroy(element: HTMLElement): void
}

export const tableRendererFacet = Facet.define<TableRenderer, TableRenderer | null>({
  combine: values => values[0] ?? null,
})

/** What the \\ref, \\href, \\input… tooltips ask the web app to do. */
export type CommandTooltipActions = {
  /** Open a file named in \\input, \\include or \\subfile (as written, maybe without .tex). */
  openFile?: (path: string) => void
  /** Go to a \\label that isn't in the open file. */
  openLabel?: (label: string) => void
  /** Open a link (default: a new tab, for http(s) and mailto only). */
  openUrl?: (url: string) => void
}

export const commandTooltipActionsFacet = Facet.define<CommandTooltipActions, CommandTooltipActions | null>({
  combine: values => values[0] ?? null,
})

export type VisualOptions = {
  /** URL and extension of a project file, or null if there's no such file. */
  previewByPath: PreviewByPath
  /** Loads a PDF (for PDF figures); without it PDF figures show their path. */
  loadPdf?: PdfLoader
  /** The table editor; without it tables stay as source. */
  renderTable?: TableRenderer
  /** Following \\ref, \\input… from their tooltips. */
  commandActions?: CommandTooltipActions
}

export const visualOptions = ({ previewByPath, loadPdf, renderTable, commandActions }: VisualOptions): Extension => [
  filePreview(previewByPath),
  loadPdf ? pdfLoaderFacet.of(loadPdf) : [],
  renderTable ? tableRendererFacet.of(renderTable) : [],
  commandActions ? commandTooltipActionsFacet.of(commandActions) : [],
]

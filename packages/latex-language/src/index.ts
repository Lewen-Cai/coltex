export { latex } from './languages/latex/index'
export { bibtex } from './languages/bibtex/index'
/** Spell checking reads the plain-text spans of a line from the syntax tree. */
export { getNormalTextSpansFromLine } from './utils/tree-query'
export { metadataState, setMetadata, setMetadataEffect, type Metadata, type PackageCommand } from './extensions/language'
export { buildProjectMetadata, extractBibKeys, extractTexMetadata, buildFolder } from './metadata/project-metadata'
export { loadPackageCommands, type PackageCommands } from './metadata/package-commands'
export { countProjectWords, emptyWordCountData, SourceSnapshot } from './word-count/project-snapshot'
export type { WordCountData } from './word-count/word-count-data'
/** Editor toolbar commands (Overleaf's), the symbol palette, and the visual-mode flag they consult. */
export {
  ADD_COMMENT_EVENT,
  addComment,
  deleteSelection,
  indentDecrease,
  indentIncrease,
  insertCite,
  insertFigure,
  insertRef,
  insertTable,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleNumberedList,
  toggleSearch,
  wrapInDisplayMath,
  wrapInHref,
  wrapInInlineMath,
} from './extensions/toolbar/commands'
export { findCurrentSectionHeadingLevel, setSectionHeadingLevel } from './extensions/toolbar/sections'
export { ancestorListType } from './extensions/toolbar/lists'
export { withinFormattingCommand, type FormattingCommand } from './utils/tree-operations/formatting'
export { minimumListDepthForSelection } from './utils/tree-operations/ancestors'
export { symbolPalette } from './extensions/symbol-palette'
export { isVisual, visualMode } from './extensions/visual-mode'
/** What a position is on (a \ref target, an \input file), for the editor's context menu. */
export { commandTargetAt, type CommandTarget } from './extensions/command-tooltip'
// Overleaf's visual (rich text) editor: `visual(path, on)` in the editor's extensions, `setVisual(on)` to switch.
export { visual, setVisual } from './extensions/visual/visual'
export { visualOptions, type VisualOptions, type PdfLoader, type PdfDocumentLike } from './extensions/visual/visual-options'
/** Tell the visual editor the project's files changed (figures resolve again). */
export { setFilePreview } from './extensions/file-preview'
export { convertPreamble, declaredMathOperators } from './extensions/visual/utils/katex'
/** Fired (on window) when an edit touched \label, \usepackage, … so project metadata should be rebuilt. */
export const METADATA_OUTDATED_EVENT = 'editor:metadata-outdated'
// Overleaf's table editor: the model, parser and commands; the web app renders it (visualOptions.renderTable).
export { TableData, type CellData, type ColumnDefinition, type RowData, type Positions } from './components/table-generator/tabular'
export { TableSelection } from './components/table-generator/contexts/selection-context'
export {
  parseTableEnvironment,
  type CellPosition,
  type CellSeparator,
  type ParsedTableData,
  type RowPosition,
  type RowSeparator,
  type TableEnvironmentData,
} from './components/table-generator/utils'
export {
  BorderTheme,
  insertColumn,
  insertRow,
  mergeCells,
  moveCaption,
  removeCaption,
  removeColumnWidths,
  removeNodes,
  removeRowOrColumns,
  setAlignment,
  setBorders,
  setColumnWidth,
  unmergeCells,
} from './components/table-generator/toolbar/commands'
export { UNITS, type WidthSelection, type WidthUnit } from './components/table-generator/toolbar/column-width-modal/column-width'
export { typesetCell } from './components/table-generator/typeset-cell'
export type { TableRenderer, TabularProps } from './extensions/visual/visual-options'
// The figure modal (the web app draws it): the figure being edited, and inserting or updating figures.
export { editFigureData, editFigureDataEffect, FigureData } from './extensions/figure-modal'
export { FIGURE_MODAL_OPEN_EVENT } from './extensions/visual/visual-widgets/editable-graphics'
export { FIGURE_MODAL_PASTE_EVENT, ALLOWED_IMAGE_TYPES, type PastedImageData } from './utils/paste-image'
export {
  deleteFigure,
  figureTexts,
  insertFigure as insertFigureWith,
  labelForPath,
  uniqueLabel,
  updateFigure,
  type FigureOptions,
} from './components/figure-modal/figure-commands'
// The file outline (sections of the open file), for the web app's outline pane.
export { documentOutline } from './languages/latex/document-outline'
export { nestOutline, type Outline } from './utils/tree-operations/outline'
export { ProjectionStatus } from './utils/tree-operations/projection'
export { textMacrosIn, expandTextMacros } from './utils/text-macros'
// Errors in the editor: compile log entries on their lines (Overleaf's annotations), and the code check.
export { annotations, setAnnotations, showCompileLogDiagnostics, type Annotation } from './extensions/annotations'
export { setSyntaxValidation } from './extensions/language'
// The equation preview above maths in the code editor.
export { mathPreview, setMathPreview } from './extensions/math-preview'

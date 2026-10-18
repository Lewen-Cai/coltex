import { tags } from '@lezer/highlight'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Compartment, EditorState, Prec, type Extension } from '@codemirror/state'
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  type Command,
  type KeyBinding,
} from '@codemirror/view'
import { defaultKeymap, deleteLine, indentWithTab, toggleComment } from '@codemirror/commands'
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { gotoLine, highlightSelectionMatches, openSearchPanel, searchKeymap, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import { createTableRenderer } from '../table-generator/render.tsx'
import {
  addComment,
  annotations as compileAnnotations,
  bibtex,
  latex,
  mathPreview,
  setAnnotations,
  setFilePreview,
  setMathPreview,
  setMetadata,
  setSyntaxValidation,
  setVisual,
  showCompileLogDiagnostics,
  symbolPalette,
  toggleBold,
  toggleItalic,
  visual as visualEditor,
  visualOptions,
  type Annotation,
  type Metadata,
  type VisualOptions,
} from '@coltex/latex-language'
import type { SpellCheckLanguage } from '@coltex/shared'
import { withoutOwnSessions, type CollabDoc } from '../lib/collab.ts'
import { editorThemeVariables } from '../lib/editor-themes.ts'
import { LINE_HEIGHTS, getEditorSettings, useEditorSettings, type EditorSettings } from '../lib/editor-settings.ts'
import { t } from '../lib/i18n.ts'
import { reviewEffects, reviewExtension, type ReviewConfig } from '../lib/review-extension.ts'
import { SHORTCUT_COMMANDS, bindingsFor, type CustomShortcuts, type ShortcutCommand } from '../lib/shortcuts.ts'
import { setSpellCheckLanguage, spelling as spellingExtension, type HunspellManager } from '../spelling/index.ts'

export type CodeEditorHandle = {
  goToLine: (line: number) => void
  /** 1-based line and 0-based column of the main cursor. */
  getCursor: () => { line: number; column: number } | undefined
  /** The main selection, if it is not empty. Lines are 1-based. */
  getSelection: () => { fromLine: number; toLine: number; text: string } | undefined
  /** Select a range and scroll it into view. */
  selectRange: (from: number, to: number) => void
  /** Review: highlight a thread or change, show the range being commented on, re-run highlights. */
  /** 1-based line of an offset. */
  lineAt: (pos: number) => number
  setActiveReview: (id: string | null) => void
  setCommentDraft: (range: { from: number; to: number } | null) => void
  refreshReview: () => void
  /** The live editor (for toolbar commands), if mounted. */
  getView: () => EditorView | null
  /** Called after every update that changes the document or selection; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void
}

/** Review options; callbacks may change between renders (the latest ones are used). */
export type EditorReview = Omit<ReviewConfig, 'ydoc'>

export type EditorSelection = { fromLine: number; toLine: number }

/** Spell checking: the project's language ('' = off) and the Hunspell worker for it (once loaded). */
export type EditorSpelling = { language: SpellCheckLanguage; manager?: HunspellManager }

type Props = {
  /** Identifies the open document; a new key resets editor state. */
  docKey: string
  /** File path, used to pick the language. */
  path: string
  /** The shared document this editor is bound to. */
  collab: CollabDoc
  readOnly?: boolean
  /** Project-wide labels, bib keys, packages and files for completions. */
  metadata?: Metadata
  onChange: (content: string) => void
  onSave: () => void
  /** Ctrl/Cmd+F (or the person's key for Search), with the selected text; without it the editor's own find panel opens. */
  onFind?: (selection: string) => void
  /** The selected line range changed (undefined when nothing is selected). */
  onSelectionChange?: (selection: EditorSelection | undefined) => void
  /** Comments and tracked changes. */
  review?: EditorReview
  /** Spell checking (LaTeX files the user can type in only). */
  spelling?: EditorSpelling
  /** Overleaf's visual (rich text) mode, for LaTeX files; switching doesn't rebuild the editor. */
  visual?: boolean
  /** Project files for the visual mode's figures (URLs, PDF loading). */
  visualFiles?: VisualOptions
  /** Entries of the last compile log that are in this file, shown on their lines. */
  annotations?: Annotation[]
}

export function languageFor(path: string): 'latex' | 'bibtex' | 'plain' {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  if (['tex', 'sty', 'cls', 'ltx', 'dtx', 'ins', 'tikz'].includes(ext)) return 'latex'
  if (ext === 'bib') return 'bibtex'
  return 'plain'
}

const LANGUAGES: Record<ReturnType<typeof languageFor>, () => Extension> = {
  latex,
  bibtex,
  plain: () => [],
}

/** Match the app theme: card background, quiet gutter, blue cursor and selection. */
// The --editor-* variables are set by a colour theme (lib/editor-themes.ts).
const coltexTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--editor-bg, var(--card))' },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg, var(--card))',
    color: 'var(--editor-gutter, var(--muted-foreground))',
    borderRight: '1px solid var(--editor-border, var(--border))',
  },
  '.cm-activeLine': { backgroundColor: 'var(--editor-active-line, color-mix(in oklch, var(--primary) 5%, transparent))' },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active-line, color-mix(in oklch, var(--primary) 9%, transparent))',
    color: 'var(--editor-cursor, var(--primary))',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--editor-selection, color-mix(in oklch, var(--primary) 20%, transparent)) !important',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--editor-cursor, var(--primary))', borderLeftWidth: '2px' },
  '.cm-tooltip': {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    backgroundColor: 'var(--popover)',
    boxShadow: 'var(--shadow-popover)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
  },
  '.cm-foldGutter span': { color: 'var(--muted-foreground)' },
})

/** Token colours come from CSS variables (`--syntax-*` in index.css), so they follow the light/dark theme. */
const coltexHighlight = HighlightStyle.define([
  { tag: tags.meta, color: 'var(--syntax-meta)' },
  { tag: tags.link, textDecoration: 'underline' },
  { tag: tags.heading, textDecoration: 'underline', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)' },
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName], color: 'var(--syntax-atom)' },
  { tag: [tags.literal, tags.inserted, tags.number], color: 'var(--syntax-literal)' },
  { tag: [tags.string, tags.deleted], color: 'var(--syntax-string)' },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: 'var(--syntax-escape)' },
  { tag: [tags.definition(tags.variableName), tags.definition(tags.propertyName)], color: 'var(--syntax-definition)' },
  { tag: [tags.typeName, tags.namespace, tags.tagName], color: 'var(--syntax-type)' },
  { tag: [tags.className, tags.attributeValue], color: 'var(--syntax-attribute)' },
  { tag: [tags.special(tags.variableName), tags.macroName], color: 'var(--syntax-macro)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: tags.invalid, color: 'var(--destructive)' },
])

/**
 * CodeMirror's own UI text (search panel, go to line, fold markers, …) in the
 * interface language. Read when the editor is created.
 */
function editorPhrases(): Extension {
  return EditorState.phrases.of({
    Find: t('Find'),
    Replace: t('Replace'),
    next: t('next'),
    previous: t('previous'),
    all: t('all'),
    'match case': t('match case'),
    regexp: t('regexp'),
    'by word': t('by word'),
    replace: t('replace'),
    'replace all': t('replace all'),
    close: t('close'),
    'current match': t('current match'),
    'on line': t('on line'),
    'replaced $ matches': t('replaced $ matches'),
    'replaced match on line $': t('replaced match on line $'),
    'Go to line': t('Go to line'),
    go: t('go'),
    'Fold line': t('Fold line'),
    'Unfold line': t('Unfold line'),
    'Folded lines': t('Folded lines'),
    'Unfolded lines': t('Unfolded lines'),
    'folded code': t('folded code'),
    unfold: t('unfold'),
    to: t('to'),
    Completions: t('Completions'),
    Diagnostics: t('Diagnostics'),
    'No diagnostics': t('No diagnostics'),
    'Control character': t('Control character'),
    'Selection deleted': t('Selection deleted'),
    // The visual editor's own text (Overleaf's phrase keys).
    end_of_document: t('End of document'),
    expand: t('Expand'),
    learn_more: t('Learn more'),
    hide_document_preamble: t('Hide document preamble'),
    show_document_preamble: t('Show document preamble'),
    the_visual_editor_cant_preview_this_type_of_image_file: t("The visual editor can't preview this type of image file"),
    click_recompile_and_check_your_pdf_to_see_how_its_looking: t('Recompile and check the PDF to see how it looks'),
    paste_options: t('Paste options'),
    paste_with_formatting: t('Paste with formatting'),
    paste_without_formatting: t('Paste without formatting'),
    edit_figure: t('Edit figure'),
    open_link: t('Open link'),
    remove_link: t('Remove link'),
    open_target: t('Go to label'),
    open_file: t('Open file'),
    sorry_your_table_cant_be_displayed_at_the_moment: t("Sorry, this table can't be displayed at the moment."),
    this_could_be_because_we_cant_support_some_elements_of_the_table: t('This could be because it uses something the table editor does not support yet.'),
  })
}

/**
 * CodeMirror's basicSetup minus its own undo history: in a shared document,
 * undo must only revert *your* edits, which Yjs' UndoManager provides.
 */
const setup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(coltexHighlight, { fallback: true }),
  bracketMatching(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...yUndoManagerKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
]

/** Editor settings that need their own compartment, so a change reconfigures only that part. */
const appearanceConf = new Compartment()
const keybindingsConf = new Compartment()
const closeBracketsConf = new Compartment()
const autocompleteConf = new Compartment()

/** Font, size and line height, through the variables the visual editor reads too (as Overleaf's theme.ts sets them). */
/** The visual editor keeps the page's colours: themes are for the source. */
function appearance(s: EditorSettings, visual: boolean): Extension {
  return EditorView.theme({
    '&.cm-editor.cm-editor': {
      ...(visual ? {} : editorThemeVariables(s.editorTheme)),
      fontSize: `${s.fontSize}px`,
      // The visual editor's text is 1.15 × --font-size; at the default 15 px this is the 14 px it was designed for.
      '--font-size': `${Math.round(((s.fontSize * 14) / 15) * 100) / 100}px`,
      '--source-font-family': s.fontFamily === 'sans' ? 'var(--font-sans)' : 'var(--font-mono)',
      '--line-height': String(LINE_HEIGHTS[s.lineHeight]),
    },
    '.cm-scroller': { fontFamily: 'var(--source-font-family)' },
    '.cm-content, .cm-gutter': { lineHeight: 'var(--line-height)' },
  })
}

const shortcutsConf = new Compartment()

/** Commands that change the text, which read-only editors leave out. */
const EDITING: ShortcutCommand[] = ['bold', 'italic', 'toggleComment', 'deleteLine']

/**
 * The commands of lib/shortcuts.ts on the person's keys, above every other
 * keymap. A default key whose command was moved elsewhere does nothing (unless
 * it is now another command's key, which comes first).
 */
function shortcutKeymap(custom: CustomShortcuts, readOnly: boolean, actions: { save: Command; find: Command }): Extension {
  const run: Record<ShortcutCommand, Command> = {
    compile: actions.save,
    search: actions.find,
    bold: toggleBold,
    italic: toggleItalic,
    toggleComment,
    deleteLine,
    selectNext: selectNextOccurrence,
    selectAll: selectSelectionMatches,
    gotoLine,
    addComment: view => {
      if (view.state.selection.main.empty) return false
      addComment()
      return true
    },
  }
  const commands = SHORTCUT_COMMANDS.filter(c => !readOnly || !EDITING.includes(c.id))
  const bindings: KeyBinding[] = commands.flatMap(c => bindingsFor(c.id, custom).map(key => ({ key, run: run[c.id], preventDefault: true })))
  for (const c of commands) if (custom[c.id]) for (const key of c.defaults) bindings.push({ key, run: () => true, preventDefault: true })
  return Prec.highest(keymap.of(bindings))
}

const closeBracketsFor = (on: boolean): Extension => (on ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : [])

// Typing no longer opens the list when autocomplete is off; Ctrl+Space still does (as in Overleaf).
const autocompleteFor = (on: boolean): Extension => autocompletion({ activateOnTyping: on })

/** Vim and Emacs load on first use; their keys must come before every other keymap. */
async function keybindingsFor(mode: EditorSettings['keybindings']): Promise<Extension> {
  if (mode === 'vim') return Prec.highest((await import('@replit/codemirror-vim')).vim({ status: true }))
  if (mode === 'emacs') return Prec.highest((await import('@replit/codemirror-emacs')).emacs())
  return []
}

/** Set the compile log entries and run the lint source once with them (it only reruns on edits by itself). */
function showAnnotations(view: EditorView, annotations: Annotation[]) {
  view.dispatch(setAnnotations(view.state, annotations), showCompileLogDiagnostics(true))
}

/** The code check runs on .tex files only (packages and classes are full of @-commands it doesn't understand). */
const codeChecked = (path: string) => /\.tex$/i.test(path)

/** Lint markers and the gutter in the app's colours. */
const diagnosticsTheme = EditorView.theme({
  '.cm-diagnostic': { padding: '6px 10px', borderLeftWidth: '3px', maxWidth: '480px', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: '13px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--destructive)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'oklch(0.77 0.16 70)' },
  '.cm-diagnostic-info': { borderLeftColor: 'var(--muted-foreground)' },
  '.cm-tooltip-lint': { padding: '0' },
  '.cm-gutter-lint': { width: '1.1em' },
  '.cm-gutter-lint .cm-gutterElement': { padding: '0 2px' },
})

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { docKey, path, collab, readOnly = false, metadata, onChange, onSave, onFind, onSelectionChange, review, spelling, visual = false, visualFiles, annotations },
  ref,
) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView>(null)
  // Keep latest callbacks without rebuilding the editor.
  const callbacks = useRef({ onChange, onSave, onSelectionChange, onFind })
  callbacks.current = { onChange, onSave, onSelectionChange, onFind }
  // Stable, so the shortcut keymap can be rebuilt without the editor.
  const shortcutActions = useRef<{ save: Command; find: Command }>({
    save: () => {
      callbacks.current.onSave()
      return true
    },
    find: view => {
      const find = callbacks.current.onFind
      if (!find) return openSearchPanel(view)
      const { from, to } = view.state.selection.main
      find(view.state.sliceDoc(from, to))
      return true
    },
  })
  const latestReview = useRef(review)
  latestReview.current = review
  const latestMetadata = useRef(metadata)
  latestMetadata.current = metadata
  const listeners = useRef(new Set<() => void>())
  const latestSpelling = useRef(spelling)
  latestSpelling.current = spelling
  /** Whether this editor has the spelling extension (LaTeX, typing allowed); changes go through effects. */
  const spellChecked = useRef(false)
  const latestVisual = useRef(visual)
  latestVisual.current = visual
  const latestVisualFiles = useRef(visualFiles)
  latestVisualFiles.current = visualFiles
  const latestAnnotations = useRef(annotations)
  latestAnnotations.current = annotations
  const settings = useEditorSettings()

  useEffect(() => {
    const save = () => {
      callbacks.current.onSave()
      return true
    }
    const { ydoc, ytext, provider, undoManager } = collab
    const r = () => latestReview.current!
    const reviewExt = latestReview.current
      ? reviewExtension({
          ydoc,
          userId: latestReview.current.userId,
          canComment: latestReview.current.canComment,
          isTracking: () => !readOnly && r().isTracking(),
          colorOf: id => r().colorOf(id),
          isHidden: id => r().isHidden(id),
          onAddComment: (from, to) => r().onAddComment(from, to),
          onFocus: focus => r().onFocus(focus),
          onResolved: review => r().onResolved(review),
        })
      : []
    // Like Overleaf, only text the user can edit is spell checked, and only LaTeX.
    spellChecked.current = !readOnly && languageFor(path) === 'latex'
    const sp = latestSpelling.current
    const spellingExt = spellChecked.current
      ? spellingExtension({ spellCheckLanguage: sp?.manager ? sp.language || undefined : undefined, hunspellManager: sp?.manager })
      : []
    const prefs = getEditorSettings()
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        setup,
        editorPhrases(),
        coltexTheme,
        diagnosticsTheme,
        appearanceConf.of(appearance(prefs, latestVisual.current && languageFor(path) === 'latex')),
        keybindingsConf.of([]),
        shortcutsConf.of(shortcutKeymap(prefs.shortcuts, readOnly, shortcutActions.current)),
        closeBracketsConf.of(closeBracketsFor(prefs.autoCloseBrackets)),
        autocompleteConf.of(autocompleteFor(prefs.autoComplete)),
        // Compile log entries for this file, on their lines (the lint gutter is shared with the code check).
        compileAnnotations(),
        LANGUAGES[languageFor(path)](),
        languageFor(path) === 'latex' ? mathPreview(prefs.mathPreview) : [],
        // The visual mode is set up for every LaTeX editor and switched with setVisual.
        languageFor(path) === 'latex'
          ? [
              visualEditor(path, latestVisual.current),
              visualOptions({
                previewByPath: p => latestVisualFiles.current?.previewByPath(p) ?? null,
                loadPdf: url => latestVisualFiles.current?.loadPdf?.(url) ?? Promise.reject(new Error('PDF figures are not available here')),
                commandActions: {
                  openFile: p => latestVisualFiles.current?.commandActions?.openFile?.(p),
                  openLabel: l => latestVisualFiles.current?.commandActions?.openLabel?.(l),
                },
                // The table editor's keys don't reach CodeMirror's keymap: compile and undo come in here.
                // Undo restores the selection from before the edit, which a table edit didn't move, and
                // scrolls to it; keep the table in view instead.
                renderTable: createTableRenderer({
                  compile: save,
                  undo: view => {
                    const scroll = view.scrollSnapshot()
                    undoManager.undo()
                    view.dispatch({ effects: scroll })
                  },
                  redo: view => {
                    const scroll = view.scrollSnapshot()
                    undoManager.redo()
                    view.dispatch({ effects: scroll })
                  },
                }),
              }),
            ]
          : [],
        EditorView.lineWrapping,
        // Inserts symbols picked in the palette (window event `editor:insert-symbol`); not in read-only editors.
        readOnly ? [] : symbolPalette(),
        EditorState.readOnly.of(readOnly),
        // The person's other sessions don't show their cursors here (see withoutOwnSessions).
        yCollab(ytext, withoutOwnSessions(provider.awareness!), { undoManager }),
        // After yCollab, whose sync config (facet) it reads.
        reviewExt,
        spellingExt,
        EditorView.updateListener.of(u => {
          if (u.docChanged || u.selectionSet || u.focusChanged) for (const l of listeners.current) l()
          if (u.docChanged) callbacks.current.onChange(u.state.doc.toString())
          if (u.selectionSet || u.docChanged) {
            const { from, to, empty } = u.state.selection.main
            callbacks.current.onSelectionChange?.(
              empty ? undefined : { fromLine: u.state.doc.lineAt(from).number, toLine: u.state.doc.lineAt(to).number },
            )
          }
        }),
      ],
    })
    const v = new EditorView({ state, parent: host.current! })
    if (latestMetadata.current) v.dispatch(setMetadata(latestMetadata.current))
    if (latestAnnotations.current) showAnnotations(v, latestAnnotations.current)
    if (languageFor(path) === 'latex') v.dispatch(setSyntaxValidation(prefs.codeCheck && codeChecked(path)))
    callbacks.current.onChange(state.doc.toString())
    callbacks.current.onSelectionChange?.(undefined)
    view.current = v
    for (const l of listeners.current) l()
    return () => {
      view.current = null
      v.destroy()
    }
    // `path` only matters through the language, which is part of `docKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, collab, readOnly])

  useEffect(() => {
    if (metadata) view.current?.dispatch(setMetadata(metadata))
  }, [metadata])

  // A new build: its log entries replace the ones shown (they move with edits until then).
  useEffect(() => {
    const v = view.current
    if (v) showAnnotations(v, annotations ?? [])
  }, [annotations])

  // Editor settings apply to open editors at once, each through its compartment.
  useEffect(() => {
    view.current?.dispatch({
      effects: [
        appearanceConf.reconfigure(appearance(settings, visual && languageFor(path) === 'latex')),
        closeBracketsConf.reconfigure(closeBracketsFor(settings.autoCloseBrackets)),
        autocompleteConf.reconfigure(autocompleteFor(settings.autoComplete)),
      ],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fontSize, settings.fontFamily, settings.lineHeight, settings.editorTheme, settings.autoCloseBrackets, settings.autoComplete, visual])

  useEffect(() => {
    const v = view.current
    if (!v || languageFor(path) !== 'latex') return
    v.dispatch(setSyntaxValidation(settings.codeCheck && codeChecked(path)))
    v.dispatch(setMathPreview(settings.mathPreview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.codeCheck, settings.mathPreview])

  useEffect(() => {
    view.current?.dispatch({ effects: shortcutsConf.reconfigure(shortcutKeymap(settings.shortcuts, readOnly, shortcutActions.current)) })
  }, [settings.shortcuts, readOnly])

  // Also after a rebuild of the editor (docKey), whose compartment starts empty.
  useEffect(() => {
    let cancelled = false
    void keybindingsFor(settings.keybindings).then(ext => {
      if (!cancelled) view.current?.dispatch({ effects: keybindingsConf.reconfigure(ext) })
    })
    return () => {
      cancelled = true
    }
  }, [settings.keybindings, docKey, collab, readOnly])

  // Switch between the source and visual modes in place (LaTeX files only).
  useEffect(() => {
    const v = view.current
    if (!v || languageFor(path) !== 'latex') return
    v.dispatch(setVisual(visual))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual])

  // The project's files changed (an upload, a rename): figures in the visual editor resolve again.
  useEffect(() => {
    const v = view.current
    if (!v || languageFor(path) !== 'latex') return
    v.dispatch(setFilePreview(p => latestVisualFiles.current?.previewByPath(p) ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualFiles])

  // A new language or worker replaces the spell checker without rebuilding the editor.
  // Until the worker has loaded, there is nothing to check with.
  const spellLanguage = spelling?.manager ? spelling.language || undefined : undefined
  useEffect(() => {
    if (!spellChecked.current) return
    view.current?.dispatch(setSpellCheckLanguage({ spellCheckLanguage: spellLanguage, hunspellManager: spelling?.manager }))
  }, [spellLanguage, spelling?.manager])

  useImperativeHandle(ref, () => ({
    getView: () => view.current,
    subscribe(listener: () => void) {
      listeners.current.add(listener)
      return () => listeners.current.delete(listener)
    },
    getCursor() {
      const v = view.current
      if (!v) return undefined
      const head = v.state.selection.main.head
      const line = v.state.doc.lineAt(head)
      return { line: line.number, column: head - line.from }
    },
    getSelection() {
      const v = view.current
      if (!v) return undefined
      const { from, to, empty } = v.state.selection.main
      if (empty) return undefined
      return {
        fromLine: v.state.doc.lineAt(from).number,
        toLine: v.state.doc.lineAt(to).number,
        text: v.state.sliceDoc(from, to),
      }
    },
    selectRange(from: number, to: number) {
      const v = view.current
      if (!v) return
      const len = v.state.doc.length
      const a = Math.min(from, len)
      const b = Math.min(to, len)
      v.dispatch({ selection: { anchor: a, head: b }, effects: EditorView.scrollIntoView(a, { y: 'center' }) })
      v.focus()
    },
    lineAt(pos: number) {
      const v = view.current
      return v ? v.state.doc.lineAt(Math.min(pos, v.state.doc.length)).number : 1
    },
    setActiveReview(id: string | null) {
      view.current?.dispatch({ effects: reviewEffects.setActive(id) })
    },
    setCommentDraft(range: { from: number; to: number } | null) {
      view.current?.dispatch({ effects: reviewEffects.setDraft(range) })
    },
    refreshReview() {
      view.current?.dispatch({ effects: reviewEffects.refresh() })
    },
    goToLine(line: number) {
      const v = view.current
      if (!v) return
      const pos = v.state.doc.line(Math.min(Math.max(line, 1), v.state.doc.lines)).from
      v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
      v.focus()
    },
    // The methods only read refs: one stable handle (EditorPage keeps it in state for the toolbar).
  }), [])

  return <div ref={host} className="h-full overflow-hidden" />
})

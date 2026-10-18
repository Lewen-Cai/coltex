/**
 * Colour themes for the code editor, as in Overleaf's editor settings. Each
 * sets the token colours (`--syntax-*`, see index.css) and the editor's own
 * surface inside the editor only; "default" follows the app's light/dark
 * theme. The palettes are the published ones of each theme.
 */
export type EditorThemeId = 'default' | 'solarized-light' | 'github' | 'solarized-dark' | 'monokai' | 'dracula' | 'nord' | 'one-dark'

type Palette = {
  dark: boolean
  bg: string
  fg: string
  gutter: string
  selection: string
  cursor: string
  activeLine: string
  keyword: string
  atom: string
  literal: string
  string: string
  escape: string
  definition: string
  type: string
  attribute: string
  macro: string
  comment: string
  meta: string
}

const THEMES: Record<Exclude<EditorThemeId, 'default'>, Palette> = {
  'solarized-light': {
    dark: false,
    bg: '#fdf6e3',
    fg: '#586e75',
    gutter: '#93a1a1',
    selection: '#eee8d5',
    cursor: '#657b83',
    activeLine: '#eee8d580',
    keyword: '#268bd2',
    atom: '#6c71c4',
    literal: '#859900',
    string: '#2aa198',
    escape: '#cb4b16',
    definition: '#268bd2',
    type: '#b58900',
    attribute: '#d33682',
    macro: '#6c71c4',
    comment: '#93a1a1',
    meta: '#657b83',
  },
  github: {
    dark: false,
    bg: '#ffffff',
    fg: '#24292f',
    gutter: '#8c959f',
    selection: '#0969da26',
    cursor: '#0969da',
    activeLine: '#f6f8fa',
    keyword: '#cf222e',
    atom: '#0550ae',
    literal: '#116329',
    string: '#0a3069',
    escape: '#953800',
    definition: '#8250df',
    type: '#953800',
    attribute: '#0550ae',
    macro: '#8250df',
    comment: '#6e7781',
    meta: '#57606a',
  },
  'solarized-dark': {
    dark: true,
    bg: '#002b36',
    fg: '#93a1a1',
    gutter: '#586e75',
    selection: '#073642',
    cursor: '#93a1a1',
    activeLine: '#07364280',
    keyword: '#268bd2',
    atom: '#6c71c4',
    literal: '#859900',
    string: '#2aa198',
    escape: '#cb4b16',
    definition: '#268bd2',
    type: '#b58900',
    attribute: '#d33682',
    macro: '#6c71c4',
    comment: '#586e75',
    meta: '#839496',
  },
  monokai: {
    dark: true,
    bg: '#272822',
    fg: '#f8f8f2',
    gutter: '#90908a',
    selection: '#49483e',
    cursor: '#f8f8f0',
    activeLine: '#3e3d3266',
    keyword: '#f92672',
    atom: '#ae81ff',
    literal: '#ae81ff',
    string: '#e6db74',
    escape: '#fd971f',
    definition: '#a6e22e',
    type: '#66d9ef',
    attribute: '#a6e22e',
    macro: '#66d9ef',
    comment: '#88846f',
    meta: '#f8f8f2',
  },
  dracula: {
    dark: true,
    bg: '#282a36',
    fg: '#f8f8f2',
    gutter: '#6272a4',
    selection: '#44475a',
    cursor: '#f8f8f2',
    activeLine: '#44475a66',
    keyword: '#ff79c6',
    atom: '#bd93f9',
    literal: '#bd93f9',
    string: '#f1fa8c',
    escape: '#ffb86c',
    definition: '#50fa7b',
    type: '#8be9fd',
    attribute: '#50fa7b',
    macro: '#8be9fd',
    comment: '#6272a4',
    meta: '#f8f8f2',
  },
  nord: {
    dark: true,
    bg: '#2e3440',
    fg: '#d8dee9',
    gutter: '#4c566a',
    selection: '#434c5e',
    cursor: '#d8dee9',
    activeLine: '#3b425280',
    keyword: '#81a1c1',
    atom: '#b48ead',
    literal: '#b48ead',
    string: '#a3be8c',
    escape: '#ebcb8b',
    definition: '#88c0d0',
    type: '#8fbcbb',
    attribute: '#8fbcbb',
    macro: '#88c0d0',
    comment: '#616e88',
    meta: '#d8dee9',
  },
  'one-dark': {
    dark: true,
    bg: '#282c34',
    fg: '#abb2bf',
    gutter: '#636d83',
    selection: '#3e4451',
    cursor: '#528bff',
    activeLine: '#2c313c',
    keyword: '#c678dd',
    atom: '#d19a66',
    literal: '#d19a66',
    string: '#98c379',
    escape: '#56b6c2',
    definition: '#61afef',
    type: '#e5c07b',
    attribute: '#e06c75',
    macro: '#61afef',
    comment: '#7f848e',
    meta: '#abb2bf',
  },
}

/** In the order the settings list them; light themes first. */
export const EDITOR_THEMES: { id: EditorThemeId; name: string }[] = [
  { id: 'default', name: 'ColTex' },
  { id: 'github', name: 'GitHub' },
  { id: 'solarized-light', name: 'Solarized Light' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nord' },
  { id: 'one-dark', name: 'One Dark' },
]

export const isEditorTheme = (value: unknown): value is EditorThemeId => EDITOR_THEMES.some(theme => theme.id === value)

/** CSS for CodeMirror's theme spec on the editor element; {} for the default theme. */
export function editorThemeVariables(id: EditorThemeId): Record<string, string> {
  if (id === 'default') return {}
  const p = THEMES[id]
  return {
    colorScheme: p.dark ? 'dark' : 'light',
    color: p.fg,
    '--editor-bg': p.bg,
    '--editor-gutter': p.gutter,
    '--editor-border': `${p.gutter}40`,
    '--editor-selection': p.selection,
    '--editor-cursor': p.cursor,
    '--editor-active-line': p.activeLine,
    '--syntax-keyword': p.keyword,
    '--syntax-atom': p.atom,
    '--syntax-literal': p.literal,
    '--syntax-string': p.string,
    '--syntax-escape': p.escape,
    '--syntax-definition': p.definition,
    '--syntax-type': p.type,
    '--syntax-attribute': p.attribute,
    '--syntax-macro': p.macro,
    '--syntax-comment': p.comment,
    '--syntax-meta': p.meta,
  }
}

import { describe, expect, test } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete'
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language'
import { bibtex, buildProjectMetadata, extractBibKeys, extractTexMetadata, latex, setMetadata } from '../src/index'

function stateFor(doc: string, files = new Map<string, string>()) {
  const state = EditorState.create({ doc, extensions: [latex()] })
  const metadata = buildProjectMetadata(
    [...files.keys()].map(path => ({ path, binary: false })),
    files,
  )
  return state.update(setMetadata(metadata)).state
}

/** Run every LaTeX completion source at `pos` and collect the labels offered. */
async function completionsAt(state: EditorState, pos: number): Promise<string[]> {
  // Without a view nothing drives the incremental parser; argument completions need the tree.
  ensureSyntaxTree(state, state.doc.length, 5000)
  const sources = state.languageDataAt<CompletionSource>('autocomplete', pos)
  const context = new CompletionContext(state, pos, true)
  const results = await Promise.all(sources.map(s => s(context)))
  return results.filter((r): r is CompletionResult => !!r).flatMap(r => r.options.map(o => o.label))
}

describe('LaTeX parser', () => {
  test('parses commands, environments, math and comments without errors', () => {
    const doc = String.raw`\documentclass{article}
\usepackage{amsmath}
% a comment
\begin{document}
\section{Intro}\label{sec:intro}
Text with $E=mc^2$ and \cite{knuth84}.
\begin{equation}a+b\end{equation}
\end{document}`
    const state = EditorState.create({ doc, extensions: [latex()] })
    const tree = ensureSyntaxTree(state, doc.length, 5000) ?? syntaxTree(state)
    const names = new Set<string>()
    let errors = 0
    tree.iterate({
      enter: n => {
        names.add(n.name)
        if (n.type.isError) errors++
      },
    })
    expect(errors).toBe(0)
    for (const name of ['DocumentClass', 'UsePackage', 'Comment', 'DocumentEnvironment', 'SectioningCommand', 'Label', 'Cite', 'InlineMath', 'EquationEnvironment']) {
      expect(names, name).toContain(name)
    }
  })

  test('bibtex language parses entries', () => {
    const doc = '@book{knuth84, title={The TeXbook}, year=1984}'
    const state = EditorState.create({ doc, extensions: [bibtex()] })
    const tree = ensureSyntaxTree(state, doc.length, 5000)!
    expect(tree.toString()).toMatch(/Entry/)
  })
})

describe('project metadata', () => {
  test('labels and packages ignore comments', () => {
    const meta = extractTexMetadata(String.raw`\usepackage[utf8]{inputenc}
\usepackage{amsmath, graphicx}
% \usepackage{hidden}
\label{fig:a} 50\% \label{eq:b}
% \label{gone}
\begin{lstlisting}[label=lst:code]`)
    expect(meta.packages).toEqual(['inputenc', 'amsmath', 'graphicx'])
    expect(meta.labels.sort()).toEqual(['eq:b', 'fig:a', 'lst:code'])
  })

  test('bib keys skip @string/@comment/@preamble', () => {
    expect(extractBibKeys('@string{x = "y"}\n@Article{smith2020,\n}\n@comment{a,b}\n@inproceedings( doe21 ,')).toEqual(['smith2020', 'doe21'])
  })
})

describe('completions', () => {
  test('command completion after a backslash', async () => {
    const state = stateFor('\\sec')
    expect(await completionsAt(state, 4)).toContain('\\section{}')
  })

  test('environment names after \\begin{', async () => {
    const state = stateFor('\\begin{ite')
    const labels = await completionsAt(state, 10)
    // Offered as a snippet that inserts the whole environment.
    expect(labels).toContain('\\begin{itemize} …')
  })

  test('\\ref offers labels from other project files', async () => {
    const files = new Map([['sec/intro.tex', '\\section{Intro}\\label{sec:intro}']])
    const state = stateFor('See \\ref{}', files)
    expect(await completionsAt(state, 9)).toContain('sec:intro')
  })

  test('\\cite offers keys from .bib files', async () => {
    const files = new Map([['refs.bib', '@book{knuth84, title={T}}']])
    const state = stateFor('\\cite{}', files)
    expect(await completionsAt(state, 6)).toContain('knuth84')
  })

  test('\\input offers project files', async () => {
    const files = new Map([['chapters/one.tex', '']])
    const state = stateFor('\\input{}', files)
    const labels = await completionsAt(state, 7)
    expect(labels.some(l => l.includes('chapters/one'))).toBe(true)
  })

  test('\\usepackage offers package names', async () => {
    const state = stateFor('\\usepackage{amsm}')
    expect(await completionsAt(state, 16)).toContain('amsmath')
  })

  test('commands defined in the document are offered', async () => {
    const state = stateFor('\\newcommand{\\myvec}[1]{\\mathbf{#1}}\n\\myv')
    const labels = await completionsAt(state, state.doc.length)
    expect(labels.some(l => l.startsWith('\\myvec'))).toBe(true)
  })
})

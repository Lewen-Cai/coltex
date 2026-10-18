// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/breadcrumbs.tsx
// @ e039ad26c5bf5422eb57b89fc7e57c75055e631d. See NOTICE at the repository root.
//
// ColTex: the path comes from the open file's path instead of the file tree
// data, the outline from the outline pane's hook, sections are buttons that
// jump to their heading, and it is a row above the editor (not a CodeMirror
// panel) drawn with Tailwind and lucide icons.

import { Fragment, useMemo } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import type { Outline } from '@coltex/latex-language'
import type { CodeEditorHandle } from '../components/CodeEditor.tsx'
import { getChildrenLines, useEditorOutline } from './outline-pane.tsx'

const constructOutlineHierarchy = (items: Outline[], highlightedLine: number, outlineHierarchy: Outline[] = []) => {
  for (const item of items) {
    if (item.line === highlightedLine) {
      outlineHierarchy.push(item)
      return outlineHierarchy
    }

    const childLines = getChildrenLines(item.children)
    if (childLines.includes(highlightedLine)) {
      outlineHierarchy.push(item)
      return constructOutlineHierarchy(item.children as Outline[], highlightedLine, outlineHierarchy)
    }
  }
  return outlineHierarchy
}

export function Breadcrumbs({ editor, path, isTexFile }: { editor: CodeEditorHandle | null; path: string; isTexFile: boolean }) {
  const { outline, highlightedLine } = useEditorOutline(isTexFile ? editor : null)
  const parts = path.split('/')
  const fileName = parts.pop()

  const outlineHierarchy = useMemo(
    () => (isTexFile ? constructOutlineHierarchy(outline, highlightedLine) : []),
    [outline, highlightedLine, isTexFile],
  )
  const numOutlineItems = outlineHierarchy.length

  return (
    <div
      className="flex h-7 shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-3 text-xs whitespace-nowrap text-muted-foreground [scrollbar-width:thin] [&>*]:shrink-0"
      translate="no"
    >
      {parts.map((folder, i) => (
        <Fragment key={i}>
          <span>{folder}</span>
          <Chevron />
        </Fragment>
      ))}
      <FileText className="size-3.5" />
      <span className="text-foreground">{fileName}</span>
      {numOutlineItems > 0 && <Chevron />}
      {outlineHierarchy.map((section, idx) => (
        <Fragment key={section.line}>
          <button type="button" className="rounded px-0.5 hover:text-foreground" onClick={() => editor?.goToLine(section.line)}>
            {section.title}
          </button>
          {idx < numOutlineItems - 1 && <Chevron />}
        </Fragment>
      ))}
    </div>
  )
}

const Chevron = () => <ChevronRight className="size-3.5 opacity-60" />

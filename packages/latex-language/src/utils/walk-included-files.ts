// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/walk-included-files.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { SyntaxNodeRef, Tree } from '@lezer/common'
import { LaTeXLanguage } from '../languages/latex/latex-language'

export type IncludedFile = {
  docPath: string
  content: string
  tree: Tree
}

// ColTex: a minimal stand-in for Overleaf's ProjectSnapshot (see
// word-count/project-snapshot.ts).
export type IncludedFileSnapshot = {
  locateFile(filePath: string, currentPath?: string): string | null | undefined
  getDocContents(path: string): string | null | undefined
}

/**
 * Read the file path from an IncludeArgument/InputArgument/SubfileArgument
 * node, handling both the braced form (`\input{file}`) and the brace-less
 * form (`\input file`).
 */
export const readIncludedFilePath = (
  content: string,
  nodeRef: SyntaxNodeRef
): string | undefined => {
  const argument =
    nodeRef.node.getChild('FilePathArgument')?.getChild('LiteralArgContent') ??
    nodeRef.node
      .getChild('BareFilePathArgument')
      ?.getChild('SpaceDelimitedLiteralArgContent')

  if (argument) {
    return content.substring(argument.from, argument.to).trim() || undefined
  }
}

/**
 * Walk the tree of files reachable from relativePath via
 * \include/\input/\subfile, parsing each file and calling `visit` in document
 * order. The visitor receives a `recurse` callback to descend into an
 * included file when it encounters one; included paths are resolved relative
 * to the directory of the including file. Include cycles are ignored.
 */
export const walkIncludedFiles = (
  projectSnapshot: IncludedFileSnapshot,
  relativePath: string,
  basePath: string,
  visit: (file: IncludedFile, recurse: (includePath: string) => void) => void
) => {
  // the stack of files currently being visited, for detecting include cycles
  const visiting = new Set<string>()

  const walk = (filePath: string, currentBasePath: string) => {
    const docPath = projectSnapshot.locateFile(filePath, currentBasePath)
    if (!docPath) {
      return
    }

    if (visiting.has(docPath)) {
      return
    }

    const content = projectSnapshot.getDocContents(docPath)
    if (!content) {
      return
    }

    const tree = LaTeXLanguage.parser.parse(content)

    // locateFile expects an absolute directory as its base path
    // ColTex: no path-browserify; the directory of `/${docPath}`.
    const docDir = `/${docPath}`.replace(/\/[^/]*$/, '') || '/'

    visiting.add(docPath)
    try {
      visit({ docPath, content, tree }, includePath =>
        walk(includePath, docDir)
      )
    } finally {
      visiting.delete(docPath)
    }
  }

  walk(relativePath, basePath)
}

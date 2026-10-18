// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/completions/sections.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { CompletionContext, CompletionSection } from '@codemirror/autocomplete'

type SectionGenerator = (
  context: CompletionContext,
  type: string
) => CompletionSection | string | undefined
// ColTex: Overleaf loads these from optional modules at build time; ColTex has none yet.
const sectionTitleGenerators: Array<SectionGenerator> = []

export function maybeGetSectionForOption(
  context: CompletionContext,
  type: string
) {
  for (const generator of sectionTitleGenerators) {
    const section = generator(context, type)
    if (section !== undefined) {
      return section
    }
  }
  return undefined
}

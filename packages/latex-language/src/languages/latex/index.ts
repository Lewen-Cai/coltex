// Adapted from Overleaf's languages/latex/index.ts (AGPL-3.0; upstream
// services/web/frontend/js/features/source-editor/languages/latex/index.ts @ e039ad26).
// ColTex: no plugin completion sources.

import { LanguageSupport } from '@codemirror/language'
import type { CompletionSource } from '@codemirror/autocomplete'
import { latexIndentService } from './latex-indent-service'
import { shortcuts } from './shortcuts'
import { linting } from './linting'
import { openAutocomplete } from './open-autocomplete'
import { metadata } from './metadata'
import {
  argumentCompletionSources,
  explicitCommandCompletionSource,
  inCommandCompletionSource,
  beginEnvironmentCompletionSource,
} from './complete'
import { documentCommands } from './document-commands'
import { documentOutline } from './document-outline'
import { LaTeXLanguage } from './latex-language'
import { documentEnvironments } from './document-environments'
import { metadataState } from '../../extensions/language'
import { figureModal, figureModalPasteHandler } from '../../extensions/figure-modal'

const completionSources: CompletionSource[] = [
  ...argumentCompletionSources,
  inCommandCompletionSource,
  explicitCommandCompletionSource,
  beginEnvironmentCompletionSource,
]

export const latex = () =>
  new LanguageSupport(LaTeXLanguage, [
    // ColTex: Overleaf installs this field in its language extension; completions read project metadata from it.
    metadataState,
    shortcuts(),
    documentOutline,
    documentCommands,
    documentEnvironments,
    latexIndentService(),
    linting(),
    metadata(),
    openAutocomplete(),
    figureModal(),
    figureModalPasteHandler(),
    ...completionSources.map(completionSource => LaTeXLanguage.data.of({ autocomplete: completionSource })),
  ])

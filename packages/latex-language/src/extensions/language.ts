// ColTex replacement for Overleaf's extensions/language.ts. Only the pieces the
// ported LaTeX language support depends on: the project metadata state field,
// the "language loaded" effect used by projection state fields, and the
// syntax validation (code check) switch.

import { StateEffect, StateField, type TransactionSpec } from '@codemirror/state'
import type { Folder } from '../types/folder'

/** Fired once the language (and its parser) has been set up for a document. */
export const languageLoadedEffect = StateEffect.define()

/** A command contributed by a package, as offered in completions (Overleaf's metadata-context Command). */
export type PackageCommand = {
  caption: string
  snippet: string
  meta: string
  score: number
}

/** Project-wide information used by completions (labels, bib keys, packages, commands, files). */
export type Metadata = {
  labels: Set<string>
  packageNames: Set<string>
  commands: PackageCommand[]
  referenceKeys: Set<string>
  fileTreeData: Folder
}

export const setMetadataEffect = StateEffect.define<Metadata>()

export const metadataState = StateField.define<Metadata | undefined>({
  create: () => undefined,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(setMetadataEffect)) return effect.value
    }
    return value
  },
})

export const setMetadata = (values: Metadata): TransactionSpec => ({
  effects: setMetadataEffect.of(values),
})

/** Turns the LaTeX code check (Overleaf's "syntax validation") on or off. */
export const setSyntaxValidationEffect = StateEffect.define<boolean>()

export const setSyntaxValidation = (value: boolean): TransactionSpec => ({
  effects: setSyntaxValidationEffect.of(value),
})

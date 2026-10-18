// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/spelling/learned-words.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { StateEffect } from '@codemirror/state'

export const addLearnedWordEffect = StateEffect.define<string>()

export const removeLearnedWordEffect = StateEffect.define<string>()

// ColTex: the user's words come from the API (setLearnedWords), not a meta tag.
export const learnedWords = {
  global: new Set<string>(),
}

export const setLearnedWords = (words: Iterable<string>) => {
  learnedWords.global = new Set(words)
}

export const addLearnedWord = (text: string) => {
  learnedWords.global.add(text)
  return {
    effects: addLearnedWordEffect.of(text),
  }
}

export const removeLearnedWord = (text: string) => {
  learnedWords.global.delete(text)
  return {
    effects: removeLearnedWordEffect.of(text),
  }
}

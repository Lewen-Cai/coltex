// Spell checking in the editor: Overleaf's Hunspell (WebAssembly, in a Web
// Worker) and CodeMirror extension, with ColTex's dictionary API. The project
// picks the language; each user has their own dictionary of learned words.
export { spelling, setSpellCheckLanguage } from './extensions/index'
export type { HunspellManager } from './hunspell/HunspellManager'
export { useHunspell } from './use-hunspell'
export { useLearnedWords, loadLearnedWords, noteLearnedWord } from './use-learned-words'
export { spellLanguageName, spellLanguageOptions, dicFor } from './languages'
/** Fired on window when a word is removed from the dictionary, so open editors check it again. */
export const REMOVE_LEARNED_WORD_EVENT = 'editor:remove-learned-word'

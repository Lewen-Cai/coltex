// Spell checking in the editor: Overleaf's Hunspell (WebAssembly, in a Web
// Worker) and CodeMirror extension, with ColTex's dictionary API. The project
// picks the language; each user has their own dictionary of learned words.
export { spelling, setSpellCheckLanguage } from './extensions/index'
export type { HunspellManager } from './hunspell/HunspellManager'
export { useHunspell } from './use-hunspell'
export { useLearnedWords, loadLearnedWords, noteLearnedWord } from './use-learned-words'
export { spellLanguageName, spellLanguageOptions, dicFor } from './languages'
/**
 * Fired on window when the dictionary changes outside the spelling menu (the
 * dictionary in the editor's settings), so open editors check those words again.
 */
export const LEARNED_WORDS_CHANGED_EVENT = 'editor:learned-words-changed'
export type LearnedWordsChange = { added?: string[]; removed?: string[] }

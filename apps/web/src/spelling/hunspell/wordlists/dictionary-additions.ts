// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/hunspell/wordlists/dictionary-additions.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

// ColTex: word lists are bundled with Vite's ?raw imports.
const dictionaryAdditions: Record<string, () => Promise<string>> = {
  en_US: () => import('./en_US.txt?raw').then(m => m.default),
}

export const buildAdditionalDictionary = async (
  lang: string,
  learnedWords: string[]
) => {
  const words = [...learnedWords]

  if (dictionaryAdditions[lang]) {
    const wordList = await dictionaryAdditions[lang]()
    words.push(...wordList.split('\n').filter(Boolean))
  }

  // the first line contains the approximate word count
  words.unshift(String(words.length))

  return new TextEncoder().encode(words.join('\n'))
}

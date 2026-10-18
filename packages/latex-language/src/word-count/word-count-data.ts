// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/word-count-modal/components/word-count-data.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

export type ServerWordCountData = {
  encode: string
  textWords: number
  headWords: number
  outside: number
  headers: number
  elements: number
  mathInline: number
  mathDisplay: number
  errors: number
  messages: string
}

export type WordCountData = ServerWordCountData & {
  textCharacters: number
  headCharacters: number
  captionWords: number
  captionCharacters: number
  footnoteWords: number
  footnoteCharacters: number
  abstractWords: number
  abstractCharacters: number
  otherWords: number
  otherCharacters: number
  // ColTex: CJK characters (Han, Hiragana, Katakana, Hangul) per context, so
  // Chinese and Japanese text, which has no spaces between words, gets a
  // meaningful count too.
  textCjk: number
  headCjk: number
  abstractCjk: number
  captionCjk: number
  footnoteCjk: number
  otherCjk: number
}

// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/word-count-modal/utils/segmenters.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

const wordRe = /['\-.\p{L}]+/gu
const wordLikeRe = /\p{L}/u // must contain at least one "letter" to be a word
const characterRe = /\S/gu

type SegmentDataLike = {
  segment: string
  isWordLike?: boolean
}

type SegmenterLike = {
  segment(input: string): {
    [Symbol.iterator](): IterableIterator<SegmentDataLike>
  }
}

export type Segmenters = {
  word: SegmenterLike
  character: SegmenterLike
}

export const createSegmenters = (locale?: string): Segmenters => {
  if (!Intl.Segmenter) {
    return genericSegmenters
  }

  try {
    return {
      word: new Intl.Segmenter(locale, {
        granularity: 'word', // TODO: count hyphenated words as a single word
      }),
      character: new Intl.Segmenter(locale, {
        granularity: 'grapheme',
      }),
    }
  } catch {
    return genericSegmenters
  }
}

const genericSegmenters = {
  word: {
    segment(input: string) {
      const segments: SegmentDataLike[] = []
      for (const match of input.matchAll(wordRe)) {
        segments.push({
          segment: match[0],
          isWordLike: wordLikeRe.test(match[0]),
        })
      }
      return segments
    },
  },
  character: {
    segment(input: string) {
      const segments: SegmentDataLike[] = []
      for (const match of input.matchAll(characterRe)) {
        segments.push({
          segment: match[0],
        })
      }
      return segments
    },
  },
}

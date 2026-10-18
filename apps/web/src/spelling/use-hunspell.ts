// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/hooks/use-hunspell.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { useEffect, useState } from 'react'
import type { SpellCheckLanguage } from '@coltex/shared'
import { globalIgnoredWords } from './extensions/ignored-words'
import { HunspellManager } from './hunspell/HunspellManager'
import { dicFor } from './languages'

// ColTex: WebAssembly support check inlined (upstream: utils/wasm).
const supportsWebAssembly = () => typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function'

/**
 * A Hunspell worker for the language, loaded with the user's dictionary.
 * ColTex: the learned words are passed in (undefined while they load, so the
 * worker starts once with the full list instead of being created twice).
 */
export const useHunspell = (spellCheckLanguage: SpellCheckLanguage | undefined, learnedWords: string[] | undefined) => {
  const [hunspellManager, setHunspellManager] = useState<HunspellManager>()
  const ready = learnedWords !== undefined

  useEffect(() => {
    const dic = dicFor(spellCheckLanguage)
    if (dic && ready && supportsWebAssembly()) {
      const hunspellManager = new HunspellManager(dic, [...globalIgnoredWords, ...learnedWords!])
      setHunspellManager(hunspellManager)

      return () => {
        hunspellManager.destroy()
      }
    } else {
      setHunspellManager(undefined)
    }
    // Words learned later reach the worker through the editor's effects, not a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellCheckLanguage, ready])

  return hunspellManager
}

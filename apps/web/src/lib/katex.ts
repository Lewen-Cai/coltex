import { useEffect, useState } from 'react'

export type KatexModule = Pick<typeof import('katex').default, 'renderToString'>
let katexPromise: Promise<KatexModule> | undefined

/** KaTeX (and its stylesheet) load the first time something on screen contains maths. */
export function useKatex(needed: boolean): KatexModule | undefined {
  const [katex, setKatex] = useState<KatexModule>()
  useEffect(() => {
    if (!needed || katex) return
    katexPromise ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([k]) => k.default)
    void katexPromise.then(k => setKatex(() => k))
  }, [needed, katex])
  return katex
}

/** Maths to HTML. KaTeX escapes its input (trust is off), so the result is safe to insert. */
export function renderMath(katex: KatexModule, tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { displayMode, throwOnError: false, trust: false, maxSize: 20, maxExpand: 200 })
}

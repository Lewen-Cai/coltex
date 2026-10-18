import { describe, expect, test } from 'vitest'
import katex from 'katex'
import { withoutAutoNumbers } from '../src/extensions/math-preview'

describe('equation preview', () => {
  test('numbered environments render without automatic numbers; explicit tags stay', () => {
    expect(withoutAutoNumbers('\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}')).toBe('\\begin{align*}\na &= b \\\\\nc &= d\n\\end{align*}')
    expect(withoutAutoNumbers('\\begin{equation*}x\\end{equation*}')).toBe('\\begin{equation*}x\\end{equation*}')
    const render = (tex: string) => katex.renderToString(withoutAutoNumbers(tex), { displayMode: true, throwOnError: true })
    expect(render('\\begin{equation}\ne^{i\\pi} = -1\n\\end{equation}')).not.toContain('eqn-num')
    expect(render('\\begin{gather}a\\\\b\\end{gather}')).not.toContain('eqn-num')
    const tagged = render('\\begin{equation}\nx = 1 \\tag{A}\n\\end{equation}')
    expect(tagged).toContain('katex-tag')
  })
})

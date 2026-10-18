// ColTex: typesets a table cell's LaTeX for the table editor, as Overleaf's
// Cell component does inline (typesetNodeIntoElement, then maths with KaTeX
// instead of MathJax).

import { parser } from '../../lezer-latex/latex.mjs'
import { typesetNodeIntoElement } from '../../extensions/visual/utils/typeset-content'
import { typesetElement } from '../../extensions/visual/utils/katex'

export async function typesetCell(element: HTMLElement, content: string) {
  const tree = parser.parse(content)
  element.textContent = ''
  typesetNodeIntoElement(tree.topNode, element, content.substring.bind(content))
  await typesetElement(element)
}

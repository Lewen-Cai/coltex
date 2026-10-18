import { describe, expect, test } from 'vitest'
import { expandTextMacros, textMacrosIn } from '../src/index'

describe('plain-text macros (ColTex)', () => {
  test('collects only macros that stand for plain text, and expands them', () => {
    const macros = textMacrosIn(String.raw`\newcommand{\method}{轨迹安全门控}
\newcommand\tool{Gate}
\def\name{ColTex}
\newcommand{\R}{\mathbb{R}}
\newcommand{\pair}[2]{(#1, #2)}
% \newcommand{\hidden}{commented out}`)
    expect([...macros]).toEqual([
      ['\\method', '轨迹安全门控'],
      ['\\tool', 'Gate'],
      ['\\name', 'ColTex'],
    ])
    expect(expandTextMacros('方法：动作提交前的\\method', macros)).toBe('方法：动作提交前的轨迹安全门控')
    expect(expandTextMacros('\\tool and \\toolbox, \\R', macros)).toBe('Gate and \\toolbox, \\R')
  })
})

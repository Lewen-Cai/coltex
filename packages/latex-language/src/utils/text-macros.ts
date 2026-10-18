// ColTex: macros that only stand for some plain text, e.g.
// \newcommand{\method}{Trajectory gating}. The visual editor shows their
// text in place of the command, and the file outline does in titles.

const PLAIN_TEXT_DEFINITION =
  /^\\(?:(?:re)?newcommand\*?\s*\{?\s*\\[A-Za-z]+\s*\}?|def\s*\\[A-Za-z]+)\s*\{([^{}\\$%#&^_~]*)\}\s*$/

/** The text of a definition like \newcommand{\x}{text}, or undefined if it is anything more. */
export function plainTextMacro(definition: string): string | undefined {
  return PLAIN_TEXT_DEFINITION.exec(definition)?.[1]?.trim() || undefined
}

const DEFINITION_LINE =
  /^[^%\n]*?(\\(?:(?:re)?newcommand\*?\s*\{?\s*(\\[A-Za-z]+)\s*\}?|def\s*(\\[A-Za-z]+))\s*\{[^{}\n]*\})/gm

/** Every plain-text macro defined in a document, by command name (with the backslash). */
export function textMacrosIn(text: string): Map<string, string> {
  const macros = new Map<string, string>()
  for (const m of text.matchAll(DEFINITION_LINE)) {
    const value = plainTextMacro(m[1]!)
    if (value) macros.set((m[2] ?? m[3])!, value)
  }
  return macros
}

/** `text` with those macros replaced by their text. */
export function expandTextMacros(text: string, macros: Map<string, string>): string {
  if (!macros.size) return text
  return text.replace(/\\[A-Za-z]+(?![A-Za-z])( ?)/g, (m, space: string) => {
    const value = macros.get(m.trimEnd())
    return value === undefined ? m : value + space
  })
}

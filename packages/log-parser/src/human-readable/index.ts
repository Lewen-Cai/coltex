// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/ide/human-readable-logs/HumanReadableLogs.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
// ColTex: operates on our flat LogEntry list and attaches the hint text and
// link to each entry, instead of leaving hint lookup to the UI.

import hints from './hints.ts'
import ruleset from './rules.ts'

type Entry = { message: string; content?: string }

export type HumanReadable = {
  ruleId?: string
  hint?: string
  hintUrl?: string
  /** The command to highlight in the source, e.g. `\foo` for "Undefined control sequence". */
  command?: string
}

/**
 * Improve messages, attach hints, and drop entries that merely cascade from an
 * earlier error of the same kind (e.g. mismatched environments).
 */
export function humanize<T extends Entry>(entries: T[]): (T & HumanReadable)[] {
  const seenErrorTypes: Record<string, boolean> = {} // keep track of types of errors seen
  const out: (T & HumanReadable)[] = []

  for (const original of entries) {
    const entry: T & HumanReadable = { ...original }
    let suppressed = false
    const ruleDetails = ruleset.find(rule => rule.regexToMatch.test(entry.message))

    if (ruleDetails) {
      if (ruleDetails.ruleId) {
        entry.ruleId = ruleDetails.ruleId
      }

      if (ruleDetails.newMessage) {
        entry.message = entry.message.replace(ruleDetails.regexToMatch, ruleDetails.newMessage)
      }

      let contentDetails: string[] | undefined
      if (ruleDetails.contentRegex) {
        if (entry.content != null) {
          const match = entry.content.match(ruleDetails.contentRegex)
          if (match) {
            contentDetails = match.slice(1)
          }
        }
      }

      if (contentDetails && ruleDetails.improvedTitle) {
        entry.message = ruleDetails.improvedTitle(entry.message, contentDetails)
      }

      if (contentDetails && ruleDetails.highlightCommand) {
        entry.command = ruleDetails.highlightCommand(contentDetails)
      }

      // suppress any entries that are known to cascade from previous error types
      if (ruleDetails.cascadesFrom) {
        for (const type of ruleDetails.cascadesFrom) {
          if (seenErrorTypes[type]) {
            suppressed = true
          }
        }
      }

      // record the types of errors seen
      if (ruleDetails.types) {
        for (const type of ruleDetails.types) {
          seenErrorTypes[type] = true
        }
      }

      const hint = hints[ruleDetails.ruleId]
      if (hint) {
        entry.hint = hint.text(contentDetails)
        if (hint.extraInfoURL) entry.hintUrl = hint.extraInfoURL
      }
    }

    if (!suppressed) out.push(entry)
  }
  return out
}

// ColTex: loads Overleaf's package → commands mapping (the data behind
// completions such as amsmath's \eqref once \usepackage{amsmath} is in the
// project). Overleaf's server attaches it to each document's metadata
// (MetaHandler.mjs); here the web app loads it once, lazily, as its own chunk.
// The JSON is services/web/app/src/Features/Metadata/packageMapping.mjs,
// converted unchanged.

import type { PackageCommand } from '../extensions/language'

export type PackageCommands = Record<string, PackageCommand[]>

let loading: Promise<PackageCommands> | undefined

export function loadPackageCommands(): Promise<PackageCommands> {
  loading ??= import('./package-mapping.json').then(m => m.default as PackageCommands)
  return loading
}

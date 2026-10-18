// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/file.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// ColTex: partial port, only the extension helpers (the file-tree helpers depend on Overleaf's file tree).
// See NOTICE at the repository root.

const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'eps', 'svg']

export const getFileExtension = (filename: string): string | null => {
  const parts = filename.split('.')
  if (parts.length < 2) {
    return null
  }
  return parts[parts.length - 1].toLowerCase()
}

export const hasImageExtension = (filename: string) => {
  const extension = getFileExtension(filename)
  return extension !== null && IMAGE_FILE_EXTENSIONS.includes(extension)
}

export const isSvgFile = (filename: string): boolean => {
  return getFileExtension(filename) === 'svg'
}

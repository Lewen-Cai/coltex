// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/paste-image.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
// ColTex: without findImageInClipboard/handleImagePaste (the paste menu's clipboard read).

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
])

export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mimeType)
}

export type PastedImageData = {
  name: string
  type: string
  data: Blob
}

export const FIGURE_MODAL_PASTE_EVENT = 'figure-modal:paste-image' // ColTex: named

export function dispatchFigureModalPasteEvent(
  imageData: PastedImageData
): void {
  window.dispatchEvent(
    new CustomEvent<PastedImageData>(FIGURE_MODAL_PASTE_EVENT, {
      detail: imageData,
    })
  )
}

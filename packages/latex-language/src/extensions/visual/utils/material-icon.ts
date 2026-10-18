// ColTex: stands in for Overleaf's material-icon helper (Material Symbols font),
// drawing the few icons the visual editor uses as inline SVG (lucide shapes).

const PATHS: Record<string, string> = {
  expand_more: '<path d="m6 9 6 6 6-6"/>',
  expand_less: '<path d="m18 15-6-6-6 6"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
}

export function materialIcon(type: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'material-symbols ol-cm-icon'
  span.setAttribute('aria-hidden', 'true')
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[type] ?? ''}</svg>`
  return span
}

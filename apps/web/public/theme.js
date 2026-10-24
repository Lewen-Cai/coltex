// Apply the signed-in person's theme before the first paint (see src/lib/theme.ts). A file of
// its own, not inline in index.html: the Content Security Policy allows no inline scripts.
try {
  var c = (localStorage.getItem('coltex:theme') || '').split(':').pop()
  if (c === 'dark' || c === 'moss' || c === 'plum') document.documentElement.classList.add('dark')
  if (c === 'forest' || c === 'moss' || c === 'lavender' || c === 'plum') document.documentElement.dataset.theme = c
} catch (e) {}

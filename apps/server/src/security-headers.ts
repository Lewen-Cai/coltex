import type { FastifyInstance } from 'fastify'

/**
 * The web app's Content Security Policy. Everything it loads is its own: scripts and workers
 * (pdf.js, the spell checker's WebAssembly, the code check), KaTeX's fonts and inline styles,
 * PDF figures drawn to data:/blob: images, and the API over fetch, EventSource and WebSocket.
 */
export const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const ALWAYS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  // No other site may show ColTex in a frame (clickjacking); `frame-ancestors` for newer browsers.
  'x-frame-options': 'DENY',
  'referrer-policy': 'same-origin',
}

/** Security headers on every response; the CSP on HTML pages that don't set their own. */
export function securityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (_req, reply, payload) => {
    for (const [name, value] of Object.entries(ALWAYS)) if (!reply.hasHeader(name)) reply.header(name, value)
    const type = String(reply.getHeader('content-type') ?? '')
    if (type.startsWith('text/html') && !reply.hasHeader('content-security-policy')) reply.header('content-security-policy', PAGE_CSP)
    return payload
  })
}

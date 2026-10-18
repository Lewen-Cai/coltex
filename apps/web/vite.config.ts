import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'))
/** pdf.js runtime assets: CMaps (CJK text), standard fonts, wasm decoders, ICC profiles. */
const PDFJS_ASSETS = ['cmaps', 'standard_fonts', 'wasm', 'iccs']

/** Serve pdf.js assets at /pdfjs/* in dev and copy them into the build output. */
function pdfjsAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'coltex-pdfjs-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]!).replace(/^\/+/, '')
        const file = path.join(pdfjsDir, rel)
        const top = rel.split('/')[0]!
        if (!PDFJS_ASSETS.includes(top) || !file.startsWith(pdfjsDir) || !fs.existsSync(file)) return next()
        fs.createReadStream(file).pipe(res)
      })
    },
    writeBundle() {
      for (const dir of PDFJS_ASSETS) {
        fs.cpSync(path.join(pdfjsDir, dir), path.join(outDir, 'pdfjs', dir), { recursive: true })
      }
    },
  }
}

/** Fetched by scripts/dictionaries.ts (run before `dev` and `build`). */
const dictionariesDir = path.resolve(import.meta.dirname, 'vendor/dictionaries')
/** Hunspell dictionaries (.aff/.dic) and their licences; nothing else from the package is served. */
const DICTIONARY_FILE = /^[A-Za-z_]+\.(aff|dic)$|^[a-z-]+\.copyright\.txt$/

/**
 * Serve the spell-check dictionaries at /dictionaries/* in dev and copy them
 * into the build output. The browser downloads only the project's language.
 */
function dictionaries(): Plugin {
  let outDir = 'dist'
  return {
    name: 'coltex-dictionaries',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/dictionaries', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0]!).replace(/^\/+/, '')
        const file = path.join(dictionariesDir, name)
        if (!DICTIONARY_FILE.test(name) || !fs.existsSync(file)) return next()
        res.setHeader('content-type', name.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    writeBundle() {
      const target = path.join(outDir, 'dictionaries')
      fs.mkdirSync(target, { recursive: true })
      for (const name of fs.readdirSync(dictionariesDir)) {
        if (DICTIONARY_FILE.test(name)) fs.copyFileSync(path.join(dictionariesDir, name), path.join(target, name))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pdfjsAssets(), dictionaries()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: {
      // `ws` so the real-time collaboration WebSocket (/api/collab) is proxied too.
      '/api': { target: 'http://localhost:3000', ws: true },
    },
  },
})

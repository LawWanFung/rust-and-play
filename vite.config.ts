import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * COOP/COEP headers for the in-browser rustc sandbox.
 * rustc.wasm is built for wasm32-wasip1-threads → needs SharedArrayBuffer
 * → the page must be cross-origin-isolated.
 * (Deploy note: the production host must send these headers too —
 *  Netlify/Vercel/CF Pages can; GitHub Pages cannot.)
 */
function crossOriginIsolation(): Plugin {
  return {
    name: 'coop-coep',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), crossOriginIsolation()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        spike: 'spike/index.html',
      },
    },
  },
})

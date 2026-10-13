import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Security headers for the dev/preview servers.
 *
 * COOP/COEP for the in-browser rustc sandbox: rustc.wasm is built for
 * wasm32-wasip1-threads → needs SharedArrayBuffer → the page must be
 * cross-origin-isolated.
 *
 * CSP (SECURITY.md finding 4): pure static SPA, no third-party content,
 * no inline scripts in the production build. Dev needs 'unsafe-inline'
 * in script-src for Vite's react-refresh preamble; preview (serving the
 * prod build) does not. style-src needs 'unsafe-inline' for React inline
 * style attributes (timer fills, rank bar, --hue).
 *
 * PRODUCTION DEPLOY — the host must send the same headers (GitHub Pages
 * cannot → the sandbox then degrades gracefully to multiple-choice):
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'
 * Netlify: netlify.toml [[headers]] · Vercel: vercel.json headers · CF Pages: headers.json
 */
function securityHeaders(): Plugin {
  const csp = (isProd: boolean) =>
    "default-src 'self'; " +
    `script-src 'self'${isProd ? '' : " 'unsafe-inline'"}; ` +
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self'; " +
    "img-src 'self' data:; " +
    "frame-ancestors 'none'"

  const use = (isProd: boolean) => (req: any, res: any, next: () => void) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    res.setHeader('Content-Security-Policy', csp(isProd))
    next()
  }

  return {
    name: 'security-headers',
    configureServer(server) {
      // dev: the react-refresh preamble is an inline script
      server.middlewares.use(use(false))
    },
    configurePreviewServer(server) {
      // preview serves the production build: no inline scripts
      server.middlewares.use(use(true))
    },
  }
}

export default defineConfig({
  plugins: [react(), securityHeaders()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        spike: 'spike/index.html',
      },
    },
  },
})

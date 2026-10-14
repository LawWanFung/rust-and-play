import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

// Defense in depth (QUALITY.md #1): errors outside React's render cycle
// (stray async rejections, timer callbacks) are logged — the ErrorBoundary
// handles render-phase crashes with a recoverable screen.
window.addEventListener('error', (e) => {
  console.error('uncaught error:', e.error ?? e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('unhandled promise rejection:', e.reason)
})

// The root element must exist (index.html ships it; guard anyway — a
// missing #root is a deploy misconfiguration we can at least explain).
const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:monospace;padding:2rem">RustQuest failed to start: the #root element is missing. Check the deployment.</p>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

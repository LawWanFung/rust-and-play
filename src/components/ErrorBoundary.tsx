import { Component, type ReactNode } from 'react'
import { emptySave, persistSave } from '../game/store'

/**
 * Last line of defense: ANY render/runtime exception (a malformed save
 * field, a bad module id, a content bug) lands here instead of unmounting
 * the whole app into a white screen. The recovery paths are:
 *   - "reload"      — works if the crash was transient
 *   - "reset save"  — wipes localStorage and reloads (corrupted-save crash)
 */
interface State {
  error: unknown
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown) {
    console.error('RustQuest crashed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="app">
        <div className="crash panel" role="alert">
          <div className="crash-icon">🦀💥</div>
          <h1>Something broke</h1>
          <p>
            The game hit an unexpected error. Your progress is safe — it only leaves your browser if
            you choose to reset it.
          </p>
          <div className="crash-actions">
            <button
              className="btn primary"
              onClick={() => {
                window.location.reload()
              }}
            >
              ↻ Reload
            </button>
            <button
              className="btn"
              onClick={() => {
                try {
                  persistSave(emptySave())
                } catch {
                  /* storage unavailable — the reload starts clean anyway */
                }
                window.location.reload()
              }}
            >
              ♻ Reset progress & reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

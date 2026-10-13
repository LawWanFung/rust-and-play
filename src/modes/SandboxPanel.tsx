import { useEffect, useRef, useState } from 'react'
import { sandbox, type CompileResult, type SandboxState } from '../lib/sandbox/client'
import { CodeEditor } from '../components/CodeEditor'

interface Props {
  /** the broken code from the fix question (starter for the editor) */
  initialCode: string
  /** back to the multiple-choice flow */
  onDone: () => void
}

interface TermLine {
  text: string
  cls: 'out' | 'err' | 'sys' | 'ok'
}

/** The per-question sandbox: edit real Rust, compile it with the in-browser
 *  rustc, read the real diagnostics. Multiple choice stays as the fast path
 *  below; this is the deep-dive. */
export function SandboxPanel({ initialCode, onDone }: Props) {
  const [code, setCode] = useState(initialCode)
  const [state, setState] = useState<SandboxState>(sandbox.state)
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<TermLine[]>([])
  const [lastResult, setLastResult] = useState<CompileResult | null>(null)
  const termRef = useRef<HTMLDivElement>(null)

  useEffect(() => sandbox.subscribe(setState), [])
  useEffect(() => {
    sandbox.warmup()
  }, [])
  useEffect(() => {
    const el = termRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const compile = async () => {
    if (busy || state === 'failed') return
    setBusy(true)
    setLastResult(null)
    setLines([{ text: '$ rustc main.rs', cls: 'sys' }])
    const t0 = performance.now()
    const r = await sandbox.compile(code, (stream, text) => {
      setLines((ls) => {
        const next = [...ls]
        for (const piece of text.split('\n')) {
          next.push({ text: piece, cls: stream === 'err' ? 'err' : 'out' })
        }
        return next.slice(-300) // cap the terminal
      })
    })
    const dt = (performance.now() - t0) / 1000
    setLastResult(r)
    if (r.code === 0) {
      setLines((ls) => [...ls, { text: `✓ compiled clean in ${dt.toFixed(1)}s`, cls: 'ok' }])
    } else if (r.code === 1) {
      setLines((ls) => [...ls, { text: `✗ ${dt.toFixed(1)}s — fix the errors above and compile again`, cls: 'err' }])
    } else {
      setLines((ls) => [...ls, { text: `✗ sandbox gave up after ${dt.toFixed(1)}s`, cls: 'err' }])
    }
    setBusy(false)
  }

  if (state === 'failed') {
    return (
      <div className="sandbox panel">
        <div className="sb-head">🛠 SANDBOX</div>
        <p className="sb-unavailable">
          The in-browser compiler couldn't start (offline or unsupported browser) — use the
          options below instead.
        </p>
        <button className="btn" onClick={onDone}>
          ← Back to the question
        </button>
      </div>
    )
  }

  return (
    <div className="sandbox panel">
      <div className="sb-head">
        🛠 SANDBOX <span className="sb-sub">real rustc, in your browser</span>
      </div>
      <CodeEditor value={code} onChange={setCode} lines={Math.min(14, Math.max(6, code.split('\n').length + 1))} />
      <div className="sb-actions">
        <button className="btn primary" disabled={busy || state === 'loading'} onClick={compile}>
          {busy ? '⚡ compiling…' : state === 'loading' ? '⏳ warming up rustc…' : '⚡ Compile'}
        </button>
        {state === 'loading' && <span className="sb-warm">first run downloads the compiler (~180 MB, once)</span>}
        {lastResult?.hung && <span className="sb-warn">rustc parked at shutdown — output above is complete</span>}
        <button className="btn" onClick={onDone}>
          ← Got it, back to the question
        </button>
      </div>
      <div className="sb-term" ref={termRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.cls}>
            {l.text || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

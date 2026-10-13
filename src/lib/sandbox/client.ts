// Game sandbox client — page-side orchestration for the rustc worker.
//
// One persistent worker per page (warm cache: rustc.wasm + std fetched once,
// reused across questions). The page stays fully responsive; a
// SharedArrayBuffer heartbeat (stamped on every WASI import call inside the
// worker) detects wedged runs — the rustc build parks in a futex at
// shutdown, which we contain with terminate + output inspection: diagnostics
// are printed BEFORE the park, so a wedged run still yields its full output.
//
// Graceful degradation: if the sandbox can't come up (offline, no
// cross-origin isolation, asset 404) the state stays `failed` and the UI
// falls back to the multiple-choice fix flow.
import type { StreamKind } from './types'

export interface CompileResult {
  /** 0 = compiled clean; 1 = diagnostics emitted (parked at shutdown or
   *  real non-zero exit); -998 = sandbox gave up (no usable output) */
  code: number
  out: string
  err: string
  /** true when the result came from output inspection of a wedged run */
  hung: boolean
}

export type SandboxState = 'idle' | 'loading' | 'ready' | 'failed'
export type ChunkHandler = (stream: StreamKind, text: string) => void

const STALE_MS = 8000
const MAX_ATTEMPTS = 3

class SandboxClient {
  state: SandboxState = 'idle'
  private worker: Worker | null = null
  private hb: SharedArrayBuffer | null = null
  private hbView: DataView | null = null
  private poll: number | undefined
  private runSlot: { chunk: (s: StreamKind, t: string) => void; result: (c: number, o: string, e: string) => void } | null = null
  private runSeq = 0
  private listeners = new Set<(s: SandboxState) => void>()

  constructor() {
    if (typeof window !== 'undefined' && !crossOriginIsolated) {
      this.state = 'failed' // no SharedArrayBuffer → no heartbeat → no safe containment
    }
  }

  subscribe(fn: (s: SandboxState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }
  private setState(s: SandboxState) {
    this.state = s
    this.listeners.forEach((fn) => fn(s))
  }

  /** Kick off the (one-time, ~180 MB) asset fetch + module compile now, so
   *  it overlaps with the player reading the question. Fire-and-forget. */
  warmup() {
    if (this.state !== 'idle') return
    if (!crossOriginIsolated) {
      this.setState('failed')
      return
    }
    this.setState('loading')
    this.ensureWorker()
    // readiness = assets fetched + module compiled (worker posts 'ready').
    // No probe run: a parked run must never wedge the ready state.
    this.worker?.postMessage({ kind: 'warm' })
  }

  private queue: Promise<unknown> = Promise.resolve()

  /** Compile `source`; resolves with the (possibly wedged-recovered) result.
   *  Runs are serialized (one at a time) — the worker can only do one.
   *  Never rejects for sandbox-level failures — those resolve as code -998. */
  compile(source: string, onChunk: ChunkHandler): Promise<CompileResult> {
    if (this.state === 'failed') {
      return Promise.resolve({ code: -998, out: '', err: 'sandbox unavailable', hung: false })
    }
    if (this.state === 'idle') this.setState('loading')
    this.ensureWorker()
    const run = this.queue.then(() => this.postRun(source, defaultArgs(), onChunk))
    this.queue = run.then(() => undefined)
    return run
  }

  /** Abort the in-flight run (user navigated away). */
  cancel() {
    if (this.poll) window.clearInterval(this.poll)
    this.poll = undefined
    this.worker?.terminate()
    this.worker = null
    this.hb = null
    this.hbView = null
  }

  // ------------------------------------------------------------------

  private ensureWorker() {
    if (this.worker) return
    try {
      this.worker = new Worker(new URL('./runner-worker.ts', import.meta.url), { type: 'module' })
    } catch (e) {
      this.setState('failed')
      console.error('sandbox worker failed to start', e)
      return
    }
    this.hb = new SharedArrayBuffer(8)
    this.hbView = new DataView(this.hb)
    this.hbView.setBigInt64(0, BigInt(Date.now()), true)

    this.worker.onmessage = (ev) => {
      const m = ev.data as {
        kind: string
        id?: number
        pct?: number
        label?: string
        stream?: StreamKind
        text?: string
        code?: number
        out?: string
        err?: string
      }
      switch (m.kind) {
        case 'ready':
          if (this.state !== 'failed') this.setState('ready')
          break
        case 'failed':
          this.setState('failed')
          break
        case 'progress':
          if (this.state === 'loading' && (m.pct ?? 0) >= 100) this.setState('ready')
          break
        case 'chunk':
          this.runSlot?.chunk(m.stream ?? 'out', m.text ?? '')
          break
        case 'result':
          this.runSlot?.result(m.code ?? -998, m.out ?? '', m.err ?? '')
          this.runSlot = null
          break
      }
    }
    this.worker.onerror = (e) => {
      console.error('sandbox worker error', e.message)
      this.setState('failed')
      this.runSlot?.result(-998, '', e.message || 'worker error')
      this.runSlot = null
    }
  }

  private postRun(source: string, args: string[], onChunk: ChunkHandler): Promise<CompileResult> {
    return new Promise((resolve) => {
      if (!this.worker || !this.hb || !this.hbView) {
        resolve({ code: -998, out: '', err: 'sandbox unavailable', hung: false })
        return
      }
      const worker = this.worker
      const hb = this.hb
      const view = this.hbView
      const id = ++this.runSeq

      let settled = false
      let streamed = ''
      let attempt = 0
      let poll: number | undefined

      const done = (r: CompileResult) => {
        if (settled) return
        settled = true
        if (poll) window.clearInterval(poll)
        this.stopPoll()
        resolve(r)
      }

      const freshHandler: ChunkHandler = (stream, text) => {
        streamed += text
        onChunk(stream, text)
      }

      const startAttempt = () => {
        attempt++
        view.setBigInt64(0, BigInt(Date.now()), true)
        this.runSlot = {
          chunk: (stream, text) => {
            if (text) freshHandler(stream, text)
          },
          result: (code, out, err) => {
            done({ code, out, err, hung: false })
          },
        }
        // NO transfer list: a SharedArrayBuffer cannot be transferred — it
        // is shared by reference by design.
        worker.postMessage({ kind: 'run', id, source, heartbeat: hb, args })

        poll = window.setInterval(() => {
          const last = Number(view.getBigInt64(0, true))
          if (Date.now() - last > STALE_MS) {
            window.clearInterval(poll)
            poll = undefined
            worker.terminate()
            // The run wedged (futex park at shutdown). Diagnostics are
            // printed before the park — if we captured any, that IS the
            // educational payload; return it instead of a blank failure.
            if (/error\[E\d+\]|warning:/.test(streamed)) {
              const NL = String.fromCharCode(10)
              done({
                code: 1,
                out: '',
                err: streamed + NL + 'note: rustc parked at shutdown — diagnostics above are complete' + NL,
                hung: true,
              })
            } else if (attempt < MAX_ATTEMPTS) {
              // no output yet (still booting?) — the worker is dead; a new
              // run on a fresh worker is the only recovery
              this.worker = null
              this.hb = null
              this.hbView = null
              this.ensureWorker()
              if (this.worker && this.hb && this.hbView) {
                // re-bind to the fresh worker and go again
                poll = undefined
                this.postRun(source, args, onChunk)
                  .then((r) => {
                    if (!settled) done(r)
                  })
                return
              }
              done({ code: -998, out: streamed, err: 'sandbox hung with no output; giving up', hung: true })
            } else {
              done({ code: -998, out: streamed, err: `sandbox hung ${MAX_ATTEMPTS} times; giving up`, hung: true })
            }
          }
        }, 500)
      }

      startAttempt()
    })
  }

  private stopPoll() {
    if (this.poll) window.clearInterval(this.poll)
    this.poll = undefined
  }

}

function defaultArgs(): string[] {
  return [
    'rustc',
    '/work/main.rs',
    '--sysroot',
    '/sysroot',
    '--target',
    'x86_64-unknown-linux-gnu',
    '-Ccodegen-units=1',
    '-Zthreads=1',
  ]
}

export const sandbox = new SandboxClient()

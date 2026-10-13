// In-browser rustc spike — proves the v0.3 sandbox is feasible.
//
// Stack: bjorn3/wasm-rustc (rustc 1.79.0-dev compiled for wasm32-wasip1-threads)
//        + @bjorn3/browser_wasi_shim (WASI preview1 in the browser)
//
// Assets (git-ignored, `node scripts/fetch-spike-assets.mjs`):
//   /spike/rustc.wasm          81MB compiler
//   /spike/sysroot/lib/*       98MB x86_64 std (27 files)

// ---------------------------------------------------------------- DOM

const $ = <T extends Element = Element>(sel: string) =>
  document.querySelector<T>(sel)!

const statusEl = $<HTMLDivElement>('#status')
const barWasm = $<HTMLDivElement>('#bar-wasm')
const barLibs = $<HTMLDivElement>('#bar-libs')
const pctWasm = $<HTMLSpanElement>('#pct-wasm')
const pctLibs = $<HTMLSpanElement>('#pct-libs')
const metricsEl = $<HTMLDivElement>('#metrics')
const codeEl = $<HTMLTextAreaElement>('#code')
const compileBtn = $<HTMLButtonElement>('#compile')
const terminalEl = $<HTMLDivElement>('#terminal')

/** Build the status line as DOM (textContent, never innerHTML —
 *  SECURITY.md finding 3). `tail` is unstyled trailing text. */
function setStatus(text: string, opts: { cls?: 'ok' | 'err' | 'warn'; tail?: string } = {}) {
  statusEl.textContent = ''
  const span = document.createElement('span')
  if (opts.cls) span.className = opts.cls
  span.textContent = text
  statusEl.appendChild(span)
  if (opts.tail) statusEl.appendChild(document.createTextNode(opts.tail))
}
function termWrite(text: string, cls = 'out') {
  const span = document.createElement('span')
  span.className = cls
  span.textContent = text
  terminalEl.appendChild(span)
  terminalEl.scrollTop = terminalEl.scrollHeight
}
function termLine(text = '', cls = 'out') {
  termWrite(text + '\n', cls)
}
function addMetric(name: string, ms: number) {
  const el = document.createElement('span')
  el.textContent = name + ': '
  const b = document.createElement('b')
  b.textContent = (ms / 1000).toFixed(1) + 's'
  el.appendChild(b)
  metricsEl.appendChild(el)
}

// ---------------------------------------------------------------- test cases

const CASES: Record<string, string> = {
  hello: `fn main() {\n    println!("Hello, world!");\n}\n`,
  mut: `fn main() {\n    let v = vec![1];\n    v.push(2);\n    println!("{:?}", v);\n}\n`,
  move: `fn main() {\n    let s1 = String::from("hello");\n    let s2 = s1;\n    println!("{} {}", s1, s2);\n}\n`,
  lifetime: `fn longest(x: &str, y: &str) -> &str {\n    if x.len() > y.len() { x } else { y }\n}\n\nfn main() {\n    let result = longest(String::from("long"), "short");\n    println!("{}", result);\n}\n`,
}

codeEl.value = CASES.hello
for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>('button.case'))) {
  btn.addEventListener('click', () => {
    codeEl.value = CASES[btn.dataset.case!]
    document.querySelectorAll<HTMLButtonElement>('button.case').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
  })
}
document.querySelector<HTMLButtonElement>('button.case[data-case="hello"]')!.classList.add('active')

// ---------------------------------------------------------------- std rlibs


// ---------------------------------------------------------------- output fd

// ---------------------------------------------------------------- rustc (runner worker)

let running = false
const STALE_MS = 15000
const MAX_ATTEMPTS = 3

/** One rustc run on a dedicated worker; heartbeat + terminate + retry. */
function runRustc(args: string[], source: string): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let poll: number | undefined
    let settled = false
    let streamed = '' // partial output captured from the worker (survives terminate)
    const done = (v: { code: number; out: string; err: string }) => {
      if (settled) return
      settled = true
      if (poll) window.clearInterval(poll)
      worker?.terminate()
      resolve(v)
    }
    const fail = (e: unknown) => {
      if (settled) return
      settled = true
      if (poll) window.clearInterval(poll)
      worker?.terminate()
      reject(e)
    }

    let attempt = 0
    const startAttempt = () => {
      attempt++
      try {
        worker = new Worker(new URL('./runner-worker.ts', import.meta.url), { type: 'module' })
      } catch (e) {
        fail(e)
        return
      }
      const heartbeat = new SharedArrayBuffer(8)
      new DataView(heartbeat).setBigInt64(0, BigInt(Date.now()), true)
      worker.onmessage = (ev) => {
        const m = ev.data as { kind: string; code?: number; out?: string; err?: string; label?: string; stream?: string; text?: string }
        if (m.kind === 'progress') setStatus('⚙ ' + (m.label ?? ''))
        if (m.kind === 'chunk' && m.text) {
          streamed += m.text
          termWrite(m.text, m.stream === 'err' ? 'err' : 'out')
        }
        if (m.kind === 'result') done({ code: m.code!, out: m.out!, err: m.err! })
      }
      worker.onerror = (e) => {
        // a wedged worker (futex park) never posts — the heartbeat poll
        // terminates it; an immediate error here is a boot failure
        if (poll && Date.now() - hbLast() < STALE_MS) fail(new Error(e.message || 'worker error'))
      }
      const hb = new DataView(heartbeat)
      const hbLast = () => Number(hb.getBigInt64(0, true))
      poll = window.setInterval(() => {
        if (Date.now() - hbLast() > STALE_MS) {
          window.clearInterval(poll)
          poll = undefined
          worker?.terminate()
          worker = null
          // The process wedged, but rustc may have already emitted its real
          // diagnostics before parking (the park happens at shutdown, after
          // all errors are printed). If we captured diagnostics, that IS the
          // educational payload — return it instead of a blank failure.
          const hasDiagnostics = /error\[E\d+\]|warning:/.test(streamed)
          if (hasDiagnostics) {
            done({ code: 1, out: '', err: streamed + String.fromCharCode(10) + 'note: rustc parked at shutdown; diagnostics above are complete' + String.fromCharCode(10) })
          } else if (attempt < MAX_ATTEMPTS) {
            termLine(`↻ runner wedged (no syscall activity ${STALE_MS / 1000}s) — retry ${attempt + 1}/${MAX_ATTEMPTS}`, 'sys')
            startAttempt()
          } else {
            done({ code: -998, out: '', err: `sandbox hung ${MAX_ATTEMPTS} times; giving up` })
          }
        }
      }, 500)
      // NO transfer list: a SharedArrayBuffer cannot be transferred (it is
      // shared by reference by design); the worker fetches its own assets
      worker.postMessage({ kind: 'run', source, heartbeat, args })
    }
    startAttempt()
  })
}

async function loadRustc() {
  setStatus('⚙ booting runner worker (it fetches rustc.wasm + std, ~180MB)…')
  barWasm.style.width = '100%'
  pctWasm.textContent = 'worker'
  barLibs.style.width = '100%'
  pctLibs.textContent = 'worker'

// identity check: rustc --version through the runner worker
  const t2 = performance.now()
  terminalEl.innerHTML = ''
  const v = await runRustc(['rustc', '--version'], '')
  addMetric('first run (--version)', performance.now() - t2)
  terminalEl.innerHTML = ''
  termWrite((v.out || v.err || 'rustc --version failed').trim() + String.fromCharCode(10), 'ok')

  setStatus('✓ rustc ready', { cls: 'ok', tail: ' — pick a case, hit ⚡ Compile' })
  compileBtn.disabled = false
}

// ---------------------------------------------------------------- compile

compileBtn.addEventListener('click', async () => {
  if (running) return
  running = true
  compileBtn.disabled = true
  terminalEl.innerHTML = ''

  const args = [
    'rustc',
    '/work/main.rs',
    '--sysroot', '/sysroot',
    '--target', 'x86_64-unknown-linux-gnu',
    '-Ccodegen-units=1',
    '-Zthreads=1',
  ]

  termLine(`$ ${args.join(' ')}`, 'sys')
  const t0 = performance.now()
  try {
    const r = await runRustc(args, codeEl.value)
    const dt = (performance.now() - t0) / 1000
    terminalEl.innerHTML = ''
    termLine(`$ ${args.join(' ')}`, 'sys')
    if (r.out) termWrite(r.out, 'out')
    if (r.err) termWrite(r.err, r.code === 0 ? 'out' : 'err')
    termLine('')
    if (r.code === 0) termLine(`✓ compiled clean in ${dt.toFixed(1)}s`, 'ok')
    else termLine(`✗ rustc exited with code ${r.code} after ${dt.toFixed(1)}s`, 'err')
  } catch (e) {
    termLine(`✗ ${e}`, 'err')
  }
  running = false
  compileBtn.disabled = false
})

// ---------------------------------------------------------------- boot

async function boot() {
  if (!crossOriginIsolated) {
    setStatus('✗ not cross-origin-isolated', {
      cls: 'err',
      tail:
        ' — SharedArrayBuffer unavailable. Reload via the dev server (http://localhost:5173/spike/), which sends COOP/COEP headers.',
    })
    return
  }
  setStatus('page is cross-origin-isolated ✓ — booting…')
  try {
    await loadRustc()
  } catch (e) {
    setStatus(`✗ failed: ${e}`, { cls: 'err' })
    console.error(e)
  }
}

boot()

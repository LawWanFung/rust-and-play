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

function setStatus(html: string) {
  statusEl.innerHTML = html
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
  el.innerHTML = `${name}: <b>${(ms / 1000).toFixed(1)}s</b>`
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

// The exact 27 files rustc needs under /sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib
// (same set as the browser_wasi_shim demo).
const RLIBS = [
  'libaddr2line-b8754aeb03c02354.rlib',
  'libadler-05c3545f6cd12159.rlib',
  'liballoc-0dab879bc41cd6bd.rlib',
  'libcfg_if-c7fd2cef50341546.rlib',
  'libcompiler_builtins-a99947d020d809d6.rlib',
  'libcore-4b8e8a815d049db3.rlib',
  'libgetopts-bbb75529e85d129d.rlib',
  'libgimli-598847d27d7a3cbf.rlib',
  'libhashbrown-d2ff91fdf93cacb2.rlib',
  'liblibc-dc63949c664c3fce.rlib',
  'libmemchr-2d3a423be1a6cb96.rlib',
  'libminiz_oxide-b109506a0ccc4c6a.rlib',
  'libobject-7b48def7544c748b.rlib',
  'libpanic_abort-c93441899b93b849.rlib',
  'libpanic_unwind-11d9ba05b60bf694.rlib',
  'libproc_macro-1a7f7840bb9983dc.rlib',
  'librustc_demangle-59342a335246393d.rlib',
  'librustc_std_workspace_alloc-552b185085090ff6.rlib',
  'librustc_std_workspace_core-5d8a121daa7eeaa9.rlib',
  'librustc_std_workspace_std-97f43841ce452f7d.rlib',
  'libstd-bdedb7706a556da2.rlib',
  'libstd-bdedb7706a556da2.so',
  'libstd_detect-cca21eebc4281add.rlib',
  'libsysroot-f654e185be3ffebd.rlib',
  'libtest-f06fa3fbc201c558.rlib',
  'libunicode_width-19a0dcd589fa0877.rlib',
  'libunwind-747b693f90af9445.rlib',
]

// ---------------------------------------------------------------- output fd

// ---------------------------------------------------------------- rustc (runner worker)

interface LibAsset {
  name: string
  data: ArrayBuffer
}
interface RustcAssets {
  wasmBytes: ArrayBuffer
  libs: LibAsset[]
}

let rustc: RustcAssets | null = null
let running = false
const STALE_MS = 15000
const MAX_ATTEMPTS = 3

/** One rustc run on a dedicated worker; heartbeat + terminate + retry. */
function runRustc(r: RustcAssets, args: string[], source: string): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let poll: number | undefined
    let settled = false
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
        const m = ev.data as { kind: string; code?: number; out?: string; err?: string; label?: string }
        if (m.kind === 'progress') setStatus(`⚙ ${m.label ?? ''}`)
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
          if (attempt < MAX_ATTEMPTS) {
            termLine(`↻ runner wedged (no syscall activity ${STALE_MS / 1000}s) — retry ${attempt + 1}/${MAX_ATTEMPTS}`, 'sys')
            startAttempt()
          } else {
            done({ code: -998, out: '', err: `sandbox hung ${MAX_ATTEMPTS} times; giving up` })
          }
        }
      }, 500)
      worker.postMessage(
        { kind: 'run', source, wasmBytes: r.wasmBytes, libs: r.libs, heartbeat, args },
        [r.wasmBytes, ...r.libs.map((l) => l.data), heartbeat],
      )
    }
    startAttempt()
  })
}

async function fetchWithProgress(url: string, onPct: (pct: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length') ?? 0)
  if (!res.body) return res.arrayBuffer()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    got += value.length
    if (total) onPct((got / total) * 100)
  }
  const out = new Uint8Array(got)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out.buffer
}

async function loadRustc() {
  const t0 = performance.now()

  setStatus('⬇ downloading <span class="ok">rustc.wasm</span> (81MB)…')
  const wasmBytes = await fetchWithProgress('/spike/rustc.wasm', (pct) => {
    barWasm.style.width = pct.toFixed(1) + '%'
    pctWasm.textContent = pct.toFixed(0) + '%'
  })
  addMetric('wasm download', performance.now() - t0)

  setStatus('⬇ downloading <span class="ok">std rlibs</span> (27 files, 98MB)…')
  const t1 = performance.now()
  const libs: LibAsset[] = []
  let doneCount = 0
  const queue = [...RLIBS]
  async function dlWorker() {
    for (;;) {
      const name = queue.shift()
      if (!name) return
      const res = await fetch('/spike/sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib/' + name)
      if (!res.ok) {
        throw new Error(
          `missing /spike/sysroot/lib/.../${name} (HTTP ${res.status}) — run: node scripts/fetch-spike-assets.mjs`,
        )
      }
      libs.push({ name, data: await res.arrayBuffer() })
      doneCount++
      barLibs.style.width = ((doneCount / RLIBS.length) * 100).toFixed(1) + '%'
      pctLibs.textContent = `${doneCount}/${RLIBS.length}`
    }
  }
  await Promise.all(Array.from({ length: 6 }, dlWorker))
  addMetric('rlibs download', performance.now() - t1)

  rustc = { wasmBytes, libs }

  // identity check: rustc --version through the runner worker
  const t2 = performance.now()
  terminalEl.innerHTML = ''
  const v = await runRustc(rustc, ['rustc', '--version'], '')
  addMetric('first run (--version)', performance.now() - t2)
  termWrite((v.out || v.err || 'rustc --version failed').trim() + String.fromCharCode(10), 'ok')

  setStatus('<span class="ok">✓ rustc ready</span> — pick a case, hit ⚡ Compile')
  compileBtn.disabled = false
}

// ---------------------------------------------------------------- compile

compileBtn.addEventListener('click', async () => {
  if (!rustc || running) return
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
    const r = await runRustc(rustc, args, codeEl.value)
    const dt = (performance.now() - t0) / 1000
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
    setStatus(
      '<span class="err">✗ not cross-origin-isolated</span> — SharedArrayBuffer unavailable. ' +
      'Reload via the dev server (http://localhost:5173/spike/), which sends COOP/COEP headers.',
    )
    return
  }
  setStatus('page is cross-origin-isolated ✓ — booting…')
  try {
    await loadRustc()
  } catch (e) {
    setStatus(`<span class="err">✗ failed: ${e}</span>`)
    console.error(e)
  }
}

boot()

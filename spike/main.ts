// In-browser rustc spike — proves the v0.3 sandbox is feasible.
//
// Stack: bjorn3/wasm-rustc (rustc 1.79.0-dev compiled for wasm32-wasip1-threads)
//        + @bjorn3/browser_wasi_shim (WASI preview1 in the browser)
//
// Assets (git-ignored, `node scripts/fetch-spike-assets.mjs`):
//   /spike/rustc.wasm          81MB compiler
//   /spike/sysroot/lib/*       98MB x86_64 std (27 files)

import {
  WASI,
  WASIProcExit,
  Fd,
  File,
  Directory,
  PreopenDirectory,
  strace,
  type Inode,
} from '@bjorn3/browser_wasi_shim'

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
const modeEl = $<HTMLSelectElement>('#mode')
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

/** WASI fd that appends everything written to it into the terminal. */
class TerminalFd extends Fd {
  private buf: number[] = []
  constructor(private cls: string) {
    super()
  }
  fd_write(data: Uint8Array): { ret: number; nwritten: number } {
    for (let i = 0; i < data.length; i++) this.buf.push(data[i])
    // flush on line boundaries so multi-chunk writes stay readable
    const text = new TextDecoder().decode(new Uint8Array(this.buf))
    if (text.includes('\n') || this.buf.length > 2048) {
      termWrite(text, this.cls)
      this.buf = []
    }
    return { ret: 0, nwritten: data.length }
  }
  flush() {
    if (this.buf.length) {
      termWrite(new TextDecoder().decode(new Uint8Array(this.buf)), this.cls)
      this.buf = []
    }
  }
}

// ---------------------------------------------------------------- rustc

interface Rustc {
  module: WebAssembly.Module
  sysroot: Directory
  workDir: Directory
}

let rustc: Rustc | null = null

async function fetchWithProgress(
  url: string,
  onPct: (pct: number) => void,
): Promise<ArrayBuffer> {
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

/** Spawn a fresh rustc process (one WASI instance per invocation). */
async function runRustc(r: Rustc, args: string[], trace = false): Promise<number> {
  const stdout = new TerminalFd('out')
  const stderr = new TerminalFd('err')
  const w = new WASI(args, [], [
    new TerminalFd('sys'),
    stdout,
    stderr,
    new PreopenDirectory('/tmp', new Directory([]).contents),
    new PreopenDirectory('/sysroot', r.sysroot.contents),
    new PreopenDirectory('/work', r.workDir.contents),
    new PreopenDirectory('/', new Directory([]).contents),
  ], { debug: false })
  let nextThreadId = 1
  const inst: any = await WebAssembly.instantiate(r.module, {
    env: {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true }),
    },
    wasi: {
      'thread-spawn': (startArg: number) => {
        const id = nextThreadId++
        inst.exports.wasi_thread_start(id, startArg)
        return id
      },
    },
    wasi_snapshot_preview1: trace ? strace(w.wasiImport, ['fd_prestat_get']) : w.wasiImport,
  })
  w.initialize(inst)
  try {
    w.start(inst)
    return 0
  } catch (e) {
    stdout.flush()
    stderr.flush()
    if (e instanceof WASIProcExit) return e.code
    throw e
  }
}

async function loadRustc() {
  const t0 = performance.now()

  setStatus('⬇ downloading <span class="ok">rustc.wasm</span> (81MB)…')
  const wasmBytes = new Uint8Array(
    await fetchWithProgress('/spike/rustc.wasm', (pct) => {
      barWasm.style.width = pct.toFixed(1) + '%'
      pctWasm.textContent = pct.toFixed(0) + '%'
    }),
  )
  addMetric('wasm download', performance.now() - t0)

  setStatus('⬇ downloading <span class="ok">std rlibs</span> (27 files, 98MB)…')
  const t1 = performance.now()
  const libContents: [string, Inode][] = []
  let doneCount = 0
  const queue = [...RLIBS]
  async function worker() {
    for (;;) {
      const name = queue.shift()
      if (!name) return
      const res = await fetch('/spike/sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib/' + name)
      if (!res.ok) {
        throw new Error(
          `missing /spike/sysroot/lib/.../${name} (HTTP ${res.status}) — run: node scripts/fetch-spike-assets.mjs`,
        )
      }
      libContents.push([name, new File(new Uint8Array(await res.arrayBuffer()))])
      doneCount++
      barLibs.style.width = ((doneCount / RLIBS.length) * 100).toFixed(1) + '%'
      pctLibs.textContent = `${doneCount}/${RLIBS.length}`
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  addMetric('rlibs download', performance.now() - t1)

  setStatus('⚙ compiling wasm module (81MB)…')
  const t2 = performance.now()
  const module = await WebAssembly.compile(wasmBytes.buffer as ArrayBuffer)
  addMetric('wasm compile', performance.now() - t2)

  const sysroot = new Directory([
    [
      'lib',
      new Directory([
        [
          'rustlib',
          new Directory([
            ['x86_64-unknown-linux-gnu', new Directory([['lib', new Directory(libContents)]])],
          ] as [string, Inode][]),
        ],
      ] as [string, Inode][]),
    ],
  ] as [string, Inode][])

  rustc = { module, sysroot, workDir: new Directory([['main.rs', new File(new TextEncoder().encode(CASES.hello))]]) }

  // identity check
  const t3 = performance.now()
  const versionExit = await runRustc(rustc, ['rustc', '--version'], true)
  addMetric('first run (--version)', performance.now() - t3)
  if (versionExit !== 0) throw new Error(`rustc --version exited ${versionExit}`)

  setStatus('<span class="ok">✓ rustc ready</span> — pick a case, hit ⚡ Compile')
  compileBtn.disabled = false
}

// ---------------------------------------------------------------- compile

compileBtn.addEventListener('click', async () => {
  if (!rustc) return
  compileBtn.disabled = true
  terminalEl.innerHTML = ''

  rustc.workDir.contents.set('main.rs', new File(new TextEncoder().encode(codeEl.value)))

  const mode = modeEl.value
  const args = [
    'rustc',
    '/work/main.rs',
    '--sysroot', '/sysroot',
    '--target', 'x86_64-unknown-linux-gnu',
    '-Cpanic=abort',
    '-Ccodegen-units=1',
    ...(mode === 'metadata' ? ['--emit=metadata'] : ['--crate-type=lib']),
  ]

  termLine(`$ ${args.join(' ')}`, 'sys')
  const t0 = performance.now()
  try {
    const exit = await runRustc(rustc, args)
    const dt = (performance.now() - t0) / 1000
    termLine('')
    if (exit === 0) termLine(`✓ compiled clean in ${dt.toFixed(1)}s`, 'ok')
    else termLine(`✗ rustc exited with code ${exit} after ${dt.toFixed(1)}s`, 'err')
  } catch (e) {
    termLine(`✗ ${e}`, 'err')
  }
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

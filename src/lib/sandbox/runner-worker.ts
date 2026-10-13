// Game sandbox runner — the worker side.
//
// One persistent worker per page: the first `run` fetches rustc.wasm (81 MB)
// + the 27 std rlibs (~98 MB) and compiles the module; subsequent runs reuse
// the warm cache (module + sysroot), so each compile costs only the run time.
//
// The page stays responsive (all wasm work is here); a SharedArrayBuffer
// heartbeat (stamped on every WASI import call) lets the page detect a
// wedged run — the rustc build parks in a futex at shutdown, which is
// contained by terminate + output inspection (diagnostics are printed
// BEFORE the park, so a wedged run still yields its full output).
//
// Messages (page -> worker):
//   { kind: 'run', id, source, heartbeat, args }
// (worker -> page):
//   { kind: 'progress', id, pct, label }
//   { kind: 'chunk', id, stream, text }
//   { kind: 'result', id, code, out, err }
import {
  WASI,
  WASIProcExit,
  Fd,
  File,
  Directory,
  PreopenDirectory,
  type Inode,
} from '@bjorn3/browser_wasi_shim'

const NL = String.fromCharCode(10)

/** WASI fd that records everything written to it AND streams it to the
 *  page on line boundaries (so a wedged run keeps its diagnostics). */
class Cap extends Fd {
  private data = new Uint8Array(0)
  private flushed = 0
  constructor(private stream: 'out' | 'err' | 'sys') {
    super()
  }
  fd_write(d: Uint8Array): { ret: number; nwritten: number } {
    const next = new Uint8Array(this.data.length + d.length)
    next.set(this.data)
    next.set(d, this.data.length)
    this.data = next
    const fresh = new TextDecoder().decode(this.data.subarray(this.flushed))
    if (fresh.includes(NL) || this.data.length - this.flushed > 4096) {
      this.flushed = this.data.length
      post({ kind: 'chunk', id: currentId, stream: this.stream, text: fresh })
    }
    return { ret: 0, nwritten: d.length }
  }
  /** Flush the remainder to the page; return the full captured output. */
  text(): string {
    const fresh = new TextDecoder().decode(this.data.subarray(this.flushed))
    if (fresh) {
      this.flushed = this.data.length
      post({ kind: 'chunk', id: currentId, stream: this.stream, text: fresh })
    }
    return new TextDecoder().decode(this.data)
  }
}

interface RunMsg {
  kind: 'run'
  id: number
  source: string
  heartbeat: ArrayBuffer
  args: string[]
}
interface WarmMsg {
  kind: 'warm'
}
type Msg = RunMsg | WarmMsg

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
const LIB_DIR = '/spike/sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib/'

// ---------------------------------------------------------------- warm cache

interface Warm {
  module: WebAssembly.Module
  sysroot: Directory
}
let warm: Warm | null = null
let warmPromise: Promise<Warm> | null = null
let currentId = 0
let busy = false

async function ensureWarm(): Promise<Warm> {
  if (warm) return warm
  // memoize: a run arriving mid-fetch must reuse the in-flight download,
  // never start a second 180 MB fetch
  if (!warmPromise) warmPromise = doEnsureWarm()
  return warmPromise
}

async function doEnsureWarm(): Promise<Warm> {
  post({ kind: 'progress', id: currentId, pct: 5, label: 'fetching std libraries (27 files, ~98 MB)' })
  void currentId
  const libContents: [string, Inode][] = []
  for (let i = 0; i < RLIBS.length; i++) {
    const name = RLIBS[i]
    const res = await fetch(LIB_DIR + name)
    if (!res.ok) throw new Error('missing ' + LIB_DIR + name + ' (HTTP ' + res.status + ')')
    libContents.push([name, new File(new Uint8Array(await res.arrayBuffer()))])
    if (i % 5 === 4) post({ kind: 'progress', id: currentId, pct: 5 + (i / RLIBS.length) * 35, label: `fetching std libraries ${i + 1}/${RLIBS.length}` })
  }
  post({ kind: 'progress', id: currentId, pct: 45, label: 'fetching rustc (81 MB)' })
  const wasmRes = await fetch('/spike/rustc.wasm')
  if (!wasmRes.ok) throw new Error('rustc.wasm HTTP ' + wasmRes.status)
  const wasmBytes = await wasmRes.arrayBuffer()

  post({ kind: 'progress', id: currentId, pct: 80, label: 'compiling rustc module' })
  const module = await WebAssembly.compile(wasmBytes)
  const sysroot = new Directory([
    [
      'lib',
      new Directory([
        [
          'rustlib',
          new Directory([
            ['x86_64-unknown-linux-gnu', new Directory([['lib', new Directory(libContents)]])],
          ]),
        ],
      ]),
    ],
  ])
  warm = { module, sysroot }
  return warm
}

// ---------------------------------------------------------------- run

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as Msg
  if (msg.kind === 'warm') {
    // readiness = assets fetched + module compiled. No `w.start` here —
    // a parked warmup run must never be able to wedge the ready state.
    try {
      await ensureWarm()
      post({ kind: 'ready' })
    } catch (e) {
      post({ kind: 'failed', err: String(e) })
    }
    return
  }
  if (msg.kind !== 'run' || busy) return
  busy = true
  currentId = msg.id

  const hb = new DataView(msg.heartbeat as SharedArrayBuffer)
  const tick = () => {
    try {
      hb.setBigInt64(0, BigInt(Date.now()), true)
    } catch {
      /* non-COEP context: heartbeat unavailable */
    }
  }

  try {
    const { module, sysroot } = await ensureWarm()

    const workDir = new Directory([['main.rs', new File(new TextEncoder().encode(msg.source))]])
    post({ kind: 'progress', id: currentId, pct: 90, label: 'running rustc' })

    const memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true })
    const stdout = new Cap('out')
    const stderr = new Cap('err')
    const w = new WASI(
      msg.args,
      [],
      [
        new Cap('sys'),
        stdout,
        stderr,
        new PreopenDirectory('/tmp', new Directory([]).contents),
        new PreopenDirectory('/sysroot', sysroot.contents),
        new PreopenDirectory('/work', workDir.contents),
        new PreopenDirectory('/', new Directory([]).contents),
      ],
      { debug: false },
    )

    // heartbeat on every syscall — import calls happen between wasm
    // executions, so the stamp is the liveness signal the page watches
    const imports: Record<string, (...a: unknown[]) => unknown> = {}
    for (const [k, fn] of Object.entries(w.wasiImport as Record<string, (...a: never[]) => unknown>)) {
      imports[k] = (...a: unknown[]) => {
        tick()
        return (fn as (...a: unknown[]) => unknown)(...a)
      }
    }

    let nextThreadId = 1
    const inst = (await WebAssembly.instantiate(module, {
      env: { memory },
      wasi: {
        // inline thread model (bjorn3 demo pattern); the page's heartbeat
        // + terminate + output inspection contains the shutdown futex park
        'thread-spawn': (startArg: number) => {
          const id = nextThreadId++
          tick()
          ;(inst.exports as { wasi_thread_start: (a: number, b: number) => void }).wasi_thread_start(
            id,
            startArg,
          )
          return id
        },
      },
      wasi_snapshot_preview1: imports as never,
    })) as any

    w.initialize(inst)
    tick()

    let code = 0
    let crash = ''
    try {
      w.start(inst)
    } catch (e) {
      if (e instanceof WASIProcExit) code = e.code
      else {
        code = -999
        crash = String(e)
      }
    }
    tick()

    let out = stdout.text()
    let err = (crash ? crash + NL : '') + stderr.text()
    // No `cc` in the sandbox: the final link always fails after all real
    // diagnostics, then the process aborts (wasm `unreachable`).
    // Expected — report a clean success without the crash noise.
    if (
      code === -999 &&
      err.includes('could not exec the linker') &&
      !/error\[E\d+\]/.test(err.split('error: could not exec the linker')[0])
    ) {
      code = 0
      err = 'note: no linker in sandbox (cc not available) — compilation itself succeeded' + NL
    }
    post({ kind: 'result', id: currentId, code, out, err })
  } catch (e) {
    post({ kind: 'result', id: currentId, code: -998, out: '', err: String(e) })
  } finally {
    busy = false
  }
}

function post(m: object) {
  self.postMessage(m)
}

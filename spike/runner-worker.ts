// Browser port of scripts/spike-runner-worker.mjs.
// Runs one rustc invocation on this dedicated Worker thread. The page
// (main thread) stays responsive; a SharedArrayBuffer heartbeat (stamped on
// every WASI import call) lets the page detect a wedged run (futex park)
// and terminate + retry.
//
// Message protocol (page -> worker):
//   { kind: 'run', source, wasmBytes, libs: {name, data}[], heartbeat, args }
// (worker -> page):
//   { kind: 'progress', pct, label }
//   { kind: 'result', code, out, err }
import {
  WASI,
  WASIProcExit,
  Fd,
  File,
  Directory,
  PreopenDirectory,
  type Inode,
} from '@bjorn3/browser_wasi_shim'

/** WASI fd that accumulates everything written to it. */
class Cap extends Fd {
  private chunks: Uint8Array[] = []
  fd_write(d: Uint8Array): { ret: number; nwritten: number } {
    this.chunks.push(new Uint8Array(d))
    return { ret: 0, nwritten: d.length }
  }
  text(): string {
    const n = this.chunks.reduce((a, c) => a + c.length, 0)
    const all = new Uint8Array(n)
    let o = 0
    for (const c of this.chunks) {
      all.set(c, o)
      o += c.length
    }
    return new TextDecoder().decode(all)
  }
}

// The worker fetches its own assets (rustc.wasm + std rlibs). The page
// only sends the run request + a SharedArrayBuffer heartbeat reference —
// a SAB can NOT be transferred (it is shared by reference by design), and
// not transferring the 180 MB of assets keeps the page's copies intact for
// retries (a transferred ArrayBuffer is detached on the sender side).
interface RunMsg {
  kind: 'run'
  source: string
  heartbeat: ArrayBuffer
  args: string[]
}

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

async function fetchLibs(): Promise<[string, Inode][]> {
  const out: [string, Inode][] = []
  for (const name of RLIBS) {
    const res = await fetch(LIB_DIR + name)
    if (!res.ok) throw new Error(`missing ${LIB_DIR}${name} (HTTP ${res.status})`)
    out.push([name, new File(new Uint8Array(await res.arrayBuffer()))])
  }
  return out
}

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as RunMsg
  if (msg.kind !== 'run') return

  const hb = new DataView(msg.heartbeat as SharedArrayBuffer)
  const tick = () => {
    try {
      hb.setBigInt64(0, BigInt(Date.now()), true)
    } catch {
      /* non-COEP context: heartbeat unavailable */
    }
  }

  try {
    post({ kind: 'progress', pct: 5, label: 'fetching std rlibs (27 files)' })
    const libContents = await fetchLibs()
    post({ kind: 'progress', pct: 40, label: 'fetching rustc.wasm (81MB)' })
    const wasmRes = await fetch('/spike/rustc.wasm')
    if (!wasmRes.ok) throw new Error(`rustc.wasm HTTP ${wasmRes.status}`)
    const wasmBytes = await wasmRes.arrayBuffer()
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
    const workDir = new Directory([['main.rs', new File(new TextEncoder().encode(msg.source))]])

    post({ kind: 'progress', pct: 70, label: 'compiling rustc module' })
    const module = await WebAssembly.compile(wasmBytes)
    const memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true })

    const stdout = new Cap()
    const stderr = new Cap()
    const w = new WASI(
      msg.args,
      [],
      [
        new Cap(),
        stdout,
        stderr,
        new PreopenDirectory('/tmp', new Directory([]).contents),
        new PreopenDirectory('/sysroot', sysroot.contents),
        new PreopenDirectory('/work', workDir.contents),
        new PreopenDirectory('/', new Directory([]).contents),
      ],
      { debug: false },
    )

    // heartbeat on every syscall: import calls happen between wasm
    // executions, so the stamp is the liveness signal the page watches
    const imports: Record<string, (...a: unknown[]) => unknown> = {}
    for (const [k, fn] of Object.entries(w.wasiImport as Record<string, (...a: never[]) => unknown>)) {
      imports[k] = (...a: unknown[]) => {
        tick()
        return (fn as (...a: unknown[]) => unknown)(...a)
      }
    }

    let nextThreadId = 1
    post({ kind: 'progress', pct: 80, label: 'instantiating' })
    const inst = (await WebAssembly.instantiate(module, {
      env: { memory },
      wasi: {
        // inline thread model (the bjorn3 demo pattern); the page's
        // heartbeat + terminate + retry contains the futex-park race
        'thread-spawn': (startArg: number) => {
          const id = nextThreadId++
          tick()
          ;(inst.exports as { wasi_thread_start: (a: number, b: number) => void }).wasi_thread_start(id, startArg)
          return id
        },
      },
      wasi_snapshot_preview1: imports as never,
    })) as any

    w.initialize(inst)
    tick()
    post({ kind: 'progress', pct: 100, label: 'running rustc' })

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

    let err = (crash ? crash + '\n' : '') + stderr.text()
    // No `cc` in the sandbox: the final link always fails after all real
    // diagnostics, then the process aborts (wasm `unreachable`). Expected.
    if (
      code === -999 &&
      err.includes('could not exec the linker') &&
      !/error\[E\d+\]/.test(err.split('error: could not exec the linker')[0])
    ) {
      code = 0
      err = 'note: no linker in sandbox (cc not available) — compilation itself succeeded' + String.fromCharCode(10)
    }
    post({ kind: 'result', code, out: stdout.text(), err })
  } catch (e) {
    post({ kind: 'result', code: -998, out: '', err: String(e) })
  }
}

function post(m: object) {
  self.postMessage(m)
}

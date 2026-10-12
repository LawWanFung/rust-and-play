// Runs one rustc invocation on a dedicated OS thread (worker_threads in Node;
// a dedicated Worker in the browser). The inline-thread rustc model can
// deadlock on a futex race (spawned codegen worker parks before the main
// rustc thread can drop the pool). We contain it:
//   - every WASI import call stamps a heartbeat into the shared SAB;
//   - the main thread polls it; if it goes stale > STALE_MS while a run is
//     in flight, the runner is terminated and the case is retried fresh;
//   - a normal run completes in well under the stale window (RUSTC_LOG=info
//     produces a steady syscall stream).
import { parentPort, workerData, Worker } from 'node:worker_threads'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WASI, WASIProcExit, Fd, File, Directory, PreopenDirectory } from '@bjorn3/browser_wasi_shim'

const { source, caseName, heartbeat } = workerData
// heartbeat: SharedArrayBuffer (8 bytes; ms timestamp, written on every import call)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'public', 'spike')

class Cap extends Fd {
  constructor() { super(); this.c = [] }
  fd_write(d) { this.c.push(new Uint8Array(d)); return { ret: 0, nwritten: d.length } }
  text() {
    const n = this.c.reduce((a, x) => a + x.length, 0)
    const a = new Uint8Array(n); let o = 0
    for (const x of this.c) { a.set(x, o); o += x.length }
    return new TextDecoder().decode(a)
  }
}

const hb = new DataView(heartbeat)
function tick() { try { hb.setBigInt64(0, BigInt(Date.now()), true) } catch {} }

const wasmBytes = readFileSync(path.join(spikeDir, 'rustc.wasm'))
const LIB = path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')
const RLIBS = readdirSync(LIB)
const libContents = RLIBS.map((n) => [n, new File(readFileSync(path.join(LIB, n)))])
const sysroot = new Directory([['lib', new Directory([['rustlib', new Directory([['x86_64-unknown-linux-gnu', new Directory([['lib', new Directory(libContents)]])]])]])]])
const workDir = new Directory([['main.rs', new File(new TextEncoder().encode(source))]])

const module = await WebAssembly.compile(wasmBytes)
const memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true })

const stdout = new Cap(), stderr = new Cap()
const w = new WASI(
  ['rustc', '/work/main.rs', '--sysroot', '/sysroot', '--target', 'x86_64-unknown-linux-gnu', '-Ccodegen-units=1', '-Zthreads=1'],
  [],
  [new Cap(), stdout, stderr,
    new PreopenDirectory('/tmp', new Directory([]).contents),
    new PreopenDirectory('/sysroot', sysroot.contents),
    new PreopenDirectory('/work', workDir.contents),
    new PreopenDirectory('/', new Directory([]).contents)],
  { debug: false })

// heartbeat on every syscall (import calls happen between wasm executions,
// so the stamp is the liveness signal the main thread watches)
const imports = {}
for (const [k, fn] of Object.entries(w.wasiImport)) {
  imports[k] = (...a) => { tick(); return fn(...a) }
}
let nextThreadId = 1
const inst = await WebAssembly.instantiate(module, {
  env: { memory },
  wasi: {
    // Standard wasi-threads model (emscripten-style): transfer THIS instance
    // to a real OS thread; it runs wasi_thread_start there and ships the
    // instance back. Same instance = same table + same memory, so no
    // cross-instance divergence. Main parks in a futex meanwhile; the
    // thread's notify wakes it.
    'thread-spawn': (a) => {
      const id = nextThreadId++
      tick()
      inst.exports.wasi_thread_start(id, a)
      return id
    },
  },
  wasi_snapshot_preview1: imports,
})
w.initialize(inst)
tick()

let code, out, err
try {
  w.start(inst)
  code = 0
} catch (e) {
  code = e instanceof WASIProcExit ? e.code : -999
  err = e.message
}
out = stdout.text()
err = (err ? err + String.fromCharCode(10) : '') + stderr.text()
tick()
parentPort.postMessage({ code, out, err })

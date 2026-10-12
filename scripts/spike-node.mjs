// Node harness for the rustc-wasm spike — verifies the core stack
// (rustc.wasm + WASI shim + in-memory sysroot + diagnostics) without a browser.
//
// Usage: node scripts/spike-node.mjs [version|hello|mut|move|lifetime|all]
//
// Node has SharedArrayBuffer natively (no COOP/COEP needed), so this exercises
// the same code path as the browser spike. If this works, the browser version
// only adds the (well-understood) isolation-header requirement.

import { readFileSync, existsSync } from 'node:fs'
import { appendFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WASI,
  WASIProcExit,
  Fd,
  File,
  Directory,
  PreopenDirectory,
} from '@bjorn3/browser_wasi_shim'
import { Worker } from 'node:worker_threads'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'public', 'spike')

// The same 27 std files as spike/main.ts
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

const CASES = {
  hello: 'fn main() {\n    println!("Hello, world!");\n}\n',
  mut: 'fn main() {\n    let v = vec![1];\n    v.push(2);\n    println!("{:?}", v);\n}\n',
  move: 'fn main() {\n    let s1 = String::from("hello");\n    let s2 = s1;\n    println!("{} {}", s1, s2);\n}\n',
  lifetime: 'fn longest(x: &str, y: &str) -> &str {\n    if x.len() > y.len() { x } else { y }\n}\n\nfn main() {\n    let result = longest(String::from("long"), "short");\n    println!("{}", result);\n}\n',
}

// ---- output capture
class CaptureFd extends Fd {
  constructor() {
    super()
    this.chunks = []
  }
  fd_write(data) {
    this.chunks.push(new Uint8Array(data))
    return { ret: 0, nwritten: data.length }
  }
  text() {
    const n = this.chunks.reduce((a, c) => a + c.length, 0)
    const all = new Uint8Array(n)
    let off = 0
    for (const c of this.chunks) { all.set(c, off); off += c.length }
    return new TextDecoder().decode(all)
  }
}

// ---- boot
if (!existsSync(path.join(spikeDir, 'rustc.wasm'))) {
  console.error('rustc.wasm missing — run: node scripts/fetch-spike-assets.mjs')
  process.exit(1)
}

console.error('loading rustc.wasm (81MB)…')
const t0 = Date.now()
const wasmBytes = readFileSync(path.join(spikeDir, 'rustc.wasm'))
console.error(`read in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

console.error('loading std rlibs…')
const LIB_DIR = path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')
const libContents = RLIBS.map((name) => {
  const p = path.join(LIB_DIR, name)
  if (!existsSync(p)) throw new Error(`missing ${p} — run: node scripts/fetch-spike-assets.mjs`)
  return [name, new File(readFileSync(p))]
})

// Toolchain layout: /sysroot/lib/rustlib/<triple>/lib/*.rlib
const sysroot = new Directory([
  ['lib', new Directory([
    ['rustlib', new Directory([
      ['x86_64-unknown-linux-gnu', new Directory([['lib', new Directory(libContents)]])],
    ])],
  ])],
])

const workDir = new Directory([['main.rs', new File(new TextEncoder().encode(CASES.hello))]])

console.error('compiling wasm module…')
const t1 = Date.now()
const module = await WebAssembly.compile(wasmBytes)
console.error(`compiled in ${((Date.now() - t1) / 1000).toFixed(1)}s`)

/** Spawn a fresh rustc process (one WASI instance per invocation). */
async function runRustc(args, source, caseName) {
  // The whole rustc run happens on a dedicated OS thread (worker_threads in
  // Node; a dedicated Worker in the browser). The inline-thread model can
  // deadlock on a futex race; the syscall heartbeat lets us detect that and
  // retry fresh.
  const MAX_ATTEMPTS = 3
  const STALE_MS = 15000
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const heartbeat = new SharedArrayBuffer(8)
    new DataView(heartbeat).setBigInt64(0, BigInt(Date.now()), true)
    const worker = new Worker(new URL('./spike-runner-worker.mjs', import.meta.url), {
      workerData: { source, caseName, heartbeat },
    })
    const result = await new Promise((resolve) => {
      const poll = setInterval(() => {
        let last = 0
        try { last = Number(new DataView(heartbeat).getBigInt64(0, true)) } catch {}
        if (Date.now() - last > STALE_MS) {
          clearInterval(poll)
          worker.terminate()
          resolve({ code: -998, out: '', err: 'runner hung (no syscall activity) — terminated' })
        }
      }, 500)
      worker.on('message', (m) => { clearInterval(poll); resolve(m) })
      worker.on('error', (e) => { clearInterval(poll); resolve({ code: -998, out: '', err: String(e) }) })
    })
    if (result.code !== -998) {
      // No `cc` in the sandbox: the final link step always "fails" AFTER all
      // real diagnostics. If that is the only error, treat it as success.
      if (result.code === -999 && result.err.includes('could not exec the linker') &&
          !/error\[E\d+\]/.test(result.err.split('error: could not exec the linker')[0])) {
        result.code = 0
        result.err = result.err.split('error: could not exec the linker')[0].trimEnd() + String.fromCharCode(10)
      }
      return result
    }
    console.error(`[runner] ${caseName} attempt ${attempt}/${MAX_ATTEMPTS} hung — retrying`)
  }
  return { code: -998, out: '', err: 'sandbox hung ' + MAX_ATTEMPTS + ' times; giving up' }
}

// ---- run the requested cases
const which = process.argv[2] ?? 'all'
const list = which === 'all' ? ['version', 'hello', 'mut', 'move', 'lifetime'] : [which]

let failures = 0
for (const name of list) {
  const t = Date.now()
  if (name === 'version') {
    const { code, out, err } = await runRustc(['rustc', '--version'])
    const dt = ((Date.now() - t) / 1000).toFixed(1)
    const ok = code === 0
    console.log(`\n${'='.repeat(60)}\n[version] exit=${code} ${ok ? '✓' : '✗ UNEXPECTED'} (${dt}s)`)
    if (!ok) failures++
    console.log((out + err).trim())
    continue
  }

  workDir.contents.set('main.rs', new File(new TextEncoder().encode(CASES[name])))
  const { code, out, err } = await runRustc([
    'rustc', '/work/main.rs', '--sysroot', '/sysroot',
    '--target', 'x86_64-unknown-linux-gnu', '-Cpanic=abort', '-Ccodegen-units=1',
    '--emit=obj',
  ], CASES[name], name)
  const dt = ((Date.now() - t) / 1000).toFixed(1)
  const expectFail = name === 'mut' || name === 'move' || name === 'lifetime'
  const ok = expectFail ? code !== 0 : code === 0
  console.log(`\n${'='.repeat(60)}\n[${name}] exit=${code} ${ok ? '✓ as expected' : '✗ UNEXPECTED'} (${dt}s)`)
  if (!ok) failures++
  if (out.trim()) console.log('--- stdout ---\n' + out)
  if (err.trim()) console.log('--- stderr ---\n' + err)
}

console.log(failures ? `\n${failures} case(s) behaved unexpectedly` : '\nall cases behaved as expected ✓')
process.exit(failures ? 1 : 0)

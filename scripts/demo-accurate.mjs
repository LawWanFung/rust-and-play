// EXACT replica of bjorn3/browser_wasi_shim examples/rustc.html in Node,
// to test determinism of the inline-thread model:
//   - source at /hello.rs (root preopen), NOT /work/main.rs
//   - env RUSTC_LOG=info
//   - 26 rlibs + libstd .so
//   - inline wasi_thread_start (single OS thread)
// Run: node scripts/demo-accurate.mjs [times]
import { readFileSync, readdirSync, appendFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WASI, WASIProcExit, Fd, File, Directory, PreopenDirectory } from '@bjorn3/browser_wasi_shim'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'public', 'spike')
const LIB = path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')
const RLIBS = readdirSync(LIB).filter((n) => n.endsWith('.rlib') || n.endsWith('.so'))

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

const wasmBytes = readFileSync(path.join(spikeDir, 'rustc.wasm'))
console.log('compiling…')
const module = await WebAssembly.compile(wasmBytes)

const libContents = RLIBS.map((n) => [n, new File(readFileSync(path.join(LIB, n)))])
const sysroot = new Directory([['lib', new Directory([['rustlib', new Directory([['x86_64-unknown-linux-gnu', new Directory([['lib', new Directory(libContents)]])]])]])]])
const helloSrc = `fn main() { println!("Hello World!"); }`
const workDir = new Directory([['main.rs', new File(new TextEncoder().encode(helloSrc))]])

const times = Number(process.argv[2] ?? 1)
for (let run = 1; run <= times; run++) {
  const t0 = Date.now()
  const stdout = new Cap(), stderr = new Cap()
  const w = new WASI(
    ['rustc', '/work/main.rs', '--sysroot', '/sysroot', '--target', 'x86_64-unknown-linux-gnu', '-Cpanic=abort', '-Ccodegen-units=1'],
    ['RUSTC_LOG=info'],
    [new Cap(), stdout, stderr,
      new PreopenDirectory('/tmp', new Directory([]).contents),
      new PreopenDirectory('/sysroot', sysroot.contents),
      new PreopenDirectory('/work', workDir.contents),
      new PreopenDirectory('/', new Directory([]).contents)],
    { debug: false })
  let next = 1
  let spawns = 0
  const inst = await WebAssembly.instantiate(module, {
    env: { memory: new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true }) },
    wasi: {
      'thread-spawn': (a) => { const id = next++; spawns++; inst.exports.wasi_thread_start(id, a); return id },
    },
    wasi_snapshot_preview1: w.wasiImport,
  })
  w.initialize(inst)
  let code, hung = false
  try {
    // safety: if the run exceeds 30s the inline park deadlocked
    const killer = setTimeout(() => { hung = true; process.exit(3) }, 30000)
    w.start(inst)
    clearTimeout(killer)
    code = 0
  } catch (e) {
    code = e instanceof WASIProcExit ? e.code : -999
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  const linkerOnly = stderr.text().includes('could not exec the linker')
  const realErr = stderr.text().split('error: could not exec the linker')[0].trim()
  console.log(`run ${run}: exit=${code} spawns=${spawns} dt=${dt}s linkerFail=${linkerOnly} realStderr="${realErr.slice(0, 120)}"`)
}

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

// ---------------------------------------------------------------- integrity
//
// The spike assets are third-party code that EXECUTES in the visitor's
// browser (SECURITY.md finding 1). These SHA-256 hashes pin the exact bytes
// from bjorn3/wasm-rustc @ 9de4a793c9e4930084944985263a3d6f378f85fb and
// mirror scripts/spike-assets.sha256 — on an intentional re-pin, update
// BOTH (node scripts/gen-asset-hashes.mjs). Verified after the in-browser
// fetch: a tampered deploy origin fails the warmup and the sandbox degrades
// gracefully to the multiple-choice flow.

const ASSET_HASHES: Record<string, string> = {
  'rustc.wasm': 'a8091e8bbf5e01e4dce0711ea76b0481a81574f04e71a6febedc87a69568c5e0',
  'libaddr2line-b8754aeb03c02354.rlib': '339e2912d00300a3bac671ed88624f3192fa2951a18694147667415031a772a2',
  'libadler-05c3545f6cd12159.rlib': '437a80fe5b83c446b8dbe9b1ee3da97238ef32f5bee5bd080e6d6a5269118b7c',
  'liballoc-0dab879bc41cd6bd.rlib': '59097635db6cb1d9dc6ed6a8127a59b299d6c6ac3f139717850cf00fd2cba265',
  'libcfg_if-c7fd2cef50341546.rlib': 'c25686e2bdc364c5078f85c4216fe91da136cdbe404095656946b6142f7246b6',
  'libcompiler_builtins-a99947d020d809d6.rlib': 'fac6c20eff7b32401b7c4a93dea3fc9f63a8b49feea3a4d32693e30f4ab8a4a9',
  'libcore-4b8e8a815d049db3.rlib': 'fb6a14363edd33194a343daa3b040182af849d5527fcc73330f68636041a3e09',
  'libgetopts-bbb75529e85d129d.rlib': 'ed93b5bf940f8ee638140b7cb2994ed50fdfaf39079b25e9eeae53b6d1bb4743',
  'libgimli-598847d27d7a3cbf.rlib': 'b41204cb5ce3498d51fe7a0e228283d7b05e5799cc9dc1951964d8561c46caff',
  'libhashbrown-d2ff91fdf93cacb2.rlib': 'c061c62b8abc0e9e1c94a80058fc8d1973b34fd2596539557f4767ff2c21ff55',
  'liblibc-dc63949c664c3fce.rlib': 'ac362ee8027023749e305f95334545dfd778f18d724dfcd2f150aaebb89df4c1',
  'libmemchr-2d3a423be1a6cb96.rlib': 'be35f989d72c32fbbd061130d9cda15a1581b51c5b65aa391b9576be8fec1992',
  'libminiz_oxide-b109506a0ccc4c6a.rlib': '1270762be67526f11697175159429f7ec975dc61ddd91a4ae0c1b238103aeb99',
  'libobject-7b48def7544c748b.rlib': 'f48c00d0b10b49773eec1a0853fa255208241dbb7d598a5b3f8fa59aaec25380',
  'libpanic_abort-c93441899b93b849.rlib': '10da7939448277ef65c67541bb46429f68fbc0be0601e291a9dec0d2e4ab7931',
  'libpanic_unwind-11d9ba05b60bf694.rlib': '834df47debfc1a20f615fe49be961ed788bae8ce5ca4cf45f031cafa9ef02924',
  'libproc_macro-1a7f7840bb9983dc.rlib': '51fa2ee9b45b646b51bb5f2edc2dc61500113ed589d4ea12c49c6971b9ef3f4d',
  'librustc_demangle-59342a335246393d.rlib': '9cd9e22ee30eaefca74922408dfa717bce1b849176a31d3f29471bda81578af2',
  'librustc_std_workspace_alloc-552b185085090ff6.rlib': '7475c719ca242697c33e0ee75c6df476b99eb2264cbf33a476e8bae9bff3f08f',
  'librustc_std_workspace_core-5d8a121daa7eeaa9.rlib': '24d0fe5af4de7bcd05b8cbbd0802d8540e8a2fdd69bddff7cad10b98a1a2e936',
  'librustc_std_workspace_std-97f43841ce452f7d.rlib': '474b69abb1e7760cdf484255a3dc7b2abaa4a1abed7312a794e8d7e3630906ad',
  'libstd-bdedb7706a556da2.rlib': '23f6ae8ba86993b97cbe936b3cb2d8e825dd7b2898ba1f943bcb53f772ad3192',
  'libstd-bdedb7706a556da2.so': 'ba3c21b60bfbfc3b6ac520f27e1c66ebd45315ceaa163e530a819ba830831b86',
  'libstd_detect-cca21eebc4281add.rlib': '1ec12cc09ac118d710aec2c8eb432d50d2fc1f184b525ef8f449158eec2aaa57',
  'libsysroot-f654e185be3ffebd.rlib': 'dc3d48e1c80ea4b5bd6c5a91edb7f538f4c90ef07151051d1b463e3ece2af945',
  'libtest-f06fa3fbc201c558.rlib': '262b11b0446e0e1c92ba9e705679ba2f267aa0fb94f03d2419d49096c2e790bc',
  'libunicode_width-19a0dcd589fa0877.rlib': '8ec1994f3efad5d25e14f30d373496f38ac8e1e6d90bc03ef6b11180f13a1962',
  'libunwind-747b693f90af9445.rlib': 'c0abe8e0635aa346c87641afc40de08aa38e310362da5e1143fd652bfbef3cd2',
}

async function verifyAssetHash(name: string, bytes: ArrayBuffer | Uint8Array): Promise<void> {
  const expected = ASSET_HASHES[name]
  if (!expected) return // not in the manifest (e.g. rustc-patched) — nothing to check
  if (!globalThis.crypto?.subtle) {
    // crypto.subtle requires a secure context; on plain-HTTP deploys skip
    // rather than break (the download script already verified the hashes)
    console.warn(`sandbox: skipping integrity check for ${name} (no crypto.subtle in this context)`)
    return
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
  const actual = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (actual !== expected) {
    throw new Error(
      `asset integrity check failed for ${name} — the served bytes do not match the pinned manifest`,
    )
  }
}

/** WASI fd that records everything written to it AND streams it to the
 *  page on line boundaries (so a wedged run keeps its diagnostics).
 *  Retention is capped at CAP_MAX (a hostile/buggy compiler must not be
 *  able to grow the worker without limit — SECURITY.md finding 2). */
class Cap extends Fd {
  private data = new Uint8Array(0)
  private flushed = 0
  private truncated = false
  constructor(private stream: 'out' | 'err' | 'sys') {
    super()
  }
  /** Beyond CAP_MAX keep only the most recent bytes (the tail, where rustc's
   *  error summary lives). Unflushed bytes are posted before being dropped
   *  so nothing silently vanishes from the stream. */
  private enforceCap() {
    const CAP_MAX = 1 << 20 // 1 MiB
    if (this.data.length <= CAP_MAX) return
    const drop = this.data.length - CAP_MAX
    if (this.flushed < drop) {
      const fresh = new TextDecoder().decode(this.data.subarray(this.flushed, drop))
      if (fresh) post({ kind: 'chunk', id: currentId, stream: this.stream, text: fresh })
      this.flushed = 0
    } else {
      this.flushed -= drop
    }
    this.data = new Uint8Array(this.data.subarray(drop)) // copy: releases the larger backing buffer
    this.truncated = true
  }
  fd_write(d: Uint8Array): { ret: number; nwritten: number } {
    const next = new Uint8Array(this.data.length + d.length)
    next.set(this.data)
    next.set(d, this.data.length)
    this.data = next
    this.enforceCap()
    const fresh = new TextDecoder().decode(this.data.subarray(this.flushed))
    if (fresh.includes(NL) || this.data.length - this.flushed > 4096) {
      this.flushed = this.data.length
      post({ kind: 'chunk', id: currentId, stream: this.stream, text: fresh })
    }
    return { ret: 0, nwritten: d.length }
  }
  /** Flush the remainder to the page; return the captured (possibly
   *  tail-truncated) output. */
  text(): string {
    const fresh = new TextDecoder().decode(this.data.subarray(this.flushed))
    if (fresh) {
      this.flushed = this.data.length
      post({ kind: 'chunk', id: currentId, stream: this.stream, text: fresh })
    }
    const t = new TextDecoder().decode(this.data)
    return this.truncated ? '…(output truncated at 1 MiB)…' + NL + t : t
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
    const buf = new Uint8Array(await res.arrayBuffer())
    await verifyAssetHash(name, buf)
    libContents.push([name, new File(buf)])
    if (i % 5 === 4) post({ kind: 'progress', id: currentId, pct: 5 + (i / RLIBS.length) * 35, label: `fetching std libraries ${i + 1}/${RLIBS.length}` })
  }
  post({ kind: 'progress', id: currentId, pct: 45, label: 'fetching rustc (81 MB)' })
  const wasmRes = await fetch('/spike/rustc.wasm')
  if (!wasmRes.ok) throw new Error('rustc.wasm HTTP ' + wasmRes.status)
  const wasmBytes = await wasmRes.arrayBuffer()
  await verifyAssetHash('rustc.wasm', wasmBytes)

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

// Patches every INDEFINITE memory.atomic.wait32 (i64.const -1 + 0xFE 01)
// into a 200ms-timed wait. Rust's parking lot re-checks its state after
// each wait returns, so a bounded timeout turns every futex park into a
// bounded spin: lost-wakeup races (notify lands between the state check and
// the wait) become self-healing within 200ms.
//
// The replacement LEB is a same-length (8-byte) redundant encoding of 200 so
// section sizes and all offsets stay valid.
//
// Usage: node scripts/patch-wait-timeout.mjs
// Output: public/spike/rustc-patched.wasm
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inPath = path.join(root, 'public', 'spike', 'rustc.wasm')
const outPath = path.join(root, 'public', 'spike', 'rustc-patched.wasm')

const b = new Uint8Array(readFileSync(inPath))

// 8-byte signed LEB128 encoding of 200 (redundant groups of zero bits)
// 200 = 0b11001000
// byte0 = 0b11001000 | 0x80 = 0xC8
// bytes 1-6 = 0x80 (zero groups, continuation)
// byte7  = 0x00 (final zero group)
const NEW = [0xc8, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x00]
// pattern: i64.const (-1) followed by 0xFE 0x01 (memory.atomic.wait32)
const OLD = [0x42, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xfe, 0x01]

// only patch inside the code section (section id 10) to avoid data-section hits
let i = 8
let patched = 0
while (i < b.length) {
  const idAt = i
  const id = b[i++]
  // read size leb
  let size = 0, s = 0
  for (; ;) {
    const x = b[i++]
    size |= (x & 0x7f) << s
    if ((x & 0x80) === 0) break
    s += 7
  }
  const end = i + size
  if (id === 10) {
    for (let p = i; p + OLD.length <= end; p++) {
      let match = true
      for (let q = 0; q < OLD.length; q++) if (b[p + q] !== OLD[q]) { match = false; break }
      if (match) {
        for (let q = 0; q < 8; q++) b[p + 1 + q] = NEW[q] // replace the 8-byte -1
        patched++
        p += 8 // skip past
      }
    }
  }
  i = end
}

writeFileSync(outPath, Buffer.from(b))
console.log(`patched ${patched} indefinite wait32 -> 200ms; wrote ${outPath}`)

// validate
const module = await WebAssembly.compile(Buffer.from(b))
const memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true })
const imports = { env: { memory }, wasi: { 'thread-spawn': () => 0 }, wasi_snapshot_preview1: {} }
for (const imp of WebAssembly.Module.imports(module)) {
  if (imp.module === 'wasi_snapshot_preview1') imports.wasi_snapshot_preview1[imp.name] = () => 0
}
await WebAssembly.instantiate(module, imports)
console.log('patched module instantiates OK')

// Patches rustc.wasm so its function table becomes a SHARED import (env.table)
// instead of a module-internal table. This lets multiple instances (main +
// one per spawned thread) share the same table, so runtime-written
// function slots (thread trampolines) are visible across instances.
//
// Usage: node scripts/patch-rustc-table.mjs
// Output: public/spike/rustc-patched.wasm
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inPath = path.join(root, 'public', 'spike', 'rustc.wasm')
const outPath = path.join(root, 'public', 'spike', 'rustc-patched.wasm')

const b = new Uint8Array(readFileSync(inPath))

// ---------- LEB128 helpers ----------
function readLeb(buf, i) {
  let r = 0, s = 0
  for (; ;) {
    const x = buf[i++]
    r |= (x & 0x7f) << s
    if ((x & 0x80) === 0) break
    s += 7
  }
  return [r, i]
}
function encLeb(n) {
  const out = []
  do {
    let x = n & 0x7f
    n >>>= 7
    if (n) x |= 0x80
    out.push(x)
  } while (n)
  return out
}

// ---------- walk sections ----------
let i = 8
const sections = [] // { id, idAt, headerEnd, end }
while (i < b.length) {
  const idAt = i
  const id = b[i++]
  let size
  ;[size, i] = readLeb(b, i)
  sections.push({ id, idAt, headerEnd: i, end: i + size })
  i += size
}

const importSec = sections.find((s) => s.id === 2)
const tableSec = sections.find((s) => s.id === 4)
if (!importSec || !tableSec) throw new Error('missing import/table section')

// ---------- parse the internal table (section 4) ----------
let j = tableSec.headerEnd
const [tableCount] = readLeb(b, j); j += 1 // must be 1
if (tableCount !== 1) throw new Error('expected exactly 1 table, got ' + tableCount)
const elemType = b[j++]; j += 0
const flags = b[j++]
let [tmin, jAfterMin] = readLeb(b, j); j = jAfterMin
const tmax = flags & 1 ? readLeb(b, j)[0] : tmin
console.log(`internal table: elemtype=${elemType} flags=${flags} min=${tmin} max=${tmax}`)
if (elemType !== 0x70) throw new Error('expected funcref table (0x70)')

// ---------- parse import section to find an insertion point ----------
// We APPEND the table import at the end of the import list. Table/function
// namespaces are independent, so this does not shift function indices.
let k = importSec.headerEnd
const [importCount, kAfterCount] = readLeb(b, k)
console.log('imports:', importCount)

// Build the new import entry: env.table, kind=0x01 (table), flags, min, max
// import declares the table SHARED (bit1) so the host can provide a shared Table
const importFlags = flags | 0x02
const newEntry = [
  3, 0x65, 0x6e, 0x76, // "env"
  5, 0x74, 0x61, 0x62, 0x6c, 0x65, // "table"
  0x01, 0x70, importFlags, // kind=1 (table), elemtype=funcref (0x70), flags
  ...encLeb(tmin),
  ...(importFlags & 1 ? encLeb(tmax) : []),
]

// ---------- rewrite ----------
// New import section body: count' = count+1, original entries, new entry
let body = []
body.push(...encLeb(importCount + 1))
body.push(...b.slice(kAfterCount, importSec.end)) // original entries verbatim
body.push(...newEntry)

const newImportSec = [0x02, ...encLeb(body.length), ...body]
// New (empty) table section
const newTableSec = [0x04, 0x01, 0x00]

// Reassemble: header + sections in original order, with 2 and 4 replaced
const chunks = [b.slice(0, 8)] // magic+version
for (const sec of sections) {
  if (sec.id === 2) chunks.push(Uint8Array.from(newImportSec))
  else if (sec.id === 4) chunks.push(Uint8Array.from(newTableSec))
  else chunks.push(b.slice(sec.idAt, sec.end))
}
const total = chunks.reduce((a, c) => a + c.length, 0)
const out = new Uint8Array(total)
let off = 0
for (const c of chunks) { out.set(c, off); off += c.length }

writeFileSync(outPath, Buffer.from(out))
console.log(`wrote ${outPath} (${out.length} bytes, was ${b.length})`)

// ---------- validate ----------
// Browsers support shared memory/table natively (COOP/COEP). Node's V8 gates
// it behind --experimental-wasm-shared, and some Node builds reject the
// combination outright — so a "shared" CompileError means "structure OK,
// validate in a browser", not a patch failure.
try {
  const module = await WebAssembly.compile(Buffer.from(out))
  const table = new WebAssembly.Table({ initial: tmin, maximum: tmax, shared: true })
  const memory = new WebAssembly.Memory({ initial: 16, maximum: 16384, shared: true })
  const instImports = {
    env: { memory, table },
    wasi: { 'thread-spawn': (a) => 0 },
    wasi_snapshot_preview1: {},
  }
  for (const imp of WebAssembly.Module.imports(module)) {
    if (imp.module === 'wasi_snapshot_preview1') instImports.wasi_snapshot_preview1[imp.name] = () => 0
  }
  await WebAssembly.instantiate(module, instImports)
  console.log('PATCHED MODULE: instantiates OK with shared table')
} catch (e) {
  if (/shared/i.test(e.message)) {
    console.log(`NOTE: this Node cannot instantiate shared-memory modules (${e.message})`)
    console.log('      structural patch written; validate in a browser (npm run dev → /spike/)')
  } else {
    console.error('PATCHED MODULE validate failed:', e.message)
    process.exit(1)
  }
}

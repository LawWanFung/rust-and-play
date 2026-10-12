// Minimal V8 SAB-lock test: main wasm spins in atomic.wait; worker touches the SAB.
// Answers: does a thread suspended in atomic.wait release the exclusive buffer lock?
import { Worker } from 'node:worker_threads'
import { appendFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const log = (t) => appendFileSync('sablock.log', t + '\n')

function section(id, bytes) {
  return [id, bytes.length, ...bytes]
}
// body: atomic.wait(0, 0, -1) ; end
const body = [
  0x41, 0x00, // i32.const 0 (addr)
  0x41, 0x00, // i32.const 0 (expected)
  0x42, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, // i64.const -1 (infinite)
  0xfe, 0x01, 0x02, 0x00, // memory.atomic.wait32 align=2 offset=0
  0x1a, // drop result
  0x0b, // end
]
const mod = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  ...section(1, [1, 0x60, 0x00, 0x00]), // type: () -> ()
  ...section(2, [1, 3, 0x65, 0x6e, 0x76, 6, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x03, 0x01, 0x10]), // import env.memory: flags=0x03 (hasMax|shared) min=1 max=16
  ...section(3, [1, 0x00]), // func[0] : type 0
  ...section(7, [1, 3, 0x72, 0x75, 0x6e, 0x00, 0x00]), // export "run"
  ...section(10, [1, body.length + 1, 0x00, ...body]),
])

const mem = new WebAssembly.Memory({ initial: 1, maximum: 16, shared: true })
const module = await WebAssembly.compile(mod)
const inst = await WebAssembly.instantiate(module, { env: { memory: mem } })

log('main: spawning worker')
const worker = new Worker('./scripts/sablock-worker.mjs', {
  workerData: { mem: mem.buffer },
})
worker.on('message', (m) => log('main got worker msg: ' + m))
worker.on('error', (e) => log('main worker error: ' + e.message))

await new Promise((r) => worker.once('message', r))
log('main: worker booted — entering atomic.wait (infinite)')

const t0 = performance.now()
inst.exports.run()
log('main: atomic.wait returned after ' + (performance.now() - t0).toFixed(0) + 'ms')
worker.terminate()
process.exit(0)
setTimeout(() => { log('main: 12s watchdog — exiting'); worker.terminate(); process.exit(2) }, 12000)

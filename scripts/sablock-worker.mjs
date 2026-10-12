// Worker half of the SAB-lock experiment.
// Boots (Memory from SAB) BEFORE main enters wasm, then tries to touch the SAB
// WHILE main is suspended in atomic.wait. Results go to sablock.log.
import { parentPort, workerData } from 'node:worker_threads'
import { appendFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const log = (t) => appendFileSync('sablock.log', '[worker] ' + t + '\n')
const T0 = performance.now()
const ts = () => ((performance.now() - T0) / 1000).toFixed(3)

const { mem } = workerData // SharedArrayBuffer

// Phase 1: boot while main is NOT in wasm (lock should be free)
const memory = new WebAssembly.Memory({ initial: mem.byteLength / 65536, maximum: 16, shared: true, buffer: mem })
log(ts() + 's memory constructed (pre-wasm)')
const u8 = new Uint8Array(mem)
u8[4] = 77
log(ts() + 's non-atomic write ok (pre-wasm)')
parentPort.postMessage('booted')

// Phase 2: main is now in atomic.wait. Try to touch the SAB again.
setTimeout(() => {
  try {
    const v = u8[4]
    log(ts() + 's non-atomic read while main in atomic.wait: ' + v + '  <-- LOCK RELEASED')
  } catch (e) {
    log(ts() + 's non-atomic read threw: ' + e)
  }
  try {
    const v = Atomics.load(new Int32Array(mem), 0)
    log(ts() + 's Atomics.load while main in atomic.wait: ' + v)
  } catch (e) {
    log(ts() + 's Atomics.load threw: ' + e)
  }
  parentPort.postMessage('phase2-done')
}, 2000)

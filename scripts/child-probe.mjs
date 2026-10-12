// Spawn the harness as a child; stream output; sample child CPU via powershell.
import { spawn, execFile } from 'node:child_process'

const child = spawn(process.execPath, ['scripts/spike-node.mjs', 'hello'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})
const t0 = Date.now()
let lastCpu = null

setInterval(() => {
  execFile(
    'powershell',
    ['-NoProfile', '-Command', '(Get-Process -Id ' + child.pid + ' -ErrorAction SilentlyContinue) | Select-Object -ExpandProperty CPU'],
    (err, out) => {
      if (err || !out || !out.trim()) return
      const cpu = parseFloat(out.trim())
      if (isNaN(cpu)) return
      const age = ((Date.now() - t0) / 1000).toFixed(0)
      const delta = lastCpu === null ? 'n/a' : (cpu - lastCpu).toFixed(1)
      lastCpu = cpu
      console.error('[sampler t=' + age + 's] cpuTotal=' + cpu.toFixed(1) + 's cpuDelta5s=' + delta + 's')
    },
  )
}, 5000)

child.stdout.on('data', (d) => process.stdout.write('[out] ' + d))
child.stderr.on('data', (d) => process.stderr.write('[err] ' + d))
child.on('exit', (code) => {
  console.error('\nchild exited code=' + code + ' after ' + ((Date.now() - t0) / 1000).toFixed(0) + 's')
  process.exit(code ?? 0)
})
setTimeout(() => { console.error('outer watchdog: killing child'); child.kill() }, 90_000)

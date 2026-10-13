// Regenerates scripts/spike-assets.sha256 from the files on disk.
// Usage: node scripts/gen-asset-hashes.mjs
//
// Run this ONLY after an intentional re-pin of the spike assets
// (see scripts/fetch-spike-assets.mjs), then review the diff before committing.
// The runner worker embeds the same hashes for runtime verification
// (src/lib/sandbox/runner-worker.ts → ASSET_HASHES) — keep the two in sync.

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'public', 'spike')
const tarball = path.join(root, 'node_modules', '.rq', 'wasm-rustc.tar.gz')
const outPath = path.join(root, 'scripts', 'spike-assets.sha256')

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

const lines = [
  '# SHA-256 manifest for the in-browser rustc spike assets',
  '# Source: https://github.com/bjorn3/wasm-rustc @ 9de4a793c9e4930084944985263a3d6f378f85fb',
  '# Verified against the local public/spike/ files. Regenerate ONLY after an intentional re-pin:',
  '#   node scripts/gen-asset-hashes.mjs',
  '# The worker verifies these at runtime (src/lib/sandbox/runner-worker.ts).',
]

if (existsSync(tarball)) {
  lines.push(`${sha256(tarball)}  wasm-rustc.tar.gz`)
} else {
  lines.push('# (wasm-rustc.tar.gz absent — run scripts/fetch-spike-assets.mjs first)')
}

const libDir = path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')
lines.push(`${sha256(path.join(spikeDir, 'rustc.wasm'))}  rustc.wasm`)
for (const name of readdirSync(libDir).sort()) {
  if (!name.endsWith('.rlib') && !name.endsWith('.so')) continue
  lines.push(
    `${sha256(path.join(libDir, name))}  sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib/${name}`,
  )
}

writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`wrote ${outPath} (${lines.length} lines)`)
console.log('NOTE: if you re-pinned, also update ASSET_HASHES in src/lib/sandbox/runner-worker.ts')

// Downloads the spike assets for the in-browser rustc sandbox.
// Usage: node scripts/fetch-spike-assets.mjs
//
// Sources (bjorn3's patched rustc precompiled for wasm32-wasip1-threads,
// rustc 1.79.0-dev — the engine behind the browser_wasi_shim demo):
//   - rustc.wasm:  https://codeload.github.com/bjorn3/wasm-rustc/tar.gz/refs/heads/main
//   - sysroot rlibs: same tarball (lib/rustlib/x86_64-unknown-linux-gnu/lib/*)
//
// Total: ~51MB tarball → 175MB of files in public/spike/ (git-ignored).

import { execSync } from 'node:child_process'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'public', 'spike')
const tarball = path.join(root, 'node_modules', '.rq', 'wasm-rustc.tar.gz')

mkdirSync(path.dirname(tarball), { recursive: true })
mkdirSync(path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib'), { recursive: true })

const url = 'https://codeload.github.com/bjorn3/wasm-rustc/tar.gz/refs/heads/main'
console.log(`↓ ${url}`)
execSync(`curl -fL --ssl-no-revoke --max-time 1800 -o "${tarball}" "${url}"`, { stdio: 'inherit' })
console.log(`✓ tarball: ${(stat_size(tarball) / 1e6).toFixed(1)}MB`)

console.log('extracting…')
const tmp = path.join(root, 'node_modules', '.rq', 'wasm-rustc-extract')
execSync('rm -rf ' + JSON.stringify(tmp))
execSync(`tar xzf "${tarball}" -C ${JSON.stringify(path.dirname(tmp))}`)
const src = path.join(tmp, 'wasm-rustc-main')

execSync(`cp "${path.join(src, 'bin', 'rustc.wasm')}" "${path.join(spikeDir, 'rustc.wasm')}"`)
execSync(`cp "${path.join(src, 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib', '*.rlib')}" "${path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')}"`)
execSync(`cp "${path.join(src, 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib', '*.so')}" "${path.join(spikeDir, 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')}"`)

console.log('✓ done — public/spike/ populated')
console.log('  start the dev server: npm run dev → http://localhost:5173/spike/')

function stat_size(p) {
  return existsSync(p) ? statSync(p).size : 0
}

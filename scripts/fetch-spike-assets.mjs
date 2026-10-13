// Downloads the spike assets for the in-browser rustc sandbox.
// Usage: node scripts/fetch-spike-assets.mjs
//
// Sources (bjorn3's patched rustc precompiled for wasm32-wasip1-threads,
// rustc 1.79.0-dev — the engine behind the browser_wasi_shim demo):
//   - Pinned commit: 9de4a793c9e4930084944985263a3d6f378f85fb
//     (the repo's tip since 2024-04; the mutable refs/heads/main URL is
//     deliberately NOT used — see SECURITY.md finding 1)
//   - rustc.wasm + 27 std rlibs from that tarball (~51 MB → 175 MB)
//
// SECURITY: every artifact is verified against scripts/spike-assets.sha256
// (tarball + all 28 files) BEFORE anything is installed. A mismatch aborts
// without touching public/spike/. Regenerate the manifest after an
// intentional re-pin: node scripts/gen-asset-hashes.mjs
//
// The assets are git-ignored; they land in public/spike/.
//
// Shell note: git-bash's MSYS layer mangles QUOTED absolute Windows paths
// (e.g. tar: "Cannot connect to E: resolve failed"), so all shell commands
// below use unquoted paths relative to the repo root (which contain no
// spaces). File copies use node:fs, not the shell.

import { execSync } from 'node:child_process'
import { mkdirSync, statSync, readFileSync, rmSync, readdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

const tarballRel = path.join('node_modules', '.rq', 'wasm-rustc.tar.gz')
const spikeRel = 'public' + path.sep + 'spike'
const libRel = path.join('public', 'spike', 'sysroot', 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib')
const manifestPath = path.join(root, 'scripts', 'spike-assets.sha256')

// ---------------------------------------------------------------- pinning

const PINNED_COMMIT = '9de4a793c9e4930084944985263a3d6f378f85fb'
const url = `https://codeload.github.com/bjorn3/wasm-rustc/tar.gz/${PINNED_COMMIT}`

// Manifest: lines of "<sha256>  <path>" (tarball path is relative to
// node_modules/.rq; asset paths are relative to public/spike).
function loadManifest() {
  const lines = readFileSync(manifestPath, 'utf8').split('\n')
  const m = new Map()
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    // sha256sum format: "<hash>  <path>" (text) or "<hash> *<path>" (binary)
    const mt = line.match(/^([0-9a-f]{64})[ \t]+\*?(\S.*)$/)
    if (!mt) continue
    m.set(mt[2].trim().toLowerCase(), mt[1].toLowerCase())
  }
  return m
}

function sha256File(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function expectHash(label, actual, expected) {
  if (!expected) {
    console.error(`✗ no manifest entry for ${label} — is the manifest stale?`)
    process.exit(1)
  }
  if (actual !== expected) {
    console.error(`✗ HASH MISMATCH: ${label}`)
    console.error(`  expected ${expected}`)
    console.error(`  actual   ${actual}`)
    console.error('  refusing to install — the served bytes do not match the pinned manifest')
    process.exit(1)
  }
  console.log(`✓ ${label}`)
}

// ---------------------------------------------------------------- download

mkdirSync(path.dirname(tarballRel), { recursive: true })
mkdirSync(libRel, { recursive: true })

console.log(`↓ ${url}`)
// --ssl-no-revoke: the corporate proxy's TLS-interception certificate fails
// Windows revocation checks (CRYPT_E_REVOCATION_OFFLINE) and the download
// fails without this; integrity is guaranteed by the hash checks below, not
// by the CRL check.
execSync(`curl -fL --ssl-no-revoke --max-time 1800 -o ${tarballRel} ${url}`, { stdio: 'inherit' })
console.log(`  tarball: ${(statSync(tarballRel).size / 1e6).toFixed(1)}MB`)

// ---------------------------------------------------------------- verify

const manifest = loadManifest()
expectHash('wasm-rustc.tar.gz', sha256File(tarballRel), manifest.get('wasm-rustc.tar.gz'))

console.log('extracting…')
const tmpRel = path.join('node_modules', '.rq', 'wasm-rustc-extract')
rmSync(tmpRel, { recursive: true, force: true })
mkdirSync(tmpRel, { recursive: true })
execSync(`tar xzf ${tarballRel} -C ${tmpRel}`)
const src = path.join(tmpRel, `wasm-rustc-${PINNED_COMMIT}`)

// Extracted → install paths, all relative to the repo root.
const toInstall = [
  [path.join(src, 'bin', 'rustc.wasm'), path.join(spikeRel, 'rustc.wasm')],
  ...readdirSync(path.join(src, 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib'))
    .filter((n) => n.endsWith('.rlib') || n.endsWith('.so'))
    .map((name) => [
      path.join(src, 'lib', 'rustlib', 'x86_64-unknown-linux-gnu', 'lib', name),
      path.join(libRel, name),
    ]),
]

for (const [from, to] of toInstall) {
  // manifest paths are relative to public/spike with forward slashes
  const rel = to.split(path.sep).join('/').slice('public/spike/'.length)
  expectHash(rel, sha256File(from), manifest.get(rel))
}

// ---------------------------------------------------------------- install

for (const [from, to] of toInstall) {
  copyFileSync(from, to)
}

console.log('✓ done — public/spike/ populated (all hashes verified)')
console.log('  start the dev server: npm run dev → http://localhost:5173/spike/')

# RustQuest — Security Review

Date: 2026-10-13 · Scope: full tracked codebase (`src/`, `scripts/`, `spike/`, config, lockfile) plus the
`@bjorn3/browser_wasi_shim` dependency and the served spike assets. All findings below were **fixed in the
same changeset** that added this document.

## Context

Pure static SPA (Vite + React + TS). No backend, no accounts, no third-party content. The one genuinely
untrusted-code component is the **in-browser rustc sandbox** (v0.3): a real `rustc` compiled to wasm
(`wasm32-wasip1-threads`) running in a Web Worker with an in-memory WASI filesystem, compiling
**user-typed Rust source**. Everything else is trusted app code rendering trusted content data.

## Attack-surface summary

| Surface | Exposure | Containment |
|---|---|---|
| `rustc.wasm` + 27 std rlibs (175 MB, third-party, executed in a Worker) | Supply chain: who controls the bytes that run in visitors' browsers? | **Pinned commit + SHA-256 manifest + runtime verification** (finding 1) |
| User-typed Rust source (sandbox editor) | Data to rustc — never executed (no linker, no codegen execution) | WASI shim: in-memory FS only; all `sock_*` syscalls throw; no DOM in worker |
| Worker → page `postMessage` | If wasm were compromised, it controls its own stdout/stderr/exit | All fields render as React text nodes; no `eval`/`innerHTML`/`dangerouslySetInnerHTML` sinks in app code |
| `localStorage` save | Same-origin readable | Worker cannot call `localStorage` (not a wasm import); save data renders text-only |
| Static assets (JS/CSS/wasm) on the deploy origin | CDN/host compromise | **CSP** (finding 4) + runtime wasm hash verification (finding 1) |

## Findings & fixes

### 1. 🔴 Unpinned, unverified executable supply chain — **FIXED**
`scripts/fetch-spike-assets.mjs` downloaded the 175 MB of *executed* compiler bytes from a **mutable
ref** (`refs/heads/main`) with **no integrity verification**. Anyone with write access to
`bjorn3/wasm-rustc` (compromised account, malicious PR) would obtain code execution in every visitor's
browser, and every re-download could silently change the bytes.

Fix:
- URL pinned to commit `9de4a793c9e4930084944985263a3d6f378f85fb` (the repo's tip since 2024-04;
  verified byte-identical to the binaries already in `public/spike/` — all 28 files compared).
- `scripts/spike-assets.sha256` manifest (tarball + rustc.wasm + 27 rlibs) committed to the repo;
  `fetch-spike-assets.mjs` verifies every hash and **refuses to install** on mismatch.
- Runtime defense-in-depth: `src/lib/sandbox/runner-worker.ts` re-hashes rustc.wasm + all rlibs after
  the in-browser fetch (WebCrypto SHA-256, one-time ~1 s) against hashes embedded in the app bundle
  (trusted repo → built artifact; a compromised origin/CDN serving tampered bytes fails the warmup and
  the sandbox degrades gracefully to the multiple-choice flow).

Residual: an attacker who compromises *this* repo's deploy pipeline can swap the embedded hashes and
the wasm together. That is the same trust level as any self-hosted static site; pinning + manifest +
runtime check closes the realistic upstream-repo vector.

### 2. 🟠 Unbounded output capture in the sandbox — **FIXED**
`Cap.fd_write` (worker) accumulated `fd_write` payloads with no cap; a compromised/buggy compiler
spewing to stderr grows the worker heap without limit (and the page-side `streamed` string in
`client.ts` grew unbounded too). The terminal capped line *count* (300) but not line *size*.

Fix: worker `Cap` is now a 1 MiB sliding window (keeps the most recent bytes; unflushed tail is
posted before being dropped; `flushed` offset adjusted accordingly). Page-side `streamed` is tail-capped
at 256 KiB (the wedge-recovery decision only needs the diagnostic tail). `SandboxPanel` caps each
terminal line at 4 KiB. Same 1 MiB cap applied to the spike worker's `Cap`.

### 3. 🟠 `innerHTML` sinks in the shipped spike page — **FIXED**
`spike/main.ts` (bundled into `dist/spike/` via the vite build input) used `innerHTML` in
`setStatus`/`addMetric`. Only internally generated strings reached them, but it was a fragile pattern
in deployable code. Replaced with DOM construction (`createElement` + `textContent`). The
`terminalEl.innerHTML = ''` *clearing* calls remain (injection-safe).

### 4. 🟡 No Content-Security-Policy — **FIXED**
`vite.config.ts` now sends a CSP on dev + preview (`default-src 'self'; script-src 'self'
['unsafe-inline' in dev for the react-refresh preamble]; style-src 'self' 'unsafe-inline' for React
inline style attributes; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'`).
The deploy section below lists the exact headers for production hosts.

### 5. 🟡 Dev `?debug=<mode>` deep-link shipped in production — **FIXED**
`Run.tsx` forced a single question mode from the URL in all builds. Now gated behind
`import.meta.env.DEV` (statically false in production builds → tree-shaken).

### 6. 🟡 `--ssl-no-revoke` in the fetch script — **KEPT, documented**
Initially flagged as TLS weakening; investigation showed the corporate proxy's TLS-interception
certificate fails Windows revocation checks (`CRYPT_E_REVOCATION_OFFLINE`) — without the flag the
download fails in this environment entirely. Kept with an explanatory comment. (The pinned URL is
HTTPS to codeload.github.com; the revocation flag does not weaken the pinned-hash verification that
now follows the download.)

### 7. 🟡 `scripts/patch-rustc-table.mjs` malformed table import — **FIXED**
The `newEntry` array was missing `...encLeb(tmin)` (lost into a mangled comment), so the script's
output wasm had an unterminated table import and failed its own `WebAssembly.compile` validation.
Restored the min/max LEBs. (Dev-only script; the app fetches `rustc.wasm`, not the patched variant —
the local `rustc-patched.wasm` turned out to be a plain copy of `rustc.wasm`, and the patched file is
excluded from the hash manifest.)

## Verified clean (no action)

- **DOM XSS**: no `dangerouslySetInnerHTML` / `eval` / `new Function` / `document.write` in app code.
  All 235 content strings, worker→page messages, and rustc output render as React text nodes
  (the `dangerouslySetInnerHTML` strings inside `dist/assets/main-*.js` are react-dom library internals).
- **WASI shim v0.4.2** (inspected): in-memory `File`/`Directory` only; `sock_recv/send/shutdown/accept`
  all throw "sockets not supported"; `proc_raise` throws; `poll_oneoff` clock-only; `random_get`
  crypto-backed. The wasm imports only `env.memory`, `wasi.thread-spawn`, and `wasi_snapshot_preview1`
  — it **cannot** call `fetch`/`WebSocket`/`localStorage`, so even a compromised binary cannot
  exfiltrate data; its residual power is CPU spin + up to 1 GiB shared memory, contained by the
  SharedArrayBuffer heartbeat (8 s stale → `terminate`, ≤3 attempts) + output inspection.
- **Dependencies**: all 122 locked packages resolve to `registry.npmjs.org`; 8 direct deps, no typosquats.
- **Save data**: `JSON.parse` + defaults merge (no prototype-pollution path — JSON keys become data
  properties); all fields render text-only; storage failures degrade gracefully.
- **No secrets** in the repo; `git status` clean; the 175 MB binaries are gitignored (the fetch script
  is their only acquisition path — exactly where the pinning/checksums now live).

## Deploy hardening (production host)

The vite plugin sets these headers for dev/preview; the production host must send the same
(GitHub Pages **cannot** — the sandbox then degrades gracefully to multiple-choice):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'
```

- Netlify: `netlify.toml` → `[[headers]]` for `/*`
- Vercel: `vercel.json` → `headers`
- Cloudflare Pages: `headers.json` at repo root

## Residual (accepted)

- Dev-only Node harnesses (`scripts/spike-node.mjs`, `demo-accurate.mjs`, `sablock-*`) use unbounded
  capture and 30 s watchdogs; they never ship and are covered by process-level timeouts.
- `Math.random()` in the game engine (shuffle/combo) is fine for game fairness, not for security use.
- A hostile *same-origin* local user can edit the `rustquest-save-v1` localStorage entry; it only
  affects their own cosmetic progress (all values render text-only, no logic depends on it beyond
  display/gating).

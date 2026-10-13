# PROGRESS — RustQuest 🦀🎮

Living log of where this project stands. Read this first when resuming work.
Last updated: v0.3 spike **validated in the browser** (real rustc diagnostics in-page; commits up to `a958c94`).

## What this is

A gamified web app for learning Rust. No lectures — you learn by playing:
quiz rounds, predict-output rounds, fix-the-bug rounds, memory match, boss battles,
XP → ranks → badges → module unlocks. Pure static SPA (Vite + React + TS), no backend,
`localStorage` persistence. Dev server: `npm run dev` → http://localhost:5173.

## Done ✅

### v0.1 (commit history root → v0.2 commit)
- Full game shell: `App.tsx` screen state machine (home ↔ run), arcade neon theme
- Game core in `src/game/`: `types.ts` (Question union), `engine.ts` (XP/combo/timer/shuffle/stratifiedPick), `ranks.ts` (5 ranks, 23 badges), `store.ts` (localStorage save v1)
- Modules 1–2 content (49 questions): Basics, Ownership
- Unified `QuestionView` for option-based modes, `HUD`, `CodeBlock` (regex Rust highlighter)
- Run state machine: intro → question → feedback → done/failed; HP=3, 30s timer, combo multiplier, speed bonus, failed runs salvage half XP
- Boss battles (8 rounds, remix conquered modules), gating (boss needs cleared run; next module needs boss cleared)

### v0.2 (current HEAD)
- **Two new game modes:**
  - 🔧 Fix the Bug — broken code + rustc-style error box + pick the fix + fixed-code reveal (20 XP)
  - 🧠 Memory Match — 4×4 card game, 8 pairs, own 60s clock, HUD timer hidden (25 XP + speed bonus)
- **All 10 modules, 235 questions** (100 quiz, 88 predict, 32 fix, 10 match):
  1 Basics · 2 Ownership · 3 Enums & Match · 4 Collections · 5 Error Handling ·
  6 Traits & Generics · 7 Closures & Iterators · 8 Smart Pointers · 9 Concurrency · 10 Async & Toolchain
- Stratified round-robin picking → every 10-round run mixes all four modes
- Full badge set (23): first-blood, combo-5/10/20, speed-5, debugger (10 fixes), memory-5,
  answers-100/300, perfect, boss-1, halfway (5 modules), champion (all 10 bosses), m1–m10-clear
- New save stats: `fixes`, `matchesWon` (shown in Home stat row; `loadSave` merges defaults so old saves survive)
- `npm run check` — content validator (esbuild-bundles banks → validates modes/options/answers/explanations/8-pair match sets): **235 questions, 0 problems**
- Docs updated: PLAN.md (v0.2 ✅, actual repo layout), README.md (how it plays, adding content incl. fix/match shapes, roadmap)
- Pushed to GitHub: LawWanFung/rust-and-play, branch `main`


### v0.3 — SPIKE: real rustc in the browser sandbox (in progress)
Goal: prove `rustc` (compiled to wasm) can run in the sandbox and emit real
diagnostics. Asset: `bjorn3/wasm-rustc` (rustc 1.79.0-dev for
`wasm32-wasip1-threads`, 81 MB wasm + x86_64-unknown-linux-gnu std rlibs) —
the official static.rust-lang.org playground build is dead (404).

**Infrastructure** (gitignored assets; `npm run fetch-spike-assets` re-downloads):
- `public/spike/rustc.wasm` + `public/spike/sysroot/lib/rustlib/x86_64-unknown-linux-gnu/lib/` (26 rlibs + libstd .so)
- `scripts/fetch-spike-assets.mjs` — re-download via jsDelivr
- `scripts/spike-node.mjs` — Node harness (main entry)
- `scripts/spike-runner-worker.mjs` — runs ONE rustc invocation on a dedicated OS thread; heartbeat (SAB timestamp stamped on every WASI import call) lets the main thread detect a wedged run and terminate+retry (3×)
- `spike/main.ts` + `spike/index.html` — browser spike (COOP/COEP headers in vite.config.ts)
- `scripts/patch-rustc-table.mjs` / `patch-wait-timeout.mjs` — wasm binary patch experiments (see below)

**What works (validated):**
- `rustc --version` in the sandbox ✓
- **Valid** programs: full pipeline runs (parse → typeck → codegen → link attempt);
  the final `cc` link step fails (no linker in sandbox) — tolerated: if the only
  error is "could not exec the linker", the compile is treated as success.
  `hello` case: **exit 0 in ~0.8 s, 5/5** ✓
- Sysroot must be the real rustup layout `/sysroot/lib/rustlib/<triple>/lib/`;
  a `/` preopen is required (rustc temp dirs like `/rmetaXXX`); the `libstd-*.so`
  file must be present (its absence changes the thread flow and breaks runs);
  `WASI` must be constructed with `{ debug: false }` (the shim's default debug
  mode writes gigabytes).

**The threading saga (why buggy cases are the hard part):**
- rustc spawns a real OS thread at startup (the `run_in_thread_with_globals`
  "rustc" compilation thread, even with `-Zthreads=1`; rayon pool + jobserver
  helper in the parallel build). `wasi_thread_start` must run it somewhere.
- **Inline** (bjorn3 demo pattern — same instance, same thread): valid programs
  complete; **buggy programs hang** — the spawned thread parks in a futex
  (`memory.atomic.wait32`; verified from rust 1.79 `library/std/src/pal/wasm/
  atomics/futex.rs`) and the main thread is blocked inside the spawn call, so
  the wake-up can never happen. Hang = 0 CPU, stable memory (true suspension).
- **Worker-thread + separate instance**: blocked — the trampoline uses
  `call_indirect` on runtime-populated table slots; a second instance has a
  different table → "null function". Sharing the table is impossible in
  shipping V8: shared funcref tables unsupported; Node 24 even forbids the
  combination (shared table import needs `--experimental-wasm-shared`, which
  then forbids shared memory). `WebAssembly.Instance` is NOT transferable
  (checked in Node), so the emscripten "transfer the instance" model is out.
- V8 releases the SAB exclusive lock while a thread is suspended in
  `atomic.wait` (validated with `scripts/sablock-test.mjs`) — so cross-thread
  memory access itself is fine; the table is the wall, not the memory.

**Status: VALIDATED IN THE BROWSER ✅ (the make-or-break passed)**
- Valid code: `hello` compiles clean in ~2 s (thread spawn works; the
  post-link `cc` failure is tolerated; `unreachable` abort silenced).
- Buggy code: `mut` produced a **complete real rustc diagnostic**
  (E0596 with caret, `help:` suggestion, `--explain` pointer) in ~15 s.
  The shutdown futex-park still happens, but the park is at shutdown
  — *after* all diagnostics are printed — so **completion-by-output-
  inspection** (streamed output contains `error[E…]`/`warning:` when the
  heartbeat goes stale → return it as the result) turns the hang into a
  contained ~15 s wait with the full educational payload on screen.
- The spawned-thread park race itself (0-CPU futex suspension, no
  lost-wakeup recovery in this V8) remains a known limitation; a
  definitive fix needs a wasm rewriter that bounds every futex wait.
  Not blocking: diagnostics are always delivered.

**Node harness** (scripts/spike-node.mjs): same story — hello 3/3 exit 0;
buggy cases contained by heartbeat/retry. Browser is the target runtime.

**Open items (non-blocking):**
1. Bounded-futex wasm rewriter (per-site timeout injection with
   branch-delta fixups) to kill the shutdown park entirely — would cut
   buggy-case latency from ~15 s to ~2 s. Nice-to-have, not a gate.
2. Tune STALE_MS (15 s → ~8 s) for snappier wedged-run resolution.
3. **The real next step: game integration** — `CodeEditor` (textarea),
   sandbox run phase on fix questions, MC fallback if the worker never
   reports ready (offline / COEP failure).

## To do ⏭️

### v0.3 — rustc-wasm sandbox (spike done — see above; next: make buggy cases reliable)
Turn "Fix the Bug" from multiple-choice into **type real Rust, it compiles**:
1. rustc asset = `bjorn3/wasm-rustc` (official playground build is dead); lazy-load the 81 MB wasm out of the critical bundle
2. New `CodeEditor` component: plain `<textarea>` first (monospace, syntax-colored overlay is a nice-to-have, NOT a blocker)
3. New run phase `sandbox`: show broken code + error → user edits → "⚡ Compile" → real rustc output in the terminal box
4. Pass condition: compiles clean AND (stretch) passes embedded `#[test]` asserts
5. Gate it behind the existing fix flow: multiple-choice stays as the fast path; "🛠 Try it in the sandbox" button on fix questions for the deep-dive path
6. Keep it optional/graceful: if WASM fails to load (offline), fall back to the current multiple-choice fix
- Design question to decide first: per-question sandbox (ship a starter file per fix question) vs free-play "workbench" module — lean per-question

### v0.4 — polish
- Sound effects (WebAudio, no assets: blips for hit/miss/combo/boss; mute toggle)
- Themes (arcade neon is default; add 1–2: e.g. "Terminal Green", "Pastel")
- Local leaderboard (best runs per module, localStorage)
- Daily challenge (seeded run of the day, shareable score string)

### Evergreen (any time)
- More questions per module when gaps show up in playtesting (validator enforces quality floor)
- Mobile pass (match grid + HUD at small widths is functional but unloved)
- Vite PWA config for offline play + installability (1-line-ish win given no backend)

## Gotchas & conventions (read before editing)

- **Lifetimes in strings:** any string containing `'a` / `'static` MUST be a template literal
  (`` `...` ``) — a raw apostrophe inside a single-quoted string ends it. This has bitten 3×.
- **Question union:** `Question` is a discriminated union (quiz|predict|fix|match).
  Option-based modes share `options/answer/explain`; `fix` adds `error`/`fixedCode`;
  `match` has `pairs`/`summary` and no options. `QuestionView` takes `OptionQuestion = Extract<Question, {mode:'quiz'|'predict'|'fix'}>`.
- **Save format:** key `rustquest-save-v1`, `{ xp, modules, badges, stats }`.
  `loadSave()` merges over defaults — ADD new fields to defaults, never assume shape.
  Bump the key only if you break compatibility.
- **Apostrophes in prose:** use `\u2019` inside single-quoted strings (or template literals).
- **Run finish()** re-reads `loadSave()` as source of truth (prop `save` is a stale snapshot);
  `finalized` ref guards double-finish.
- **Content rule:** new module files export a `ModuleDef`, register in `src/content/modules.ts`
  (order = unlock order), then `npm run check` must pass.
- **Build:** `npm run build` = `tsc --noEmit && vite build` (strict, noUnusedLocals/Parameters).
- Dev server may be left running on :5173 between sessions (HMR picks up edits).

## Commands

```bash
npm run dev      # play → http://localhost:5173
npm run build    # type-check + production bundle → dist/
npm run check    # validate all 235 questions
```

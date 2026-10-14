# RustQuest — Code Quality & Robustness Review

Date: 2026-10-13 · Scope: full current codebase (`src/`, `spike/`, `scripts/`, config). Companion to
[SECURITY.md](./SECURITY.md) (security phase). All findings below were **fixed in the same changeset**
that added this document.

Guiding principle: **the game must never show a white screen and never freeze a tab** — not for a
corrupted save, not for a malformed message, not for degenerate content. Every externally-sourced
value (localStorage, worker messages, content data, URL params) is treated as untrusted input.

## Findings & fixes

### 1. 🔴 No error boundary — any render exception = white screen
React 18 unmounts the entire tree on an uncaught render error; nothing caught it. Two realistic
triggers already existed in the tree (`getModule` throwing, `q` undefined from an empty bank).

Fix: `src/components/ErrorBoundary.tsx` — a themed crash screen with **Reload** and
**Reset progress & reload** (wipes the save via `persistSave(emptySave())`). `main.tsx` wraps the
app in it, guards a missing `#root`, and registers `window` `error` / `unhandledrejection` listeners
(log-only; the boundary owns render-phase recovery).

### 2. 🔴 `getModule` threw on unknown module ids
`Run` called it at render top; a stale deep-link or a module removed from the array crashed the app.

Fix: `getModule` returns `ModuleDef | null`; `Run` shows a recoverable "MODULE NOT FOUND → Home"
screen (all hooks stay unconditional — the early return is *after* every hook, so hook order is
stable per mount; `Run` is keyed by module, so the null state is stable within a mount).

### 3. 🟠 Corrupted save values flowed into math and rendering
`loadSave` used `??` defaults, which don't catch **wrong types**: a hand-edited localStorage entry
with `xp: "123"` made `s.xp += 30` do string concatenation (`"12330"`, `NaN` rank bar);
`bestXp: "abc"` rendered "best run: NaN XP"; `modules: null` threw in `Object.keys`.

Fix: `loadSave` now sanitizes every field — `num()` (finite-number coercion), `bool()`
(strict `=== true`), `Array.isArray` + string-filter for badges, per-entry object checks for
modules, and `correct ≤ answers` clamping. Any shape it can't parse falls back to the empty save.

### 4. 🟠 `?debug=<mode>` deep-link could freeze the tab (infinite loop)
`while (filtered.length < need) filtered.push(...filtered)` never terminates when the forced mode
has **zero** questions in the bank (empty `filtered` pushes nothing). Latent with the current
content (all modules carry all four modes), but a one-line content edit could trigger it.

Fix: the force is applied only when `filtered.length > 0`; an empty filter falls back to the full
bank.

### 5. 🟠 Empty question bank → `q` undefined → render throw
`stratifiedPick` on an empty bank returns `[]`; `questions[qIndex]` was then `undefined` and
`q.mode` threw in effects/render.

Fix: the §2 SafeScreen also fires on `questions.length === 0`; countdown/timeout/answer effects
and `applyResult` all null-guard `q`.

### 6. 🟠 `MatchGame` with zero pairs auto-won on mount
The win effect is `matched.size === pairs.length` — with zero pairs that's `0 === 0`, true
immediately: a degenerate match round paid XP for doing nothing.

Fix: `pairs ?? []` normalization; zero-pair content triggers a one-shot **immediate loss**
(`onResult(false, 0, MATCH_TIME)`); win/timeout effects additionally require `pairs.length > 0`.
(Production content is checked to have exactly 8 pairs by `npm run check` — this is the
defense-in-depth layer for hand-edited content.)

### 7. 🟠 `SandboxPanel.compile` had no failure path
The `await sandbox.compile(...)` was bare: the client contract says "never rejects", but a future
refactor breaking that contract would (a) drop the `setBusy(false)` and (b) raise an unhandled
rejection.

Fix: the whole block is `try { … } catch { terminal error line } finally { setBusy(false) }`.

### 8. 🟠 Worker: a malformed message wedged the sandbox permanently
`self.onmessage` ran `new DataView(msg.heartbeat)` **outside** any `try`; a message with a
missing/wrong-typed `heartbeat` rejected the async handler *after* `busy = true` — `busy` was never
reset, so every later `run` was silently ignored. Dead sandbox, no error, no recovery.

Fix: the handler validates the full message shape (`kind` string, `source` string, `args`
array, `heartbeat instanceof SharedArrayBuffer`) and rejects malformed runs with a `-998` result;
the payload is only touched inside the `try` whose `finally` releases `busy`.

### 9. 🟡 `client.ts`: dead code + unvalidated messages
`cancel()`, `stopPoll()` and the instance `poll` field were leftovers from an earlier design
(`postRun` uses a local `poll`; the instance one was never set). The `onmessage` handler trusted
message fields.

Fix: `cancel()` is now a real, correct API (kills the worker, **resolves the pending run as
"abandoned" so the queue unblocks**); the dead `stopPoll`/`this.poll` are gone. `onmessage`
validates the message is an object with a string `kind` and coerces every field it consumes.

### 10. 🟡 `MatchGame` flip timers leaked across unmount
The 450/900 ms `setTimeout`s fired after unmount (harmless in React 18, but sloppy).

Fix: timers are tracked in a ref and cleared on unmount.

### 11. 🟡 Run stats inflated for early-ended runs
`finish()` added `questions.length` (10) to `stats.answers` even when the run failed on round 3 —
skewing the accuracy % and the answers-100/300 badge thresholds.

Fix: `roundsPlayed = qIndex + 1` is used for the answers stat (identical for completed runs).

### 12. 🟡 Unbounded sandbox editor input
A pasted 50 MB file grew the textarea and the worker's in-memory FS without limit (compile then
burns the 120 s hard cap on pointless work).

Fix: `SandboxPanel` ignores edits beyond 100 KB.

### 13. 🟡 Dead statement in the game worker
`void currentId` in `doEnsureWarm` was a leftover from an earlier signature. Removed.

### 14. 🟡 Duplicated result-settlement logic in `Run`
`answer()` and `onMatchResult()` each repeated the combo/bestCombo/XP/HP/speed-hit block.

Fix: one `applyResult(ok, xp, fast, kind)` helper; the two call sites differ only in XP source and
the speed criterion.

### 15. 🟡 Stale docs
README roadmap showed v0.3 (the sandbox) as not-done while it ships in the app. Marked complete.

### 16. 🟡 No `<noscript>` fallback
`index.html` now explains that JavaScript is required.

### 17. 🟢 Spike: unknown case button produced the string `"undefined"`
`CASES[btn.dataset.case!]` → falls back to `CASES.hello` for unknown ids.

## Verified clean (no action)

- **Content integrity at build time**: `npm run check` enforces 4 options + bounded `answer` index,
  exactly 8 non-duplicate match pairs, min lengths, per-mode required fields, ≥1 match per module —
  so the runtime guards above are defense-in-depth, not the primary line.
- **Timer discipline**: every `setInterval` (Run countdown, MatchGame clock) has a cleanup; the
  Run timeout effect is double-fire-safe via the `phase` guard.
- **Queue/worker lifecycle**: one persistent worker, serialized runs, shared in-flight warmup
  promise (no double 180 MB fetch), stale-detect → terminate → recreate → bounded retries.
- **React key/identity**: `Run` is keyed by `moduleId:isBoss`; lists use stable keys; the
  `key={combo}` re-animation in the HUD is intentional.
- **Styles**: 967 lines, zero `!important`, consistent custom-property theming.
- **`finish()` idempotence**: `finalized` ref prevents double XP/badge granting (double-click safe).

## Edge-case matrix (what must never break the app)

| Input | Source | Handling |
|---|---|---|
| Missing/corrupted `localStorage` save | hand-edit, privacy mode | `loadSave` sanitizes every field; worst case = fresh empty save |
| `localStorage` write failure (quota/private) | environment | `persistSave` swallows; game continues in-memory |
| Unknown module id | stale URL/deep-link | SafeScreen → Home (no throw) |
| Empty question bank / empty `?debug` filter | degenerate content | SafeScreen / full-bank fallback (no infinite loop) |
| Zero-pair match question | degenerate content | immediate loss, no auto-win XP |
| Malformed worker message | protocol drift/bug | shape-validated; `-998` result; `busy` released |
| Wedged rustc run (futex park) | the known rustc-wasm behavior | SAB heartbeat → terminate → ≤3 bounded retries → output inspection |
| Huge editor paste / huge rustc output | user | 100 KB input cap; 1 MiB worker window; 256 KiB page tail; 4 KiB lines; 300-line terminal |
| Any render-phase exception | any bug | ErrorBoundary → recoverable crash screen |
| Any async rejection outside React | any bug | logged via `unhandledrejection` listener |
| No JavaScript / missing `#root` | misconfigured deploy | explanatory text, not a blank page |

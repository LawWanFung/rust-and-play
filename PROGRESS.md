# PROGRESS — RustQuest 🦀🎮

Living log of where this project stands. Read this first when resuming work.
Last updated: after v0.2, pushed to github.com/LawWanFung/rust-and-play (commit `1ed1b6b`).

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

## To do ⏭️

### v0.3 — rustc-wasm sandbox (next up, the killer feature)
Turn "Fix the Bug" from multiple-choice into **type real Rust, it compiles**:
1. Add `@rustwasm/...` (rustc compiled to WASM, the engine behind rust Playground) as a Vite asset; lazy-load it (big — keep it out of the critical bundle; expect ~10–20 MB)
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

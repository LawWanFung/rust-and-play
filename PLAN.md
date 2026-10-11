# RustQuest 🎮

A gamified web app for learning Rust. No chapters, no lectures — you learn by **fighting, predicting, fixing, and matching** your way through the language.

## Core idea

Every lesson is a *game mechanic*, not a reading assignment:

- **Quiz** — multiple choice with timer, combos, and instant explanations on miss
- **Predict Output** — read a real Rust snippet, predict what it prints / compiles / panics (the #1 mode for internalizing Rust semantics: ownership, borrowing, lifetimes)
- **Fix the Bug** — a broken snippet with a real compile/runtime error; pick (later: type) the fix
- **Match** — concept ↔ definition / trait ↔ behavior memory game
- **Boss Battle** — end-of-module mixed gauntlet; clearing it earns big XP + badge

## Game loop

```
Pick a Module (10 total, sequential unlock)
   → Mixed rounds: Quiz · Predict · Fix · Match
   → HP bar (miss = -1 HP; 0 HP = run over, retry module)
   → Timer + combo multiplier (consecutive correct = more XP)
   → Clear module → BOSS BATTLE
   → Earn XP → rank up, unlock next module
```

## Content map

All content is **data-driven** (JSON/TS question banks) so new questions are trivial to add.

| # | Module | Teaches |
|---|--------|---------|
| 1 | Basics | `let`/`mut`, shadowing, primitive types, `fn`, expressions |
| 2 | Ownership | moves, borrowing, references, lifetimes (the scary one) |
| 3 | Enums & `match` | `enum`, pattern matching, `Option`, `if let` |
| 4 | Collections | `Vec`, `HashMap`, `String` vs `&str`, iteration |
| 5 | Error handling | `Result`, `Option`, `?`, `panic!`, custom errors |
| 6 | Traits & generics | trait impls, bounds, derive, trait objects |
| 7 | Closures & iterators | `Fn`/`FnMut`/`FnOnce`, iterator chains |
| 8 | Smart pointers | `Box`, `Rc`, `RefCell`, recursion, reference counting |
| 9 | Concurrency | threads, channels, `Mutex`, `Sync`/`Send` |
| 10 | Async & toolchain | `async`/`await`, Cargo, crates, testing |

Target: ~10–15 questions per module per mode.

## Level system

- **XP:** base per correct answer × combo multiplier; speed bonus; boss bonus
- **Ranks:** Rookie → Apprentice → Adept → Engineer → Rustc Whisperer (XP thresholds)
- **Badges:** First Blood, Combo ×10, Perfect Module, Speed Demon, Boss Slayer, Module 2 Conqueror (ownership!), …
- **Persistence:** `localStorage` — progress, XP, ranks, badges, streaks, per-module bests. Survives reloads; no backend.

## Tech stack

- **Vite + React + TypeScript** (default choice; plain HTML/JS fallback if preferred)
- Pure static SPA — `npm install && npm run dev`, no backend, deployable anywhere
- `localStorage` for persistence
- Later: **rustc-wasm** (the Rust Playground's engine) embedded in the browser so "Fix the Bug" becomes a *real* compile-and-run sandbox

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| **v0.1** ✅ | Game shell + Modules 1–2 (Basics, Ownership). Quiz + Predict Output. HP/combo/XP, ranks, badges, localStorage, boss battles. **Playable.** |
| **v0.2** ✅ | Fix the Bug + Memory Match. All 10 modules (235 questions). Full badge set. Stratified run mixing. |
| **v0.3** | rustc-wasm sandbox — type real Rust, see real compile errors, real "aha" moments. |
| **v0.4** | Polish — sounds, themes (arcade neon default), local leaderboard, daily challenge. |

## Decisions (defaults — override any of these)

1. **Stack:** Vite + React + TypeScript
2. **Scope:** build v0.1 first (Modules 1–2), then expand
3. **Tone:** full arcade energy — neon, combo popups, big feedback

## Repo layout (actual)

```
learn-rust/
├── PLAN.md
├── README.md
├── package.json
├── index.html
├── scripts/
│   └── check-content.mjs     # npm run check — validates all question banks
└── src/
    ├── main.tsx
    ├── App.tsx               # screen state machine: home ↔ run
    ├── styles.css            # arcade neon theme
    ├── game/
    │   ├── types.ts          # Question union (quiz|predict|fix|match), ModuleDef
    │   ├── engine.ts         # XP formulas, shuffle/stratifiedPick, constants
    │   ├── ranks.ts          # rank thresholds, all badge defs
    │   └── store.ts          # localStorage persistence (save v1, forward-compatible)
    ├── content/
    │   ├── modules.ts        # registry of all 10 modules
    │   └── m1…m10-*.ts       # 235 questions, data-only
    ├── modes/
    │   ├── QuestionView.tsx  # unified quiz/predict/fix card + MatchSummary
    │   └── MatchGame.tsx     # 4×4 memory-match card game (own 60s timer)
    ├── screens/
    │   ├── Home.tsx          # hero, rank, stats, module grid, badge wall
    │   └── Run.tsx           # run state machine (intro→question→feedback→done/failed)
    └── ui/                   # HUD, CodeBlock (Rust syntax highlighter)
```

## Next step

Build v0.3: embed rustc-wasm for a real type-and-compile sandbox (the killer feature: "Fix the Bug" becomes "write the fix, compile it, see it pass").

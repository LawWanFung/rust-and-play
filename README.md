# RustQuest 🦀🎮

Learn Rust by playing. A gamified web app: no lectures, no video courses — you level up by **quizzing, predicting output, and boss-battling** your way through the language.

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
```

No backend. Progress (XP, ranks, badges, module progress) persists in `localStorage`.

## How it plays

1. Pick a **module** (10 total: Basics → Ownership → Enums → Collections → Errors → Traits → Closures → Smart Pointers → Concurrency → Async/Toolchain)
2. Survive a **run**: 10 timed rounds mixing **Quiz**, **Predict-Output**, **Fix-the-Bug**, and **Memory Match**
3. Every miss costs **1 HP** (3 total); consecutive hits build a **combo** that multiplies XP
4. Clear the run → fight the **module boss** (8 rounds, remixed from conquered modules)
5. Beat the boss → unlock the next module, earn XP, badges, and **rank up**
6. Every answer shows an **explanation** — that's where the actual learning happens

**Ranks:** 🌱 Rookie → 🗡️ Apprentice → ⚔️ Adept → 🛡️ Engineer → 👑 Rustc Whisperer

**235 questions** across 10 modules: 100 quiz, 88 predict, 32 fix-the-bug, 10 memory match.

## Adding content

Content is pure data. Add questions to `src/content/m*-*.ts` (or new module files) and register them in `src/content/modules.ts`, then validate with `npm run check`:

```ts
// option-based modes (quiz | predict | fix) share one shape:
{
  mode: 'predict',            // 'quiz' | 'predict' | 'fix'
  prompt: 'What does this print?',
  code: 'let x = 5;\nlet x = x + 5;\nprintln!("{}", x);',
  options: ['Prints: 10', 'Prints: 5', 'Compile error', 'Prints: 55'],
  answer: 0,                  // index of the correct option
  explain: 'Shadowing: the second `let x` is a new binding.',
}

// fix adds a rustc error box + the revealed fix:
{
  mode: 'fix',
  prompt: 'This won\u2019t compile. What\u2019s the fix?',
  code: 'let v = vec![1];\nv.push(2);',
  error: 'error[E0594]: cannot assign to `v` because it is not declared as mutable',
  options: ['Add `mut`', '...', '...', '...'],
  answer: 0,
  fixedCode: 'let mut v = vec![1];\nv.push(2);',
  explain: 'push() needs a mutable binding.',
}

// memory match: 8 concept↔definition pairs, played as a 4×4 card game:
{
  mode: 'match',
  prompt: 'Pair each concept with its meaning.',
  pairs: [{ a: 'mut', b: 'opt-in reassignment' }, /* ...8 pairs */],
  summary: 'One-liner shown in feedback.',
}
```

⚠️ Any string containing a lifetime (`'a`, `'static`) must be a **template literal** — a raw apostrophe breaks single-quoted strings.

## Roadmap

See [PLAN.md](./PLAN.md).

- [x] **v0.1** — game shell, Modules 1–2, Quiz + Predict, HP/combo/XP, ranks, badges, bosses, localStorage
- [x] **v0.2** — Fix-the-Bug + Memory Match modes, all 10 modules (235 questions), full badge set
- [ ] **v0.3** — rustc-wasm sandbox (type real Rust, real compile errors, in-browser)
- [ ] **v0.4** — sounds, themes, local leaderboard, daily challenge

## Stack

Vite + React + TypeScript. Pure static SPA — deploy anywhere.

## Security

See [SECURITY.md](./SECURITY.md) — the full review (2026-10-13) of the in-browser rustc sandbox:
pinned + hash-verified compiler assets, output caps, CSP, and the deploy header requirements.

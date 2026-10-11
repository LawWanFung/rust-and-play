import type { ModuleDef } from '../game/types'

export const m10Async: ModuleDef = {
  id: 'm10-async',
  title: 'Async & Toolchain',
  subtitle: 'futures, await, cargo, tests, crates',
  icon: '🚀',
  hue: 130,
  clearBadge: 'm10-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What does an `async fn` return?',
      options: [
        'A `Future` \u2014 a value that will eventually produce a result (not the result itself)',
        'The result immediately',
        'A thread',
        'A callback',
      ],
      answer: 0,
      explain:
        'Calling an async fn does NOT run it to completion \u2014 it returns a Future, a paused computation. The result materializes only when something DRIVES the future (polls it).',
    },
    {
      mode: 'quiz',
      prompt: 'Why are futures LAZY by default?',
      options: [
        'Nothing happens until an executor polls them \u2014 so you can compose them freely',
        'They run in a separate process',
        'They are slower',
        'They need a macro',
      ],
      answer: 0,
      explain:
        'Futures, like iterators, do no work on their own. `let f = fetch();` just builds the machine; you need `.await` (inside async) or an executor (block_on, tokio::main) to run it. No runtime \u2192 no work.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.await` do?',
      options: [
        'Resumes a future, yielding the surrounding async fn while the work completes',
        'Sleeps the OS thread',
        'Blocks the whole program',
        'Spawns a thread',
      ],
      answer: 0,
      explain:
        'await = "run this future to completion, but cooperatively": the executor can run OTHER work while waiting. One thread, many concurrent tasks \u2014 the basis of async I/O. (Only allowed inside async fns.)',
    },
    {
      mode: 'quiz',
      prompt: 'What is a "runtime" (executor)?',
      options: [
        'A piece of software (tokio, async-std) that polls futures in a loop until they finish',
        'The OS scheduler',
        'A thread pool only',
        'The compiler',
      ],
      answer: 0,
      explain:
        'Futures are lazy, so SOMETHING must poll them: a runtime like tokio runs a loop of .poll() calls on many tasks, switching as I/O completes. `#[tokio::main]` = "block_on(my_main_future) plus a task pool".',
    },
    {
      mode: 'quiz',
      prompt: 'What is Cargo?',
      options: [
        'Rust\u2019s official build tool + package manager (crates.io is its registry)',
        'A web framework',
        'A linter',
        'A runtime',
      ],
      answer: 0,
      explain:
        'cargo new / build / run / test / add / doc \u2014 it compiles, manages dependencies, runs tests, and publishes to crates.io. Every Rust project starts with cargo; it is the toolchain\u2019s front door.',
    },
    {
      mode: 'quiz',
      prompt: 'What is `Cargo.toml`?',
      options: [
        'The manifest: project metadata, dependencies, and build configuration',
        'A log file',
        'A binary',
        'The compiler config',
      ],
      answer: 0,
      explain:
        'The [package] section (name, version, edition), [dependencies] (what you import from crates.io), [dev-dependencies], [features]... It\u2019s the project\u2019s identity card. `cargo add serde` edits it for you.',
    },
    {
      mode: 'quiz',
      prompt: 'How do you write a unit test in Rust?',
      options: [
        'An `#[test]` fn inside a `#[cfg(test)] mod tests { ... }` block',
        'A class named Test',
        'A file ending in .test.rs only',
        'A comment directive',
      ],
      answer: 0,
      explain:
        '`#[test]` marks a fn as a test; `cargo test` finds and runs them all. The `#[cfg(test)]` module keeps test code out of production builds. Tests are ordinary fns \u2014 assert, panic on failure.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `assert_eq!(a, b)` do?',
      options: [
        'Panic (failing the test) if a != b, printing both values',
        'Returns a bool',
        'Prints a warning',
        'Rounds a to b',
      ],
      answer: 0,
      explain:
        'The test workhorse: compares with ==, and on mismatch PANICS with a message showing both sides \u2014 the failure you see in cargo test output. There\u2019s also assert! (bool) and assert_ne!.',
    },
    {
      mode: 'quiz',
      prompt: 'How do modules and `pub` work together?',
      options: [
        '`mod name { }` groups items; `pub` marks them visible OUTSIDE the module',
        'pub is a macro',
        'Modules are files only',
        'pub makes items global to all processes',
      ],
      answer: 0,
      explain:
        'Everything is private by default. `pub fn` / `pub struct` exports from the module. `use crate::mymod::thing;` imports it. Module trees (mod declarations + files) ARE Rust\u2019s file organization.',
    },
    {
      mode: 'quiz',
      prompt: 'What is crates.io?',
      options: [
        'The public registry of Rust packages \u2014 `cargo add` fetches from it',
        'A Rust compiler fork',
        'A benchmarking site',
        'A language server',
      ],
      answer: 0,
      explain:
        'crates.io hosts community packages (serde, tokio, clap...). You depend on them in Cargo.toml, and cargo downloads + builds them. The ecosystem\u2019s backbone \u2014 "the Rust community" lives here.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn main() {\n    let fut = async { 1 + 2 };\n    // no runtime, no await... what happens?\n    println!("made a future");\n}',
      options: [
        'Prints "made a future" and exits \u2014 the async block was never polled',
        'Prints 3',
        'Compile error \u2014 async needs a runtime',
        'Hangs',
      ],
      answer: 0,
      explain:
        'The async block just builds a Future value; nothing polls it, so 1+2 never runs. This is the #1 async beginner confusion: async code is inert until a runtime (or await inside a driven fn) runs it.',
    },
    {
      mode: 'predict',
      prompt: 'With a runtime present (e.g. #[tokio::main]), what does this print?',
      code: 'async fn work(n: u32) -> u32 {\n    n * 10\n}\n\n#[tokio::main]\nasync fn main() {\n    let a = work(1).await;\n    let b = work(2).await;\n    println!("{a} {b}");\n}',
      options: ['10 20', '1020', '20 10', 'Compile error'],
      answer: 0,
      explain:
        'Sequential awaits: work(1) to completion, THEN work(2) \u2192 "10 20". (To run them CONCURRENTLY you\u2019d use join! or spawned tasks \u2014 awaiting one-by-one is just slow-in-disguise.)',
    },
    {
      mode: 'predict',
      prompt: 'What does `cargo test` output for a PASSING test look like?',
      code: 'fn add(a: i32, b: i32) -> i32 { a + b }\n\n#[cfg(test)]\nmod tests {\n    use super::*;\n    #[test]\n    fn it_adds() {\n        assert_eq!(add(2, 2), 4);\n    }\n}',
      options: [
        'test result: ok. 1 passed; 0 failed; 0 ignored',
        'test result: FAILED',
        'No output',
        'Compile error',
      ],
      answer: 0,
      explain:
        'The canonical green line: "test result: ok. 1 passed". Each test runs in its own thread; assert! failures panic \u2192 the test is reported failed with the panic message.',
    },
    {
      mode: 'predict',
      prompt: 'What does `cargo test` report for a FAILING assert?',
      code: '#[test]\nfn it_adds() {\n    assert_eq!(2 + 2, 5);\n}',
      options: [
        'panicked at ...: left: `4`, right: `5`  \u2014 1 failed',
        'Silent success',
        'Compile error',
        'Hangs',
      ],
      answer: 0,
      explain:
        'assert_eq! panics on mismatch and PRINTS BOTH sides \u2014 "left: `4`, right: `5`" \u2014 so failures are self-explaining. 1 failed; the non-zero exit code is what makes CI red.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: `mod config {\n    pub fn host() -> &'static str { "localhost" }\n    fn port() -> u16 { 8080 }\n}\n\nfn main() {\n    println!("{}", config::host());\n    // println!("{}", config::port());  \u2190 this line is commented out\n}`,
      options: [
        'localhost  (port() would NOT compile \u2014 it is private)',
        'localhost 8080',
        'Compile error \u2014 host is private too',
        'Nothing',
      ],
      answer: 0,
      explain:
        'host() is pub \u2192 callable from outside the module. port() has no pub \u2192 invisible beyond `mod config` \u2014 uncommenting that line is E0603. Privacy is the default; pub is the exception.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::time::Duration;\n\nasync fn fetch_after(ms: u64, label: &str) -> &str {\n    tokio::time::sleep(Duration::from_millis(ms)).await;\n    label\n}\n\n#[tokio::main]\nasync fn main() {\n    let start = std::time::Instant::now();\n    let a = fetch_after(200, "a").await;\n    let b = fetch_after(200, "b").await;\n    println!("{a} {b} ~{}ms", start.elapsed().as_millis());\n}',
      options: ['a b ~400ms', 'a b ~200ms', 'b a ~400ms', 'Compile error'],
      answer: 0,
      explain:
        'Two 200ms sleeps awaited SEQUENTIALLY = ~400ms total. Async doesn\u2019t make sequential code fast \u2014 it makes CONCURRENT code possible. (join!(...) would get ~200ms.)',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this is compiled?',
      code: 'use helper::do_thing;\n\nfn main() {\n    do_thing();\n}\n\n// helper module does not exist yet',
      options: [
        'Compile error E0432/E0425: unresolved import `helper`',
        'It works \u2014 use is optional',
        'Runtime panic',
        'Silent no-op',
      ],
      answer: 0,
      explain:
        '`use` is a compile-time path: no such module \u2192 hard error naming the missing path. The compiler\u2019s import checking is why Rust refactors so safely \u2014 dead paths fail the build, not production.',
    },
    {
      mode: 'predict',
      prompt: 'What does `cargo build --release` differ from `cargo build` in?',
      code: '# in Cargo.toml\n[profile.release]\nopt-level = 3',
      options: [
        'Release enables optimizations (faster binary, slower build); debug keeps debug info + speed of build',
        'They are identical',
        'Release strips all code',
        'Release is for libraries only',
      ],
      answer: 0,
      explain:
        'Debug profile: fast compile, unoptimized (and debug assertions on). Release: optimized for speed, slower to build. Benchmarks and shipping binaries ALWAYS use --release \u2014 debug builds can be 10\u00d7+ slower.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'async fn load() -> i32 { 42 }\n\nfn main() {\n    let n = load();\n    println!("{n}");\n}',
      error:
        'error[E0277]: the trait bound `i32: Future` is not satisfied\n  |\n  |         ---- ^^^^ expected a future, found `i32`\n  = note: async fns return futures; you are using the future as a value',
      options: [
        'Drive it: make main async (`#[tokio::main] async fn main`) and `let n = load().await;`',
        'Cast the future with as i32',
        'Remove the async keyword from load',
        'Use load() in a thread',
      ],
      answer: 0,
      fixedCode: 'async fn load() -> i32 { 42 }\n\n#[tokio::main]\nasync fn main() {\n    let n = load().await;\n    println!("{n}");\n}',
      explain:
        'The classic "future vs value" error: load() returns a Future<i32>, and println! wanted an i32. The fix is always the same shape: await it inside an async context (with a runtime at the root).',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'async fn fetch() -> String { String::from("data") }\n\nfn run() {\n    let s = fetch().await;\n    println!("{s}");\n}',
      error:
        'error: `.await` cannot be used on a non-async function\n  |\n  |           -^^^ `run` is not `async`\n  = note: awaiting is only allowed inside async functions',
      options: [
        'Make the function async: `async fn run()` (and await IT from an async main)',
        'Use block_on inside run',
        'Remove .await',
        'Spawn a thread',
      ],
      answer: 0,
      fixedCode: 'async fn fetch() -> String { String::from("data") }\n\nasync fn run() {\n    let s = fetch().await;\n    println!("{s}");\n}\n\n#[tokio::main]\nasync fn main() {\n    run().await;\n}',
      explain:
        'await is only legal inside async fns \u2014 the "async-ness" must propagate UP the call chain to a runtime root. This is why async APIs "infect" their callers by design: it makes concurrency boundaries visible in the type signature.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'mod utils {\n    fn helper() { println!("hi"); }\n}\n\nfn main() {\n    utils::helper();\n}',
      error:
        'error[E0603]: function `helper` is private\n  |\n  |          -------- ^^^^^^ private function\n  = note: crate-private items are not visible outside their module',
      options: [
        'Mark it public: `pub fn helper()`',
        'Move main inside utils',
        'Use `use utils::helper` \u2014 imports don\u2019t bypass privacy',
        'Make the mod pub only',
      ],
      answer: 0,
      fixedCode: 'mod utils {\n    pub fn helper() { println!("hi"); }\n}\n\nfn main() {\n    utils::helper();\n}',
      explain:
        'Privacy is per-ITEM, not per-module: the mod can be visible while its innards stay hidden. E0603 \u2192 add pub exactly where the API boundary is. (pub(crate) = visible within the crate \u2014 often the right knob.)',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'fn counts() -> std::collections::HashMap<&str, i32> {\n    todo!()\n}\n\nfn main() {\n    let mut m = HashMap::new();\n    m.insert("a", 1);\n    println!("{m:?}");\n}',
      error:
        'error[E0425]: cannot find value `HashMap` in this scope\n  |\n  |        -------- help: consider importing this struct: `use std::collections::HashMap;`',
      options: [
        'Import it: `use std::collections::HashMap;` at the top of the file',
        'Rename HashMap to Map',
        'Use a Vec of tuples instead',
        'Add `mut` to the HashMap type',
      ],
      answer: 0,
      fixedCode: 'use std::collections::HashMap;\n\nfn main() {\n    let mut m = HashMap::new();\n    m.insert("a", 1);\n    println!("{m:?}");\n}',
      explain:
        'E0425, the "name not found" error: HashMap lives in std::collections, outside the prelude. The compiler\u2019s `help:` line usually hands you the exact import \u2014 read it, paste it, move on. (std prelude covers String, Vec... but not everything.)',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each async/toolchain term with its meaning.',
      pairs: [
        { a: 'Future', b: 'paused computation' },
        { a: '.await', b: 'run it, cooperatively' },
        { a: 'async fn', b: 'returns a Future' },
        { a: 'runtime/executor', b: 'polls futures (tokio)' },
        { a: 'Cargo', b: 'build + package manager' },
        { a: 'crates.io', b: 'public package registry' },
        { a: '#[test]', b: 'marks a test fn' },
        { a: 'pub / mod', b: 'visibility + structure' },
      ],
      summary:
        'The finale: futures are lazy until a runtime runs them, await composes them without blocking threads, and the cargo/crates.io/mod/pub machinery is how all of this gets built, tested, and shared.',
    },
  ],
}

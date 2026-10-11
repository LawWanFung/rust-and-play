import type { ModuleDef } from '../game/types'

export const m5Errors: ModuleDef = {
  id: 'm5-errors',
  title: 'Error Handling',
  subtitle: 'Result, Option, ?, panic',
  icon: '⚠️',
  hue: 5,
  clearBadge: 'm5-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What are the two variants of `Result<T, E>`?',
      options: [
        '`Ok(T)` and `Err(E)`',
        '`Some(T)` and `None`',
        '`True` and `False`',
        '`Success` and `Failure`',
      ],
      answer: 0,
      explain:
        'Result models "this succeeded with a value, or failed with an error": `Ok(value)` / `Err(e)`. Some/None belong to Option. Rust has no exceptions \u2014 errors are values you pass around.',
    },
    {
      mode: 'quiz',
      prompt: 'What are the two variants of `Option<T>`?',
      options: [
        '`Some(T)` and `None`',
        '`Ok(T)` and `Err(E)`',
        '`Yes` and `No`',
        '`Full` and `Empty`',
      ],
      answer: 0,
      explain:
        'Option is "maybe a value" (missing is not an error \u2014 just absent). Result is "success or error". Both are enums; both force you to handle every case.',
    },
    {
      mode: 'quiz',
      prompt: 'What does the `?` operator do on a `Result`?',
      options: [
        'Unwraps Ok, or returns the Err from the CURRENT function early',
        'Panic on Err',
        'Converts Err to None',
        'Retries the operation',
      ],
      answer: 0,
      explain:
        '`?` is early-exit: `let x = f()?;` means "if f() is Err, return that Err NOW; otherwise bind x to the Ok value". It turns nested error-handling pyramids into flat code.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `?` do on an `Option`?',
      options: [
        'Unwraps Some, or returns None from the current function early',
        'Panic on None',
        'Converts to a Result',
        'Blocks until a value arrives',
      ],
      answer: 0,
      explain:
        'Same idea, Option flavor: `let x = opt?;` returns None early if opt is None. The function must return an Option (or you can `opt.ok_or(...)?` to switch to a Result).',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.unwrap()` do?',
      options: [
        'Returns the inner value, or PANICS if it\u2019s None/Err',
        'Returns the inner value or 0',
        'Returns the inner value or None',
        'Drops the value',
      ],
      answer: 0,
      explain:
        'unwrap() is the "I promise this is here" button. Fine in tests and prototyping; in production, handle the failure case (match, if-let, `?`, expect with a message).',
    },
    {
      mode: 'quiz',
      prompt: 'What is `panic!`?',
      options: [
        'A macro that aborts normal flow \u2014 the thread unwinds',
        'A kind of error type',
        'A sleep function',
        'A debug print',
      ],
      answer: 0,
      explain:
        'panic! is for "this can NEVER happen" \u2014 unrecoverable bugs. It unwinds the stack (running cleanup/drops on the way). Recoverable failures use Result/Option, not panic.',
    },
    {
      mode: 'quiz',
      prompt: 'Can `main` return a `Result`?',
      options: [
        'Yes \u2014 `fn main() -> Result<(), Box<dyn std::error::Error>>` is idiomatic',
        'No \u2014 main must return ()',
        'Only with a macro',
        'Only in nightly Rust',
      ],
      answer: 0,
      explain:
        'main can return a Result. If it returns Err, the runtime prints `Error: <msg>` and exits non-zero. The boxed-dyn idiom lets one signature carry many error types.',
    },
    {
      mode: 'quiz',
      prompt: 'How do you handle BOTH cases of a Result explicitly?',
      options: [
        '`match r { Ok(v) => ..., Err(e) => ... }`',
        'try/catch',
        'assert!',
        'r.handle()',
      ],
      answer: 0,
      explain:
        'There is no try/catch in Rust. `match` (or if-let for one case) is THE way to split Ok from Err \u2014 and the compiler verifies you handled both.',
    },
    {
      mode: 'quiz',
      prompt: 'How do you define a custom error type?',
      options: [
        'An enum of error cases, typically implementing `std::error::Error`',
        'A struct with a panic message',
        'A macro',
        'You cannot \u2014 only built-in errors exist',
      ],
      answer: 0,
      explain:
        'The standard pattern: `enum MyError { Io(std::io::Error), Parse(String) }` + `impl Error for MyError`. Each variant wraps a cause; match picks the right handling.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.map_err()` on a Result do?',
      options: [
        'Transforms the Err value (e.g. into your own error type), leaving Ok alone',
        'Transforms the Ok value',
        'Converts Err into a panic',
        'Swaps Ok and Err',
      ],
      answer: 0,
      explain:
        'map_err maps over the ERROR side: `f().map_err(|e| MyError::Io(e))?` converts a foreign error type into yours, then `?` propagates it. (`.map()` is the Ok-side twin.)',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn parse(s: &str) -> Result<i32, String> {\n    s.parse().map_err(|e| format!("bad: {e}"))\n}\n\nmatch parse("42") {\n    Ok(n) => println!("got {n}"),\n    Err(e) => println!("err: {e}"),\n}\nmatch parse("nope") {\n    Ok(n) => println!("got {n}"),\n    Err(e) => println!("err: {e}"),\n}',
      options: ['got 42 then err: bad: ...', 'err then got 42', 'Ok(42) Err(nope)', 'Compile error'],
      answer: 0,
      explain:
        '"42".parse() \u2192 Ok(42) \u2192 "got 42". "nope".parse() \u2192 Err \u2192 map_err wraps it \u2192 "err: bad: ...". map_err only touches the failure side.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn read_a() -> Result<i32, String> { Ok(1) }\nfn read_b(x: i32) -> Result<i32, String> { Ok(x * 10) }\n\nfn run() -> Result<i32, String> {\n    let a = read_a()?;\n    let b = read_b(a)?;\n    Ok(b + 1)\n}\n\nprintln!("{}", run().unwrap());',
      options: ['11', '1', '2', 'Compile error'],
      answer: 0,
      explain:
        'a = 1, b = 10, result 11. The `?`s only fire on Err \u2014 with all-Ok inputs the chain runs straight through. This flatness is why `?` exists.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this runs?',
      code: 'let x: Option<i32> = None;\nlet y = x.unwrap();\nprintln!("{}", y);',
      options: [
        'Panics: called `Option::unwrap()` on a `None` value',
        'Prints: 0',
        'Prints: None',
        'Compile error',
      ],
      answer: 0,
      explain:
        'unwrap on None is a runtime panic with a very recognizable message. Compiles fine \u2014 the type system allows it; the promise ("I swear it\u2019s Some") is on you.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let name: Option<&str> = None;\ngreet(name);\n\nfn greet(n: Option<&str>) {\n    match n {\n        Some(x) => println!("Hello, {x}!"),\n        None => println!("Hello, stranger!"),\n    }\n}',
      options: ['Hello, stranger!', 'Hello, !', 'Panic', 'Compile error'],
      answer: 0,
      explain:
        'None arm runs. Note the function takes an Option in its signature \u2014 "name may be missing" is now part of the API contract, visible to every caller.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let x: Option<i32> = None;\nlet y = x.expect("x must be set");\nprintln!("{}", y);',
      options: [
        'Panics: x must be set (called `Option::expect()` on a `None` value)',
        'Prints: 0',
        'Prints: None',
        'Compile error',
      ],
      answer: 0,
      explain:
        'expect() is unwrap with a custom message \u2014 the panic says exactly WHY the invariant broke. Prefer it over bare unwrap in code you\u2019ll debug at 2am.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn f() -> Result<i32, String> { Err("boom".into()) }\nfn g() -> Result<i32, String> {\n    let x = f()?;\n    Ok(x + 1)\n}\nprintln!("{:?}", g());',
      options: ['Err("boom")', 'Ok(0)', 'Ok(1)', 'Panic'],
      answer: 0,
      explain:
        'f() is Err \u2192 `?` returns it immediately from g \u2014 the `x + 1` line never runs. g() surfaces the SAME error: propagation, not loss.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let r: Result<i32, String> = Ok(20);\nlet doubled = r.map(|n| n * 2);\nprintln!("{:?}", doubled);',
      options: ['Ok(40)', 'Ok(20)', 'Err(40)', 'Compile error'],
      answer: 0,
      explain:
        '.map() transforms the Ok side (like Option::map): 20 \u2192 40. Err values pass through untouched.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this runs?',
      code: 'fn main() -> Result<(), String> {\n    Err("something went wrong".into())\n}',
      options: [
        'Prints: `Error: something went wrong` and exits with non-zero status',
        'Silent exit 0',
        'Panic with a stack trace',
        'Compile error',
      ],
      answer: 0,
      explain:
        'main returning Err is handled by the runtime: it prints `Error: <Display of E>` and sets a failure exit code. Graceful top-level failure, no panic noise.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This can panic. What\u2019s the robust fix?',
      code: 'let n: i32 = "not a number".parse().unwrap();\nprintln!("{n}");',
      error:
        'runtime: thread \'main\' panicked at src/main.rs:1:\ncalled `Result::unwrap()` on an `Err` value: \nIntError { kind: ParseIntError }',
      options: [
        'Handle the failure: `match "not a number".parse() { Ok(n) => ..., Err(_) => println!("not a number") }`',
        'Use parse().unwrap() but in a loop',
        'Cast the string with as i32',
        'Add `mut` to n',
      ],
      answer: 0,
      fixedCode: 'match "not a number".parse() {\n    Ok(n) => println!("{n}"),\n    Err(_) => println!("not a number"),\n}',
      explain:
        'unwrap() on a failing parse is a landmine: fine for "123", fatal for garbage. Match the Result and decide what failure MEANS \u2014 that decision is the whole art of Rust error handling.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'fn read() -> Result<i32, String> { Ok(5) }\n\nfn run() {\n    let x = read()?;\n    println!("{x}");\n}',
      error:
        'error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`\n  |\n  |      ---- ^? cannot `?` in a function that returns `()`\n  = note: the `?` operator cannot act on a `Result` value in a function that returns `()`',
      options: [
        'Make run return a Result: `fn run() -> Result<(), String>` (and return Ok(()) at the end)',
        'Remove the `?`',
        'Change read to return an Option',
        'Use `unsafe`',
      ],
      answer: 0,
      fixedCode: 'fn read() -> Result<i32, String> { Ok(5) }\n\nfn run() -> Result<(), String> {\n    let x = read()?;\n    println!("{x}");\n    Ok(())\n}',
      explain:
        '`?` needs somewhere to put the propagated error: the enclosing function must return a compatible Result/Option. This error is your cue that error handling is "flowing upward" \u2014 follow it to the signature.',
    },
    {
      mode: 'fix',
      prompt: 'The compiler warns about this line. What\u2019s the fix?',
      code: 'fn load() -> Result<String, String> { Ok("data".into()) }\n\nfn run() {\n    load();\n    println!("done");\n}',
      error:
        'warning: unused `Result` that must be used\n  |\n  |     ----^-\n  = note: this `Result` may be an `Err` variant, which should be handled\n  = note: `#[warn(unused_must_use)]` on by default',
      options: [
        'Handle it: `load().unwrap();` or `if let Err(e) = load() { ... }` or `let _ = load();` to deliberately ignore',
        'Delete the load() call',
        'Add `unsafe` block',
        'Ignore the warning \u2014 it is harmless',
      ],
      answer: 0,
      fixedCode: 'fn load() -> Result<String, String> { Ok("data".into()) }\n\nfn run() {\n    if let Err(e) = load() {\n        eprintln!("load failed: {e}");\n    }\n    println!("done");\n}',
      explain:
        'Result is `#[must_use]`: the compiler refuses to let you silently drop a failure. Handle it, or write `let _ =` to say "I deliberately ignore this" \u2014 silence must be a choice, never an accident.',
    },
    {
      mode: 'fix',
      prompt: 'This can panic. What\u2019s the robust fix?',
      code: 'let config: Option<String> = None;\nlet c = config.expect("config");\nuse_config(&c);',
      error:
        'runtime: thread \'main\' panicked at src/main.rs:2:\nconfig: called `Option::expect()` on a `None` value',
      options: [
        'Handle the None case: `match config { Some(c) => use_config(&c), None => use_default() }`',
        'Call expect twice',
        'Make config a Result instead',
        'Use config.clone().unwrap()',
      ],
      answer: 0,
      fixedCode: 'let config: Option<String> = None;\nmatch config {\n    Some(c) => use_config(&c),\n    None => use_default(),\n}',
      explain:
        'expect() with a message is better than unwrap(), but it still panics. If "missing" is a NORMAL state (no config file provided!), it deserves a code path, not a crash.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each error-handling tool with its behavior.',
      pairs: [
        { a: 'Ok(v)', b: 'success with value' },
        { a: 'Err(e)', b: 'failure with cause' },
        { a: 'Some(v)', b: 'value present' },
        { a: 'None', b: 'value absent' },
        { a: '?', b: 'propagate early' },
        { a: 'panic!', b: 'unrecoverable, unwind' },
        { a: 'unwrap()', b: 'value or crash' },
        { a: 'expect(msg)', b: 'value or crash + why' },
      ],
      summary:
        'The error toolkit: Ok/Err and Some/None are data, ? propagates failures upward, map/map_err reshape them, and panic/unwrap are the last-resort "impossible" buttons.',
    },
  ],
}

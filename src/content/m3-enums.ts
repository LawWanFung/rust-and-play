import type { ModuleDef } from '../game/types'

export const m3Enums: ModuleDef = {
  id: 'm3-enums',
  title: 'Enums & Match',
  subtitle: 'variants, pattern matching, Option',
  icon: '🧩',
  hue: 265,
  clearBadge: 'm3-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What is an `enum` in Rust?',
      options: [
        'A user-defined type with a fixed set of named variants',
        'A variable that can change type',
        'A kind of loop',
        'A foreign-function interface',
      ],
      answer: 0,
      explain:
        'An enum names a family of values: `enum Coin { Penny, Nickel, Dime }`. Each variant can also carry data. Enums are how Rust models "this OR that, nothing else".',
    },
    {
      mode: 'quiz',
      prompt: 'What does "exhaustive" mean for a `match`?',
      options: [
        'Every possible value of the type must be handled by some arm',
        'The match must fit on one line',
        'It must use the `_` wildcard',
        'It can only match integers',
      ],
      answer: 0,
      explain:
        'If a value could exist that no arm covers, that\u2019s a compile error (E0004). Exhaustiveness is a compile-time guarantee that your code handles all cases \u2014 no silent fallthrough.',
    },
    {
      mode: 'quiz',
      prompt: 'What does the `_` arm in a match do?',
      options: [
        'Matches anything not handled by earlier arms (wildcard)',
        'Matches only the value zero',
        'Ignores the match entirely',
        'Compile error \u2014 `_` is not allowed in match',
      ],
      answer: 0,
      explain:
        '`_` is the wildcard: it catches whatever earlier arms didn\u2019t. It\u2019s the idiomatic "and everything else" arm.',
    },
    {
      mode: 'quiz',
      prompt: 'What is `Option<T>`?',
      options: [
        'A built-in enum with `Some(T)` and `None` \u2014 Rust\u2019s answer to null',
        'A pointer type',
        'A field that may be skipped',
        'A lazy value',
      ],
      answer: 0,
      explain:
        'There is no null in Rust. `Option<T>` makes "might be missing" explicit in the type: `Some(value)` or `None`. The compiler forces you to handle both.',
    },
    {
      mode: 'quiz',
      prompt: 'What is `if let`?',
      options: [
        'A shortcut for a single-arm match with an optional else',
        'A faster if statement',
        'A let binding that can fail',
        'An assignment operator',
      ],
      answer: 0,
      explain:
        '`if let Some(x) = opt { } else { }` is a match with one interesting arm. Use `match` when several variants matter; `if let` when only one does.',
    },
    {
      mode: 'quiz',
      prompt: 'How do you pull data OUT of an enum variant in a match arm?',
      options: [
        'Destructure it in the pattern: `match msg { Message::Data { x, y } => ... }`',
        'You cannot \u2014 enums cannot carry data',
        'Call .data()',
        'Use a cast',
      ],
      answer: 0,
      explain:
        'Patterns match INTO data. `Message::Data { x, y }` binds x and y from the variant\u2019s fields. Same idea as tuple and struct destructuring.',
    },
    {
      mode: 'quiz',
      prompt: 'What is a match guard?',
      options: [
        'An `if` condition on an arm: `n if n > 0 => ...`',
        'A security check inside a match',
        'A way to lock a match',
        'The wildcard arm',
      ],
      answer: 0,
      explain:
        'Guards add a boolean condition to an arm. Arms are checked in order: a guard-failing arm falls through to the next. Great for range logic: `n if (1..=9).contains(&n) => "small"`.',
    },
    {
      mode: 'quiz',
      prompt: '`match` in Rust is\u2026',
      options: [
        'An expression \u2014 it produces a value',
        'A statement \u2014 it produces nothing',
        'A macro',
        'A loop',
      ],
      answer: 0,
      explain:
        'Like `if`, `match` is an expression: each arm must produce the same type, and you can assign the result: `let s = match x { ... };`',
    },
    {
      mode: 'quiz',
      prompt: 'What does `while let` do?',
      options: [
        'Loops while a pattern keeps matching (re-checks each iteration)',
        'Runs a match exactly once',
        'Creates a match statement alias',
        'Compile error \u2014 no such thing',
      ],
      answer: 0,
      explain:
        '`while let Some(x) = iter.next() { ... }` re-evaluates the pattern each round \u2014 the classic idiom for draining an iterator of Options.',
    },
    {
      mode: 'quiz',
      prompt: 'What happens if a match is missing an arm for an existing variant?',
      options: [
        'Compile error: non-exhaustive patterns',
        'It panics at runtime',
        'It silently skips that value',
        'It returns None',
      ],
      answer: 0,
      explain:
        'E0004 at compile time. The compiler even tells you which variant you missed. This is Rust\u2019s superpower: impossible states are unrepresentable, missing cases are unbuilt.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'enum Coin { Penny, Nickel, Dime }\n\nlet c = Coin::Nickel;\nmatch c {\n    Coin::Penny => 1,\n    Coin::Nickel => 5,\n    Coin::Dime => 10,\n}\nprintln!("{}", c == Coin::Nickel);',
      options: ['true', 'false', '5', 'Compile error'],
      answer: 0,
      explain:
        'The match runs (its value is discarded) and the comparison is true: c IS Nickel. Note unit variants are referred to as `Coin::Nickel`.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let msg: Option<String> = Some(String::from("hi"));\nmatch msg {\n    Some(m) => println!("{}", m),\n    None => println!("nothing"),\n}',
      options: ['hi', 'nothing', 'Some(hi)', 'Compile error'],
      answer: 0,
      explain:
        'The `Some(m)` arm binds m to the inner String and prints it. `None` would print "nothing".',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let x: Option<i32> = None;\nlet r = if let Some(v) = x {\n    v + 1\n} else {\n    42\n};\nprintln!("{}", r);',
      options: ['42', '1', 'None', 'Compile error'],
      answer: 2,
      explain:
        'x is None, so the else branch runs: r = 42. if-let is a one-arm match with an else.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let mut i = 0;\nlet v = vec![Some(1), Some(2), None, Some(3), None];\nlet mut count = 0;\nwhile let Some(x) = v.get(count) {\n    i += x;\n    count += 1;\n}\nprintln!("{} {}", i, count);',
      options: ['3 2', '6 4', '3 4', 'Compile error'],
      answer: 0,
      explain:
        'While the next slot is Some, add it. Stops at the first None (index 2): i = 1+2 = 3, count = 2. `while let` bails the moment the pattern stops matching.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: `fn describe(n: i32) -> &'static str {\n    match n {\n        n if n < 0 => "negative",\n        0 => "zero",\n        n if n <= 10 => "small",\n        _ => "big",\n    }\n}\nprintln!("{} {}", describe(7), describe(50));`,
      options: ['small big', 'negative zero', 'small small', 'Compile error'],
      answer: 0,
      explain:
        'Guards are checked in order. 7: fails n<0, is not 0, passes n<=10 \u2192 "small". 50: falls to `_` \u2192 "big".',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'enum Shape { Circle { r: f64 }, Rect { w: f64, h: f64 } }\n\nlet s = Shape::Rect { w: 2.0, h: 3.0 };\nmatch s {\n    Shape::Circle { r } => println!("circle {}", r),\n    Shape::Rect { w, h } => println!("{} {}", w * h, w + h),\n}',
      options: ['6 5', '2 3', 'circle 2', 'Compile error'],
      answer: 0,
      explain:
        'The Rect arm destructures w=2, h=3: prints area (6) then perimeter-ish sum (5). Pattern matching pulls data straight out of variants.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: `fn size(n: i32) -> &'static str {\n    match n {\n        1..=3 => "small",\n        4..=9 => "medium",\n        _ => "large",\n    }\n}\nprintln!("{} {}", size(2), size(12));`,
      options: ['small large', 'small medium', 'medium large', 'Compile error'],
      answer: 0,
      explain:
        'Range patterns: 2 is in 1..=3 \u2192 "small"; 12 is in neither \u2192 `_` \u2192 "large".',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'enum Msg { Text(String), Num(i32) }\n\nlet r: i32 = match Msg::Text(String::from("a")) {\n    Msg::Text(t) => t.len(),\n    Msg::Num(n) => n,\n};\nprintln!("{}", r);',
      options: ['1', '0', 'a', 'Compile error'],
      answer: 0,
      explain:
        'The Text arm binds t = "a"; "a".len() = 1. Both arms return i32, so the match expression type-checks.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'fn is_odd(n: i32) -> bool {\n    match n % 2 {\n        1 => true,\n    }\n}',
      error:
        'error[E0004]: non-exhaustive patterns: `0` not covered\n --> src/main.rs:3:5\n  |\n3 |     match n % 2 {\n  |     ^^^^^^^^^^^^ pattern `0` not covered',
      options: [
        'Add a `0 => false` arm',
        'Add `mut` to n',
        'Wrap n in Some()',
        'Add a semicolon after the match',
      ],
      answer: 0,
      fixedCode: 'fn is_odd(n: i32) -> bool {\n    match n % 2 {\n        1 => true,\n        0 => false,\n    }\n}',
      explain:
        'E0004: `n % 2` can be 0, which no arm covers. (A `_ => false` wildcard would also work \u2014 naming the case is clearer here.)',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let x = 5;\nlet label = match x {\n    1 => 10,\n    _ => "other",\n};',
      error:
        'error[E0308]: mismatched types\n --> src/main.rs:3:13\n  |\n3 |     1 => 10,\n  |        -- ^^^ expected `&str`, found integer\n  |        |\n  |        expected due to this',
      options: [
        'Make both arms the same type: `1 => "one", _ => "other"`',
        'Add `.to_string()` to 10',
        'Change the match to an if',
        'Cast 10 to &str with as',
      ],
      answer: 0,
      fixedCode: 'let x = 5;\nlet label = match x {\n    1 => "one",\n    _ => "other",\n};',
      explain:
        'Every arm of a match must produce the SAME type (it\u2019s an expression). i32 and &str don\u2019t unify \u2192 E0308. (You can convert: `1 => "one".to_string()` if you need an owned String.)',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let r: Result<i32, String> = Ok(7);\nif let Some(v) = r {\n    println!("{}", v);\n}',
      error:
        'error[E0527]: pattern type `Option<_>` is incompatible with expected type `Result<i32, String>`\n  |\n  |     ^^^^ expected `Result<i32, String>`, found `Option<_>`',
      options: [
        'Match the right variants: `if let Ok(v) = r { ... }`',
        'Change r to an Option',
        'Add `?` after r',
        'Use `as` to cast r',
      ],
      answer: 0,
      fixedCode: 'let r: Result<i32, String> = Ok(7);\nif let Ok(v) = r {\n    println!("{}", v);\n}',
      explain:
        'Pattern must match the type: Result has Ok/Err, Option has Some/None. `if let Ok(v) = r` is the Result-shaped version of the same idiom.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: `enum Color { Red, Green, Blue }\n\nfn name(c: Color) -> &'static str {\n    match c {\n        Color::Red => "red",\n        Color::Green => "green",\n    }\n}`,
      error:
        'error[E0004]: non-exhaustive patterns: `Color::Blue` not covered\n --> src/main.rs:4:5\n  |\n4 |     match c {\n  |     ^^^^^^^ pattern `Color::Blue` not covered',
      options: [
        'Add a `Color::Blue => "blue"` arm (or a `_` wildcard)',
        'Make Blue a variant with data',
        'Delete the Green arm',
        'Return an Option instead',
      ],
      answer: 0,
      fixedCode: `enum Color { Red, Green, Blue }\n\nfn name(c: Color) -> &'static str {\n    match c {\n        Color::Red => "red",\n        Color::Green => "green",\n        Color::Blue => "blue",\n    }\n}`,
      explain:
        'Blue exists, no arm covers it \u2192 E0004. Add the missing arm; if the set is open-ended, `_` is the escape hatch.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each pattern-matching term with its meaning.',
      pairs: [
        { a: 'enum', b: 'named set of variants' },
        { a: 'variant', b: 'one enum case' },
        { a: 'match', b: 'exhaustive expression' },
        { a: '_ wildcard', b: 'catches the rest' },
        { a: 'Option<T>', b: 'Some(T) or None' },
        { a: 'Some(x)', b: 'a value is present' },
        { a: 'None', b: 'absent, no null' },
        { a: 'if let', b: 'single-arm match' },
      ],
      summary:
        'Enums name the possibilities, match covers them all exhaustively, and Option is the built-in "maybe" enum that replaces null.',
    },
  ],
}

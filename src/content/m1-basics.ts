import type { ModuleDef } from '../game/types'

export const m1Basics: ModuleDef = {
  id: 'm1-basics',
  title: 'Basics',
  subtitle: 'let, mut, shadowing, types, fn',
  icon: '🧱',
  hue: 165,
  clearBadge: 'm1-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What does the `mut` keyword do?',
      options: [
        'Makes a variable global',
        'Allows a binding to be reassigned',
        'Makes a variable a compile-time constant',
        'Allocates the variable on the heap',
      ],
      answer: 1,
      explain:
        'Bindings are immutable by default. `let mut x = 5; x = 6;` compiles; without `mut`, reassignment is a compile error. Immutability is Rust\u2019s default \u2014 you opt INTO mutation.',
    },
    {
      mode: 'quiz',
      prompt: 'What is "shadowing" in Rust?',
      options: [
        'Creating a new variable with the same name, replacing the old one',
        'Copying a variable into extra memory',
        'Hiding a private function from other modules',
        'Overriding a trait method',
      ],
      answer: 0,
      explain:
        '`let x = 5; let x = x + 5;` \u2014 the second `let` creates a NEW binding that shadows the first. Unlike `mut`, you can shadow with a different type: `let x = 5; let x = "five";` is fine.',
    },
    {
      mode: 'quiz',
      prompt: '`let n = 42;` \u2014 what is the default type of `n`?',
      options: ['i32', 'i64', 'isize', 'f64'],
      answer: 0,
      explain:
        'Integer literals default to `i32`. Annotate to change it: `let n: i64 = 42;` \u2014 the literal is reinterpreted as i64.',
    },
    {
      mode: 'quiz',
      prompt: 'What is the result of `7 / 2` in Rust?',
      options: ['3.5', '3', '4', 'Compile error'],
      answer: 1,
      explain:
        'Integer division truncates toward zero: 7 / 2 == 3. Want a decimal? Use floats: 7.0 / 2.0 == 3.5.',
    },
    {
      mode: 'quiz',
      prompt: 'In `fn square(n: i32) -> i32 { n * n }`, what does the function return?',
      options: [
        'The value of the final expression (`n * n`)',
        'Nothing \u2014 functions must use `return`',
        'The last variable that was declared',
        'Compile error \u2014 `return` is required',
      ],
      answer: 0,
      explain:
        'An expression WITHOUT a trailing semicolon is the function\u2019s return value. `return` works too, but idiomatic Rust drops it when the body is one expression.',
    },
    {
      mode: 'quiz',
      prompt: 'What is the `()` type?',
      options: [
        'The unit type \u2014 a value that carries no data',
        'An empty array type',
        'A null pointer type',
        'The type of a failed compile',
      ],
      answer: 0,
      explain:
        '`()` is the unit type: it exists, but contains nothing. Functions that "return nothing" actually return `()`. You can bind it: `let x = ();`',
    },
    {
      mode: 'quiz',
      prompt: 'What does `"hi".len()` return?',
      options: ['2', '1', '16', 'Compile error \u2014 &str has no len()'],
      answer: 0,
      explain:
        '`len()` on a `&str` is the length in BYTES. "hi" is 2 ASCII bytes \u2014 2. Gotcha: "h\u00e9llo".len() is 6, not 5, because \u00e9 is 2 bytes in UTF-8.',
    },
    {
      mode: 'quiz',
      prompt: '`let t = (1, "two", 3.0);` \u2014 how do you get the value `"two"`?',
      options: ['t.1', 't[1]', 't.two', 't->1'],
      answer: 0,
      explain:
        'Tuple elements are accessed by 0-based index: `t.0`, `t.1`, `t.2`. No brackets, no arrow.',
    },
    {
      mode: 'quiz',
      prompt: 'What happens if you assign an `i32` value to an `f64` variable without converting?',
      options: [
        'Compile error \u2014 Rust does no implicit numeric conversion',
        'It works, numbers convert automatically',
        'Runtime panic',
        'It silently becomes 0.0',
      ],
      answer: 0,
      explain:
        'Rust never converts numeric types implicitly. Be explicit: `let f: f64 = n as f64;` \u2014 no silent surprises.',
    },
    {
      mode: 'quiz',
      prompt: 'Which of these is a VALID use of `if` in Rust?',
      options: [
        'let r = if x > 0 { 1 } else { -1 };',
        'let r = if x > 0 1 else -1;',
        'let r: i32 = if x > 0 { 1 };',
        'let r = if x > 0 { 1 } else { "one" };',
      ],
      answer: 0,
      explain:
        '`if` is an EXPRESSION: branches are blocks, branches must have the same type, and if you assign the result, an `else` is required. (A bare `if` with no else returns `()` \u2014 so option 3 only works if `r` is `()`.)',
    },
    {
      mode: 'quiz',
      prompt: 'What is the difference between `String` and `&str`?',
      options: [
        '`String` is owned, heap-allocated, mutable text; `&str` borrows a slice of existing UTF-8',
        '`&str` is owned, `String` is a view',
        'They are identical, just different names',
        '`String` is for ASCII only',
      ],
      answer: 0,
      explain:
        '`String` owns its data on the heap and can grow. `&str` is a "fat pointer" (ptr + len) into existing UTF-8 \u2014 like a string literal. Functions that just read text take `&str`.',
    },
    {
      mode: 'quiz',
      prompt: 'What is a macro in Rust (e.g. `println!`)?',
      options: [
        'A function whose name ends in `!`, expanding into code at compile time',
        'A variable that runs code',
        'A type of trait',
        'Just a normal function with a funny name',
      ],
      answer: 0,
      explain:
        'The `!` distinguishes macros. `println!` is a macro that expands into code at compile time \u2014 it can take a variable number of args, which normal functions cannot.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What happens when this compiles and runs?',
      code: 'let x = 5;\nlet x = x + 5;\nprintln!("{}", x);',
      options: ['Prints: 10', 'Prints: 5', 'Compile error', 'Prints: 55'],
      answer: 0,
      explain:
        'Shadowing: the second `let x` is a brand-new binding, so the first `x` is gone. 5 + 5 = 10.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles and runs?',
      code: 'let mut x = 5;\nx = 7;\nprintln!("{}", x);',
      options: ['Prints: 7', 'Prints: 5', 'Compile error', 'Prints: 12'],
      answer: 0,
      explain: '`mut` allows reassignment through the same binding \u2014 x is now 7.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'let x = 5;\nx = 7;\nprintln!("{}", x);',
      options: ['Prints: 7', 'Compile error: cannot assign to immutable variable', 'Prints: 5', 'Panics at runtime'],
      answer: 1,
      explain:
        'No `mut` \u2192 `x` is immutable \u2192 `x = 7;` is a compile error (E0384). Rust catches this BEFORE you ever run the program.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let (a, b) = (3, 9);\nprintln!("{} {}", a, b);',
      options: ['3 9', '9 3', '(3, 9)', 'Compile error'],
      answer: 0,
      explain:
        'Tuple destructuring: `(a, b)` on the left splits the tuple into two bindings, in order.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let n = if 3 > 2 { "yes" } else { "no" };\nprintln!("{}", n);',
      options: ['yes', 'no', 'true', 'Compile error \u2014 if cannot be assigned'],
      answer: 0,
      explain:
        '`if` is an expression: the branch that runs produces the value. 3 > 2 is true, so n = "yes".',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'println!("{}", 7 / 2);\nprintln!("{}", 7.0 / 2.0);',
      options: ['3 then 3.5', '3.5 then 3.5', '3 then 3', 'Compile error'],
      answer: 0,
      explain:
        'First line: integer division truncates \u2192 3. Second line: float division \u2192 3.5. Same symbols, different types, different results.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn double(n: i32) -> i32 {\n    n * 2;\n}\nprintln!("{}", double(4));',
      options: [
        'Prints: 8',
        'Compile error: expected i32, found ()',
        'Prints: 4',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        'THE classic gotcha: the semicolon after `n * 2` DISCARDS the value, so the block returns `()`. The function promises `i32` \u2192 compile error (E0306). Remove the `;` and it prints 8.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn double(n: i32) -> i32 {\n    n * 2\n}\nprintln!("{}", double(4));',
      options: ['8', 'Compile error', '4', '0'],
      answer: 0,
      explain:
        'No semicolon \u2192 the expression `n * 2` IS the return value. 4 * 2 = 8.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let s = "Rust";\nprintln!("{}", s.len());',
      options: ['4', '1', '16', 'Compile error'],
      answer: 0,
      explain:
        '`len()` counts bytes. "Rust" is 4 ASCII bytes \u2192 4.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let x = 10;\nlet x = x * 2;\nlet x = if x > 20 { x } else { x / 2 };\nprintln!("{}", x);',
      options: ['10', '20', '5', 'Compile error'],
      answer: 0,
      explain:
        'Trace it: x = 10 \u2192 x = 20 \u2192 is 20 > 20? NO (strictly greater!) \u2192 else branch: 20 / 2 = 10.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let t = ("a", 1, 2.5);\nprintln!("{}", t.0);',
      options: ['a', '1', '2.5', 'Compile error'],
      answer: 0,
      explain: 'Tuple indexing is 0-based: t.0 is the first element \u2014 "a".',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let x: f64 = 5;\nprintln!("{}", x);',
      options: ['5', '5.0', 'Compile error: cannot assign int to f64', 'Panics at runtime'],
      answer: 0,
      explain:
        'Numeric LITERALS are flexible: with the annotation `: f64`, the literal 5 becomes 5.0. (Converting a variable would need `as`.) And `{}` formats 5.0 as "5". Sneaky one.',
    },
    {
      mode: 'match',
      prompt: 'Memory match: pair each basics concept with its meaning.',
      pairs: [
        { a: 'mut', b: 'opt-in reassignment' },
        { a: 'shadowing', b: 'new let, same name' },
        { a: 'i32', b: 'default integer type' },
        { a: 'f64', b: '64-bit float' },
        { a: 'tuple', b: '(a, b, c) fixed-size' },
        { a: 'unit ()', b: 'a value with no data' },
        { a: '&str', b: 'borrowed UTF-8 slice' },
        { a: 'String', b: 'owned, growable text' },
      ],
      summary:
        'The basics toolbox: mut mutates, shadowing replaces, () carries nothing, &str borrows text, String owns it.',
    },
  ],
}

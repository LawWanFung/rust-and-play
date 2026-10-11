import type { ModuleDef } from '../game/types'

export const m2Ownership: ModuleDef = {
  id: 'm2-ownership',
  title: 'Ownership',
  subtitle: 'moves, borrowing, lifetimes — the scary one',
  icon: '🔥',
  hue: 320,
  clearBadge: 'm2-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What happens when a `String` variable goes out of scope?',
      options: [
        'Its heap memory is freed (the value is dropped)',
        'It moves to the global pool',
        'It becomes a reference',
        'Nothing happens until a garbage collector runs',
      ],
      answer: 0,
      explain:
        'Rust has NO garbage collector. Memory is freed deterministically when a value is dropped at the end of its scope. That\u2019s why ownership rules matter so much.',
    },
    {
      mode: 'quiz',
      prompt: '`let s2 = s1;` where s1 is a `String` \u2014 what does this do?',
      options: [
        'Moves the String into s2; s1 is no longer valid',
        'Deep-copies the String; both are valid',
        'Borrows s1; s1 is untouched',
        'Compile error \u2014 Strings cannot be assigned',
      ],
      answer: 0,
      explain:
        'A `String` owns heap memory, so assignment MOVES it. The data has one owner: s2. Using s1 afterwards is a compile error.',
    },
    {
      mode: 'quiz',
      prompt: 'After a value has been moved, using the original variable\u2026',
      options: [
        'Is a compile error',
        'Panics at runtime',
        'Silently gives you an empty value',
        'Works, since it was secretly copied',
      ],
      answer: 0,
      explain:
        'The borrow checker tracks moves at compile time (E0382). You never ship a use-after-move \u2014 the program won\u2019t build.',
    },
    {
      mode: 'quiz',
      prompt: 'Which of these is NOT moved when assigned to another variable?',
      options: ['i32', 'String', 'Vec<i32>', 'Box<String>'],
      answer: 0,
      explain:
        'Types that are just bits (i32, f64, bool, char, tuples of those) implement `Copy` \u2014 assignment copies the bits. Heap-owning types (String, Vec, Box) move.',
    },
    {
      mode: 'quiz',
      prompt: 'What does the `&` operator create?',
      options: [
        'A shared reference \u2014 a read-only borrow',
        'A mutable reference',
        'A raw pointer',
        'A deep copy of the value',
      ],
      answer: 0,
      explain:
        '`&s` borrows `s` read-only. You can create as MANY shared references as you like \u2014 as long as nobody has a mutable one.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `&mut` create?',
      options: [
        'A mutable reference \u2014 exclusive access, can write through it',
        'A shared read-only reference',
        'An owned clone of the value',
        'A constant pointer',
      ],
      answer: 0,
      explain:
        '`&mut s` borrows `s` mutably: you can change it through the reference, but ONLY one mutable reference may exist at a time.',
    },
    {
      mode: 'quiz',
      prompt: 'State the core rule of references:',
      options: [
        'At any time: ANY number of `&`, OR exactly ONE `&mut` \u2014 never both',
        'Only one reference of any kind may exist at a time',
        'References must outlive the program',
        'You may have at most three references total',
      ],
      answer: 0,
      explain:
        'Shared XOR mutable. Many readers, or one writer. This single rule eliminates data races \u2014 at compile time, in single-threaded code.',
    },
    {
      mode: 'quiz',
      prompt: 'What is a "lifetime" in Rust?',
      options: [
        'The region of code over which a reference is guaranteed valid',
        'How long a process runs',
        'The time until a GC runs',
        'A timer you attach to variables',
      ],
      answer: 0,
      explain:
        `A lifetime is the compiler\u2019s bookkeeping that a reference will never outlive the value it points to. Most are inferred; you name them (\`'a'\`) when a function returns a borrow.`,
    },
    {
      mode: 'quiz',
      prompt: 'Why would a function take `&String` instead of `String`?',
      options: [
        'To read it without taking ownership \u2014 the caller keeps it',
        'It is faster for large strings',
        'Strings cannot be passed by value',
        'It makes the string mutable inside the function',
      ],
      answer: 0,
      explain:
        'Borrowing: the function uses the data, the caller keeps ownership. (Idiomatic Rust: take `&str` for read-only text, since `&String` auto-derefs to it.)',
    },
    {
      mode: 'quiz',
      prompt: 'What does `drop()` do?',
      options: [
        'Runs cleanup when a value leaves scope \u2014 frees its resources',
        'Deletes a variable from the source code',
        'Terminates the program',
        'Only runs if a GC is enabled',
      ],
      answer: 0,
      explain:
        'The compiler inserts `drop` automatically when a value goes out of scope. You CAN call it explicitly, but letting scope do it is the norm.',
    },
    {
      mode: 'quiz',
      prompt: 'A "dangling reference" is\u2026',
      options: [
        'A reference to memory that has already been freed',
        'A reference with a very short lifetime',
        'A null pointer',
        'A reference to a constant',
      ],
      answer: 0,
      explain:
        'The classic use-after-free. Rust\u2019s lifetimes make dangling references a COMPILE error, so they never reach runtime.',
    },
    {
      mode: 'quiz',
      prompt: '`fn longest(x: &str, y: &str) -> &str` \u2014 what must you add for it to compile?',
      options: [
        `A lifetime annotation tying the return to its inputs, e.g. \`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str\``,
        'A `Box` around the return value',
        'A `mut` on the parameters',
        'Nothing \u2014 it compiles as-is',
      ],
      answer: 0,
      explain:
        `The returned reference borrows from x or y, so the compiler needs to know the return\u2019s lifetime comes from the inputs. \`<'a>\` says: "the result lives as long as BOTH inputs".`,
    },
    {
      mode: 'quiz',
      prompt: 'Can a reference live longer than the value it points to?',
      options: [
        'No \u2014 the compiler rejects it',
        'Yes, if the reference is `mut`',
        'Yes, if you wrap it in a `Box`',
        'Only in `unsafe` code',
      ],
      answer: 0,
      explain:
        'Never in safe Rust. The lifetime system exists precisely to make this impossible \u2014 it\u2019s the compiler\u2019s promise that references are always valid.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn main() {\n    let s1 = String::from("hello");\n    let s2 = s1;\n    println!("{}", s1);\n}',
      options: [
        'Prints: hello',
        'Compile error: s1 moved into s2',
        'Prints an empty string',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        '`s2 = s1` MOVES the String. s1 is dead. The `println!` using s1 is E0382 \u2014 "borrow of moved value". The most famous Rust error.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn main() {\n    let s1 = String::from("hello");\n    let s2 = s1;\n    println!("{}", s2);\n}',
      options: ['hello', 'Compile error', 'Empty string', 'Panics at runtime'],
      answer: 0,
      explain:
        'Same move \u2014 but now we use s2, the NEW owner. Ownership transferred cleanly; s2 is valid.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn calculate_len(s: &String) -> usize {\n    s.len()\n}\n\nlet s = String::from("hi");\nlet len = calculate_len(&s);\nprintln!("{} - {}", s, len);',
      options: ['hi - 2', 'Compile error: s moved into function', '- 2', 'hi - 0'],
      answer: 0,
      explain:
        'The function takes `&String` \u2014 a BORROW, not the value. s is only loaned, then given back: the caller still owns it after the call.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn append(s: &mut String) {\n    s.push_str("o");\n}\n\nlet mut s = String::from("hell");\nappend(&mut s);\nprintln!("{}", s);',
      options: ['hello', 'hell', 'Compile error', 'helloo'],
      answer: 0,
      explain:
        '`&mut` borrows mutably: the function can write through the reference, and the changes are visible to the caller. hell + o = hello.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn main() {\n    let mut s = String::from("hi");\n    let r1 = &mut s;\n    let r2 = &mut s;\n    println!("{} {}", r1, r2);\n}',
      options: [
        'Prints: hi hi',
        'Compile error: two mutable borrows of s',
        'Prints: hi',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        'Two `&mut` references alive at the same time \u2192 E0499. One writer at a time, always. (If r1 were used BEFORE r2 is created, non-lexical lifetimes would let it compile.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn main() {\n    let s = String::from("hi");\n    let r1 = &s;\n    let r2 = &s;\n    println!("{} {}", r1, r2);\n}',
      options: ['hi hi', 'Compile error: two borrows', 'Panics at runtime', 'i h'],
      answer: 0,
      explain:
        'Any NUMBER of shared `&` references is fine \u2014 as long as none of them is `mut`. Readers don\u2019t conflict.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn main() {\n    let s = String::from("hi");\n    let r = &s;\n    drop(s);\n    println!("{}", r);\n}',
      options: [
        'Prints: hi',
        'Compile error: cannot move out of `s` while it is borrowed',
        'Prints an empty string',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        '`drop(s)` would MOVE s out of scope \u2014 but r is still borrowing it. E0501. You can\u2019t destroy a value that someone is looking at.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn main() {\n    let result;\n    {\n        let s = String::from("temporary");\n        result = &s;\n    }\n    println!("{}", result);\n}',
      options: [
        'Prints: temporary',
        'Compile error: s does not live long enough',
        'Prints an empty string',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        's is dropped at the closing brace. `result` would be a reference to freed memory \u2014 a dangling pointer. Lifetimes catch it: E0597.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn main() {\n    let x = 5;\n    let y = x;\n    println!("{} {}", x, y);\n}',
      options: ['5 5', '5 0', 'Compile error: x moved', '0 5'],
      answer: 0,
      explain:
        'i32 is `Copy` \u2014 small, bit-level types are copied, not moved. Both x and y are 5. Contrast with the String version, which WOULD be a move.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn takes_ownership(s: String) {\n    println!("{}", s);\n}\n\nlet s = String::from("bye");\ntakes_ownership(s);\nprintln!("{}", s);',
      options: [
        'Prints: bye then bye',
        'Compile error: s moved into takes_ownership',
        'Prints: bye, then panics',
        'Prints: empty string then bye',
      ],
      answer: 1,
      explain:
        'Passing by value transfers ownership INTO the function. s is dropped when the function returns. The final println uses a moved value \u2192 E0382.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this compiles?',
      code: 'fn main() {\n    let v1 = vec![1, 2, 3];\n    let v2 = v1;\n    println!("{:?}", v1);\n}',
      options: [
        'Prints: [1, 2, 3]',
        'Compile error: v1 moved into v2',
        'Prints: []',
        'Panics at runtime',
      ],
      answer: 1,
      explain:
        '`Vec` owns its heap buffer, so `v2 = v1` is a move \u2014 same rule as String. v1 is no longer valid. (Need both? `v1.clone()` \u2014 a real, costly copy.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {\n    if x.len() > y.len() { x } else { y }\n}\n\nlet s1 = String::from("long string");\nlet s2 = String::from("short");\nlet result = longest(&s1, &s2);\nprintln!("{}", result);`,
      options: ['long string', 'short', 'Compile error: mismatched lifetimes', 'Panics at runtime'],
      answer: 0,
      explain:
        `The \`<'a>\` annotation says the return borrows from the inputs. Both s1 and s2 outlive the call, so the borrow is valid. "long string" is longer \u2192 it wins.`,
    },
    {
      mode: 'match',
      prompt: 'Memory match: pair each ownership concept with its meaning.',
      pairs: [
        { a: 'move', b: 'transfer, original dies' },
        { a: '&', b: 'shared borrow, read-only' },
        { a: '&mut', b: 'exclusive borrow, writable' },
        { a: 'lifetime', b: 'reference validity window' },
        { a: 'drop()', b: 'frees at scope end' },
        { a: 'Copy', b: 'bits copied, not moved' },
        { a: 'dangling', b: 'points at freed memory' },
        { a: 'scope', b: 'where values live' },
      ],
      summary:
        'Ownership in one breath: values move or copy, references borrow (many readers, one writer), and everything drops at scope end. No GC, no leaks, no data races.',
    },
  ],
}

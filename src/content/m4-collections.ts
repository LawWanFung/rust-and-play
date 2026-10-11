import type { ModuleDef } from '../game/types'

export const m4Collections: ModuleDef = {
  id: 'm4-collections',
  title: 'Collections',
  subtitle: 'Vec, HashMap, String, slices',
  icon: '📦',
  hue: 45,
  clearBadge: 'm4-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'How do you create a Vec with initial values?',
      options: ['vec![1, 2, 3]', 'Vec(1, 2, 3)', 'new vec[1,2,3]', 'vec(1, 2, 3)'],
      answer: 0,
      explain:
        'The `vec!` MACRO (note the bang) builds a Vec from a list. `Vec::new()` makes an empty one. Macros expand at compile time \u2014 they\u2019re how Rust gets convenient syntax.',
    },
    {
      mode: 'quiz',
      prompt: '`v.push(4)` requires\u2026',
      options: [
        '`let mut v = ...` \u2014 push mutates the Vec',
        'A lifetime annotation',
        'The Vec to be on the heap',
        'Nothing \u2014 push works on any Vec',
      ],
      answer: 0,
      explain:
        'push() changes the Vec in place \u2192 it needs `&mut self` \u2192 you need a `mut` binding. Immutability is the default, even for collections.',
    },
    {
      mode: 'quiz',
      prompt: 'What happens when you index `v[99]` on a 3-element Vec?',
      options: [
        'Runtime panic: index out of bounds',
        'Compile error',
        'Returns 0',
        'Returns None',
      ],
      answer: 0,
      explain:
        'Indexing panics at RUNTIME if out of bounds \u2014 the compiler can\u2019t always know the length. Safer: `v.get(99)` returns `Option<&T>` \u2014 `None` instead of a crash.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `v.get(0)` return?',
      options: [
        '`Option<&T>` \u2014 Some(&first) or None',
        'The element directly',
        'A copy of the element',
        'A boolean',
      ],
      answer: 0,
      explain:
        'get() is the panic-free index: `Some(&value)` when in bounds, `None` when not. You then have to handle the Option \u2014 which is the whole point.',
    },
    {
      mode: 'quiz',
      prompt: 'What is the difference between `for x in &v` and `for x in v`?',
      options: [
        '`&v` borrows (x is &T, v survives); `v` moves the Vec (x is T, v is consumed)',
        'They are identical',
        '`v` is faster, `&v` is slower',
        '`&v` requires mut',
      ],
      answer: 0,
      explain:
        'Ownership in loops: `for x in v` MOVES the Vec and hands you owned items \u2014 v is gone after. `for x in &v` borrows and hands you references. 90% of the time you want `&v` (or `v.iter()`).',
    },
    {
      mode: 'quiz',
      prompt: 'What does `map.get("key")` return?',
      options: [
        '`Option<&V>` \u2014 Some(&value) or None',
        'The value, or a panic',
        'A mutable reference',
        'A clone of the value',
      ],
      answer: 0,
      explain:
        'HashMap lookups return Options \u2014 missing keys are data, not crashes. Insert with `map.insert(k, v)`, read with `.get()`. Keys must be `Hash + Eq`.',
    },
    {
      mode: 'quiz',
      prompt: 'What is `&s[0..2]` on a String?',
      options: [
        'A &str slice of the first two bytes (if on a char boundary)',
        'A new String with 2 chars',
        'A compile error \u2014 String cannot be sliced',
        'Two separate characters',
      ],
      answer: 0,
      explain:
        'Slicing borrows a range as a &str. It panics at runtime if the range cuts through a multi-byte UTF-8 character \u2014 strings are bytes, not letters.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `&"h\u00e9llo"[0..1]` do?',
      options: [
        'Panic: byte index 1 is not a char boundary',
        'Returns "h"',
        'Returns "h\u00e9"',
        'Compile error',
      ],
      answer: 0,
      explain:
        '\u00e9 is 2 bytes in UTF-8, so byte 1 lands in the MIDDLE of a character \u2192 runtime panic. This is why `s[i]` indexing is a trap; use `.chars()` for letter-based logic.',
    },
    {
      mode: 'quiz',
      prompt: 'How does an array `[i32; 4]` differ from a `Vec<i32>`?',
      options: [
        'Arrays are fixed-length and live on the stack; Vecs grow and live on the heap',
        'There is no difference',
        'Arrays can only hold integers',
        'Vecs are faster for small sizes',
      ],
      answer: 0,
      explain:
        'Array: length in the type, stack-allocated, fixed forever. Vec: heap buffer that can grow. Arrays shine for small fixed data (e.g. RGB tuples, months); Vecs for dynamic lists.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `v.pop()` return?',
      options: [
        '`Option<T>` \u2014 the removed last element, or None if empty',
        'The last element, panicking if empty',
        'A boolean',
        'A reference to the last element',
      ],
      answer: 0,
      explain:
        'pop() removes and returns the last element as an Option \u2014 popping an empty Vec is None, not a crash. (Need a guaranteed value? `v.pop().unwrap()` \u2014 with the usual panic risk.)',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let mut v = vec![1, 2];\nv.push(3);\nprintln!("{} {}", v.len(), v[1]);\nv.pop();\nprintln!("{}", v.len());',
      options: ['3 2 then 2', '2 2 then 1', '3 3 then 2', 'Compile error'],
      answer: 0,
      explain:
        'push grows to [1,2,3]: len 3, v[1] is 2. pop removes 3: len 2. Classic Vec lifecycle.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this runs?',
      code: 'let v = vec![10, 20];\nprintln!("{}", v[5]);',
      options: [
        'Panic: index out of bounds: the len is 2 but the index is 5',
        'Prints: 0',
        'Prints: None',
        'Compile error',
      ],
      answer: 0,
      explain:
        'Out-of-bounds indexing is a RUNTIME panic (the compiler can\u2019t see through your logic). The message tells you len and index \u2014 a very familiar Rust stack trace.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![1, 2, 3, 4];\nlet sum: i32 = v.iter().sum();\nprintln!("{}", sum);',
      options: ['10', '24', '4', 'Compile error'],
      answer: 0,
      explain:
        '`v.iter()` yields &i32; sum() adds them: 1+2+3+4 = 10. (iter() borrows \u2014 v is still alive after, unlike `for x in v`.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::collections::HashMap;\n\nlet mut map = HashMap::new();\nmap.insert("a", 1);\nmap.insert("b", 2);\nmap.insert("a", 9);\nprintln!("{} {} {}", map.get("a").unwrap(), map.get("b").unwrap(), map.get("z").unwrap_or(&0));',
      options: ['9 2 0', '1 2 0', '9 2 panic', 'Compile error'],
      answer: 0,
      explain:
        'Re-inserting key "a" REPLACES the value (1 \u2192 9). Missing key "z" \u2192 None \u2192 unwrap_or(&0) \u2192 0. HashMap: insert upserts, get returns Option.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let s = String::from("RustQuest");\nlet mut t = String::new();\nt.push_str(&s[0..4]);\nt.push(\'!\');\nprintln!("{} {}", t, t.len());',
      options: ['Rust! 5', 'Rust! 4', 'Rust 5', 'Compile error'],
      answer: 0,
      explain:
        'Slice the first 4 bytes ("Rust" \u2014 all ASCII, safe), push_str appends it, push adds \u2019!\u2019. Result "Rust!" is 5 bytes. (Slicing "R\u00e9st" at 1 would panic.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let s = String::from("hello world");\nlet slice = &s[6..];\nprintln!("{}", slice);',
      options: ['world', 'hello', 'o world', 'Compile error'],
      answer: 0,
      explain:
        '`[6..]` slices from byte 6 to the end \u2014 "world". Range syntax: a..b, a.., ..b all work on str/slices.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let mut v = vec![5, 6, 7];\nfor x in &v {\n    println!("{}", x);\n}\nprintln!("{}", v.len());',
      options: ['5 6 7 then 3', '5 6 7 then 0', '567 then 3', 'Compile error'],
      answer: 0,
      explain:
        'Iterating `&v` borrows each element \u2014 the Vec survives the loop (len 3 after). If it were `for x in v`, v would be moved and the final println would not compile.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let a = [1, 2, 3];\nlet b: [i32; 3] = a;\nprintln!("{} {}", a[0], b[2]);',
      options: ['1 3', 'Compile error: a moved', '0 3', '1 0'],
      answer: 0,
      explain:
        'Arrays of Copy elements are Copy \u2014 `b = a` copies all three values; a stays valid. (A `Vec` in the same spot would be a move.)',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![1, 2];\nv.push(3);\nprintln!("{:?}", v);',
      error:
        'error[E0594]: cannot assign to `v` because it is not declared as mutable\n --> src/main.rs:2:1\n  |\n2 | v.push(3);\n  | ^ cannot assign to immutable variable',
      options: [
        'Declare it mutable: `let mut v = vec![1, 2];`',
        'Use v.append(3)',
        'Wrap v in a Box',
        'Remove the push',
      ],
      answer: 0,
      fixedCode: 'let mut v = vec![1, 2];\nv.push(3);\nprintln!("{:?}", v);',
      explain:
        'push() needs `&mut Vec` \u2192 the binding must be `mut`. E0594 is the "I forgot mut" error \u2014 Rust\u2019s most classic rookie slip.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![1, 2, 3];\nfor x in v {\n    println!("{}", x);\n}\nprintln!("len: {}", v.len());',
      error:
        'error[E0509]: cannot move from `v` into for loop, as `v` is later used\n --> src/main.rs:4:21\n  |\n4 |     println!("len: {}", v.len());\n  |                       ^ `v` moved here... and used here',
      options: [
        'Borrow in the loop: `for x in &v { ... }`',
        'Clone v before the loop',
        'Move the len() call before the loop',
        'Use v.iter_mut()',
      ],
      answer: 0,
      fixedCode: 'let v = vec![1, 2, 3];\nfor x in &v {\n    println!("{}", x);\n}\nprintln!("len: {}", v.len());',
      explain:
        '`for x in v` moves the Vec \u2014 v is dead afterwards. Borrow with `&v` (or `v.iter()`) when you need the Vec to survive. You can do both: option A and C would compile \u2014 but borrowing is the idiomatic fix.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![10, 20];\nlet n = v.get(0);\nlet doubled = n * 2;\nprintln!("{}", doubled);',
      error:
        'error[E0277]: cannot multiply two `Option<&i32>` values\n  |\n  |       ^ no implementation for `Option<&i32> * i32`\n  |\n  = note: the trait `Mul<i32>` is not implemented for `Option<&i32>`',
      options: [
        'Unwrap the Option first: `let n = v.get(0).unwrap();` (or handle None with if-let)',
        'Change get to get_mut',
        'Cast n to i32 with as',
        'Use v[0] * 2 instead',
      ],
      answer: 0,
      fixedCode: 'let v = vec![10, 20];\nlet n = v.get(0).unwrap();\nlet doubled = n * 2;\nprintln!("{}", doubled);',
      explain:
        'get() hands you an Option, not a number \u2014 the type system forces you to decide what "missing" means. unwrap() is fine when presence is guaranteed; if-let/`?` when it isn\u2019t. (Option D also compiles but panics on empty \u2014 the opposite of what get() was protecting you from.)',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let s = "hello";\ns.push_str(" world");\nprintln!("{}", s);',
      error:
        'error[E0599]: no method named `push_str` found for reference `&str` in the current scope\n  |\n  |        -------- method not found in `&str`\n  | str is not mutable, and cannot be grown in place',
      options: [
        'Make it an owned String: `let mut s = String::from("hello");`',
        'Add `mut` to the &str',
        'Use s += " world"',
        'Convert with s.to_string() and discard it',
      ],
      answer: 0,
      fixedCode: 'let mut s = String::from("hello");\ns.push_str(" world");\nprintln!("{}", s);',
      explain:
        '`&str` is a fixed-size borrow \u2014 it cannot grow, period. Growing text needs an owned `String` (and `mut`). The &str \u2192 String upgrade is one of the most common early Rust fixes.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each collection concept with its meaning.',
      pairs: [
        { a: 'Vec<T>', b: 'growable heap list' },
        { a: 'HashMap', b: 'key \u2192 value lookup' },
        { a: 'String', b: 'owned UTF-8 text' },
        { a: '&str', b: 'borrowed UTF-8 slice' },
        { a: 'slice [T]', b: 'view into a sequence' },
        { a: 'array [T; n]', b: 'fixed-length, stack' },
        { a: 'get()', b: 'Option, no panic' },
        { a: 'push/pop', b: 'needs mut' },
      ],
      summary:
        'Collections, one breath: Vecs grow on the heap, HashMaps map keys to values, String owns text while &str views it, and get()/Option keep you from panicking on the edge.',
    },
  ],
}

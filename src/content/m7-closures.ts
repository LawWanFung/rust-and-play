import type { ModuleDef } from '../game/types'

export const m7Closures: ModuleDef = {
  id: 'm7-closures',
  title: 'Closures & Iterators',
  subtitle: 'anonymous fns, lazy chains, move',
  icon: '🌊',
  hue: 185,
  clearBadge: 'm7-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What is a closure?',
      options: [
        'An anonymous function that can capture variables from its surrounding scope',
        'A function that closes a file',
        'A loop that terminates itself',
        'A private method',
      ],
      answer: 0,
      explain:
        '`|x| x + 1` is a closure. "Closure" = the function + the environment it captured. It\u2019s how Rust passes behavior: map, filter, sort_by, threads all take closures.',
    },
    {
      mode: 'quiz',
      prompt: 'What do the Fn, FnMut, and FnOnce traits distinguish?',
      options: [
        'How a closure captures: shared borrow, mutable borrow, or move (ownership)',
        'How many times a loop runs',
        'Function return types',
        'Nothing \u2014 they\u2019re synonyms',
      ],
      answer: 0,
      explain:
        'Fn: borrows what it uses (can be called any time). FnMut: mutably borrows (can update state). FnOnce: MOVES captured values (can be called at most once). Most closures you write are just `|args| body` \u2014 the compiler picks.',
    },
    {
      mode: 'quiz',
      prompt: 'What does it mean that iterators are LAZY?',
      options: [
        'Nothing happens until a consuming adapter (collect, sum, fold) pulls the values',
        'They run in the background',
        'They skip values randomly',
        'They are slower than loops',
      ],
      answer: 0,
      explain:
        '`v.iter().filter(...).map(...)` alone does NOTHING \u2014 it just builds a chain of adapters. Add `.collect::<Vec<_>>()` or `.sum()` and it flows. No intermediate vectors are allocated: one pass, zero waste.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.map()` on an iterator do?',
      options: [
        'Transforms each item with a closure, producing a new iterator',
        'Creates a HashMap',
        'Maps a function to a trait',
        'Copies the iterator',
      ],
      answer: 0,
      explain:
        'map takes `FnMut(item) -> new_item`: `v.iter().map(|x| x * 2)`. It\u2019s a transform stage \u2014 chain as many as you like.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.filter()` do?',
      options: [
        'Keeps only the items for which the closure returns true',
        'Removes duplicates',
        'Sorts the items',
        'Returns the first item',
      ],
      answer: 0,
        explain:
        'filter takes `FnMut(&item) -> bool`: `v.iter().filter(|x| x % 2 == 0)`. Note the closure gets a REFERENCE to the item (because the iterator yields &T here).',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.collect()` do?',
      options: [
        'Consumes the iterator and gathers the items into a collection you choose (Vec, String, HashMap, ...)',
        'Collects garbage',
        'Clones the iterator',
        'Sorts the items',
      ],
      answer: 0,
      explain:
        'collect() is the CONSUMING adapter that makes laziness real: `v.iter().filter(...).collect::<Vec<_>>()` \u2014 the `::<Vec<_>>` tells the compiler which collection. Same chain can collect into a String, a HashMap, a sum...',
    },
    {
      mode: 'quiz',
      prompt: 'How does a closure usually capture a variable?',
      options: [
        'By reference \u2014 the minimal capture it needs (shared, mutable, or move)',
        'Always by clone',
        'Never \u2014 closures cannot see local variables',
        'By global lookup',
      ],
      answer: 0,
      explain:
        'The compiler picks the weakest capture that compiles: shared borrow if it only reads, mutable borrow if it writes, move only when it must (e.g. handing to a thread). You can force moves with the `move` keyword.',
    },
    {
      mode: 'quiz',
      prompt: 'What does the `move` keyword on a closure do?',
      options: [
        'Forces the closure to TAKE OWNERSHIP of captured variables',
        'Moves the closure to a different file',
        'Makes the closure global',
        'Copies all variables',
      ],
      answer: 0,
      explain:
        '`move` transfers captured values INTO the closure. Essential for threads: `thread::spawn(move || use(x))` \u2014 the thread must own its data, because the parent scope may end first.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `for x in v` desugar into, roughly?',
      options: [
        'A `v.into_iter()` loop \u2014 the for loop is iterator sugar',
        'A C-style index loop',
        'A recursive call',
        'A macro expansion into a match',
      ],
      answer: 0,
      explain:
        '`for` calls `.into_iter()` and drives `next()` until None. That\u2019s why `for x in &v` yields references and `for x in v` moves \u2014 it depends on which iterator you handed it.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `.fold(init, |acc, item| ...)` do?',
      options: [
        'Reduces the iterator to a single value by accumulating',
        'Folds the iterator in half',
        'Sorts in descending order',
        'Creates nested vectors',
      ],
      answer: 0,
      explain:
        'fold is the general reduction: start with `init`, then combine each item into the accumulator. `v.iter().fold(0, |a, b| a + b)` = sum. map/filter are the star performers; fold is the Swiss army knife.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![1, 2, 3, 4];\nlet doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();\nprintln!("{doubled:?}");',
      options: ['[2, 4, 6, 8]', '[1, 2, 3, 4]', '[8, 6, 4, 2]', 'Compile error'],
      answer: 0,
      explain:
        'iter() \u2192 &1,&2,&3,&4; map doubles each; collect gathers into a Vec. One pass, no intermediate allocation \u2014 the lazy chain flows left to right.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![1, 2, 3, 4, 5, 6];\nlet evens: Vec<i32> = v.iter().filter(|x| x % 2 == 0).collect();\nprintln!("{evens:?}");',
      options: ['[2, 4, 6]', '[1, 3, 5]', '[2, 4, 6, 8]', 'Compile error'],
      answer: 0,
      explain:
        'filter keeps items where the closure is true: the even numbers. (The closure takes `&&i32` \u2014 Rust auto-derefs in the expression, so `x % 2` just works.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![1, 2, 3];\nlet total = v.iter().fold(100, |acc, x| acc + x);\nprintln!("{total}");',
      options: ['106', '6', '100', 'Compile error'],
      answer: 0,
      explain:
        'fold starts the accumulator at 100: 100+1+2+3 = 106. The init value is part of the result \u2014 fold(0, add) is sum, fold(1, mul) is product.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let mut count = 0;\nlet inc = || count += 1;\ninc();\ninc();\ninc();\nprintln!("{count}");',
      options: ['3', '0', '1', 'Compile error'],
      answer: 0,
      explain:
        'The closure mutably borrows `count` (FnMut) and increments it on each call. Three calls \u2192 3. Closures can carry state through borrowed variables.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let s = String::from("hello");\nlet len = move || s.len();\nprintln!("{s:?} {}", len());',
      options: ['Compile error: s moved', '"hello" 5', 'hello 5', 'Panic'],
      answer: 0,
      explain:
        '`move` transfers ownership of s INTO the closure \u2014 the outer `s` is dead, so `println!("{s:?}"...)` no longer compiles. Move is ownership transfer, not copy.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![1, 2, 3, 4, 5];\nlet r: Vec<i32> = v.iter()\n    .filter(|x| x > &1)\n    .map(|x| x * 10)\n    .collect();\nprintln!("{r:?}");',
      options: ['[20, 30, 40, 50]', '[10, 20, 30, 40, 50]', '[2, 3, 4, 5]', 'Compile error'],
      answer: 0,
      explain:
        'Chain: drop 1, then multiply by 10. filter\u2019s closure gets `&&i32` (hence `x > &1`), map\u2019s gets `&i32`. The chain reads like a pipeline: keep the big ones, scale them up.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![5, 3, 8, 1];\nlet first_even = v.iter().find(|x| x % 2 == 0);\nprintln!("{first_even:?}");',
      options: ['Some(8)', 'Some(5)', 'None', 'Some(3)'],
      answer: 0,
      explain:
        'find returns the FIRST item matching the predicate, as an Option: 5 is odd, 3 is odd, 8 is even \u2192 Some(8). Iteration stops there \u2014 lazy again.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let v = vec![10, 20, 30];\nfor (i, x) in v.iter().enumerate() {\n    println!("{}:{}", i, x);\n}',
      options: ['0:10 1:20 2:30 (three lines)', '1:10 2:20 3:30', '0:10 1:20 2:30 (one line)', 'Compile error'],
      answer: 0,
      explain:
        'enumerate() pairs each item with its 0-based index; the for loop destructures the (index, item) tuples. Three separate println! calls \u2192 three lines.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![1, 2, 3];\nlet doubled: Vec<i32> = v.iter().map(|x| x + 1).collect();\nprintln!("{doubled:?}");',
      error:
        'error[E0277]: can\u2019t add `i32` to `&i32`\n  |\n  |                  -^-\n  |                  |\n  = note: expected type `i32`, found `&i32`',
      options: [
        'Deref the reference: `map(|x| *x + 1)`',
        'Change iter() to iter_mut()',
        'Cast with as i32',
        'Use v.iter() + 1',
      ],
      answer: 0,
      fixedCode: 'let v = vec![1, 2, 3];\nlet doubled: Vec<i32> = v.iter().map(|x| *x + 1).collect();\nprintln!("{doubled:?}");',
      explain:
        'iter() yields &i32, so the closure receives a reference. Arithmetic wants values: `*x + 1` (or clone). This &-vs-value friction is the #1 iterator stumbling block.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![1, 2, 3];\nlet r = v.iter().filter(|x| x > 1).collect();\nprintln!("{r:?}");',
      error:
        'error[E0282]: type annotations needed\n  |\n  |       -^^- type must be known at this point\n  = note: cannot infer type for type parameter `B`\n  = help: specify the type: `collect::<Vec<_>>()`',
      options: [
        'Tell collect the target type: `.collect::<Vec<_>>()`',
        'Remove the collect()',
        'Add `mut` to r',
        'Change filter to map',
      ],
      answer: 0,
      fixedCode: 'let v = vec![1, 2, 3];\nlet r = v.iter().filter(|x| x > 1).collect::<Vec<_>>();\nprintln!("{r:?}");',
      explain:
        'collect() can build MANY types (Vec, String, HashMap, Box...) \u2014 when the binding has no type, the compiler can\u2019t pick. The turbofish `collect::<Vec<_>>()` is the standard disambiguation.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'use std::thread;\n\nlet data = vec![1, 2, 3];\nlet h = thread::spawn(|| {\n    println!("{data:?}");\n});\nh.join().unwrap();',
      error:
        'error[E0372]: variable `data` does not live long enough\n  |\n  |     ---- variable does not live long enough\n  | ...closure requires `data` to outlive annotation\n  = note: borrowed values must outlive the thread that receives them',
      options: [
        'Move the data into the thread: `thread::spawn(move || ...)`',
        'Make data a global',
        'Clone it: `let data = data.clone();` inside the closure won\u2019t help \u2014 use move',
        'Remove the thread',
      ],
      answer: 0,
      fixedCode: 'use std::thread;\n\nlet data = vec![1, 2, 3];\nlet h = thread::spawn(move || {\n    println!("{data:?}");\n});\nh.join().unwrap();',
      explain:
        'Threads outlive their spawn scope, so borrows are dangerous \u2014 the spawned closure must OWN its data. `move` gives it ownership. This is the closure-ownership rule that makes Rust concurrency safe.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let v = vec![1, 2, 3];\nlet r: Vec<i32> = v.iter().map(|x| {\n    if *x > 1 {\n        x * 2\n    } else {\n        ()\n    }\n})\n.collect();',
      error:
        'error[E0308]: mismatched types\n  |\n  |             -^^ expected `i32`, found `()`\n  = note: expected iterator over `i32`, found iterator over `{integer}`',
      options: [
        'Make both branches i32: `else { 0 }` (or map after filtering)',
        'Remove the else branch',
        'Cast () to i32',
        'Use a match with one arm',
      ],
      answer: 0,
      fixedCode: 'let v = vec![1, 2, 3];\nlet r: Vec<i32> = v.iter().map(|x| {\n    if *x > 1 {\n        x * 2\n    } else {\n        0\n    }\n})\n.collect();',
      explain:
        'Every arm of a closure\u2019s if/else must return the SAME type \u2014 same rule as match arms. `()` is not an i32. (Cleaner: filter first, then map \u2014 separation of concerns.)',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each iterator/closure concept with its behavior.',
      pairs: [
        { a: 'closure', b: 'fn + captured env' },
        { a: 'map', b: 'transform each item' },
        { a: 'filter', b: 'keep some items' },
        { a: 'fold', b: 'reduce to one value' },
        { a: 'collect', b: 'consume into a type' },
        { a: 'move', b: 'take ownership' },
        { a: 'FnMut', b: 'mutably borrows state' },
        { a: 'lazy', b: 'runs when consumed' },
      ],
      summary:
        'The functional flow: closures carry behavior (and state), adapters chain transformations lazily, and one consumer \u2014 collect, sum, fold \u2014 makes it all run in a single pass.',
    },
  ],
}

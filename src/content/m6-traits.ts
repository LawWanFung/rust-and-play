import type { ModuleDef } from '../game/types'

export const m6Traits: ModuleDef = {
  id: 'm6-traits',
  title: 'Traits & Generics',
  subtitle: 'impl, bounds, dyn, derive',
  icon: '✨',
  hue: 200,
  clearBadge: 'm6-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What is a `trait`?',
      options: [
        'A named bundle of behavior (methods) that types can implement',
        'A type of enum',
        'A generic loop',
        'A macro rule',
      ],
      answer: 0,
      explain:
        'Traits are Rust\u2019s "interface + abstract class": `trait Display { fn fmt(...) }`. Any type can `impl Display for MyType`. Think: a contract of behavior, shared across types.',
    },
    {
      mode: 'quiz',
      prompt: 'What does an `impl` block do?',
      options: [
        'Attaches methods to a type (inherent methods, or a trait\u2019s methods for that type)',
        'Instantiates a class',
        'Imports a module',
        'Inlines a function',
      ],
      answer: 0,
      explain:
        'Two flavors: `impl MyType { ... }` adds inherent methods; `impl Trait for MyType { ... }` fulfills a trait. That\u2019s where behavior gets attached to data.',
    },
    {
      mode: 'quiz',
      prompt: 'What is a generic type parameter, as in `fn max<T>(a: T, b: T) -> T`?',
      options: [
        'A placeholder type chosen by the CALLER at compile time',
        'A dynamic type chosen at runtime',
        'A default type',
        'A trait alias',
      ],
      answer: 0,
      explain:
        'The caller\u2019s concrete type is substituted at compile time (monomorphization) \u2014 zero runtime cost. T is "some type, to be decided".',
    },
    {
      mode: 'quiz',
      prompt: 'What does the bound `<T: Display>` mean?',
      options: [
        'T can be any type, as long as it implements Display',
        'T must be exactly the Display type',
        'T borrows a Display',
        'T is displayed automatically',
      ],
      answer: 0,
      explain:
        'Trait bounds say "T is any type WITH this capability". Now the body can call .fmt()/Display methods on T. Without the bound, the compiler can\u2019t guarantee the method exists.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `#[derive(Debug)]` do?',
      options: [
        'Auto-generates a Debug impl (so {:?} works) for the type',
        'Deletes the type at compile time',
        'Makes the type debuggable only in release mode',
        'Prints the type layout',
      ],
      answer: 0,
      explain:
        'derive is a proc-macro that writes the impl FOR you: Debug, Clone, Copy, PartialEq, Eq, Hash, Default... Your struct gets the boilerplate in one attribute line.',
    },
    {
      mode: 'quiz',
      prompt: 'What is `dyn Trait` (a trait object)?',
      options: [
        'Dynamic dispatch: a value of "some type implementing Trait", via a pointer',
        'A generic parameter',
        'A mutable trait',
        'A macro keyword',
      ],
      answer: 0,
      explain:
        '`Box<dyn Shape>` can hold ANY Shape implementor \u2014 one type at a time, chosen at runtime (vtable pointer). Generics decide at compile time; dyn decides at runtime. (Usually `&dyn Trait` or `Box<dyn Trait>`.)',
    },
    {
      mode: 'quiz',
      prompt: 'What is a `where` clause?',
      options: [
        'An alternative place to write trait bounds: `fn f<T> (x: T) where T: Display + Clone`',
        'A loop condition',
        'A conditional type alias',
        'A macro fragment',
      ],
      answer: 0,
      explain:
        '`where` lists bounds at the end \u2014 same power as `<T: ...>`, better for long lists and for constraining associated types: `where T::Output: Debug`.',
    },
    {
      mode: 'quiz',
      prompt: 'How do inherent methods and trait methods differ?',
      options: [
        'Inherent methods come from `impl Type`; trait methods require the type to implement the trait',
        'There is no difference',
        'Inherent methods are always private',
        'Trait methods cannot take self',
      ],
      answer: 0,
      explain:
        'Both are called with the same `.` syntax. Inherent = belongs to the type itself; trait = belongs to a capability the type opted into. You can have both, and they can even share names (inherent wins).',
    },
    {
      mode: 'quiz',
      prompt: 'Which of these is a REAL standard-library trait?',
      options: [
        'PartialEq \u2014 types that can be compared with ==',
        'Equals',
        'Comparable',
        'SameAs',
      ],
      answer: 0,
      explain:
        'The std workhorses: PartialEq (==), Eq, PartialOrd/Ord (sorting), Debug ({:?}), Display ({}), Clone, Copy, Default, Hash, Drop. Learn their names \u2014 you\u2019ll derive them constantly.',
    },
    {
      mode: 'quiz',
      prompt: 'Why can\u2019t you write `impl ForeignTrait for ForeignType` (both from other crates)?',
      options: [
        'The coherence/orphan rule: you must "own" at least one of the trait or the type',
        'You can \u2014 it\u2019s always allowed',
        'Only `unsafe` code can',
        'It requires nightly',
      ],
      answer: 0,
      explain:
        'If every crate could impl any trait for any type, two crates could conflict silently. The orphan rule: at least one of (trait, type) must be local. Workaround: a newtype wrapper or your own trait.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'struct Point { x: i32, y: i32 }\n\nimpl Point {\n    fn sum(&self) -> i32 { self.x + self.y }\n}\n\nlet p = Point { x: 3, y: 4 };\nprintln!("{}", p.sum());',
      options: ['7', '3 4', 'Compile error', 'Panic'],
      answer: 0,
      explain:
        'Inherent impl: p.sum() borrows self (&self) and adds the fields. `&self` = read-only access, the most common receiver.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::fmt;\n\nfn shout<T: fmt::Display>(v: T) {\n    println!("LOUD: {v}");\n}\n\nshout(42);\nshout("hello");',
      options: ['LOUD: 42 then LOUD: hello', 'LOUD: 42 LOUD: hello (one line)', 'Compile error', 'Panic'],
      answer: 0,
      explain:
        'One generic function, two call sites: the compiler builds an i32 version and a &str version. Both i32 and &str implement Display, so both calls compile \u2014 zero-cost polymorphism.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: '#[derive(Debug, Clone)]\nstruct Job { name: String, id: u32 }\n\nlet a = Job { name: String::from("dev"), id: 1 };\nlet b = a.clone();\nprintln!("{:?}", b);',
      options: ['Job { name: "dev", id: 1 }', 'Job', 'dev 1', 'Compile error'],
      answer: 0,
      explain:
        'derive(Debug) gives you {:?} printing with field names; derive(Clone) gives .clone(). b is an independent copy \u2014 clone is a real (deep) copy, just convenient.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'trait Area { fn area(&self) -> f64 }\nstruct Circle { r: f64 }\nimpl Area for Circle { fn area(&self) -> f64 { std::f64::consts::PI * self.r * self.r } }\n\nlet shapes: Vec<Box<dyn Area>> = vec![\n    Box::new(Circle { r: 1.0 }),\n    Box::new(Circle { r: 2.0 }),\n];\nfor s in &shapes {\n    println!("{:.1}", s.area());\n}',
      options: ['3.1 then 12.6', '1.0 2.0', 'Compile error', 'Panic'],
      answer: 0,
      explain:
        'A Vec of trait objects: each Box<dyn Area> holds a DIFFERENT type, one area() implementation per element, dispatched at runtime via the vtable. \u03c0\u00b71\u00b2 \u2248 3.1, \u03c0\u00b74 \u2248 12.6.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'struct Cfg { verbose: bool }\n\nimpl Default for Cfg {\n    fn default() -> Self { Cfg { verbose: true } }\n}\n\nlet c = Cfg::default();\nprintln!("{}", c.verbose);',
      options: ['true', 'false', 'Cfg', 'Compile error'],
      answer: 0,
      explain:
        'Implementing Default gives you `Cfg::default()` \u2014 "the sensible zero". You chose verbose: true as THE default. Deriving Default would have given all-false/zero fields instead.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn describe<T: std::fmt::Display + std::fmt::Debug>(v: &T) -> String {\n    format!("{v:?}")\n}\n\nprintln!("{}", describe(&5));\nprintln!("{}", describe(&"hi"));',
      options: ['5 then "hi"', '5 then hi', '"5" "hi"', 'Compile error'],
      answer: 0,
      explain:
        'The bound list (T: Display + Debug) allows both. Debug formatting adds quotes to strings: "hi" \u2192 `"hi"`, while 5 \u2192 5. Display vs Debug: user-facing vs developer-facing.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'fn sum<T>(iter: impl Iterator<Item = T>, f: impl Fn(T) -> T) -> T\nwhere\n    T: std::ops::Add<Output = T> + Clone,\n{\n    iter.map(f).fold(T::clone(&iter.clone().next().unwrap()), |a, b| a + b)\n}\n\n// simplified: what does the where clause accomplish?\nfn ok<T: std::ops::Add<Output = T>>(a: T, b: T) -> T { a + b }\n\nprintln!("{}", ok(2, 3));',
      options: ['5', 'Compile error \u2014 where clauses are decorative', '23', 'Panic'],
      answer: 0,
      explain:
        'The where clause constrains T to "addable with itself" \u2014 exactly what a + b needs. 2 + 3 = 5. Where clauses and <T: ...> bounds are the same power, different syntax.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'trait Greet { fn greet(&self) -> &str { "hello" } }\nstruct Dog;\nstruct Cat;\nimpl Greet for Dog {}\nimpl Greet for Cat { fn greet(&self) -> &str { "meow" } }\n\nfn say<T: Greet>(t: &T) { println!("{}", t.greet()) }\n\nsay(&Dog);\nsay(&Cat);',
      options: ['hello then meow', 'meow then hello', 'hello hello', 'Compile error'],
      answer: 0,
      explain:
        'Trait methods can have DEFAULT implementations (greet \u2192 "hello"). Dog takes the default; Cat overrides it. That\u2019s how traits give shared behavior with per-type customization.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'fn print_it<T>(v: T) {\n    println!("{v}");\n}',
      error:
        'error[E0277]: the trait bound `T: std::fmt::Display` is not satisfied\n  |\n  |           ^ required by `println!`\n  = note: required for `T` to implement `std::fmt::Display`',
      options: [
        'Add the bound: `fn print_it<T: std::fmt::Display>(v: T)`',
        'Cast v to String',
        'Use format! instead',
        'Remove the println',
      ],
      answer: 0,
      fixedCode: 'fn print_it<T: std::fmt::Display>(v: T) {\n    println!("{v}");\n}',
      explain:
        'E0277 is the "bound missing" error: println! needs Display, bare T promises nothing. Add the bound and the compiler knows every caller supplies a printable type.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'struct Sensor { id: u32, temp: f64 }\n\nlet s = Sensor { id: 1, temp: 21.5 };\nprintln!("{s:?}");',
      error:
        'error[E0277]: the trait bound `Sensor: std::fmt::Debug` is not satisfied\n  |\n  |              ^^^^ the trait `std::fmt::Debug` is not implemented for `Sensor`\n  = note: this is an advanced feature that requires `#![feature(pretty_assertions)]`... (nope \u2014 just derive it)',
      options: [
        'Add `#[derive(Debug)]` above the struct',
        'Manually impl fmt::Display',
        'Print the fields individually instead',
        'Wrap s in a Box',
      ],
      answer: 0,
      fixedCode: '#[derive(Debug)]\nstruct Sensor { id: u32, temp: f64 }\n\nlet s = Sensor { id: 1, temp: 21.5 };\nprintln!("{s:?}");',
      explain:
        '{:?} needs Debug. Every custom type you\u2019ll ever debug wants `#[derive(Debug)]` \u2014 this is the #1 "why won\u2019t my struct print" fix in all of Rust.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'use std::fmt::Display;\n\nimpl Display for String {\n    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {\n        write!(f, "STR({self})")\n    }\n}',
      error:
        'error[E0117]: only traits defined in the current crate can be implemented for a foreign type\n  |\n  |     ------------------- ^^^^----\n  |     |                |\n  |     |                `String` does not have this type bound... `Display` from the std crate',
      options: [
        'Define your OWN trait (e.g. `trait Shout`) and impl it for String \u2014 you own the trait',
        'Use `unsafe impl`',
        'Impl it for &String instead',
        'Remove the impl and use format!',
      ],
      answer: 0,
      fixedCode: 'use std::fmt;\n\ntrait Shout {\n    fn shout(&self) -> String {\n        format!("STR({self})")\n    }\n}\nimpl Shout for String {}\n\n// now String "can shout" without touching std\u2019s Display',
      explain:
        'E0117, the orphan rule: String (foreign) + Display (foreign) = not allowed. Own at least one half: define your own trait, or wrap String in a local newtype and impl Display for THAT.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'trait Draw { fn draw(&self) }\n\nfn render(art: Draw) {\n    art.draw();\n}',
      error:
        'error[E0277]: the size for values of type `Draw` cannot be known at compilation time\n  |\n  |               ---- ^^^^ doesn\u2019t have a size known at compile-time\n  = note: traits can\u2019t be passed by value directly',
      options: [
        'Borrow a trait object: `fn render(art: &dyn Draw)`',
        'Make Draw a struct',
        'Use `fn render(art: Box<Draw>)` without dyn',
        'Remove the parameter',
      ],
      answer: 0,
      fixedCode: 'trait Draw { fn draw(&self) }\n\nfn render(art: &dyn Draw) {\n    art.draw();\n}',
      explain:
        'A bare `dyn`-less trait param has no size \u2014 the compiler can\u2019t lay it out on the stack. Trait objects must go behind a pointer: `&dyn Draw` (borrow) or `Box<dyn Draw>` (own). The `dyn` keyword makes "sized at runtime" explicit.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each trait/generic concept with its meaning.',
      pairs: [
        { a: 'trait', b: 'named bundle of behavior' },
        { a: 'impl', b: 'attach methods to a type' },
        { a: 'generic <T>', b: 'type decided at compile time' },
        { a: 'bound T: Trait', b: 'T must implement Trait' },
        { a: 'derive', b: 'auto-generate impls' },
        { a: 'dyn Trait', b: 'runtime dispatch via pointer' },
        { a: 'supertrait', b: 'trait that requires another' },
        { a: 'Deref', b: 'smart-pointer `*` behavior' },
      ],
      summary:
        'Traits say "what you can do", impls say "how THIS type does it", generics reuse one function across all of them, and dyn trades compile-time for flexibility-at-runtime.',
    },
  ],
}

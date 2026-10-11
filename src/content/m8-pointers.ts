import type { ModuleDef } from '../game/types'

export const m8Pointers: ModuleDef = {
  id: 'm8-pointers',
  title: 'Smart Pointers',
  subtitle: 'Box, Rc, RefCell, interior mutability',
  icon: '📡',
  hue: 285,
  clearBadge: 'm8-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'What does `Box<T>` do?',
      options: [
        'Allocates T on the heap behind a single owner \u2014 like a one-owner pointer',
        'Shares T between owners',
        'Makes T mutable',
        'Compresses T',
      ],
      answer: 0,
      explain:
        'Box is the simplest smart pointer: a heap allocation with ONE owner, dropped when the Box is dropped. It\u2019s the standard answer to "this type needs indirection" (recursive types, trait objects, huge structs).',
    },
    {
      mode: 'quiz',
      prompt: 'What is a "smart pointer"?',
      options: [
        'A type with a `*` in its name that adds behavior on top of pointing (ownership rules, counting, ...)',
        'A pointer managed by the GC',
        'A pointer to a CPU register',
        'An unsafe pointer',
      ],
      answer: 0,
      explain:
        'Smart pointers (Box, Rc, Arc, RefCell, ...) are ordinary types that happen to point at data on the heap, plus extra semantics: who owns it, when it\u2019s dropped, how it\u2019s synchronized. All safe, no `*` dereference gymnastics.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `Rc<T>` (reference counted) do?',
      options: [
        'Allows MULTIPLE owners of one value; drops it when the last owner goes away',
        'Gives one owner a reference',
        'Makes T thread-safe',
        'Internationalizes T',
      ],
      answer: 0,
      explain:
        'Rc = reference count. `Rc::clone()` bumps a counter (cheap, shallow \u2014 the DATA is not copied). When the count hits zero, the data is freed. Use it for shared, single-thread ownership: trees, graphs, event handlers.',
    },
    {
      mode: 'quiz',
      prompt: 'How do you read an Rc\u2019s reference count?',
      options: [
        '`Rc::strong_count(&rc)`',
        '`rc.size()`',
        '`rc.borrow()`',
        'You can\u2019t \u2014 it\u2019s private',
      ],
      answer: 0,
      explain:
        'strong_count() returns how many Rc handles exist. Great for debugging "who is keeping this alive?" \u2014 and for spotting reference cycles.',
    },
    {
      mode: 'quiz',
      prompt: 'What is "interior mutability"? (RefCell, Cell)',
      options: [
        'Mutating data through a SHARED (immutable) reference, checked at RUNTIME instead of compile time',
        'Making a struct\u2019s inner fields private',
        'A kind of mutex',
        'Heap allocation tricks',
      ],
      answer: 0,
      explain:
        'The normal rule: & = immutable, &mut = mutable, decided at compile time. RefCell INVERTS it: you hold a shared &RefCell<T> but can call .borrow_mut() to change it \u2014 the borrow rules are enforced at RUNTIME (panic on violation).',
    },
    {
      mode: 'quiz',
      prompt: 'When would you use `RefCell<T>`?',
      options: [
        'When multiple shared references need to MUTATE the data (e.g. a data structure modified during iteration)',
        'When you need threads',
        'When you need a heap allocation only',
        'Never \u2014 it is deprecated',
      ],
      answer: 0,
      explain:
        'The classic case: a tree node shared by Rcs, where adding a child must mutate through a shared reference. RefCell lets that happen \u2014 at the price of runtime panics if you break the one-writer rule.',
    },
    {
      mode: 'quiz',
      prompt: 'What happens if you call `.borrow_mut()` while a `.borrow()` is still alive?',
      options: [
        'Runtime panic: already mutably/immutsably borrowed',
        'Compile error',
        'It waits (blocks)',
        'It returns a clone',
      ],
      answer: 0,
      explain:
        'RefCell enforces THE borrow rules at runtime: many readers XOR one writer. Violate them and you panic \u2014 "RefCell<T> already mutably borrowed". Same safety as &/&mut, just checked later.',
    },
    {
      mode: 'quiz',
      prompt: 'Why does `Rc::clone()` NOT deep-copy the data?',
      options: [
        'It only increments the reference counter \u2014 a shallow, O(1) handle copy',
        'It does \u2014 Rc always deep-copies',
        'It drops the data',
        'Rc cannot be cloned',
      ],
      answer: 0,
      explain:
        'Clone for Rc means "one more handle to the SAME data" \u2014 counter +1, nanoseconds. That\u2019s the whole point of sharing. (If you truly need a copy, clone the inner value: `(*rc).clone()`.)',
    },
    {
      mode: 'quiz',
      prompt: 'Why do recursive types (linked list, tree) need `Box`?',
      options: [
        'The compiler must know each type\u2019s size; a self-referencing field would be infinitely sized \u2014 Box has a fixed size (one pointer)',
        'Because recursion is forbidden',
        'To make it faster',
        'Box is required for all structs',
      ],
      answer: 0,
      explain:
        '`struct Node { next: Node }` is an infinite size \u2192 the compiler refuses. `next: Box<Node>` is just a pointer (fixed size) that points at the heap-allocated next node. Indirection breaks the size loop.',
    },
    {
      mode: 'quiz',
      prompt: 'What problem do reference cycles cause, and what solves them?',
      options: [
        'Data never freed (count never reaches 0) \u2014 break the cycle with `Weak<T>`',
        'Infinite loops \u2014 solved by Rc',
        'Stack overflows \u2014 solved by Box',
        'Nothing \u2014 Rust GC cleans them up',
      ],
      answer: 0,
      explain:
        'Parent \u2194 Child strong references keep each other alive forever: a leak, with no GC to catch it. Make ONE direction of the edge `Weak<T>` (upgrade with .upgrade() \u2192 Option<Rc>). No GC \u2014 you design the acyclicity.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'let b = Box::new(String::from("heap!"));\nprintln!("{b}");\nprintln!("{}", std::mem::size_of_val(&b));',
      options: ['heap! then 8 (on 64-bit)', 'heap! then 5', 'Box 8', 'Compile error'],
      answer: 0,
      explain:
        'Box<String> prints the inner String (Deref). The Box itself is just a pointer: 8 bytes on a 64-bit machine, no matter how big the String is. Fixed size = composable types.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::rc::Rc;\n\nlet r1 = Rc::new(String::from("shared"));\nlet r2 = Rc::clone(&r1);\nprintln!("{} {}", Rc::strong_count(&r1), Rc::strong_count(&r2));\ndrop(r1);\nprintln!("{}", Rc::strong_count(&r2));',
      options: ['2 2 then 1', '1 1 then 0', '2 2 then 2', 'Compile error'],
      answer: 0,
      explain:
        'Two handles \u2192 count 2. drop(r1) \u2192 count 1. The data is freed only when the LAST handle dies \u2014 deterministic, no GC pause.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::cell::RefCell;\n\nlet c = RefCell::new(10);\nlet x = c.borrow();\nprintln!("{x}");\nlet y = c.borrow_mut();\n*y = 99;\nprintln!("{}", c.borrow());',
      options: ['10 then 99', '10 10', '99 99', 'Panic'],
      answer: 0,
      explain:
        'First borrow (reader) ends after the println; then borrow_mut can write 99. Sequential borrows are fine \u2014 it\u2019s only OVERLAPPING reader+writer that panics. This is how "mutate through a shared reference" works.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this runs?',
      code: 'use std::cell::RefCell;\n\nlet c = RefCell::new(10);\nlet r = c.borrow();\nlet _m = c.borrow_mut();\nprintln!("{r}");',
      options: [
        'Panic: RefCell already mutably borrowed (while the reader is alive)',
        'Prints: 10',
        'Compile error',
        'Blocks forever',
      ],
      answer: 0,
      explain:
        'r (a reader) and _m (a writer) overlap \u2192 runtime panic. The scope of the Ref/RefMut guards matters: end the reader (drop it / scope block) before the writer arrives.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::rc::Rc;\n\nstruct Node { val: i32, next: Option<Rc<Node>> }\n\nlet n1 = Rc::new(Node { val: 1, next: None });\nlet n2 = Rc::new(Node { val: 2, next: Some(Rc::clone(&n1)) });\nprintln!("{} -> {}", n2.val, n2.next.as_ref().unwrap().val);',
      options: ['2 -> 1', '1 -> 2', '2 -> None', 'Compile error'],
      answer: 0,
      explain:
        'A linked list with shared nodes: n2 points back at n1 via an Rc. Multiple nodes can reference the same Rc<Node> \u2014 graphs for free. (Note: this is a DAG here; true cycles need Weak.)',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::cell::Cell;\n\nlet c = Cell::new(5);\nc.set(7);\nprintln!("{}", c.get());',
      options: ['7', '5', 'Cell(7)', 'Compile error'],
      answer: 0,
      explain:
        'Cell is the Copy-only cousin of RefCell: get()/set() swap whole values, no borrows at all. Perfect for counters and flags on Copy types (i32, f64, bool).',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::rc::Rc;\n\ntrait Shape {\n    fn area(&self) -> f64;\n}\n\nlet shapes: Vec<Rc<dyn Shape>> = vec![];\nprintln!("{}", shapes.len());',
      options: ['0', 'Compile error \u2014 dyn needs Box', 'Panic', 'Rc'],
      answer: 0,
      explain:
        'Rc<dyn Trait> is a perfectly valid trait-object handle (like Box<dyn Trait>, but shareable). An empty vec has 0 shapes \u2014 the point: the TYPE allows heterogeneous shared shapes.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::rc::{Rc, Weak};\n\nlet r = Rc::new(42);\nlet w: Weak<i32> = Rc::downgrade(&r);\nprintln!("{}, {}", Rc::strong_count(&r), w.upgrade().is_some());\ndrop(r);\nprintln!("{}", w.upgrade().is_none());',
      options: ['1, true then true', '2, true then false', '1, false then true', 'Compile error'],
      answer: 0,
      explain:
        'Weak does NOT count as a strong owner (count stays 1) but can be upgraded while the Rc lives. After drop(r), upgrade() \u2192 None. This one-way street is how cycles get broken.',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'struct Link {\n    val: i32,\n    next: Link,\n}\n\nlet l = Link { val: 1, next: Link { val: 2, next: todo!() } };',
      error:
        'error[E0073]: recursive type `Link` has infinite size\n  |\n  |     ---- field `next` has type `Link`\n  = note: `Link` has infinite size because it contains itself directly',
      options: [
        'Indirect through the heap: `next: Box<Link>` (or `Option<Box<Link>>`)',
        'Make next a u8',
        'Add `#[derive(Copy)]`',
        'Use a global variable',
      ],
      answer: 0,
      fixedCode: 'struct Link {\n    val: i32,\n    next: Option<Box<Link>>,\n}\n\nlet l = Link { val: 1, next: Some(Box::new(Link { val: 2, next: None })) };',
      explain:
        'E0073: a type cannot contain itself by value \u2014 it would be infinitely large. Box breaks the loop: the field is a fixed-size pointer to the heap. Option<Box<...>> marks "maybe a next" (the idiom for linked lists).',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'let s = String::from("shared");\nlet a = s;\nlet b = s;\nprintln!("{} {}", a, b);',
      error:
        'error[E0382]: use of moved value: `s`\n  |\n  |       - value moved here...\n  | ...later used here\n  = note: move occurs because `String` does not implement the `Copy` trait',
      options: [
        'Share it: `let a = Rc::clone(&s_rc); let b = Rc::clone(&s_rc);` where `s_rc = Rc::new(...)`',
        'Make s a &str',
        'Clone the String: `let a = s.clone(); let b = s.clone();`',
        'Both B and C are fine here (and A for deep sharing) \u2014 pick the semantics you want',
      ],
      answer: 3,
      fixedCode: 'use std::rc::Rc;\n\nlet s = Rc::new(String::from("shared"));\nlet a = Rc::clone(&s);\nlet b = Rc::clone(&s);\nprintln!("{} {}", a, b);',
      explain:
        'A moved value can\u2019t be used twice \u2014 so choose: clone() for two independent copies, Rc for two HANDLES to one copy (true sharing), & for two borrows (no ownership). Same symptom, three different intents \u2014 that\u2019s the design space smart pointers open up.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'fn append(name: &String) {\n    name.push_str("!");\n}\n\nlet s = String::from("hi");\nappend(&s);',
      error:
        'error[E0594]: cannot mutate immutable reference\n  |\n  |     ------------ ^ cannot mutate through `&String`\n  = note: `push_str` takes `&mut self`',
      options: [
        'Interior mutability: take `&RefCell<String>` and `name.borrow_mut().push_str("!")`',
        'Take `&mut String`',
        'Both work \u2014 `&mut` keeps the compile-time rule; RefCell enables sharing + mutation',
        'Make push_str unsafe',
      ],
      answer: 2,
      fixedCode: 'use std::cell::RefCell;\n\nfn append(name: &RefCell<String>) {\n    name.borrow_mut().push_str("!");\n}\n\nlet s = RefCell::new(String::from("hi"));\nappend(&s);\nprintln!("{s:?}"); // RefCell("hi!")',
      explain:
        'Classic dilemma: a function wants to mutate, but callers share the value. The honest fix is &mut (one exclusive owner). When MANY callers share it, RefCell moves the mutability INSIDE the type \u2014 interior mutability.',
    },
    {
      mode: 'fix',
      prompt: 'This panics. What\u2019s the fix?',
      code: 'use std::cell::RefCell;\n\nlet c = RefCell::new(vec![1, 2]);\nlet r = c.borrow();\nlet m = c.borrow_mut();\nm.push(3);\ndrop(r);\nprintln!("{c:?}");',
      error:
        'runtime: thread \'main\' panicked:\nRefCell<internal error: already mutably borrowed\n\nFix: the reader `r` must be dropped BEFORE the mutable borrow.',
      options: [
        'Scope the reader so it ends first: `let r = { let g = c.borrow(); ...; g };` then borrow_mut',
        'Use a Mutex',
        'Clone the vec',
        'Remove the borrow_mut',
      ],
      answer: 0,
      fixedCode: 'use std::cell::RefCell;\n\nlet c = RefCell::new(vec![1, 2]);\n{\n    let r = c.borrow();\n    println!("read: {r:?}");\n} // r dropped here\n{\n    let m = c.borrow_mut();\n    m.push(3);\n}\nprintln!("{c:?}");',
      explain:
        'The Ref guard r lived across the borrow_mut call \u2192 overlapping reader + writer \u2192 panic. Drop borrows as SOON as possible (inner blocks) \u2014 short-lived borrows are the RefCell hygiene rule.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each smart pointer with its superpower.',
      pairs: [
        { a: 'Box<T>', b: 'heap, one owner' },
        { a: 'Rc<T>', b: 'shared, many owners' },
        { a: 'Weak<T>', b: 'non-owning back-reference' },
        { a: 'RefCell<T>', b: 'runtime borrow checks' },
        { a: 'Cell<T>', b: 'swap Copy values' },
        { a: 'interior mutability', b: 'mutate through &' },
        { a: 'shallow clone', b: 'counter +1, data shared' },
        { a: 'cycle', b: 'leak \u2014 break with Weak' },
      ],
      summary:
        'The pointer zoo: Box gives heap + fixed size, Rc gives sharing, RefCell/Cell give mutation through shared refs, and Weak is the seatbelt that stops reference cycles from leaking forever.',
    },
  ],
}

import type { ModuleDef } from '../game/types'

export const m9Concurrency: ModuleDef = {
  id: 'm9-concurrency',
  title: 'Concurrency',
  subtitle: 'threads, channels, mutexes, Arc',
  icon: '🧵',
  hue: 340,
  clearBadge: 'm9-clear',
  questions: [
    // ── QUIZ ──────────────────────────────────────────────
    {
      mode: 'quiz',
      prompt: 'How do you spawn a new thread?',
      options: [
        '`std::thread::spawn(|| { ... })` \u2014 returns a JoinHandle',
        'thread.fork()',
        'async { ... }',
        'std::process::spawn()',
      ],
      answer: 0,
      explain:
        'spawn takes a closure and hands back a JoinHandle. The new thread runs the closure on its own OS thread \u2014 real parallelism, not just interleaving.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `handle.join()` do?',
      options: [
        'Blocks the current thread until the spawned thread finishes, returning its result',
        'Kills the thread',
        'Detaches the thread',
        'Clones the thread',
      ],
      answer: 0,
      explain:
        'join() = "wait for it, give me the return value (Result<T, Box<dyn Any>>)". Without joining, main may exit first and your background work vanishes mid-flight.',
    },
    {
      mode: 'quiz',
      prompt: 'Why does a spawned closure often need `move`?',
      options: [
        'The thread may outlive the spawning scope \u2014 so it must OWN its captured data',
        'To make it faster',
        'spawn requires owned closures',
        'To enable async',
      ],
      answer: 0,
      explain:
        'A thread can run after main() has ended its scope. Borrowing from a scope that might be gone is a data race waiting to happen \u2014 so the closure must move (own) everything it uses.',
    },
    {
      mode: 'quiz',
      prompt: 'What is a "data race"?',
      options: [
        'Two threads accessing the same data concurrently, at least one writing, without synchronization',
        'A slow thread',
        'A memory leak',
        'A deadlock',
      ],
      answer: 0,
      explain:
        'Data races are undefined behavior in most languages \u2014 silent corruption. In Rust, the type system makes data races a COMPILE ERROR: shared + mutable + concurrent cannot be expressed safely. "Fearless concurrency" is a feature, not a slogan.',
    },
    {
      mode: 'quiz',
      prompt: 'What are the `Send` and `Sync` traits?',
      options: [
        'Compiler-enforced markers: Send = safe to MOVE across threads, Sync = safe to SHARE a reference across threads',
        'Traits for network I/O',
        'Runtime locks',
        'Deprecated aliases',
      ],
      answer: 0,
      explain:
        'Most types are Send (Rc is NOT \u2014 its counter isn\u2019t atomic). Sync = &T is Send (Mutex<T> is Sync even if T isn\u2019t). These auto traits are what make illegal sharing uncompilable.',
    },
    {
      mode: 'quiz',
      prompt: 'What does a channel (mpsc) do?',
      options: [
        'Passes messages between threads: sender.send(value), receiver.recv() \u2014 moves data, no shared memory',
        'Synchronizes locks',
        'Copies memory between threads',
        'Buffers stdin',
      ],
      answer: 0,
      explain:
        'mpsc = many producers, one consumer. Channels move ownership from one thread to another \u2014 no sharing at all, so no locks. The actor-model style of concurrency, built right into std.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `recv()` return, and what does that mean?',
      options: [
        '`Result<T, RecvError>` \u2014 Err when all senders are dropped (channel closed)',
        'An Option \u2014 None on close',
        'The value, or panics',
        'A Vec of all messages',
      ],
      answer: 0,
      explain:
        'recv() blocks until a message arrives. When every Sender is dropped, the channel CLOSES and recv() returns Err \u2014 your "no more work" signal. Handle it (loop until Err) instead of unwrapping blindly.',
    },
    {
      mode: 'quiz',
      prompt: 'What does `Mutex<T>` protect?',
      options: [
        'Shared mutable data: only one thread can hold the lock (and thus write) at a time',
        'A single variable in one thread',
        'Heap allocation',
        'Network sockets',
      ],
      answer: 0,
      explain:
        'Mutex = mutual exclusion. `.lock().unwrap()` gives a guard that derefs to T and releases the lock when dropped. The type system forces the lock before access \u2014 forgetting to lock is a compile error, not a bug.',
    },
    {
      mode: 'quiz',
      prompt: 'Why does the Mutex guard get dropped after a statement/scope end?',
      options: [
        'Rust\u2019s drop-at-scope-end semantics release the lock deterministically \u2014 no forgotten unlock',
        'The OS reclaims it',
        'It is never released',
        'Only if you call unlock()',
      ],
      answer: 0,
      explain:
        'The guard is an ordinary value: scope ends \u2192 drop runs \u2192 lock released. Even panics release it (Rust mutexes are poisoning-aware). Deterministic cleanup is what makes it safe by default.',
    },
    {
      mode: 'quiz',
      prompt: 'A `Vec<T>` is shared between threads inside an `Arc` \u2014 why do we need BOTH Arc AND Mutex for mutation?',
      options: [
        'Arc gives shared ownership; Mutex gives exclusive access. Neither alone is enough',
        'Arc is decorative',
        'Mutex implies Arc',
        'You don\u2019t \u2014 Arc alone suffices',
      ],
      answer: 0,
      explain:
        'Arc = thread-safe REFERENCE COUNTING (many owners). It doesn\u2019t make the data mutable through a shared ref. Arc<Mutex<T>> is the standard "shared, mutable, across threads" combo \u2014 two orthogonal problems, two tools.',
    },

    // ── PREDICT OUTPUT ────────────────────────────────────
    {
      mode: 'predict',
      prompt: 'What does this print (in some order)?',
      code: 'use std::thread;\nuse std::time::Duration;\n\nlet h = thread::spawn(|| {\n    thread::sleep(Duration::from_millis(50));\n    println!("from thread");\n});\nh.join().unwrap();\nprintln!("from main");',
      options: ['from thread then from main', 'from main then from thread (always)', 'Nothing', 'Compile error'],
      answer: 0,
      explain:
        'join() makes main WAIT for the spawned thread: "from thread" always prints first, then "from main". Without the join, the order (and even whether the thread finishes) would be a coin flip.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::sync::mpsc;\n\nlet (tx, rx) = mpsc::channel();\nthread::spawn(move || {\n    tx.send(1).unwrap();\n    tx.send(2).unwrap();\n});\nfor r in rx {\n    println!("{r}");\n}',
      options: ['1 then 2 (two lines, in order)', '2 then 1', '12', 'Compile error'],
      answer: 0,
      explain:
        'The channel delivers in send order: 1, then 2. `for r in rx` iterates until the channel closes (tx dropped at end of the closure) \u2014 the idiomatic "consume all messages" loop.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::sync::{Arc, Mutex};\nuse std::thread;\n\nlet data = Arc::new(Mutex::new(0));\nlet mut hs = vec![];\nfor _ in 0..4 {\n    let d = Arc::clone(&data);\n    hs.push(thread::spawn(move || {\n        let mut g = d.lock().unwrap();\n        *g += 1;\n    }));\n}\nfor h in hs { h.join().unwrap(); }\nprintln!("{}", *data.lock().unwrap());',
      options: ['4', '0', '1', 'Compile error'],
      answer: 0,
      explain:
        'Four threads each lock the SAME shared counter (Arc shares it, Mutex serializes them) and add 1 \u2192 4. The lock is what makes concurrent mutation safe: without it, increments would silently lose each other.',
    },
    {
      mode: 'predict',
      prompt: 'What happens when this runs?',
      code: 'use std::thread;\nuse std::rc::Rc;\n\nlet c = Rc::new(vec![1, 2, 3]);\nlet h = thread::spawn(move || {\n    println!("{c:?}");\n});\nh.join().unwrap();',
      options: [
        'Compile error: Rc is not Send \u2014 it cannot cross threads (use Arc)',
        'It works fine',
        'Runtime panic',
        'Deadlock',
      ],
      answer: 0,
      explain:
        'Rc\u2019s counter is a plain integer \u2014 not atomic \u2014 so the compiler marks Rc as !Send and REFUSES to let a thread own it. The type system caught a would-be data race at compile time. Swap in Arc and it compiles.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::sync::mpsc;\n\nlet (tx, rx) = mpsc::channel();\n// no sender exists anymore... except:\nlet r = rx.recv();\nprintln!("{r:?}");',
      options: [
        'Err(RecvError) \u2014 the channel was already closed (no senders)',
        'Blocks forever',
        'Ok(())',
        'Panic',
      ],
      answer: 0,
      explain:
        'If a Receiver exists with ZERO Senders, recv() immediately returns Err \u2014 the closed-channel signal. Channels encode their lifecycle in the type: dropped senders = finished stream.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::thread;\n\nlet mut handles = vec![];\nfor i in 0..3 {\n    handles.push(thread::spawn(move || {\n        let sum: u64 = (0..100_000).sum();\n        sum\n    }));\n}\nlet total: u64 = handles.into_iter().map(|h| h.join().unwrap()).sum();\nprintln!("{total}");',
      options: ['4999950000', '4999950000*3 = 14999850000', '0', 'Compile error: move in loop'],
      answer: 1,
      explain:
        'Each of the 3 threads sums 0..100000 = 4,999,950,000; the main thread adds the three results \u2192 14,999,850,000. (The `move` + i-in-loop E0372 trap is avoided because i isn\u2019t used in the closure.) Real parallel work, deterministic sum.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::sync::Mutex;\n\nlet m = Mutex::new(10);\nlet v = m.lock().unwrap();\nprintln!("{v}");\n// v dropped here, lock released\nprintln!("{}", *m.lock().unwrap());',
      options: ['10 then 10', '10 then (deadlock)', 'Compile error', 'Panic'],
      answer: 0,
      explain:
        'The guard v ends its scope at the println line \u2192 lock released \u2192 the second lock() succeeds. Sequential locks on the same mutex are fine; NESTED locks (locking while a guard is alive) would deadlock \u2014 scope your guards tightly.',
    },
    {
      mode: 'predict',
      prompt: 'What does this print?',
      code: 'use std::thread;\n\nfn main() {\n    let h = thread::spawn(|| {\n        panic!("boom in thread");\n    });\n    h.join();\n    println!("main continues");\n}',
      options: [
        'main continues (panic is contained in the thread; join() returns Err)',
        'The whole program dies before main continues',
        'Compile error',
        'Hangs',
      ],
      answer: 0,
      explain:
        'A panic UNWINDS ITS THREAD, not the process: join() returns Err(panicked payload) and main carries on. (You can opt a thread into aborting the process with std::process, but the default is containment.)',
    },

    // ── FIX THE BUG ───────────────────────────────────────
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'use std::thread;\n\nlet name = String::from("worker");\nlet h = thread::spawn(|| {\n    println!("{name}");\n});\nh.join().unwrap();',
      error:
        'error[E0372]: variable `name` does not live long enough\n  |\n  |     ---- variable does not live long enough\n  | ...closure requires `name` to outlive the thread\n  = note: threads outlive the stack frame that spawned them',
      options: [
        'Move it in: `thread::spawn(move || { ... })`',
        'Make name a &str',
        'Declare name as static',
        'Join before the spawn',
      ],
      answer: 0,
      fixedCode: 'use std::thread;\n\nlet name = String::from("worker");\nlet h = thread::spawn(move || {\n    println!("{name}");\n});\nh.join().unwrap();',
      explain:
        'E0372 is the "threads must own their data" rule. `move` transfers name into the closure so it lives as long as the thread. (A &str would also work \u2014 static data never dies \u2014 but move is the general tool.)',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'use std::thread;\nuse std::rc::Rc;\n\nlet v = Rc::new(vec![1, 2]);\nlet a = Rc::clone(&v);\nlet h = thread::spawn(move || {\n    println!("{a:?}");\n});\nh.join().unwrap();',
      error:
        'error[E0277]: the trait bound `Rc<Vec<i32>>: Send` is not satisfied\n  |\n  |          ---- ^^^^ required by `thread::spawn`\n  = note: `Rc` is not `Send` \u2014 its reference count is not atomic',
      options: [
        'Swap Rc for Arc: `Arc::new(...)`, `Arc::clone(...)`',
        'Add `unsafe`',
        'Clone the vec values into the closure',
        'Use a channel to send the data instead',
      ],
      answer: 0,
      fixedCode: 'use std::thread;\nuse std::sync::Arc;\n\nlet v = Arc::new(vec![1, 2]);\nlet a = Arc::clone(&v);\nlet h = thread::spawn(move || {\n    println!("{a:?}");\n});\nh.join().unwrap();',
      explain:
        'Rc = single-thread sharing (cheap non-atomic count). Arc = ATOMIC Reference Count \u2014 the thread-safe twin. Seeing `Rc: Send not satisfied`? Reach for Arc. One-word fix, huge concept.',
    },
    {
      mode: 'fix',
      prompt: 'This won\u2019t compile. What\u2019s the fix?',
      code: 'use std::sync::Mutex;\n\nlet m = Mutex::new(5);\nprintln!("{}", m);',
      error:
        'error[E0277]: the trait bound `Mutex<{integer}>: std::fmt::Display` is not satisfied\n  |\n  |               ^ the trait `Display` is not implemented for `Mutex<i32>`\n  = note: you must LOCK the mutex before reading the data',
      options: [
        'Lock it: `println!("{}", *m.lock().unwrap());`',
        'Deref with *m',
        'Use m.value()',
        'Drop the mutex',
      ],
      answer: 0,
      fixedCode: 'use std::sync::Mutex;\n\nlet m = Mutex::new(5);\nprintln!("{}", *m.lock().unwrap());',
      explain:
        'You can\u2019t touch the data through the Mutex itself \u2014 the compiler makes you lock first. `*m.lock().unwrap()` = guard \u2192 deref \u2192 value. The error is a feature: it\u2019s the type system saying "synchronize before you read".',
    },
    {
      mode: 'fix',
      prompt: 'This can panic. What\u2019s the robust fix?',
      code: 'use std::sync::mpsc;\n\nlet (tx, rx) = mpsc::channel();\nthread::spawn(move || tx.send(1).unwrap());\nlet v = rx.recv().unwrap();\nprintln!("{v}");',
      error:
        'runtime (if the sender panics before sending):\nthread panicked: called `Result::unwrap()` on an `Err` value \n\u2014 recv() returned Err because the channel closed with no message',
      options: [
        'Handle the closed channel: `match rx.recv() { Ok(v) => ..., Err(_) => println!("no message") }`',
        'Call recv() twice',
        'Use a bigger buffer',
        'Remove the thread',
      ],
      answer: 0,
      fixedCode: 'use std::sync::mpsc;\n\nlet (tx, rx) = mpsc::channel();\nthread::spawn(move || {\n    let _ = tx.send(1);\n});\nmatch rx.recv() {\n    Ok(v) => println!("{v}"),\n    Err(_) => println!("channel closed \u2014 no message"),\n}',
      explain:
        'recv().unwrap() trusts the sender. In concurrent code, senders die (panics, early returns) \u2014 treat a closed channel as a NORMAL outcome and branch on the Result. Graceful degradation beats 3am panics.',
    },

    // ── MEMORY MATCH ──────────────────────────────────────
    {
      mode: 'match',
      prompt: 'Memory match: pair each concurrency tool with its role.',
      pairs: [
        { a: 'thread::spawn', b: 'start an OS thread' },
        { a: 'join()', b: 'wait for a thread + result' },
        { a: 'channel', b: 'move messages between threads' },
        { a: 'Mutex', b: 'one writer at a time' },
        { a: 'Arc', b: 'thread-safe sharing' },
        { a: 'Rc', b: 'single-thread sharing only' },
        { a: 'Send', b: 'safe to move across threads' },
        { a: 'data race', b: 'compile error in Rust' },
      ],
      summary:
        'Concurrency in one breath: threads do the work, channels pass the data, mutexes guard the shared bits, Arc shares the ownership \u2014 and the type system turns every data race into a compile error before it can exist.',
    },
  ],
}

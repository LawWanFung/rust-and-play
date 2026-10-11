import type { ReactNode } from 'react'

/**
 * Tiny Rust syntax highlighter (regex tokenizer).
 * Handles: comments, strings, char literals, lifetimes, keywords, types, numbers.
 */
const TOKEN_RE =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|('(?:\\.|[^'\\])')|('[a-zA-Z_]\w*)|\b(let|mut|fn|if|else|match|while|for|loop|return|use|struct|enum|impl|trait|const|static|true|false|ref|move|async|await|dyn|where|pub|self|crate|mod|break|continue)\b|\b(i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|isize|usize|f32|f64|str|char|bool|String|Vec|Box|Rc|RefCell|Cell|Option|Result|HashMap|BTreeMap|Drop|Clone|Copy|Debug)\b|\b(\d[\d_]*\.?\d*)\b/g

export function highlightRust(code: string): ReactNode {
  const nodes: ReactNode[] = []
  let last = 0
  let k = 0
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(code))) {
    if (m.index > last) nodes.push(code.slice(last, m.index))
    const cls = m[1] ? 'tk-c' : m[2] ? 'tk-s' : m[3] ? 'tk-ch' : m[4] ? 'tk-l' : m[5] ? 'tk-k' : m[6] ? 'tk-t' : 'tk-n'
    nodes.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    )
    last = TOKEN_RE.lastIndex
  }
  if (last < code.length) nodes.push(code.slice(last))
  return <>{nodes}</>
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code">
      <code>{highlightRust(code)}</code>
    </pre>
  )
}

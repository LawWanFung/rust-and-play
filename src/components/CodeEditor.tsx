import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  lines?: number
}

/** Plain-text Rust editor. A syntax-highlight overlay is a nice-to-have;
 *  a monospace textarea is the working core (v0.3 spike validated the
 *  flow — editor glamour is polish, not a gate). */
export function CodeEditor({ value, onChange, lines = 10 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Tab inserts two spaces (the editor owns the tab key)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = ref.current
    if (!el) return
    const s = el.selectionStart
    const en = el.selectionEnd
    const next = value.slice(0, s) + '  ' + value.slice(en)
    onChange(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + 2
    })
  }

  return (
    <textarea
      ref={ref}
      className="code-editor"
      value={value}
      rows={lines}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

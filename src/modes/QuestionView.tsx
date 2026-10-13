import { useState } from 'react'
import type { MatchPair, Question } from '../game/types'
import { CodeBlock } from '../ui/CodeBlock'
import { SandboxPanel } from './SandboxPanel'

/** the three option-answering modes (match rounds use MatchGame) */
export type OptionQuestion = Extract<Question, { mode: 'quiz' | 'predict' | 'fix' }>

interface Props {
  q: OptionQuestion
  phase: 'question' | 'feedback'
  /** index of the chosen option, -1 for timeout/miss, null while answering */
  selected: number | null
  gainedXp: number
  onAnswer: (i: number) => void
  onContinue: () => void
}

const KEYS = ['A', 'B', 'C', 'D']

const CHIP: Record<Question['mode'], { label: string; cls: string }> = {
  quiz: { label: '❓ QUIZ', cls: 'quiz' },
  predict: { label: '⌨ PREDICT OUTPUT', cls: 'predict' },
  fix: { label: '🔧 FIX THE BUG', cls: 'fix' },
  match: { label: '🧠 MEMORY MATCH', cls: 'match' },
}

export function QuestionView({ q, phase, selected, gainedXp, onAnswer, onContinue }: Props) {
  // match rounds are rendered by MatchGame in Run; this view handles the
  // three option-based modes (quiz / predict / fix)
  const [inSandbox, setInSandbox] = useState(false)
  const isCorrect = selected !== null && selected === q.answer
  const timedOut = selected === -1
  const chip = CHIP[q.mode]

  return (
    <div className={`qcard panel ${phase === 'feedback' ? (isCorrect ? 'flash-good' : 'flash-bad') : ''}`}>
      <div className="q-top">
        <span className={`chip ${chip.cls}`}>{chip.label}</span>
      </div>
      <h2 className="q-prompt">{q.prompt}</h2>
      {q.mode === 'fix' && q.error && (
        <div className="rustc-error">
          <span className="rustc-label">~$ cargo check</span>
          {q.error.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      {q.code && <CodeBlock code={q.code} />}
      {q.mode === 'fix' && q.code && phase === 'question' && !inSandbox && (
        <button className="btn sb-open" onClick={() => setInSandbox(true)}>
          🛠 Try it in the sandbox
        </button>
      )}
      {q.mode === 'fix' && q.code && phase === 'question' && inSandbox && (
        <SandboxPanel initialCode={q.code} onDone={() => setInSandbox(false)} />
      )}
      <div className="options">
        {q.options.map((opt, i) => {
          let cls = 'option'
          if (phase === 'feedback') {
            if (i === q.answer) cls += ' correct'
            if (i === selected) cls += ' selected'
            if (i === selected && i !== q.answer) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} disabled={phase === 'feedback'} onClick={() => onAnswer(i)}>
              <span className="opt-key">{KEYS[i]}</span>
              <span className="opt-text">{opt}</span>
            </button>
          )
        })}
      </div>
      {phase === 'feedback' && (
        <div className="feedback">
          <div className={`verdict ${isCorrect ? 'good' : 'bad'}`}>
            {timedOut ? "⏰ TIME'S UP" : isCorrect ? `✅ CORRECT  +${gainedXp} XP` : '❌ WRONG'}
            {!isCorrect && <span className="verdict-hp">  −1 HP</span>}
          </div>
          {q.mode === 'fix' && q.fixedCode && (
            <div className="fix-reveal">
              <span className="fix-label">✅ THE FIX</span>
              <CodeBlock code={q.fixedCode} />
            </div>
          )}
          <p className="explain">{q.explain}</p>
          <button className="btn primary big" onClick={onContinue}>
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}

/** Pair list shown after a memory match round */
export function MatchSummary({ pairs }: { pairs: MatchPair[] }) {
  return (
    <div className="match-summary">
      {pairs.map((p, i) => (
        <div key={i} className="ms-row">
          <span className="ms-a">{p.a}</span>
          <span className="ms-arrow">⇄</span>
          <span className="ms-b">{p.b}</span>
        </div>
      ))}
    </div>
  )
}

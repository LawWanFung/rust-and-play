import { useEffect, useMemo, useRef, useState } from 'react'
import type { MatchPair } from '../game/types'
import { MATCH_TIME } from '../game/engine'
import { shuffle } from '../game/engine'

interface Card {
  key: number
  pairId: number
  text: string
}

interface Props {
  pairs: MatchPair[]
  onResult: (ok: boolean, flips: number, timeUsed: number) => void
}

export function MatchGame({ pairs, onResult }: Props) {
  // a malformed/empty pair list must lose the round, never auto-win
  // (QUALITY.md #6): `matched.size (0) === pairs.length (0)` would fire on mount
  const safePairs = pairs ?? []
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        safePairs.flatMap((p, i) => [
          { key: i * 2, pairId: i, text: p.a },
          { key: i * 2 + 1, pairId: i, text: p.b },
        ]),
      ),
    [safePairs],
  )

  const [faceUp, setFaceUp] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [flips, setFlips] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME)
  const done = useRef(false)
  const timers = useRef<number[]>([])

  // clear pending flip timers on unmount (QUALITY.md #10)
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // degenerate content (zero pairs) → immediate loss, once
  useEffect(() => {
    if (safePairs.length === 0 && !done.current) {
      done.current = true
      onResult(false, 0, MATCH_TIME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // countdown
  useEffect(() => {
    if (done.current) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])

  // timeout
  useEffect(() => {
    if (!done.current && safePairs.length > 0 && timeLeft <= 0) {
      done.current = true
      onResult(false, flips, MATCH_TIME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // win
  useEffect(() => {
    if (!done.current && safePairs.length > 0 && matched.size === safePairs.length) {
      done.current = true
      onResult(true, flips, MATCH_TIME - timeLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched])

  function flip(key: number) {
    if (done.current || faceUp.length === 2) return
    const card = cards[key]
    if (!card) return
    if (matched.has(card.pairId) || faceUp.includes(key)) return
    const next = [...faceUp, key]
    setFaceUp(next)
    if (next.length === 2) {
      setFlips((f) => f + 1)
      const [a, b] = next.map((k) => cards[k])
      if (a && b && a.pairId === b.pairId) {
        later(() => {
          setMatched((m) => new Set(m).add(a.pairId))
          setFaceUp([])
        }, 450)
      } else {
        later(() => setFaceUp([]), 900)
      }
    }
  }

  const matchedCount = matched.size
  const allMatched = safePairs.length > 0 && matchedCount === safePairs.length

  return (
    <div className="match">
      <div className="match-top">
        <span className="match-pairs">
          {matchedCount}/{safePairs.length} pairs
        </span>
        <span className="match-flips">{flips} flips</span>
      </div>
      <div className={`timer ${timeLeft <= 10 ? 'low' : ''}`}>
        <div className="timer-fill" style={{ width: `${(Math.max(0, timeLeft) / MATCH_TIME) * 100}%` }} />
      </div>
      <div className={`cards ${allMatched ? 'all' : ''}`}>
        {cards.map((c, i) => {
          const up = faceUp.includes(i) || matched.has(c.pairId)
          return (
            <button
              key={c.key}
              className={`card ${up ? 'up' : ''} ${matched.has(c.pairId) ? 'matched' : ''}`}
              onClick={() => flip(i)}
              disabled={done.current}
            >
              <span className="card-inner">
                <span className="card-face card-back">?</span>
                <span className="card-face card-front">{c.text}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

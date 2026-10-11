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
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        pairs.flatMap((p, i) => [
          { key: i * 2, pairId: i, text: p.a },
          { key: i * 2 + 1, pairId: i, text: p.b },
        ]),
      ),
    [pairs],
  )

  const [faceUp, setFaceUp] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [flips, setFlips] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME)
  const done = useRef(false)

  // countdown
  useEffect(() => {
    if (done.current) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])

  // timeout
  useEffect(() => {
    if (!done.current && timeLeft <= 0) {
      done.current = true
      onResult(false, flips, MATCH_TIME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // win
  useEffect(() => {
    if (!done.current && matched.size === pairs.length) {
      done.current = true
      onResult(true, flips, MATCH_TIME - timeLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched])

  function flip(key: number) {
    if (done.current || faceUp.length === 2) return
    const card = cards[key]
    if (matched.has(card.pairId) || faceUp.includes(key)) return
    const next = [...faceUp, key]
    setFaceUp(next)
    if (next.length === 2) {
      setFlips((f) => f + 1)
      const [a, b] = next.map((k) => cards[k])
      if (a.pairId === b.pairId) {
        setTimeout(() => {
          setMatched((m) => new Set(m).add(a.pairId))
          setFaceUp([])
        }, 450)
      } else {
        setTimeout(() => setFaceUp([]), 900)
      }
    }
  }

  const matchedCount = matched.size
  const allMatched = matchedCount === pairs.length

  return (
    <div className="match">
      <div className="match-top">
        <span className="match-pairs">
          {matchedCount}/{pairs.length} pairs
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

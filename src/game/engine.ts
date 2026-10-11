import type { Question } from './types'

export const MAX_HP = 3
export const QUESTION_TIME = 30 // seconds per round (match rounds run their own clock)
export const MATCH_TIME = 60 // seconds to clear a memory match
export const RUN_LENGTH = 10
export const BOSS_LENGTH = 8

/** answer within this many seconds of the round start for a speed bonus */
export const SPEED_WINDOW = 8

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** random sample from a bank (boss remix) */
export function pick(bank: readonly Question[], n: number): Question[] {
  return shuffle(bank).slice(0, Math.min(n, bank.length))
}

/**
 * Round-robin across modes so every run mixes quiz / predict / fix / match.
 * Each mode's bank is shuffled first; mode order is shuffled too.
 */
export function stratifiedPick(bank: readonly Question[], n: number): Question[] {
  const queues = new Map<Question['mode'], Question[]>()
  for (const q of bank) {
    const arr = queues.get(q.mode) ?? []
    arr.push(q)
    queues.set(q.mode, arr)
  }
  const lists = shuffle([...queues.values()].map(shuffle))
  const order = shuffle(lists)
  const out: Question[] = []
  let i = 0
  while (out.length < n && i < 1000) {
    if (lists.every((l) => l.length === 0)) break
    const q = order[i % order.length].shift()
    i++
    if (q) out.push(q)
  }
  return out
}

/**
 * XP for a correct option-based answer.
 * combo = consecutive correct count INCLUDING this answer (max 3× at 20).
 * timeLeft = seconds remaining when answered.
 */
export function answerXp(q: Question, combo: number, timeLeft: number): number {
  const base = q.mode === 'fix' ? 20 : q.mode === 'predict' ? 15 : 10
  const mult = 1 + Math.min(combo, 20) * 0.1
  const speed = timeLeft >= QUESTION_TIME - SPEED_WINDOW ? 5 : 0
  return Math.round(base * mult) + speed
}

/** XP for clearing a match mini-game. Faster clears pay more. */
export function matchXp(combo: number, timeUsed: number): number {
  const base = 25
  const mult = 1 + Math.min(combo, 20) * 0.1
  const speed = timeUsed <= MATCH_TIME / 2 ? 10 : timeUsed <= MATCH_TIME * 0.75 ? 5 : 0
  return Math.round(base * mult) + speed
}

/** [combo threshold, badge id] */
export const COMBO_BADGES: Array<[number, string]> = [
  [5, 'combo-5'],
  [10, 'combo-10'],
  [20, 'combo-20'],
]

export const SPEED_BADGE_AT = 5 // speed bonuses in one run

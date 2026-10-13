import { useEffect, useMemo, useRef, useState } from 'react'
import type { Badge } from '../game/ranks'
import { badgeById, nextRank, rankFor } from '../game/ranks'
import type { ModuleProgress, SaveData } from '../game/store'
import type { Question } from '../game/types'
import { loadSave, persistSave } from '../game/store'
import {
  BOSS_LENGTH,
  COMBO_BADGES,
  MAX_HP,
  MATCH_TIME,
  QUESTION_TIME,
  RUN_LENGTH,
  SPEED_BADGE_AT,
  SPEED_WINDOW,
  answerXp,
  matchXp,
  pick,
  stratifiedPick,
} from '../game/engine'
import { MODULES, getModule } from '../content/modules'
import { HUD } from '../ui/HUD'
import { MatchGame, MatchSummary, QuestionView } from '../modes'

export interface RunResult {
  save: SaveData
  /** if set, App starts a run for this module next */
  nextModuleId?: string
}

interface Props {
  moduleId: string
  isBoss: boolean
  save: SaveData
  onExit: (result: RunResult) => void
}

type Phase = 'intro' | 'question' | 'feedback' | 'done' | 'failed'

interface Final {
  save: SaveData
  xpEarned: number
  newBadges: Badge[]
  rankedUp: boolean
}

export function Run({ moduleId, isBoss, save, onExit }: Props) {
  const module = getModule(moduleId)
  const [attempt, setAttempt] = useState(0)

  const questions = useMemo(() => {
    let bank = module.questions
    if (isBoss) {
      // boss fights remix in questions from conquered modules
      for (const m of MODULES) {
        if (m.id !== moduleId && save.modules[m.id]?.bossCleared) {
          bank = [...bank, ...pick(m.questions, 2)]
        }
      }
    }
    // dev deep-link: ?debug=fix|quiz|predict|match forces a single mode
    // (makes it instant to reach e.g. fix-the-bug rounds while testing)
    const forced = new URLSearchParams(location.search).get('debug') as Question['mode'] | null
    if (forced && ['quiz', 'predict', 'fix', 'match'].includes(forced)) {
      const filtered = bank.filter((q) => q.mode === forced)
      // cycle the (small) mode bank so the run still has full length
      const need = isBoss ? BOSS_LENGTH : RUN_LENGTH
      while (filtered.length < need) filtered.push(...filtered)
      bank = filtered
    }
    return stratifiedPick(bank, isBoss ? BOSS_LENGTH : RUN_LENGTH)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, isBoss, module, attempt])

  const [phase, setPhase] = useState<Phase>(isBoss ? 'intro' : 'question')
  const [qIndex, setQIndex] = useState(0)
  const [hp, setHp] = useState(MAX_HP)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [runXp, setRunXp] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [speedHits, setSpeedHits] = useState(0)
  const [gainedXp, setGainedXp] = useState(0)
  const [fixWins, setFixWins] = useState(0)
  const [matchWins, setMatchWins] = useState(0)
  const [final, setFinal] = useState<Final | null>(null)
  const finalized = useRef(false)
  const startRankXp = useRef(save.xp)

  const q = questions[qIndex]

  // ── countdown (match rounds run their own clock) ───────
  useEffect(() => {
    if (phase !== 'question' || q.mode === 'match') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, qIndex, q.mode, attempt])

  useEffect(() => {
    if (phase === 'question' && q.mode !== 'match' && timeLeft <= 0) answer(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, q.mode])

  // ── option-based answers (quiz / predict / fix) ────────
  function answer(i: number) {
    if (phase !== 'question' || q.mode === 'match') return
    const correct = i === q.answer
    if (correct) {
      const newCombo = combo + 1
      const xp = answerXp(q, newCombo, timeLeft)
      setCombo(newCombo)
      setBestCombo((b) => Math.max(b, newCombo))
      setRunXp((x) => x + xp)
      setGainedXp(xp)
      setCorrectCount((c) => c + 1)
      if (q.mode === 'fix') setFixWins((f) => f + 1)
      if (timeLeft >= QUESTION_TIME - SPEED_WINDOW) setSpeedHits((s) => s + 1)
    } else {
      setCombo(0)
      setGainedXp(0)
      setHp((h) => h - 1)
    }
    setSelected(i)
    setPhase('feedback')
  }

  // ── memory match result ────────────────────────────────
  function onMatchResult(ok: boolean, _flips: number, timeUsed: number) {
    if (phase !== 'question') return
    if (ok) {
      const newCombo = combo + 1
      const xp = matchXp(newCombo, timeUsed)
      setCombo(newCombo)
      setBestCombo((b) => Math.max(b, newCombo))
      setRunXp((x) => x + xp)
      setGainedXp(xp)
      setCorrectCount((c) => c + 1)
      setMatchWins((m) => m + 1)
      if (timeUsed <= MATCH_TIME / 2) setSpeedHits((s) => s + 1)
    } else {
      setCombo(0)
      setGainedXp(0)
      setHp((h) => h - 1)
    }
    setSelected(ok ? 0 : -1)
    setPhase('feedback')
  }

  function continueNext() {
    if (hp <= 0) {
      finish('failed')
      return
    }
    if (qIndex + 1 >= questions.length) {
      finish('done')
      return
    }
    setQIndex((i) => i + 1)
    setSelected(null)
    setGainedXp(0)
    setTimeLeft(QUESTION_TIME)
    setPhase('question')
  }

  function finish(outcome: 'done' | 'failed') {
    if (finalized.current) return
    finalized.current = true

    const s: SaveData = JSON.parse(JSON.stringify(loadSave()))
    const mod: ModuleProgress = s.modules[module.id] ?? { cleared: false, bossCleared: false, bestXp: 0 }
    const bonus = outcome === 'done' ? (isBoss ? 50 : 30) : 0
    const xpEarned = (outcome === 'done' ? runXp : Math.floor(runXp / 2)) + bonus

    const earned: string[] = []
    const earn = (id: string) => {
      if (!s.badges.includes(id) && !earned.includes(id)) earned.push(id)
    }

    if (s.stats.correct === 0 && correctCount > 0) earn('first-blood')
    for (const [n, id] of COMBO_BADGES) if (bestCombo >= n) earn(id)
    if (speedHits >= SPEED_BADGE_AT) earn('speed-5')
    if (s.stats.fixes + fixWins >= 10) earn('debugger')
    if (s.stats.matchesWon + matchWins >= 5) earn('memory-5')
    if (s.stats.answers + questions.length >= 100) earn('answers-100')
    if (s.stats.answers + questions.length >= 300) earn('answers-300')
    if (outcome === 'done') {
      if (hp === MAX_HP) earn('perfect')
      if (isBoss) {
        earn('boss-1')
        if (module.clearBadge) earn(module.clearBadge)
        mod.bossCleared = true
      }
      mod.cleared = true
    }
    const clearedCount = Object.values(s.modules).filter((m) => m.cleared).length
    if (clearedCount >= 5) earn('halfway')
    if (Object.values(s.modules).every((m) => m.bossCleared) && Object.keys(s.modules).length === MODULES.length)
      earn('champion')

    s.xp += xpEarned
    s.stats.answers += questions.length
    s.stats.correct += correctCount
    s.stats.bestCombo = Math.max(s.stats.bestCombo, bestCombo)
    s.stats.fixes += fixWins
    s.stats.matchesWon += matchWins
    s.modules[module.id] = { ...mod, bestXp: Math.max(mod.bestXp, xpEarned) }
    s.badges = [...s.badges, ...earned]

    persistSave(s)
    setFinal({
      save: s,
      xpEarned,
      newBadges: earned.map((id) => badgeById(id)).filter((b): b is Badge => !!b),
      rankedUp: rankFor(s.xp).name !== rankFor(startRankXp.current).name,
    })
    setPhase(outcome)
  }

  function retry() {
    finalized.current = false
    setFinal(null)
    setPhase(isBoss ? 'intro' : 'question')
    setQIndex(0)
    setHp(MAX_HP)
    setCombo(0)
    setBestCombo(0)
    setRunXp(0)
    setCorrectCount(0)
    setSelected(null)
    setTimeLeft(QUESTION_TIME)
    setSpeedHits(0)
    setGainedXp(0)
    setFixWins(0)
    setMatchWins(0)
    startRankXp.current = loadSave().xp
    setAttempt((a) => a + 1)
  }

  function quit() {
    if (window.confirm('Quit this run? Progress in this run is lost.')) {
      onExit({ save: loadSave() })
    }
  }

  // ── boss intro ────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="run">
        <div className="intro panel">
          <div className="intro-icon">👹</div>
          <h1 className="intro-title">BOSS BATTLE</h1>
          <p className="intro-sub">
            {module.icon} {module.title} — the gauntlet
          </p>
          <p className="intro-desc">
            {BOSS_LENGTH} rounds · {MAX_HP} HP · no mercy. Boss fights remix questions from every module you have
            conquered.
          </p>
          <button className="btn primary big" onClick={() => setPhase('question')}>
            ⚔ Enter the Arena
          </button>
        </div>
      </div>
    )
  }

  // ── results ───────────────────────────────────────────
  if ((phase === 'done' || phase === 'failed') && final) {
    const rank = rankFor(final.save.xp)
    const next = nextRank(final.save.xp)
    const nextMod = isBoss ? MODULES[MODULES.findIndex((m) => m.id === moduleId) + 1] : undefined
    return (
      <div className="run">
        <div className={`results panel ${phase}`}>
          <h1 className={`results-title ${phase}`}>{phase === 'done' ? '🏆 VICTORY' : '💀 DEFEATED'}</h1>
          <p className="results-sub">
            {phase === 'failed'
              ? `HP hit zero — you salvaged half your XP. The ${module.title} ${isBoss ? 'boss' : 'module'} still stands.`
              : isBoss
                ? `The ${module.title} boss falls.`
                : `Module cleared! Now take down the boss to unlock the next module.`}
          </p>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-val">{final.xpEarned}</span>
              <span>XP earned</span>
            </div>
            <div className="stat">
              <span className="stat-val">
                {correctCount}/{questions.length}
              </span>
              <span>rounds won</span>
            </div>
            <div className="stat">
              <span className="stat-val">×{bestCombo}</span>
              <span>best combo</span>
            </div>
            <div className="stat">
              <span className="stat-val">
                {rank.icon} {rank.name}
              </span>
              <span>rank</span>
            </div>
          </div>
          {final.rankedUp && (
            <div className="rankup">
              ⭐ RANK UP — you are now {rank.icon} <b>{rank.name}</b>
              {next ? ` · ${next.xp - final.save.xp} XP to ${next.name}` : ' · max rank'}
            </div>
          )}
          {final.newBadges.length > 0 && (
            <div className="new-badges">
              <span className="nb-label">New badges:</span>
              {final.newBadges.map((b) => (
                <span key={b.id} className="badge-chip" title={b.desc}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          )}
          <div className="results-actions">
            <button className="btn" onClick={retry}>
              ↻ Retry
            </button>
            {!isBoss && phase === 'done' && (
              <button className="btn accent" onClick={() => onExit({ save: final.save })}>
                👹 Face the Boss →
              </button>
            )}
            {isBoss && nextMod && (
              <button
                className="btn accent"
                onClick={() => onExit({ save: final.save, nextModuleId: nextMod.id })}
              >
                Next: {nextMod.title} →
              </button>
            )}
            <button className="btn primary" onClick={() => onExit({ save: final.save })}>
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── gameplay ──────────────────────────────────────────
  return (
    <div className="run">
      <HUD
        moduleTitle={module.title}
        moduleIcon={module.icon}
        isBoss={isBoss}
        qNumber={qIndex + 1}
        total={questions.length}
        hp={hp}
        combo={combo}
        xp={runXp}
        timeLeft={timeLeft}
        showTimer={q.mode !== 'match'}
      />
      {q.mode === 'match' ? (
        phase === 'feedback' ? (
          <div className={`qcard panel ${selected === 0 ? 'flash-good' : 'flash-bad'}`}>
            <div className="q-top">
              <span className="chip match">🧠 MEMORY MATCH</span>
            </div>
            <h2 className="q-prompt">{q.prompt}</h2>
            <div className={`verdict ${selected === 0 ? 'good' : 'bad'}`}>
              {selected === 0 ? `✅ CLEARED  +${gainedXp} XP` : "⏰ TIME'S UP"}
              {selected !== 0 && <span className="verdict-hp">  −1 HP</span>}
            </div>
            <p className="explain">{q.summary}</p>
            <MatchSummary pairs={q.pairs} />
            <button className="btn primary big" onClick={continueNext}>
              Continue →
            </button>
          </div>
        ) : (
          <div className="qcard panel">
            <div className="q-top">
              <span className="chip match">🧠 MEMORY MATCH</span>
            </div>
            <h2 className="q-prompt">{q.prompt}</h2>
            <MatchGame pairs={q.pairs} onResult={onMatchResult} />
          </div>
        )
      ) : (
        <QuestionView
          q={q}
          phase={phase === 'feedback' ? 'feedback' : 'question'}
          selected={selected}
          gainedXp={gainedXp}
          onAnswer={answer}
          onContinue={continueNext}
        />
      )}
      <button className="btn ghost quit" onClick={quit}>
        ✕ Quit run
      </button>
    </div>
  )
}

import { MAX_HP, QUESTION_TIME } from '../game/engine'

interface HUDProps {
  moduleTitle: string
  moduleIcon: string
  isBoss: boolean
  qNumber: number
  total: number
  hp: number
  combo: number
  xp: number
  timeLeft: number
  showTimer?: boolean
}

export function HUD({ moduleTitle, moduleIcon, isBoss, qNumber, total, hp, combo, xp, timeLeft, showTimer = true }: HUDProps) {
  const pct = Math.max(0, Math.min(100, (timeLeft / QUESTION_TIME) * 100))
  const low = timeLeft <= 5
  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-left">
          <span className="hud-module">
            {isBoss ? '👹' : moduleIcon} {isBoss ? 'BOSS' : moduleTitle}
          </span>
          <span className="hud-progress">
            Q {Math.min(qNumber, total)}/{total}
          </span>
        </div>
        <div className="hud-hearts" aria-label={`${hp} of ${MAX_HP} HP`}>
          {Array.from({ length: MAX_HP }, (_, i) => (
            <span key={i} className={i < hp ? 'heart' : 'heart dead'}>
              ❤
            </span>
          ))}
        </div>
        <div className="hud-right">
          {combo >= 2 && (
            <span className="combo" key={combo}>
              🔥 ×{combo}
            </span>
          )}
          <span className="hud-xp">⚡ {xp} XP</span>
        </div>
      </div>
      {showTimer && (
        <div className={`timer ${low ? 'low' : ''}`}>
          <div className="timer-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

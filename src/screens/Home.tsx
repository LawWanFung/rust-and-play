import type { CSSProperties } from 'react'
import type { SaveData } from '../game/store'
import { moduleStatus } from '../game/store'
import { BADGES, nextRank, rankFor } from '../game/ranks'
import { MODULES } from '../content/modules'

interface Props {
  save: SaveData
  onStart: (moduleId: string, isBoss: boolean) => void
}

export function Home({ save, onStart }: Props) {
  const rank = rankFor(save.xp)
  const next = nextRank(save.xp)
  const rankPct = next ? ((save.xp - rank.xp) / (next.xp - rank.xp)) * 100 : 100
  const acc = save.stats.answers ? Math.round((save.stats.correct / save.stats.answers) * 100) : 0
  const earned = new Set(save.badges)

  return (
    <div className="home">
      <header className="hero">
        <h1 className="title">
          RUST<span>QUEST</span>
        </h1>
        <p className="tagline">🦀 learn rust by playing — no lectures, just battles</p>
      </header>

      <div className="rank-card panel">
        <div className="rank-icon">{rank.icon}</div>
        <div className="rank-body">
          <div className="rank-name">{rank.name}</div>
          <div className="rank-xp">
            {save.xp} XP{next ? ` · ${next.xp - save.xp} to ${next.name}` : ' · max rank'}
          </div>
          <div className="rank-bar">
            <div className="rank-bar-fill" style={{ width: `${Math.max(0, Math.min(100, rankPct))}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="mini-stat">
          <b>{save.stats.answers}</b>
          <span>answers</span>
        </div>
        <div className="mini-stat">
          <b>{acc}%</b>
          <span>accuracy</span>
        </div>
        <div className="mini-stat">
          <b>×{save.stats.bestCombo}</b>
          <span>best combo</span>
        </div>
        <div className="mini-stat">
          <b>{save.stats.fixes}</b>
          <span>bugs fixed</span>
        </div>
        <div className="mini-stat">
          <b>{save.stats.matchesWon}</b>
          <span>matches won</span>
        </div>
        <div className="mini-stat">
          <b>
            {save.badges.length}/{BADGES.length}
          </b>
          <span>badges</span>
        </div>
      </div>

      <h2 className="section">Modules</h2>
      <div className="modules">
        {MODULES.map((m, i) => {
          const st = moduleStatus(save, m, i, MODULES)
          return (
            <div
              key={m.id}
              className={`module-card panel ${st.unlocked ? '' : 'locked'}`}
              style={{ '--hue': m.hue } as CSSProperties}
            >
              <div className="module-icon">{st.unlocked ? m.icon : '🔒'}</div>
              <div className="module-body">
                <h3>
                  {m.title} {st.bossCleared && <span className="cleared-mark" title="Boss defeated">✅</span>}
                </h3>
                <p>{m.subtitle}</p>
                {st.bestXp > 0 && <span className="module-best">best run: {st.bestXp} XP</span>}
              </div>
              {st.unlocked ? (
                <div className="module-actions">
                  <button className="btn" onClick={() => onStart(m.id, false)}>
                    ▶ Run
                  </button>
                  <button
                    className={`btn ${st.cleared ? 'accent' : 'disabled'}`}
                    disabled={!st.cleared}
                    title={st.cleared ? 'Fight the module boss' : 'Clear a module run first'}
                    onClick={() => st.cleared && onStart(m.id, true)}
                  >
                    👹 Boss
                  </button>
                </div>
              ) : (
                <span className="lock-hint">clear previous module</span>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="section">Badges</h2>
      <div className="badges">
        {BADGES.map((b) => (
          <div key={b.id} className={`badge ${earned.has(b.id) ? '' : 'unearned'}`} title={b.desc}>
            <span className="badge-icon">{b.icon}</span>
            <span className="badge-name">{b.name}</span>
          </div>
        ))}
      </div>

      <p className="howto">
        <b>How to play:</b> pick a module → survive 10 timed rounds → face the boss (8 rounds).
        Every miss costs 1 HP; consecutive hits build a combo that multiplies XP.
        Every answer shows an explanation — <i>that</i> is where the learning happens.
      </p>
    </div>
  )
}

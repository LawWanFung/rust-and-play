import type { ModuleDef } from './types'

export interface ModuleProgress {
  cleared: boolean
  bossCleared: boolean
  bestXp: number
}

export interface SaveData {
  xp: number
  modules: Record<string, ModuleProgress>
  badges: string[]
  stats: { answers: number; correct: number; bestCombo: number; fixes: number; matchesWon: number }
}

const KEY = 'rustquest-save-v1'

export function emptySave(): SaveData {
  return {
    xp: 0,
    modules: {},
    badges: [],
    stats: { answers: 0, correct: 0, bestCombo: 0, fixes: 0, matchesWon: 0 },
  }
}

/** Coerce to a finite number; anything else (string, NaN, object, null)
 *  becomes `fallback`. JSON can't carry NaN/Infinity (they round-trip as
 *  null), but a hand-edited localStorage entry can carry strings. */
function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function bool(v: unknown): boolean {
  return v === true
}

/**
 * Load + sanitize the save. A hand-edited/corrupted localStorage entry must
 * never break the app: every field is coerced to its declared type, unknown
 * shapes fall back to defaults, and the whole read is failure-safe.
 */
export function loadSave(): SaveData {
  const empty = emptySave()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p !== 'object' || p === null) return empty

    // modules: keep only object entries with sane fields
    const modules: SaveData['modules'] = {}
    const rawModules = p.modules
    if (typeof rawModules === 'object' && rawModules !== null) {
      for (const [id, mp] of Object.entries(rawModules)) {
        if (typeof mp !== 'object' || mp === null) continue
        const m = mp as Record<string, unknown>
        modules[id] = {
          cleared: bool(m.cleared),
          bossCleared: bool(m.bossCleared),
          bestXp: Math.max(0, num(m.bestXp)),
        }
      }
    }

    const rawStats = (typeof p.stats === 'object' && p.stats !== null ? p.stats : {}) as Record<
      string,
      unknown
    >
    return {
      xp: Math.max(0, num(p.xp)),
      modules,
      badges: Array.isArray(p.badges) ? (p.badges.filter((b): b is string => typeof b === 'string')) : [],
      stats: {
        answers: Math.max(0, num(rawStats.answers)),
        correct: Math.max(0, Math.min(num(rawStats.correct), num(rawStats.answers))),
        bestCombo: Math.max(0, num(rawStats.bestCombo)),
        fixes: Math.max(0, num(rawStats.fixes)),
        matchesWon: Math.max(0, num(rawStats.matchesWon)),
      },
    }
  } catch {
    return empty
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode, quota) — play on without persisting
  }
}

export function moduleStatus(save: SaveData, mod: ModuleDef, index: number, all: ModuleDef[]) {
  const prev = index > 0 ? all[index - 1] : null
  const p = save.modules[mod.id]
  return {
    unlocked: !prev || !!save.modules[prev.id]?.bossCleared,
    cleared: !!p?.cleared,
    bossCleared: !!p?.bossCleared,
    bestXp: p?.bestXp ?? 0,
  }
}

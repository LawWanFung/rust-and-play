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

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySave()
    const p = JSON.parse(raw) as Partial<SaveData>
    return {
      xp: p.xp ?? 0,
      modules: p.modules ?? {},
      badges: p.badges ?? [],
      // defaults first, then spread: old saves missing new fields stay valid
      stats: { answers: 0, correct: 0, bestCombo: 0, fixes: 0, matchesWon: 0, ...p.stats },
    }
  } catch {
    return emptySave()
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode) — play on without persisting
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

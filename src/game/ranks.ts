export interface Rank {
  name: string
  xp: number
  icon: string
}

export const RANKS: Rank[] = [
  { name: 'Rookie', xp: 0, icon: '🌱' },
  { name: 'Apprentice', xp: 100, icon: '🗡️' },
  { name: 'Adept', xp: 300, icon: '⚔️' },
  { name: 'Engineer', xp: 700, icon: '🛡️' },
  { name: 'Rustc Whisperer', xp: 1500, icon: '👑' },
]

export function rankFor(xp: number): Rank {
  let r = RANKS[0]
  for (const rank of RANKS) if (xp >= rank.xp) r = rank
  return r
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.xp > xp) ?? null
}

export interface Badge {
  id: string
  name: string
  icon: string
  desc: string
}

export const BADGES: Badge[] = [
  { id: 'first-blood', name: 'First Blood', icon: '🩸', desc: 'Answer your first question correctly' },
  { id: 'combo-5', name: 'On a Roll', icon: '🔥', desc: 'Reach a 5× combo' },
  { id: 'combo-10', name: 'Combo ×10', icon: '💥', desc: 'Reach a 10× combo' },
  { id: 'combo-20', name: 'Unstoppable', icon: '☄️', desc: 'Reach a 20× combo' },
  { id: 'speed-5', name: 'Speed Demon', icon: '⚡', desc: '5 fast answers in one run' },
  { id: 'perfect', name: 'Flawless', icon: '💎', desc: 'Finish a run with full HP' },
  { id: 'boss-1', name: 'Boss Slayer', icon: '🏆', desc: 'Defeat a module boss' },
  { id: 'debugger', name: 'Debugging Instinct', icon: '🐞', desc: 'Fix 10 broken programs' },
  { id: 'memory-5', name: 'Perfect Memory', icon: '🧠', desc: 'Win 5 memory matches' },
  { id: 'answers-100', name: 'Centurion', icon: '💬', desc: 'Answer 100 questions' },
  { id: 'answers-300', name: 'Voluminous', icon: '📚', desc: 'Answer 300 questions' },
  { id: 'halfway', name: 'Halfway There', icon: '🗺️', desc: 'Clear 5 modules' },
  { id: 'champion', name: 'Champion', icon: '🏅', desc: 'Defeat all 10 bosses' },
  { id: 'm1-clear', name: 'Basics Beaten', icon: '🧱', desc: 'Conquer Module 1' },
  { id: 'm2-clear', name: 'Ownership Conquered', icon: '🔥', desc: 'Conquer Module 2 — the scary one' },
  { id: 'm3-clear', name: 'Pattern Master', icon: '🧩', desc: 'Conquer Module 3' },
  { id: 'm4-clear', name: 'Vector Victor', icon: '📦', desc: 'Conquer Module 4' },
  { id: 'm5-clear', name: 'Panic-Free', icon: '⚠️', desc: 'Conquer Module 5' },
  { id: 'm6-clear', name: 'Trait Wizard', icon: '✨', desc: 'Conquer Module 6' },
  { id: 'm7-clear', name: 'Flow State', icon: '🌊', desc: 'Conquer Module 7' },
  { id: 'm8-clear', name: 'Pointer Tamer', icon: '📡', desc: 'Conquer Module 8' },
  { id: 'm9-clear', name: 'Thread Lord', icon: '🧵', desc: 'Conquer Module 9' },
  { id: 'm10-clear', name: 'Full Circle', icon: '🚀', desc: 'Conquer all 10 modules' },
]

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id)
}

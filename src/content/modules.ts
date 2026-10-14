import type { ModuleDef } from '../game/types'
import { m1Basics } from './m1-basics'
import { m2Ownership } from './m2-ownership'
import { m3Enums } from './m3-enums'
import { m4Collections } from './m4-collections'
import { m5Errors } from './m5-errors'
import { m6Traits } from './m6-traits'
import { m7Closures } from './m7-closures'
import { m8Pointers } from './m8-pointers'
import { m9Concurrency } from './m9-concurrency'
import { m10Async } from './m10-async'

/** Module order = unlock order. */
export const MODULES: ModuleDef[] = [
  m1Basics,
  m2Ownership,
  m3Enums,
  m4Collections,
  m5Errors,
  m6Traits,
  m7Closures,
  m8Pointers,
  m9Concurrency,
  m10Async,
]

/** Unknown id → null (a caller-renderable edge case, never a throw —
 *  QUALITY.md #2). App only ever passes ids from MODULES, but a stale
 *  deep-link or a module removed from the array must not crash the tree. */
export function getModule(id: string): ModuleDef | null {
  return MODULES.find((m) => m.id === id) ?? null
}

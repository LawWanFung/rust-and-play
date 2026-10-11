// Validates all module content. Usage:
//   npm run check
// (builds src/content/modules.ts to /tmp with esbuild, then runs this)
import { readFileSync } from 'node:fs'

const bundle = readFileSync(process.argv[2] ?? '/tmp/rq-modules.mjs', 'utf8')
const mod = await import('data:text/javascript;base64,' + Buffer.from(bundle).toString('base64'))
const { MODULES } = mod

let errors = 0
const fail = (msg) => {
  errors++
  console.error(`  ✗ ${msg}`)
}

let total = 0
for (const m of MODULES) {
  const counts = { quiz: 0, predict: 0, fix: 0, match: 0 }
  console.log(`${m.icon} ${m.id} — ${m.title} (${m.questions.length}q)`)
  if (!m.title || !m.subtitle || m.questions.length < 15) fail(`module too small (<15q)`)
  m.questions.forEach((q, i) => {
    total++
    const where = `[${m.id} q${i + 1} ${q.mode}]`
    if (!['quiz', 'predict', 'fix', 'match'].includes(q.mode)) {
      fail(`${where} bad mode: ${q.mode}`)
      return
    }
    counts[q.mode]++
    if (q.mode === 'match') {
      if (!q.prompt) fail(`${where} missing prompt`)
      if (!q.summary || q.summary.length < 20) fail(`${where} summary too short`)
      if (!Array.isArray(q.pairs) || q.pairs.length !== 8) fail(`${where} need exactly 8 pairs, got ${q.pairs?.length}`)
      else {
        const seen = new Set()
        for (const p of q.pairs) {
          if (!p.a || !p.b) fail(`${where} empty pair side`)
          if (seen.has(p.a)) fail(`${where} duplicate card: ${p.a}`)
          seen.add(p.a)
          if (seen.has(p.b)) fail(`${where} duplicate card: ${p.b}`)
          seen.add(p.b)
        }
      }
      return
    }
    if (!q.prompt) fail(`${where} missing prompt`)
    if (q.mode === 'predict' && !q.code) fail(`${where} predict missing code`)
    if (q.mode === 'fix' && !q.code) fail(`${where} fix missing code`)
    if (q.mode === 'fix' && !q.fixedCode) fail(`${where} fix missing fixedCode`)
    if (!Array.isArray(q.options) || q.options.length !== 4) fail(`${where} need 4 options, got ${q.options?.length}`)
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= 4) fail(`${where} bad answer index: ${q.answer}`)
    if (!q.explain || q.explain.length < 20) fail(`${where} explain too short`)
    const opts = new Set(q.options ?? [])
    if (opts.size !== (q.options?.length ?? 0)) fail(`${where} duplicate options`)
  })
  const line = Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(' ')
  console.log(`    ${line}`)
  if (counts.match < 1) fail(`module has no match set`)
}

console.log(`\n${MODULES.length} modules, ${total} questions, ${errors} problem${errors === 1 ? '' : 's'}`)
process.exit(errors ? 1 : 0)

// Prints the site-wide status mapping (src/engine/status.ts) for every tier each module can return.
//   node scripts/status-map.mjs
// Needs Node 23.6+ (it imports the TypeScript file directly; status.ts is types-only on its import side).
// Exits 1 if a row does not round-trip through statusFrom() or a word is missing.
import { STATUS_WORDS, TIER_TABLE, levelOf, statusFrom, worstStatus } from '../src/engine/status.ts'

let bad = 0
for (const [module, rows] of Object.entries(TIER_TABLE)) {
  console.log(`\n${module}`)
  for (const r of rows) {
    const s = statusFrom(module, { tier: r.tier, tierName: r.tierName, severity: 'nominal', whoActs: '' })
    const ok = s.level === r.level && s.known && s.word === STATUS_WORDS[r.level]
    if (!ok) bad++
    console.log(`  tier ${r.tier}  ${JSON.stringify(r.tierName).padEnd(62)} -> ${r.level} ${STATUS_WORDS[r.level].padEnd(14)}${r.note ? `  (${r.note})` : ''}${ok ? '' : '  MISMATCH'}`)
  }
}

// The fallback rule, for a tier name that is not in the table.
const drift = [
  ['veinsqueeze', 'Yellow, crew medical officer', 2, 'crew medical officer', 1],
  ['braindrift', 'Tier 4e', 4, 'ground team', 2],
  ['tracktrace', 'Something new: evacuate', undefined, 'ground team', 3],
  ['garnmeter', 'Blue', undefined, 'astronaut (self-care)', 0],
]
console.log('\nfallback (names not in the table)')
for (const [m, name, tier, who, want] of drift) {
  const got = levelOf(m, name, tier, who)
  if (got.level !== want || got.known) bad++
  console.log(`  ${m.padEnd(12)} ${JSON.stringify(name).padEnd(34)} -> ${got.level} ${STATUS_WORDS[got.level]}${got.level === want ? '' : '  MISMATCH'}`)
}

const demo = (levels) => levels.map((level, i) => ({ module: Object.keys(TIER_TABLE)[i], level }))
console.log('\nhome line')
for (const levels of [[0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 1, 0, 2, 2, 0]]) console.log(`  ${levels.join(' ')} -> ${worstStatus(demo(levels)).sentence}`)

console.log(bad ? `\n${bad} mismatch(es)` : '\nall rows map as documented')
process.exit(bad ? 1 : 0)

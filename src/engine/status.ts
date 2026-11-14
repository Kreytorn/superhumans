// One site-wide status from any module's act() result.
//
// The big status word names WHO ACTS FIRST. Four levels (work/Web/research/06_clarity_jury.md section 3.2):
//   0 "You"             the crew member acts alone (routine, self-care, or an alert they handle themselves)
//   1 "Crew medic"      the crew medical officer acts
//   2 "Flight surgeon"  the flight surgeon / ground medical team acts
//   3 "Abort"           emergency: abort, evacuate, ground-directed emergency care
//
// The level is the row of the "who acts" table in work/Web/models/README.md section 6, NOT the module's
// tier number (tier numbers are local to each module) and NOT the colour word in its tier name.
// Always show the module's verbatim tier name (`tierName`) next to the word; this file only derives the word.
// `severity` is passed through unchanged from the engine: use it (not the level) to tell a routine "You"
// from an alert the crew member handles alone (BubbleGrade's amber SPACEWALK ALERT is level 0, severity caution).
//
// This file is pure (types only from ./types), so node can run it: `node scripts/status-map.mjs` prints the tables.
import type { ActDecision, ModuleId, Severity } from './types.ts'

export type StatusLevel = 0 | 1 | 2 | 3

export const STATUS_WORDS = ['You', 'Crew medic', 'Flight surgeon', 'Abort'] as const
export type StatusWord = (typeof STATUS_WORDS)[number]

export interface SiteStatus {
  module: ModuleId
  /** 0 You, 1 Crew medic, 2 Flight surgeon, 3 Abort. */
  level: StatusLevel
  word: StatusWord
  /** The module's own tier name, verbatim. Show it with the word. */
  tierName: string
  /** The engine's severity, unchanged. */
  severity: Severity
  /** The engine's own "who acts" text, unchanged. */
  whoActs: string
  /** True when nothing needs doing beyond the routine (severity 'nominal'). */
  routine: boolean
  /** False when the tier name was not in the table below and the level came from the fallback rule. */
  known: boolean
}

/** One possible tier of a module: its local tier number, verbatim name, and the site level it maps to. */
export interface TierRow {
  tier: number
  tierName: string
  level: StatusLevel
  /** Why this level, or when the tier can fire. */
  note?: string
}

// ---------------------------------------------------------------------------------------------
// The mapping, per module. Tier names are verbatim copies from each engine's act.ts.
// ---------------------------------------------------------------------------------------------
export const TIER_TABLE: Record<ModuleId, TierRow[]> = {
  // TrackTrace (act.ts): GREEN = self, YELLOW = crew medical officer, ORANGE = flight surgeon with the ground
  // radiation team. RED never fires; it only comes back greyed as `redRow`. "No tier" = no rule fires.
  tracktrace: [
    { tier: 0, tierName: 'GREEN: self-care', level: 0 },
    { tier: 0, tierName: 'No tier: no trigger holds', level: 0, note: 'nobody acts; severity watch' },
    { tier: 1, tierName: 'YELLOW: crew medical officer', level: 1 },
    { tier: 2, tierName: 'ORANGE: flight surgeon + ground radiation team', level: 2 },
    { tier: 3, tierName: 'RED: abort / evacuate', level: 3, note: 'never fires on our data; returned greyed as redRow' },
  ],
  // BubbleGrade (act.ts): the amber SPACEWALK ALERT is handled by the crew member ("self, reporting to the IV
  // crewmember / Mission Control"), so it is "You" with severity caution. Red = crew medical officer + Mission
  // Control. Tier 3 = flight surgeon. (06 section 3.2 loosely lists amber under "Crew medic" and "end the EVA"
  // under "Flight surgeon"; the engine's own who-acts text and the README table win.)
  bubblegrade: [
    { tier: 0, tierName: '0 Green: continue', level: 0 },
    { tier: 1, tierName: '1 Amber: SPACEWALK ALERT', level: 0, note: 'the crew member acts and reports; severity caution' },
    { tier: 2, tierName: '2 Red: end the EVA (Crew Medical Officer + Mission Control)', level: 1 },
    { tier: 3, tierName: '3 Flight surgeon / evacuation', level: 2, note: 'only from ticked symptoms' },
  ],
  // SpikeCount (act.ts TIER_NAMES): tiers 3 and 4 never fire from the model; they come back as `nextSteps`.
  spikecount: [
    { tier: 0, tierName: 'Green', level: 0 },
    { tier: 1, tierName: 'Self-care', level: 0 },
    { tier: 2, tierName: 'Crew Medical Officer', level: 1 },
    { tier: 3, tierName: 'Flight surgeon', level: 2, note: 'never fires; listed in nextSteps' },
    { tier: 4, tierName: 'Ground / evacuation', level: 3, note: 'never fires; listed in nextSteps' },
  ],
  // VeinSqueeze (act.ts TIERS): both GREEN tiers are the crew member; RED is the emergency row.
  veinsqueeze: [
    { tier: 0, tierName: 'GREEN, self-care', level: 0 },
    { tier: 1, tierName: 'GREEN, increased monitoring', level: 0 },
    { tier: 2, tierName: 'YELLOW, crew medical officer', level: 1 },
    { tier: 3, tierName: 'ORANGE, flight surgeon', level: 2 },
    { tier: 4, tierName: 'RED, emergency / ground-directed', level: 3 },
  ],
  // BrainDrift (act.ts): tier 0 means no row fired (level 0 whatever its who-acts text says). Tiers 4a-4d are
  // planned follow-ups by the ground medical team (severity watch or caution), not emergencies, so they map to
  // "Flight surgeon" and never to "Abort". The engine picks the primary row by severity, not by tier number.
  braindrift: [
    { tier: 0, tierName: 'Standard schedule', level: 0, note: 'no row fired' },
    { tier: 0, tierName: 'No flag', level: 0, note: 'no row fired' },
    { tier: 1, tierName: 'Tier 1, astronaut self-care', level: 0 },
    { tier: 2, tierName: 'Tier 2, crew medical officer', level: 1 },
    { tier: 3, tierName: 'Tier 3, flight surgeon', level: 2 },
    { tier: 4, tierName: 'Tier 4a, post-landing', level: 2, note: 'ground follow-up, not an emergency' },
    { tier: 4, tierName: 'Tier 4b', level: 2, note: 'ground follow-up, not an emergency' },
    { tier: 4, tierName: 'Tier 4c, re-flight clock', level: 2, note: 'ground follow-up, not an emergency' },
    { tier: 4, tierName: 'Tier 4d', level: 2, note: 'ground follow-up, not an emergency' },
  ],
  // Garn Meter (act.ts): Yellow = the astronaut (self-care). Red = crew medical officer and flight surgeon;
  // the crew medical officer acts first, so it is "Crew medic".
  garnmeter: [
    { tier: 0, tierName: 'Green', level: 0, note: 'no one acts (keep logging)' },
    { tier: 1, tierName: 'Yellow', level: 0 },
    { tier: 2, tierName: 'Red', level: 1 },
  ],
}

/** Fallback when a tier name is not in the table: read the engine's own words. */
function fallbackLevel(tierName: string, whoActs: string): StatusLevel {
  const t = tierName.toLowerCase()
  const w = whoActs.toLowerCase()
  if (/abort|evacuat|emergency/.test(t)) return 3
  if (/^\s*(flight surgeon|ground)/.test(w)) return 2
  if (/^\s*(crew medical officer|cmo)/.test(w)) return 1
  return 0
}

/** The site level for a tier, by its verbatim name (also for rows that are not full decisions, e.g. TrackTrace's redRow or SpikeCount's nextSteps). */
export function levelOf(module: ModuleId, tierName: string, tier?: number, whoActs = ''): { level: StatusLevel; known: boolean } {
  const rows = TIER_TABLE[module]
  const byName = rows.find((r) => r.tierName === tierName)
  if (byName) return { level: byName.level, known: true }
  // Same tier number and every row of that number agrees: safe even if the wording drifted.
  const same = tier === undefined ? [] : rows.filter((r) => r.tier === tier)
  if (same.length && same.every((r) => r.level === same[0].level)) return { level: same[0].level, known: false }
  return { level: fallbackLevel(tierName, whoActs), known: false }
}

/** The site-wide status for one module's act() result. */
export function statusFrom(module: ModuleId, act: Pick<ActDecision, 'tier' | 'tierName' | 'severity' | 'whoActs'>): SiteStatus {
  const { level, known } = levelOf(module, act.tierName, act.tier, act.whoActs)
  return {
    module,
    level,
    word: STATUS_WORDS[level],
    tierName: act.tierName,
    severity: act.severity,
    whoActs: act.whoActs,
    routine: act.severity === 'nominal',
    known,
  }
}

/**
 * The worst level across modules, for a home screen ("master caution"): the level, its word, and how many
 * modules are at that level. Example sentences: "All six: You", "1 needs the crew medic".
 */
export function worstStatus(list: SiteStatus[]): { level: StatusLevel; word: StatusWord; count: number; modules: ModuleId[]; sentence: string } {
  const level = list.reduce<StatusLevel>((m, s) => (s.level > m ? s.level : m), 0)
  const at = list.filter((s) => s.level === level)
  const n = at.length
  const all = ['No checks', 'One check', 'Both', 'All three', 'All four', 'All five', 'All six'][list.length] ?? `All ${list.length}`
  const sentence =
    level === 0
      ? `${all}: You`
      : level === 1
        ? `${n} ${n === 1 ? 'needs' : 'need'} the crew medic`
        : level === 2
          ? `${n} ${n === 1 ? 'needs' : 'need'} the flight surgeon`
          : `${n}: abort`
  return { level, word: STATUS_WORDS[level], count: n, modules: at.map((s) => s.module), sentence }
}

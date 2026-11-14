// Fixed strings and sources for VeinSqueeze. Numbers are quoted from DOMAIN.md ("Measured model results, r2"),
// work/VeinSqueeze/LOG.md (final summary), from_vm/decision.json and work/VeinSqueeze/verify_chunk_7.md.
import type { Source } from '../types'

export const SRC = {
  sp2026: (p: string): Source => ({
    label: `NASA/SP-20260005258/REV1, ${p}`,
    ref: 'https://ntrs.nasa.gov/api/citations/20260005258/downloads/20260005258_REV1.pdf',
  }),
  sp2025: (p: string): Source => ({
    label: `NASA/SP-20250001074/REV1, ${p}`,
    ref: 'https://ntrs.nasa.gov/api/citations/20250001074/downloads/Venous%20Thromboembolism%20VTE%20Report%20REV1%20April%202025.pdf',
  }),
  jama2019: {
    label: 'Marshall-Goebel et al., JAMA Netw Open 2019;2(11):e1915011',
    ref: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6902784/',
  } as Source,
  ourRule: (what: string): Source => ({ label: `our product rule: ${what}`, ref: 'plans/04_VeinSqueeze.md §9; work/VeinSqueeze/verify_chunk_7.md' }),
  thrombus: {
    label: 'ThrombUS+ Ultrasound Dataset #1 (CC BY 4.0)',
    ref: 'https://zenodo.org/records/17659415',
  } as Source,
  sam2: { label: 'SAM 2.1 (Meta, Apache-2.0), zero-shot', ref: 'https://huggingface.co/facebook/sam2.1-hiera-large' } as Source,
}

/** Measured numbers (out-of-fold, 594 patients, 5 patient folds). Quote only these. */
export const MEASURED = {
  withinPhilipsAuc: 0.72,
  withinPhilipsCi: [0.65, 0.782] as const,
  pooledAuc: 0.785,
  pairAuc: 0.606,
  pairCi: [0.516, 0.689] as const,
  fold0Auc: 0.816,
  siteAccuracy: 0.801,
  floorF1WithinPhilips: 0.55,
  baselineBWithinPhilips: 0.682,
  tau: 0.005486580933,
  tauFold0Sensitivity: 0.909,
  tauFold0Specificity: 0.232,
  decision: 'level2:main',
} as const

/** Must appear wherever a VeinSqueeze AI result is shown (verbatim). */
export const HONESTY_RESULT = [
  'AI second opinion, screening only: not a diagnosis.',
  'Within one scanner brand (Philips) the model scores AUC 0.720 (0.650-0.782); on same-patient pairs 0.606; pooled 0.785 (out-of-fold, 594 patients).',
  'Alarm threshold 0.55% is our product rule: on held-out patients it catches 91% of clot clips at specificity 0.23.',
  'Trained on leg-vein ultrasound (ThrombUS+, 5 European hospitals); not tested on neck veins or on astronauts.',
] as const

export const HONESTY_STRIP = 'where the model looked, not a per-frame diagnosis'
export const HONESTY_SQUEEZE = 'Explanation layer: SAM 2, zero-shot, not a validated measurement'
export const HONESTY_BANDS = 'Squeeze bands are our product rule: 10% or less closed fully, 10-50% partly closed, above 50% stayed open.'
export const HONESTY_HELD_OUT = 'Every clip shown is from patients the model never trained on, and the alarm threshold was set on other patients.'
export const HONESTY_HONEST_ERROR = 'Clip F is one the model gets wrong: a false alarm on a clean vein.'
/** Clips A + B: vs_pick.py moved the best-separated non-Philips pair to rank 1 of 39 fold-0 same-patient pairs
 *  (from_vm/showcase.json: hero_pair_pool 39, pair_rank 1; work/ModelExamples/scripts/veinsqueeze_example.py). */
export const HONESTY_HERO_PAIR =
  'Clips A and B are a best case, not a typical result: the most clearly separated non-Philips same-patient pair of 39 held-out pairs.'
export const HONESTY_USER_INPUT =
  'Your own clip: the model was trained on leg-vein compression ultrasound only; on anything else its number has no meaning.'
export const HONESTY_NECK_GILLMAN =
  'A real neck vein squeezed flat by the probe (published ICU clip, no clot), outlined by the same SAM 2 step, not a model verdict.'
export const HONESTY_NECK_SEGTHY = [
  'Healthy volunteer with expert manual outlines; not our model and not a patient.',
  'The jugular vein is the vein where the 2019 ISS clot was found; this panel shows its anatomy only.',
  'Never compare these areas with the ISS 9.8 / 70.3 mm2 numbers (different people, posture and method).',
] as const

/** Must accompany every ACT decision (verbatim). */
export const HONESTY_ACT = [
  'AI trigger: screening only (AI second opinion).',
  'Flow grade, age band, blood type, D-dimer and symptoms are entered by crew, not measured by AI.',
  'Doses are per NASA protocol, never our prescription.',
  'The squeeze curve is supporting evidence only; it never changes the tier.',
] as const

/** Never say these anywhere (plan §11). */
export const NEVER_CLAIM = [
  'That it detects jugular or neck clots, or was tested on astronauts or on the 2019 scan.',
  'That it diagnoses anything or replaces a radiologist.',
  'That the AI grades Doppler flow (the flow grade is crew-entered).',
  'That the squeeze curve or the 10% / 50% bands are validated or clinical.',
  'That the per-frame strip shows where the clot is in time (it is model attention).',
  'A precise per-hospital number for FR1 or GR2 (5 and 6 clot patients); always show counts.',
  'Any comparison between the SegThy jugular area and the ISS 9.8 / 70.3 mm2 numbers.',
  'Any patient detail (age, sex, size, ID).',
  'That the Crew-11 2026 evacuation was a clot (its cause is undisclosed).',
] as const

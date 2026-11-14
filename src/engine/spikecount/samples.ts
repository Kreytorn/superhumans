// The 31 shipped fields: all fold 0, never seen by the shipped (fold-0) models in training.
// Expert numbers from expert/<f>.json; model numbers from precomputed/<f>.json (Python run of the same ONNX files).
// Field numbers are RedTell's own field indices; they carry no personal data.

export interface FieldRow {
  field: number
  showcase: boolean
  /** showcase role (plan 03 section 8), null for the 22 "pick any field" fields */
  role: string | null
  /** mission timeline step this field plays (illustrative), if any */
  timeline: string | null
  expertN: number
  expertSpikyPct: number
  expertAdvancedPct: number
  modelN: number
  modelSpikyPct: number
}

// prettier-ignore
export const FIELDS: FieldRow[] = [
  { field: 32, showcase: false, role: null, timeline: null, expertN: 33, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 45, modelSpikyPct: 6.7 },
  { field: 35, showcase: false, role: null, timeline: null, expertN: 41, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 47, modelSpikyPct: 0.0 },
  { field: 41, showcase: false, role: null, timeline: null, expertN: 13, expertSpikyPct: 15.4, expertAdvancedPct: 0.0, modelN: 13, modelSpikyPct: 7.7 },
  { field: 60, showcase: false, role: null, timeline: null, expertN: 16, expertSpikyPct: 87.5, expertAdvancedPct: 56.2, modelN: 19, modelSpikyPct: 84.2 },
  { field: 70, showcase: true, role: "mid", timeline: null, expertN: 54, expertSpikyPct: 29.6, expertAdvancedPct: 3.7, modelN: 61, modelSpikyPct: 34.4 },
  { field: 74, showcase: false, role: null, timeline: null, expertN: 51, expertSpikyPct: 3.9, expertAdvancedPct: 0.0, modelN: 52, modelSpikyPct: 3.8 },
  { field: 78, showcase: false, role: null, timeline: null, expertN: 18, expertSpikyPct: 22.2, expertAdvancedPct: 11.1, modelN: 18, modelSpikyPct: 38.9 },
  { field: 80, showcase: false, role: null, timeline: null, expertN: 47, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 49, modelSpikyPct: 0.0 },
  { field: 81, showcase: true, role: "8 E2 cells", timeline: "Day 60", expertN: 35, expertSpikyPct: 40.0, expertAdvancedPct: 22.9, modelN: 38, modelSpikyPct: 44.7 },
  { field: 82, showcase: false, role: null, timeline: null, expertN: 38, expertSpikyPct: 2.6, expertAdvancedPct: 0.0, modelN: 39, modelSpikyPct: 0.0 },
  { field: 83, showcase: false, role: null, timeline: null, expertN: 45, expertSpikyPct: 24.4, expertAdvancedPct: 4.4, modelN: 48, modelSpikyPct: 12.5 },
  { field: 84, showcase: false, role: null, timeline: null, expertN: 24, expertSpikyPct: 58.3, expertAdvancedPct: 20.8, modelN: 25, modelSpikyPct: 44.0 },
  { field: 86, showcase: false, role: null, timeline: null, expertN: 18, expertSpikyPct: 5.6, expertAdvancedPct: 0.0, modelN: 18, modelSpikyPct: 5.6 },
  { field: 87, showcase: true, role: "healthy", timeline: null, expertN: 62, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 68, modelSpikyPct: 2.9 },
  { field: 92, showcase: false, role: null, timeline: null, expertN: 38, expertSpikyPct: 2.6, expertAdvancedPct: 2.6, modelN: 43, modelSpikyPct: 7.0 },
  { field: 96, showcase: true, role: "16 E4 cells", timeline: "Day 90", expertN: 52, expertSpikyPct: 53.8, expertAdvancedPct: 34.6, modelN: 53, modelSpikyPct: 58.5 },
  { field: 101, showcase: false, role: null, timeline: null, expertN: 29, expertSpikyPct: 41.4, expertAdvancedPct: 24.1, modelN: 33, modelSpikyPct: 39.4 },
  { field: 107, showcase: true, role: "early", timeline: null, expertN: 41, expertSpikyPct: 14.6, expertAdvancedPct: 2.4, modelN: 41, modelSpikyPct: 14.6 },
  { field: 109, showcase: false, role: null, timeline: null, expertN: 24, expertSpikyPct: 4.2, expertAdvancedPct: 0.0, modelN: 26, modelSpikyPct: 0.0 },
  { field: 121, showcase: true, role: "E1 only", timeline: "Day 30", expertN: 43, expertSpikyPct: 16.3, expertAdvancedPct: 0.0, modelN: 54, modelSpikyPct: 14.8 },
  { field: 130, showcase: false, role: null, timeline: null, expertN: 43, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 45, modelSpikyPct: 0.0 },
  { field: 134, showcase: false, role: null, timeline: null, expertN: 46, expertSpikyPct: 2.2, expertAdvancedPct: 2.2, modelN: 51, modelSpikyPct: 2.0 },
  { field: 136, showcase: false, role: null, timeline: null, expertN: 14, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 16, modelSpikyPct: 0.0 },
  { field: 141, showcase: true, role: "high", timeline: null, expertN: 45, expertSpikyPct: 64.4, expertAdvancedPct: 40.0, modelN: 47, modelSpikyPct: 70.2 },
  { field: 153, showcase: false, role: null, timeline: null, expertN: 40, expertSpikyPct: 2.5, expertAdvancedPct: 0.0, modelN: 47, modelSpikyPct: 0.0 },
  { field: 158, showcase: false, role: null, timeline: null, expertN: 49, expertSpikyPct: 16.3, expertAdvancedPct: 2.0, modelN: 50, modelSpikyPct: 14.0 },
  { field: 168, showcase: true, role: "8 E3 cells", timeline: null, expertN: 21, expertSpikyPct: 66.7, expertAdvancedPct: 61.9, modelN: 20, modelSpikyPct: 70.0 },
  { field: 173, showcase: false, role: null, timeline: null, expertN: 33, expertSpikyPct: 30.3, expertAdvancedPct: 6.1, modelN: 41, modelSpikyPct: 31.7 },
  { field: 182, showcase: false, role: null, timeline: null, expertN: 18, expertSpikyPct: 5.6, expertAdvancedPct: 0.0, modelN: 18, modelSpikyPct: 11.1 },
  { field: 184, showcase: true, role: "healthy", timeline: "Preflight", expertN: 67, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 77, modelSpikyPct: 5.2 },
  { field: 185, showcase: false, role: null, timeline: null, expertN: 40, expertSpikyPct: 0.0, expertAdvancedPct: 0.0, modelN: 42, modelSpikyPct: 0.0 },
]

/** Mission timeline (plan 03 section 8, fixed before training). Illustrative: different donors, not one astronaut. */
export const TIMELINE = [
  { label: 'Preflight', day: null as number | null, field: 184 },
  { label: 'Day 30', day: 30, field: 121 },
  { label: 'Day 60', day: 60, field: 81 },
  { label: 'Day 90', day: 90, field: 96 },
]

/** Showcase order of plan 03 section 8 (healthy -> high). */
export const SHOWCASE_ORDER = [184, 87, 121, 107, 70, 81, 96, 141, 168]

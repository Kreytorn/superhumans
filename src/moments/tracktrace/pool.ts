// The nuclei the stage cycles through when no sampleId pins it, and the shuffled deck that deals them.
// Every id is a real held-out gallery nucleus (engine: listSamples / replay); the comments quote the stored
// engine outputs in gallery.json (circles, line rule) and NASA's label for the well. Chosen by look and by label.
export interface PoolNucleus {
  id: string
  /** True when the nucleus belongs to the one sample whose images ship (P242_G4), so the run can pull back to all 583. */
  inSample: boolean
}

export const POOL: PoolNucleus[] = [
  // ---- the shipped sample P242_G4 (iron ions, 4 h): every one of these pulls back to the whole-sample grid
  { id: 'nucleus-238', inSample: true }, // 8 circles, line drawn (6 on it): the hero
  { id: 'nucleus-003', inSample: true }, // 7 circles, line drawn (6 on it)
  { id: 'nucleus-007', inSample: true }, // 5 circles, line drawn (5 on it)
  { id: 'nucleus-011', inSample: true }, // 4 circles, line drawn (4 on it)
  { id: 'nucleus-004', inSample: true }, // 3 circles, line drawn (3 on it)
  { id: 'nucleus-010', inSample: true }, // 4 circles, line drawn (3 on it)
  { id: 'nucleus-009', inSample: true }, // 7 circles, scattered: no line (score under the rule)
  { id: 'nucleus-000', inSample: true }, // 3 circles, no line
  { id: 'nucleus-013', inSample: true }, // 1 circle
  { id: 'nucleus-012', inSample: true }, // 1 circle
  // ---- other held-out samples (their images do not ship whole): these runs end on the nucleus
  { id: 'nucleus-239', inSample: false }, // iron ions, lower lab dose: 5 circles in an almost perfect line
  { id: 'nucleus-241', inSample: false }, // X-rays: 8 scattered circles, no line
  { id: 'nucleus-146', inSample: false }, // X-rays: 17 scattered circles, no line
  { id: 'nucleus-038', inSample: false }, // not irradiated (sham): no circles
]

export const POOL_IDS = POOL.map((p) => p.id)
const IN_SAMPLE = new Set(POOL.filter((p) => p.inSample).map((p) => p.id))

interface Deck {
  sig: string
  order: string[]
  /** Index of the last nucleus shown; -1 = none yet. */
  pos: number
}

// The deck lives in memory for one page load only (no storage): every load opens on the pool's first nucleus
// (nucleus-238 for the default pool, the clearest straight line, for the pitch and a judge's first look), then
// deals the shuffled rest; leaving the page and coming back within the same load continues the same deck.
let mem: Deck | null = null

function read(sig: string): Deck | null {
  return mem && mem.sig === sig ? mem : null
}

function write(d: Deck) {
  mem = d
}

function shuffle<V>(a: V[]): V[] {
  const out = a.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * One pass through the pool in a fresh random order. The very first deck opens with the pool's first nucleus
 * (the hero); a later deck never opens with the nucleus shown last. Nuclei that cannot pull back to the grid
 * are dealt into separate gaps between the ones that can, so two of them never follow each other.
 */
function deal(ids: string[], last: string | null): string[] {
  const a = shuffle(ids.filter((id) => IN_SAMPLE.has(id) || !POOL_IDS.includes(id)))
  const b = shuffle(ids.filter((id) => !a.includes(id)))
  if (last === null) {
    const k = a.indexOf(ids[0])
    if (k > 0) [a[0], a[k]] = [a[k], a[0]]
  } else if (a.length > 1 && a[0] === last) [a[0], a[1]] = [a[1], a[0]]
  if (a.length < 2) return [...a, ...b]
  const gaps = shuffle(Array.from({ length: a.length - 1 }, (_, i) => i + 1)).slice(0, b.length)
  const at = new Map(gaps.map((g, i) => [g, b[i]]))
  const order: string[] = []
  a.forEach((id, i) => {
    const extra = at.get(i)
    if (extra) order.push(extra)
    order.push(id)
  })
  order.push(...b.slice(gaps.length))
  return order
}

/** The nucleus the next run or visit shows. Reading it does not use it up: call commit() once it is on stage. */
export function peekNext(ids: string[]): string {
  const sig = ids.join(',')
  let d = read(sig)
  if (!d) {
    // the first deck of a page load always opens with the pool's first nucleus, whatever its kind
    const order = deal(ids, null)
    d = { sig, order: order[0] === ids[0] ? order : [ids[0], ...order.filter((id) => id !== ids[0])], pos: -1 }
    write(d)
  } else if (d.pos + 1 >= d.order.length) {
    d = { sig, order: deal(ids, d.order[d.order.length - 1]), pos: -1 }
    write(d)
  }
  return d.order[d.pos + 1]
}

/** Marks the nucleus as shown. Safe to call twice (React runs effects twice in development). */
export function commit(id: string, ids: string[]) {
  const d = read(ids.join(','))
  if (d && d.order[d.pos + 1] === id) write({ ...d, pos: d.pos + 1 })
}

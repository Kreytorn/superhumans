// BrainDrift stage: formatting and placement for the compact readout (used where the moment's own labels have no
// room, e.g. the phone sheet). The numbers are the engine's run-time result; the formats are the moment's own.

export const fmtPct = (v: number | null) => (v === null ? 'n/a' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} %`)
export const fmtPut = (v: number) => `+${Math.round(v * 100 + 1e-6) / 100} %`
export const fmtMm = (v: number | null) => (v === null ? 'n/a' : `${Math.abs(v).toFixed(1)} mm`)
export const fmtPutMm = (v: number) => `${Math.round(v * 100 + 1e-6) / 100} mm`

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Where the moment says its brain stands (its --bx/--by/--bw/--bh), in px of its own box; null before its first layout. */
export function brainRect(el: HTMLElement): Rect | null {
  const read = (n: string) => parseFloat(el.style.getPropertyValue(n))
  const bx = read('--bx')
  const by = read('--by')
  const bw = read('--bw')
  const bh = read('--bh')
  if (![bx, by, bw, bh].every(Number.isFinite) || bw <= 0 || bh <= 0) return null
  return { x0: bx - bw / 2, y0: by - bh / 2, x1: bx + bw / 2, y1: by + bh / 2 }
}

/** Whether the stage has room for the moment's own labels (they need a wide box, or a tall upright one). */
export function roomy(w: number, h: number) {
  return w / h > 1.25 ? w >= 660 && h >= 430 : h >= 520 && w >= 330
}

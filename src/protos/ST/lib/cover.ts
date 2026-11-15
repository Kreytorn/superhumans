// Cover maths: where a frame of mw x mh pixels lands on a screen of vw x vh. Every film layer (loop, clips,
// stills, the scene overlay, the hotspots) is sized with this one box, so a point given in frame coordinates
// is at the same screen pixel in all of them.

export interface Box {
  /** Top-left corner of the frame on the screen, in px (negative when the frame is cropped). */
  x: number
  y: number
  /** Size of the whole frame on the screen, in px. */
  w: number
  h: number
  /** Screen size the box was computed for. */
  vw: number
  vh: number
  /** true when the frame does not fill the screen height (a landscape frame on a portrait screen). */
  letterboxed: boolean
}

/** A part of the frame, 0..1 from the top-left. */
export interface Reach {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Placement {
  /** The part of the frame that must stay on screen (the hotspots' reach over the whole loop), kept at least
   *  `margin` px clear of the screen edges so a hotspot's press area is never cut. */
  keep: Reach
  margin: number
  /** The frame point (0..1) to bring to the screen point `to` (0..1), as far as the frame can move. */
  at: [number, number]
  to: [number, number]
  /** Letterboxed only. A number: the frame fills the screen from the top down to at least this fraction of
   *  the screen height (where a sheet starts), and may run off the top. Missing: the whole frame stays on. */
  floor?: number
}

const span = (want: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, want)))

/**
 * Normally the frame covers the screen (object-fit: cover). If covering would crop into `keep` (a landscape
 * frame on a portrait screen), it is scaled down until `keep` fits, and is then a band across the screen. Either
 * way it is then moved so `at` lands on `to`, but never so far that it leaves a gap at a side it covers.
 */
export function frameBox(vw: number, vh: number, mw: number, mh: number, p: Placement): Box {
  const cover = Math.max(vw / mw, vh / mh)
  const reachW = Math.max(1, (p.keep.x1 - p.keep.x0) * mw)
  const reachH = Math.max(1, (p.keep.y1 - p.keep.y0) * mh)
  const scale = Math.max(0.01, Math.min(cover, (vw - 2 * p.margin) / reachW, (vh - 2 * p.margin) / reachH))
  const w = mw * scale
  const h = mh * scale
  const letterboxed = h < vh - 0.5
  const wantX = p.to[0] * vw - p.at[0] * w
  const wantY = p.to[1] * vh - p.at[1] * h
  const x = w > vw ? span(wantX, vw - w, 0) : (vw - w) / 2
  const y = !letterboxed ? span(wantY, vh - h, 0) : p.floor !== undefined ? span(wantY, p.floor * vh - h, 0) : span(wantY, 0, vh - h)
  return { x, y, w, h, vw, vh, letterboxed }
}

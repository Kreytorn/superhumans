// Station: the home loop slows down under the pointer instead of stopping dead, so a moving hotspot is easy to
// press, and spins back up after. This eases video.playbackRate once per animation frame (no React render).

/** The loop's speed while a hotspot is aimed at (pointer over it, or keyboard focus on it). Slow enough that a
 *  point stays under a resting pointer for a few seconds, long enough to read its sentence: at a quarter speed a
 *  point on the ring slid out from under the pointer in under a second, and its words went with it. */
export const SLOW_RATE = 0.12
/** How long the change of speed takes. */
export const RATE_MS = 400
/** Slowing down for an aimed point is quicker, so the point has not drifted away before it slows. */
export const SLOW_IN_MS = 180

const runs = new WeakMap<HTMLVideoElement, number>()

/** Moves the video's speed to `to` over `ms`, from wherever it is now (also halfway through another change). */
export function easeRate(video: HTMLVideoElement, to: number, ms = RATE_MS) {
  const running = runs.get(video)
  if (running) cancelAnimationFrame(running)
  runs.delete(video)
  const from = video.playbackRate
  if (ms <= 0 || Math.abs(from - to) < 0.005) {
    video.playbackRate = to
    return
  }
  const t0 = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms)
    // smoothstep: the speed leaves and lands gently, like a reel slowing under a hand
    video.playbackRate = from + (to - from) * k * k * (3 - 2 * k)
    if (k < 1) runs.set(video, requestAnimationFrame(step))
    else runs.delete(video)
  }
  runs.set(video, requestAnimationFrame(step))
}

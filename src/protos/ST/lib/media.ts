// Small timing and media helpers for the Station film layer. Everything here animates only transform,
// opacity and (for the short push-in) filter, through the Web Animations API, so no React render is involved.

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** Resolves after the browser has painted once more (two animation frames). */
export const painted = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

/**
 * Moves an element's inline styles to `to`, animated from wherever it is now (also mid-animation).
 * The inline style holds the end state, so nothing snaps back when the animation ends or is cancelled.
 */
export function tween(el: HTMLElement, to: Record<string, string>, ms: number, easing = 'linear'): Promise<void> {
  const cs = getComputedStyle(el)
  const from: Record<string, string> = {}
  let moves = false
  for (const [k, v] of Object.entries(to)) {
    from[k] = cs.getPropertyValue(k)
    if (from[k] !== v) moves = true
  }
  for (const a of el.getAnimations()) a.cancel()
  for (const [k, v] of Object.entries(to)) el.style.setProperty(k, v)
  if (ms <= 0 || !moves || typeof el.animate !== 'function') return Promise.resolve()
  return el.animate([from, to], { duration: ms, easing }).finished.then(
    () => undefined,
    () => undefined,
  )
}

/** Points a video at a clip and resolves true once it can show and play it, false on an error or after `ms`. */
export function loadClip(video: HTMLVideoElement, url: string, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      video.removeEventListener('canplay', onOk)
      video.removeEventListener('error', onBad)
      resolve(ok)
    }
    const onOk = () => finish(true)
    const onBad = () => finish(false)
    const timer = window.setTimeout(() => finish(false), ms)
    video.addEventListener('canplay', onOk)
    video.addEventListener('error', onBad)
    try {
      video.pause()
      video.src = url
      video.load()
    } catch {
      finish(false)
    }
  })
}

/** Plays a loaded clip once from its start. Resolves when it ends, fails, or overruns its length by 1.5 s. */
export function playClip(video: HTMLVideoElement, expectSeconds: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      video.removeEventListener('ended', finish)
      video.removeEventListener('error', finish)
      resolve()
    }
    const length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : expectSeconds
    const timer = window.setTimeout(finish, length * 1000 + 1500)
    video.addEventListener('ended', finish)
    video.addEventListener('error', finish)
    video.play().catch(finish)
  })
}

/** Loads a picture into an <img> and resolves true once it is decoded, false on an error or after `ms`. */
export function loadImage(img: HTMLImageElement, url: string, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      img.onload = null
      img.onerror = null
      resolve(ok)
    }
    const timer = window.setTimeout(() => finish(false), ms)
    const decoded = () => {
      const d = typeof img.decode === 'function' ? img.decode() : Promise.resolve()
      d.then(
        () => finish(true),
        () => finish(true),
      )
    }
    if (img.getAttribute('src') === url && img.complete && img.naturalWidth > 0) {
      decoded()
      return
    }
    img.onload = decoded
    img.onerror = () => finish(false)
    img.src = url
  })
}

/**
 * Fetches clips and stills ahead of time and hands them back as in-memory addresses, so a press starts its
 * clip at once even on a slow connection. A file that is not fetched yet is simply loaded from its own address.
 */
export class Preloader {
  private blobs = new Map<string, string>()
  private queue: string[] = []
  private busy = false
  private dead = false
  private toUrl: (path: string) => string

  /** `toUrl` turns a manifest path into an address. */
  constructor(toUrl: (path: string) => string) {
    this.toUrl = toUrl
  }

  /** The address to load for a manifest path. */
  url = (path: string): string => this.blobs.get(path) ?? this.toUrl(path)

  /** Adds files to fetch, one at a time, in this order. `first` puts them at the head of the line. */
  want(paths: string[], first = false) {
    const fresh = paths.filter((p) => !this.blobs.has(p) && !this.queue.includes(p))
    this.queue = first ? [...fresh, ...this.queue] : [...this.queue, ...fresh]
    void this.pump()
  }

  private async pump() {
    if (this.busy) return
    this.busy = true
    while (!this.dead && this.queue.length) {
      const path = this.queue.shift() as string
      try {
        const res = await fetch(this.toUrl(path))
        if (res.ok) {
          const blob = await res.blob()
          if (this.dead) break
          this.blobs.set(path, URL.createObjectURL(blob))
        }
      } catch {
        // A file that cannot be fetched now is loaded from its address when it is needed.
      }
    }
    this.busy = false
  }

  dispose() {
    this.dead = true
    this.queue = []
    for (const u of this.blobs.values()) URL.revokeObjectURL(u)
    this.blobs.clear()
  }
}

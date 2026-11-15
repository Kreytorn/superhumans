// Station: the director. It owns the order of events between the home loop and a check:
//
//   home --press--> push --> fly --> scene --> panel
//   panel --back--> leave --> pull --> home
//   panel --onward--> fly (the next check's clip) --> scene --> panel
//
//   push   the loop is frozen on its frame and pushed in toward the pressed hotspot, which travels toward the
//          place where the close-up shows its subject
//   fly    the approach clip plays once (or, with no clip, the still cross-fades in)
//   scene  the still is up and the check's frozen scene plays over it
//   panel  the working panel is open
//   leave  the panel closes and the reverse clip plays
//   pull   cross-fade back to the frozen loop frame while it pulls out; then the loop resumes
//
// The address decides where it goes (`goto`), so a press, Esc, the Back button of the page and the Back
// button of the browser are all the same thing. A newer `goto` cancels the sequence that is running: each
// step checks that it is still the latest before it touches anything. A missing or slow clip never blocks:
// the sequence falls through to the still.
import type { CheckId } from '../modules/types'
import type { Variant } from './manifest'
import { loadClip, loadImage, painted, playClip, tween, wait } from './media'

export type Phase = 'boot' | 'home' | 'push' | 'fly' | 'scene' | 'panel' | 'leave' | 'pull'

export const TIMING = {
  /** The push-in on the frozen loop frame. */
  pushMs: 450,
  pushScale: 1.9,
  pushBlurPx: 7,
  /** Cross-fade between the frozen loop frame and a clip. */
  xfadeMs: 240,
  /** How long a press waits for a clip before it settles for the still. */
  clipWaitMs: 1400,
  stillWaitMs: 2500,
  /** The cross-fade used when there is no clip, and for reduced motion. */
  plainFadeMs: 520,
  /** The frozen scene: the panel opens after this, or earlier on a skip or when the scene says it is done. */
  sceneMs: 2500,
  /** A press this soon after the scene starts is the tail of the press that started it, not a skip. */
  skipGuardMs: 400,
  panelCloseMs: 280,
  pullMs: 640,
  /** Deep link: how long the still stands alone before the panel opens. */
  deepLinkMs: 260,
} as const

const EASE_IN = 'cubic-bezier(0.5, 0, 0.9, 0.42)'
const EASE_OUT = 'cubic-bezier(0.16, 0.84, 0.3, 1)'

export interface FilmEls {
  /** Wraps the poster and the loop video; this is what the push-in transforms. */
  loopWrap: HTMLElement
  loop: HTMLVideoElement
  /** One video element for every approach and reverse clip. */
  shot: HTMLVideoElement
  /** Two still images, so one can cross-fade into the other. */
  stills: [HTMLImageElement, HTMLImageElement]
  /** The hotspot layer. It rides along with the push (moved, not zoomed), so the pressed point's reticle stays
   *  on its module while the frame rushes in. */
  rider: HTMLElement | null
}

type Pt = { x: number; y: number }

export interface FilmState {
  phase: Phase
  id: CheckId | null
  /** In `scene`: true = the frozen scene plays, false = it shows its last frame at once. */
  play: boolean
}

export interface Host {
  els(): FilmEls | null
  variant(): Variant | null
  fps(): number
  /** The address to load for a manifest path. */
  url(path: string): string
  /** Where that check's hotspot is right now, in px of the cover box. */
  point(id: CheckId): { x: number; y: number }
  /** The cover box: its place and size on the screen, and the screen's size, in px. */
  box(): { x: number; y: number; w: number; h: number; vw: number; vh: number } | null
  /** Where that check's close-up has its subject (the still's focus anchor), in px of the cover box. */
  focus(id: CheckId): { x: number; y: number } | null
  /** Reduced motion: cross-fades only, and the loop stays on its frame. */
  reduced(): boolean
  /** The home view is pinned by ?state=: the loop stays on its first frame. */
  held(): boolean
  /** Blur for the push-in, in px (0 where a full-screen blur would cost frames). */
  blurPx(): number
  set(state: FilmState): void
}

export class Director {
  phase: Phase = 'boot'
  id: CheckId | null = null
  private run = 0
  private pushed = false
  /** How far the push carries the pressed point (see carryFor), px. */
  private carry: Pt = { x: 0, y: 0 }
  private cur = 0
  private stillOn = false
  private wake: (() => void) | null = null
  private sceneAt = 0
  private host: Host

  constructor(host: Host) {
    this.host = host
  }

  private set(phase: Phase, id: CheckId | null, play = false) {
    this.phase = phase
    this.id = id
    this.host.set({ phase, id, play })
  }

  private wakeUp() {
    const w = this.wake
    this.wake = null
    w?.()
  }

  private startLoop(els: FilmEls) {
    if (this.host.reduced() || this.host.held()) return
    els.loop.play().catch(() => {
      // Autoplay refused (a power-saving mode): the poster frame stays, the hotspots stay on frame 0.
    })
  }

  /** Jump to the settled picture for a view with no animation: the first load, and after the screen turns. */
  settle(target: CheckId | null) {
    const run = ++this.run
    this.wakeUp()
    const els = this.host.els()
    const v = this.host.variant()
    this.pushed = false
    this.stillOn = false
    if (els) {
      for (const el of [els.loopWrap, els.shot, ...els.stills, ...(els.rider ? [els.rider] : [])]) for (const a of el.getAnimations()) a.cancel()
      els.loopWrap.style.transform = ''
      els.loopWrap.style.filter = ''
      if (els.rider) els.rider.style.transform = ''
      els.shot.pause()
      els.shot.style.opacity = '0'
      for (const s of els.stills) s.style.opacity = '0'
    }
    if (!target) {
      if (els) this.startLoop(els)
      this.set('home', null)
      return
    }
    // A deep link: the still at once, then the panel. The scene shows its last frame, it does not play.
    els?.loop.pause()
    const shot = v?.shots[target]
    this.set('scene', target, false)
    if (!els || !shot) {
      this.set('panel', target)
      return
    }
    void (async () => {
      const ok = await this.prepareStill(els, shot.still)
      if (run !== this.run) return
      if (ok) this.showStill(els, 0)
      await wait(TIMING.deepLinkMs)
      if (run !== this.run) return
      this.set('panel', target)
    })()
  }

  /** Go to a view, with the film. Does nothing when it is already there or on its way. */
  goto(target: CheckId | null) {
    if (this.phase === 'boot') {
      this.settle(target)
      return
    }
    if (target) {
      const heading = this.phase === 'push' || this.phase === 'fly' || this.phase === 'scene' || this.phase === 'panel'
      if (this.id === target && heading) return
      void this.toCheck(target)
    } else {
      if (this.phase === 'home' || this.phase === 'leave' || this.phase === 'pull') return
      void this.toHome()
    }
  }

  /** Any press or key during the frozen scene: jump to its last frame and open the panel. */
  skip() {
    if (this.phase === 'scene' && this.wake && performance.now() - this.sceneAt > TIMING.skipGuardMs) this.wakeUp()
  }

  /** The scene says its animation has finished. */
  sceneDone() {
    if (this.phase === 'scene') this.wakeUp()
  }

  dispose() {
    this.run++
    this.wakeUp()
    this.phase = 'boot'
    this.id = null
  }

  // ------------------------------------------------------------------------------------------- sequences
  private async toCheck(id: CheckId) {
    const run = ++this.run
    const live = () => run === this.run
    const fromHome = this.phase === 'home'
    this.wakeUp()
    const els = this.host.els()
    const v = this.host.variant()
    const shot = v?.shots[id]
    if (!els || !v || !shot) {
      this.set('panel', id)
      return
    }
    const reduced = this.host.reduced()
    // Coming from another check, its still stays up until the next clip can take over (a straight cut).
    const overStill = this.stillOn

    this.set(fromHome ? 'push' : 'fly', id)
    els.loop.pause()
    if (!overStill) {
      for (const a of els.shot.getAnimations()) a.cancel()
      els.shot.style.opacity = '0'
    }
    const still = this.prepareStill(els, shot.still)
    const clip = reduced ? Promise.resolve(false) : loadClip(els.shot, this.host.url(shot.in), TIMING.clipWaitMs)

    if (fromHome && !reduced) {
      await this.push(els, id, this.host.point(id))
      if (!live()) return
    }
    const clipOk = await clip
    if (!live()) return

    if (clipOk) {
      this.set('fly', id)
      if (overStill) {
        els.shot.style.opacity = '1'
        await painted()
        if (!live()) return
        this.hideStill(els, 0)
      } else void tween(els.shot, { opacity: '1' }, TIMING.xfadeMs)
      await playClip(els.shot, shot.frames / this.host.fps())
      if (!live()) return
      // The still is the clip's last frame, sharp: swap it in under no fade. Without one, the clip's own
      // last frame stays up.
      const stillOk = await still
      if (!live()) return
      if (stillOk) {
        this.showStill(els, 0)
        await painted()
        if (!live()) return
        els.shot.style.opacity = '0'
      }
    } else {
      const stillOk = await still
      if (!live()) return
      this.set('fly', id)
      if (stillOk) {
        this.showStill(els, TIMING.plainFadeMs)
        await wait(TIMING.plainFadeMs)
        if (!live()) return
        els.shot.style.opacity = '0'
      }
    }

    const play = !reduced
    this.sceneAt = performance.now()
    this.set('scene', id, play)
    if (play) {
      await Promise.race([
        wait(TIMING.sceneMs),
        new Promise<void>((resolve) => {
          this.wake = resolve
        }),
      ])
      this.wake = null
      if (!live()) return
    }
    this.set('panel', id)
  }

  private async toHome() {
    const run = ++this.run
    const live = () => run === this.run
    const from = this.phase
    const id = this.id
    this.wakeUp()
    const els = this.host.els()
    const v = this.host.variant()
    if (!els || !v) {
      this.set('home', null)
      return
    }
    const reduced = this.host.reduced()
    const shot = id ? v.shots[id] : undefined
    // Only a check that had arrived (its still is up) gets the reverse clip. Anything interrupted on the
    // way in just cross-fades back.
    const arrived = (from === 'panel' || from === 'scene') && this.stillOn

    this.set('leave', id)
    if (arrived && shot && !reduced) {
      const [clipOk] = await Promise.all([loadClip(els.shot, this.host.url(shot.out), TIMING.clipWaitMs), wait(TIMING.panelCloseMs)])
      if (!live()) return
      if (clipOk) {
        // The reverse clip starts on the still's own frame: put it under the still, then lift the still.
        els.shot.style.opacity = '1'
        await painted()
        if (!live()) return
        this.hideStill(els, 0)
        await playClip(els.shot, shot.frames / this.host.fps())
        if (!live()) return
      }
    } else if (from === 'panel') {
      await wait(TIMING.panelCloseMs)
      if (!live()) return
    }

    // After a deep link the loop was never pushed in: pose it now, under the picture, so it can pull out.
    if (!this.pushed && id && !reduced) this.pose(els, id, this.host.point(id))
    this.set('pull', id)
    const fadeMs = reduced ? TIMING.plainFadeMs : TIMING.xfadeMs
    void tween(els.shot, { opacity: '0' }, fadeMs)
    this.hideStill(els, fadeMs)
    if (reduced) await wait(fadeMs)
    else {
      // The way back is the push undone: the frame pulls out and carries the point home, and the hotspot layer
      // rides back with it, so the points come up where the station is.
      if (els.rider) void tween(els.rider, { transform: 'translate(0px, 0px)' }, TIMING.pullMs, EASE_OUT)
      await tween(els.loopWrap, { transform: 'translate(0px, 0px) scale(1)', filter: 'blur(0px)' }, TIMING.pullMs, EASE_OUT)
    }
    if (!live()) return
    els.loopWrap.style.transform = ''
    els.loopWrap.style.filter = ''
    if (els.rider) els.rider.style.transform = ''
    els.shot.pause()
    this.pushed = false
    this.startLoop(els)
    this.set('home', null)
  }

  // --------------------------------------------------------------------------------------------- pieces
  private moved(): string {
    return `translate(${this.carry.x.toFixed(1)}px, ${this.carry.y.toFixed(1)}px)`
  }

  private pushedStyle(): Record<string, string> {
    const blur = this.host.blurPx()
    return { transform: `${this.moved()} scale(${TIMING.pushScale})`, filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)' }
  }

  /**
   * The push carries the pressed point toward the place where the close-up will show its subject (the still's
   * focus: every fly-in keeps its subject there from its first frame), as far as the zoomed frame still covers
   * the screen. The cut into the clip then lands where the eye already is, instead of jumping across the frame.
   */
  private carryFor(id: CheckId, p: Pt): Pt {
    const b = this.host.box()
    const f = this.host.focus(id)
    if (!b || !f) return { x: 0, y: 0 }
    const k = TIMING.pushScale
    // the part of the frame on screen, in box px, a little wider than the screen for the blur's soft edge
    const m = 12
    const x0 = Math.max(0, -b.x) - m
    const x1 = Math.min(b.w, b.vw - b.x) + m
    const y0 = Math.max(0, -b.y) - m
    const y1 = Math.min(b.h, b.vh - b.y) + m
    // q -> target + k (q - p): the frame's left edge lands at target - k p, its right edge at target + k (w - p)
    const fit = (want: number, lo: number, hi: number, at: number) => (lo > hi ? at : Math.min(hi, Math.max(lo, want)))
    const tx = fit(f.x, x1 - k * (b.w - p.x), x0 + k * p.x, p.x)
    const ty = fit(f.y, y1 - k * (b.h - p.y), y0 + k * p.y, p.y)
    return { x: tx - p.x, y: ty - p.y }
  }

  /** The hotspot is the transform origin: the frame rushes in around the pressed point while the point travels
   *  to where the close-up will show its subject, its reticle riding along. */
  private push(els: FilmEls, id: CheckId, p: Pt): Promise<void> {
    this.carry = this.carryFor(id, p)
    els.loopWrap.style.transformOrigin = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`
    this.pushed = true
    if (els.rider) void tween(els.rider, { transform: this.moved() }, TIMING.pushMs, EASE_IN)
    return tween(els.loopWrap, this.pushedStyle(), TIMING.pushMs, EASE_IN)
  }

  private pose(els: FilmEls, id: CheckId, p: Pt) {
    this.carry = this.carryFor(id, p)
    els.loopWrap.style.transformOrigin = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`
    this.pushed = true
    if (els.rider) void tween(els.rider, { transform: this.moved() }, 0)
    void tween(els.loopWrap, this.pushedStyle(), 0)
  }

  /** Loads a still into the image that is not on screen. */
  private prepareStill(els: FilmEls, path: string): Promise<boolean> {
    return loadImage(els.stills[1 - this.cur], this.host.url(path), TIMING.stillWaitMs)
  }

  /** Brings the prepared still up over whatever is showing. */
  private showStill(els: FilmEls, ms: number) {
    const next = els.stills[1 - this.cur]
    const old = els.stills[this.cur]
    next.style.zIndex = '2'
    old.style.zIndex = '1'
    this.cur = 1 - this.cur
    this.stillOn = true
    void tween(next, { opacity: '1' }, ms).then(() => {
      if (this.stillOn && els.stills[this.cur] === next) void tween(old, { opacity: '0' }, 0)
    })
  }

  private hideStill(els: FilmEls, ms: number) {
    this.stillOn = false
    for (const s of els.stills) void tween(s, { opacity: '0' }, ms)
  }
}

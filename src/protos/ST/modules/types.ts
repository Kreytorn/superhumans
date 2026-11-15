// Station: the interface between the shell and the six check modules. Shell-owned: ask for changes in
// work/Station/LOG.md. modules/README.md explains every field in plain words.
import type { Ref } from 'react'

export type CheckId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

/** Anchors of one frozen close-up, in the still's own image space: [x, y], 0..1 from the top-left. */
export interface Anchors {
  /** Centre of the subject: where the story happens. */
  focus: [number, number]
  /** The subject's radius as a fraction of the still's HEIGHT. */
  r: number
  /** tracktrace: where the particle's straight path enters the frame. */
  a?: [number, number]
  /** tracktrace: where it leaves. It passes through the hull at `focus`. */
  b?: [number, number]
  /** braindrift: 2D unit vector, the screen direction of "toward the head". */
  up?: [number, number]
}

/** wide = landscape frames (1920x1080 today), tall = portrait frames for phones. Sizes come from the manifest. */
export type VariantName = 'wide' | 'tall'
/** side = the panel sits on the right of a landscape screen, sheet = it covers the lower part of a portrait one. */
export type PanelLayout = 'side' | 'sheet'

export interface SceneProps {
  id: CheckId
  /** Pixel size of the still. The box you are mounted in has exactly this aspect ratio and is glued to the
   *  still under object-fit: cover, so an <svg viewBox={`0 0 ${w} ${h}`}> at 100% x 100% is in still pixels. */
  w: number
  h: number
  anchors: Anchors
  variant: VariantName
  /** true: play your story once from the start (about 2.5 s). false: show its last frame at once
   *  (deep link, a skip, reduced motion, and the whole time the panel is open). It can turn false mid-play. */
  play: boolean
  /** Optional: call when your animation has finished, to open the panel before the 2.5 s are up. */
  onDone(): void
}

export type StageState = 'idle' | 'running' | 'result' | 'error'

/** The "what to do next" line the panel prints under the stage once a check has a result. */
export interface StageAct {
  /** Who acts, a few words: "Flight surgeon". */
  whoActs: string
  /** The one plain action, one sentence. Engine wording only; never invent one. */
  headline: string
}

/** What the panel's own buttons call. Both must work at any time, including before the stage has loaded. */
export interface StageHandle {
  /** The panel's main button: start (or restart) the check. */
  run(): void
  /** The panel's Reset button: back to the idle stage. */
  reset(): void
}

export interface StageProps {
  id: CheckId
  ref?: Ref<StageHandle>
  layout: PanelLayout
  /** true once the panel has finished opening. Start heavy work (models, 3D) only then. */
  active: boolean
  /** From ?state=idle|result in the address: show that state at once, with no animation. null = normal. */
  pinned: 'idle' | 'result' | null
  /** Keep the shell's data-state current: call on every change. */
  onState(state: StageState): void
  /** Call with the action when a result settles, and with null when the stage goes back to idle. */
  onAct(act: StageAct | null): void
  /** Call once, when the idle stage (or the pinned state) is drawn. The shell waits for it before it reports
   *  the page as settled; it stops waiting after 2.5 s. */
  onReady(): void
  /** Optional (added 05:10), phone sheet only: ask for the sheet to be tall (true) or back to its normal
   *  height (false). A tall sheet covers most of the frozen frame, so ask once the story has been seen, for
   *  example when the check starts running, not on mount. Every opening starts at the normal height. Ignored
   *  on a landscape screen. */
  onTall?(tall: boolean): void
}

# Station modules: what a check owner writes

Each check has its own folder here and exactly two entry files. The shell loads both with `React.lazy`
behind an error boundary, so a broken module shows a note and never takes the page down. (06:30: it also
fetches them ahead, every scene once the station has settled and a check's stage as soon as it is pressed, and
renders a fetched one directly, so a scene starts with its phase and a stage draws in the panel's first frame:
heavy work still waits for `active`.)

```
modules/<id>/Scene.tsx   default export: the frozen scene, drawn over the still (about 2.5 s)
modules/<id>/Stage.tsx   default export: the panel body, the working check
modules/<id>/*           your helper files and CSS (scope every class under one root class of your own)
```
`<id>` is `tracktrace`, `bubblegrade`, `spikecount`, `veinsqueeze`, `braindrift` or `garnmeter`.
The files that are there now are **stubs that work**: replace them. Shell-owned, do not edit:
`types.ts` (the props below), `kit.tsx` (helpers), `_stub/`. Ask for an interface change in `work/Station/LOG.md`.

## The flow your two files sit in
home (the station turns, six hotspots) -> press -> the frame freezes and pushes in -> the approach clip
plays -> the still stands -> **your Scene plays** while the shell shows the problem label as a large
title in the lower left ("COSMIC RAYS") -> the panel opens with **your Stage** in its body. Your Scene
stays visible beside the panel, on its last frame. Back plays it all in reverse.

## Scene.tsx

```ts
interface SceneProps {
  id: CheckId
  w: number; h: number      // pixel size of the still (from the manifest; never hard-code)
  anchors: Anchors          // { focus:[x,y], r, a?, b?, up? } in the still's own space, 0..1 from top-left
  variant: 'wide' | 'tall'  // landscape frames, or portrait frames for phones
  play: boolean             // true: play once from the start. false: show the LAST frame at once
  onDone(): void            // optional: call when finished, to open the panel before 2.5 s
}
```
- **Where you draw.** You are mounted in a box that has exactly the still's aspect ratio and is glued to
  the still under `object-fit: cover` (it may be larger than the screen; the page crops it). So draw in
  the still's own coordinates: `<SceneSvg w={w} h={h}>` from `../kit` gives an SVG whose units are still
  pixels, and `anchors.focus[0] * w, anchors.focus[1] * h` is the subject. `anchors.r * h` is its radius.
  With plain HTML use percentages of the box (`left: ${focus[0] * 100}%`).
- **Composition.** On `wide` the subject is in the left part and the panel covers the right 58 % of the
  screen; on `tall` it is in the top part and the sheet covers the lower 62 %. Keep the story near `focus`.
  The lower-left corner belongs to the shell's title during the scene.
- **Time.** The panel opens 2.5 s after the scene starts, or at once on any press or key (a skip), or
  when you call `onDone()`. Finish inside 2.5 s.
- **The last frame.** `play` is false on a deep link, with reduced motion, after a skip, and the whole
  time the panel is open; it can turn false in the middle of your animation. If you animate with CSS
  keyframes and `animation-fill-mode: both`, you get this for free: while `play` is false the shell forces
  every animation and transition inside the scene box to its end. If you animate with JavaScript or a
  canvas, watch `play` yourself and draw the last frame when it is false.
- **Cost.** Animate `transform`, `opacity` and SVG stroke offsets only. No loop that keeps running on the
  last frame: the panel's glass is blurred over your scene and would repaint with it.
- **Content.** An illustration of the story, not data: no numbers, no medical claims, no people drawn
  close up. The picture under you is AI-made and already marked; add no title of your own.

## Stage.tsx

```ts
interface StageProps {
  id: CheckId
  ref?: Ref<StageHandle>          // { run(): void; reset(): void }  the panel's buttons call these
  layout: 'side' | 'sheet'        // panel on the right of a landscape screen, or a sheet on a portrait one
  active: boolean                 // true once the panel has finished opening: start heavy work only then
  pinned: 'idle' | 'result' | null // from ?state= in the address: show that state at once, no animation
  onState(s: 'idle' | 'running' | 'result' | 'error'): void   // on every change
  onAct(a: { whoActs: string; headline: string } | null): void // the action when a result settles; null at idle
  onReady(): void                 // once, when your idle picture (or the pinned state) is drawn
  onTall?(tall: boolean): void    // optional (05:10): phone sheet only, ask for a tall sheet (true) or the
                                  // normal height (false); ask when the check runs, not on mount, because a
                                  // tall sheet covers the frozen frame. Every opening starts normal.
}
```
- **What the shell already shows** (do not repeat it): Back, previous and next, the problem label, the
  check's name, its one sentence, the main button (its words are in `../registry.ts`), and under your
  stage the line "What to do next" filled from `onAct`. Your stage is the working picture and its own
  marks and controls.
- **Size.** Fill the body: your root is `width: 100%; height: 100%`. If you need more room (TrackTrace's
  architecture card), make your content taller than 100 % and the body scrolls. Measured (05:00): the body
  is 755 x 532 px on a 1440 x 900 laptop, 662 x 436 at 1280 x 800, 1034 x 700 on a 1920 x 1080 projector
  and 358 x 291 px on a 390 x 844 phone (the phone sheet can be made taller by its handle); it is the same
  size for all six checks and does not change when the "what to do next" line lands. Read `layout` and lay out for both. The body (`.st-stage`, the scroll box) sits
  in a frame (`.st-frame`) that draws pale-gold corner marks over its edge; nothing changes for your root.
- **The buttons.** `run()` is the panel's main button and must start (or restart) the check whenever it is
  called, also before your data has loaded: keep an early press and play it when you are ready. The shell
  repeats `run()` every half second until you report `running`, so treat repeats as one press. `reset()`
  is the Reset button the panel shows at a result: go back to idle and call `onAct(null)`.
- **A ready-made moment** (`src/moments/<id>`) fits in a few lines; see the stubs. `useStageControls` from
  `../kit` wires `ref` and `pinned` to it and returns the pin to pass as the moment's `state` prop
  (a pinned moment ignores input, so the first press lets go of the pin). `MOMENT_TOKENS` is the film
  palette as the moments' `--m-*` tokens; spread it into `style` and add the tokens your moment needs.
  `pickAct(act)` turns an engine decision into what `onAct` takes. Do not edit `src/moments` or `src/engine`.
- **Keys.** While focus is inside your stage, arrow keys and Esc are yours (the shell's "previous / next
  check" arrows only act outside it; Esc inside the stage first moves focus out to Back).
- **Test hooks.** The shell sets `data-ready`, `data-state` and `data-qa="primary"` (its main button).
  Do not put `data-qa="primary"` on anything; `data-qa="hero"` on your specimen is fine.
- **Honesty tags** your moment's README asks the page to keep (LIVE / REPLAY, SIMULATION, "Best case" ...)
  are yours to show inside the stage. Numbers and medical words only from the engine at run time or from
  `work/Web/models/<id>.md`.

## Tokens: the only colours, faces and steps to use
They are set on the page root (`.st`), so they work anywhere inside a module.

| Token | Value | Use |
|---|---|---|
| `--st-black` | `#030507` | the dark of the frame |
| `--st-well` | `#05070a` | the stage background (solid) |
| `--st-glass` | `rgba(5,7,10,.8)` | the panel's smoked glass |
| `--st-ink` | `#e8eef5` | text, cold white |
| `--st-ink-2` | `#a9b5c2` | second text (readable on the dark) |
| `--st-ink-3` | `#7b8794` | quiet labels |
| `--st-amber` | `#ffb45a` | the one warm accent: anything pressable or alive, the viewer's own action |
| `--st-amber-ink` | `#1c1003` | text on amber |
| `--st-gold` | `#d6c6a2` | the pale gold of the planet: quiet structure only (frame marks, a hairline), never "press me" |
| `--st-blue` | `#8fb3d9` | the quiet second colour (a model's cool marks) |
| `--st-hair`, `--st-hair-2` | white at 17 % / 9 % | hairlines, frames |
| `--st-font-display` | Archivo, set `font-stretch: 125%`, weight 300, uppercase, `letter-spacing: var(--st-track-title)` | names and large numerals only |
| `--st-font-body` | Instrument Sans | sentences |
| `--st-font-mono` | Geist Mono, uppercase, `letter-spacing: var(--st-track-label)` | tiny technical labels only |
| `--st-t-label` 11.5 px, `--st-t-small` 14 px, `--st-t-body` 17 px, `--st-t-lead`, `--st-t-title` | | the type scale: nothing smaller than the label size |
| `--st-1` .. `--st-7` | 4, 8, 12, 16, 24, 40, 64 px | spacing |
| `--st-ease`, `--st-ease-in` | | easing for things arriving, and for things leaving |

Ready classes: `st-btn` (amber button, 46 px high) and `st-btn st-btn--quiet` (hairline button) for any
button of your own. No other colour, no gradient as decoration, no neon, no card with a shadow. A model's
own marks may keep the colour its moment defines (`--m-mark`) when that colour carries meaning.

## Before you say it is done
`npx tsc --noEmit -p tsconfig.app.json` (only errors in your files count), then look at it:
`node ../work/Station/tools/drive.mjs --out ../work/Station/shots/<id> --view <id> --steps "ready,wait:1500,shot:idle,click:[data-qa=primary],wait:9000,shot:result"`
at `--size 1440x900` and `--size 390x844`, and the scene:
`... --view home --steps "press:<id>,phase:scene,wait:700,shot:scene_a,wait:900,shot:scene_b,phase:panel,wait:800,shot:panel"`.
Add `--plates ../work/Station/renders/v9` to see it over the approved renders instead of the placeholder
pictures (clips are blocked, so a press cross-fades to the still). The placeholder manifest's anchors do not
match those stills, so judge colour and contrast with it, not placement. `measure:<css>` prints an element's box.

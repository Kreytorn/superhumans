# Garn Meter moment (stage only)

`import GarnMoment from './moments/garnmeter'` renders the specimen, two instruments and the model's marks, dark by default. At idle: 14 real recorded EEG traces (channel names at the left) under one sentence ("Recorded brainwaves. Can a model tell how sick this person felt?"), the scalp map, the Garn dial and the 1-7 check-in rail ("How sick do you feel?") with a resting handle. Play brings on the session strip (the person's own ratings vs the model's estimate, the whole recording as a ribbon of scenes under it) and ends on one large line above the rail: "Brainwave model 0.08 · the person said 1.0 Garn". The page supplies title, action card and navigation. Harness: `#/moment/garnmeter`.

**Props** (unchanged since r3 fix round 2)
- `sampleId` (default `user19-s3`, the whole session, 243 windows; a single scene such as `user19-s3-t13` also works).
- `mode` `auto | live | replay`. auto = real model (`analyze()`) on a laptop, stored outputs (`replay()`) on a coarse pointer or a screen 600 px wide or less, and on any model failure.
- `state` `idle | result` pins the stage. `t` (ms, 0-5000) pins the timeline. Reduced motion jumps to the end state and stops the resting replay.
- `onResult(result, act)` fires when the result settles and after every check-in or scene change; `act` is the engine's `act(result, { checkinIds, atTrial })`. Action: `act.headline`, `act.whoActs`. A check-in made **before** the session is played also fires it, with the stored-outputs result (only `act` is meaningful then).
- `onState(state)`, `onReady()` (fires once the pinned state is drawn, not before), `annotations` (default true; false removes every word but the 1-7 numerals and the dial's number), `className`, `style`.
- Ref: `run()`, `reset()`, `checkIn(1..7)` (works at idle and at the result), `focusOn(trial)`.
- Root attributes for scripts: `data-state`, `data-ready`, `data-beat`, `data-open` (0 = idle stage, 1 = session view), `data-source` (live | precomputed), `data-checkin`, `data-zone`, `data-focus`, `data-notes`, `data-narrow`.

**Layout** (all from the stage's own box, `layoutFor` in `draw.ts`)
- Wide (860 px or more and landscape): the traces, strip and rail in a column at the left; a column of two instrument panels at the right: the **scalp map** on top, the **Garn dial** below.
- Otherwise (phones, portrait): the two panels share a row between the traces and the legend (at idle: right above the rail).

**Tokens** (set on `.gm-root` or any parent; the canvas reads them on mount, resize, run and reset). Defaults are now the dark set; `?skin=light` in the harness is a worked example of restyling.
`--m-stage` surface, `--m-ink` traces and text, `--m-ink-2` axes and quiet text, `--m-mark` everything the model drew (4 s window, estimate thread, tick on the rail and on the dial), `--m-accent` the person's own ratings, `--m-ok` / `--m-watch` / `--m-alert` the zones (ring / triangle / square; also the dots of the person's ratings on the strip and the arcs of the dial), `--m-field-hi` / `--m-field-lo` scalp map, `--m-font`, `--m-font-mono`. **New, optional:** `--m-glow` (the halo of the traces, the electrodes' light and the light in the two panels; falls back to `--m-accent`). Internal, set by the component: `--gm-u`, the type scale (1 under 900 px of stage width, rising to 1.75 at 1575 px and wider).

**Beats** (`timeline.ts`: `frameAt(t, data)` is pure; `BEATS` and `DURATION` are exported)
| Beat | ms | What it shows about the model |
|---|---|---|
| calibrate | 0-400 | The stage opens: the sentence leaves, the traces make room for the session strip, the 8 s at rest draw in with each channel's spread (which the model divides by). Holds here if the model is slower. |
| session | 400-1200 | The view zooms out to all 224 s. Grey thread = the model's raw estimate per 4 s window; blue steps = the person's own rating after each scene, each dot in its check-in zone colour. |
| focus | 1200-2300 | Zoom into the scene with the worst own rating (trial 24 in the default sample). |
| read | 2300-4100 | The model's 4 s window slides over its 9 positions; the grey tick on the rail and on the dial is that window's estimate. The scalp map fast-forwards through the measured theta of the windows it passes. |
| checkin | 4100-5000 | The tick settles on the scene's mean, the person's check-in lands (red square, "Warning"), the dashed bracket joins them, the dial lights up to the check-in, the large line says both values. |

**At rest the stage keeps living, on real data only** (about 40 frames a second, paused when the tab is hidden, off with reduced motion or a pinned `t`):
- Idle: the 8 s at rest replay at 1x; a lit playhead crosses the traces, and each electrode on the scalp map glows with its own trace's amplitude at the playhead (mean |signal| over the last 1/8 s, in that channel's spreads).
- Result: the scene in view replays at 1x; the model's 4 s window slides again over its standard positions, the scalp map follows the stored measured theta of those windows, the electrodes glow with their traces. The number on the rail stays on the scene's mean.
- Static parts (grid, names, traces) are cached on a layer; only the lit part, the playhead and the window redraw.

**The two instruments**
- **Scalp map** ("THETA POWER", "A measurement, not model output."): measured theta power vs rest at the 14 electrodes, interpolated over a head seen from above, channel names under the dots, key "less ... more than at rest". At idle it shows the rest itself (no change, by definition) with the electrodes breathing. It is the engine's `windows[].theta`, never model output.
- **Garn dial** ("GARN METER · THE CHECK-IN"): the check-in as a lit arc from 0 to (check-in - 1) / 6 Garn, with a knob; the outer ring carries the three zones (stop 1, stops 2-3, stops 4-7); the grey triangle outside the groove is the model's estimate (the same tick as on the rail). The middle prints whose answer it is ("the person said" / "you said"), the Garn value and the status word with its shape. Before any check-in: "no check-in yet".

**Labels on the stage** (all in the DOM except the instruments' words, which are on the canvas; axis and scale labels carry `data-qa="tick"`)
- Idle: the sentence above the traces. No strip, no legend, no axes: they come on stage when Play fills them.
- Traces, once playing: "Recorded brainwaves, at rest / whole session / scene N" at the left, a time-scale bar at the right; "what the model reads" hangs from the 4 s window.
- Legend: a blue key, "what the person said"; a grey key, `LIVE` or `REPLAY` (from `result.source`), then the engine's sentence `STRINGS.eegLine`, verbatim.
- Strip: "0", "1 Garn", a "scene N" tag on the scene in view (the strip's handle); under the plot the whole recording as a ribbon cut into its scenes, with what each block of scenes varied ("scene complexity", "speed", "stereo depth", from the engine's trial `cue`).
- Rail: the question; at idle "tap to answer" over a hollow resting handle; at the result the large line "Brainwave model x · the person said y Garn" ("you said" once the viewer moved the handle; the hollow ring left behind is "they said"), and the status word over the handle. The track carries the three zones; the handle glows in its zone and sends a ripple on every answer.

**Interaction**: the rail answers at idle (the check-in alone sets zone, word, dial and action; no EEG involved) and after the result. Tap a stop or use arrow / Home / End keys. After the result, tap, drag or arrow-key the session strip to bring another scene into view (scene 13: person fine, model at 0.42, a false alarm).

**`GarnScalp`** (`import { GarnScalp } from './moments/garnmeter/scalp'`, props `result`, optional `trial`, `size`): the same scalp map as a small standalone figure with its key, for a page's "How do we know?" layer.

**Harness only**: Play / Reset; the action sentence (`act.headline`) under the stage; "How do we know?" opens one sheet with `STRINGS.personLabel`, `groundAnalog`, how the run was made, `STRINGS.playback`, `garnDefinition`, `captions.resultCard` and the scalp map. A page that embeds the stage must put those lines in its own "How do we know?" layer. `?bare=1` = marks only (posters), `?skin=light` = token example.

**Downloads**: `session_eeg.bin` 1.61 MB, `session.json` 4 KB, `card.json` 14 KB, `topomap.json.gz` 19 KB on mount. Live adds `garn.onnx` 0.52 MB plus the shared onnxruntime-web runtime; replay (and a check-in before playing) adds `outputs.json.gz` 139 KB. Two font files, 47 KB and 36 KB.

**Display choices that are not model output**: big artefacts are bent by a soft limiter; the zoomed-out view is a min/max envelope; the electrodes' glow is a display of the trace's own amplitude; the status word is `act.severity` (Nominal, Watch, Warning); the tick travels between two outputs but the number printed is always an engine value; the person's Garn is (check-in - 1) / 6 printed without a trailing zero (1.0, 0.33); the resting handle at idle is a control, not a rating (no `data-checkin`, no stop is checked). The module asks for the wasm backend for this model (`preferBackends('garnmeter/garn', ['wasm'])`).

**Gaps**
- Touch checked only in an emulated browser, not on a real phone.
- The animation plays the finished result; it does not stream window by window (said in the sheet).
- Theta only (no gamma toggle). The 4 s window cannot be dragged; no electrode what-if. The screen-task and promethazine switches are not on the stage: call `garn.act(result, {...})` from the page.
- On a portrait stage the scalp panel is short, so the map is small there.
- Two imports reach outside the engine's index: `engine/garnmeter/data` (electrode positions) and `lib/infer/client` (`preferBackends`).

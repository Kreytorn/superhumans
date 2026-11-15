# Garn Meter moment (stage only)

`import GarnMoment from './moments/garnmeter'` renders the specimen, two instruments and the model's marks, dark by default. **r4 (the owner's ruling): model output only.** There is no check-in question anywhere on the stage, and the person's own ratings are not drawn. At idle: 14 real recorded EEG traces (channel names at the left) under one sentence ("Recorded brainwaves. Can a model read motion sickness in them?"), the scalp map and the Garn gauge ("no reading yet"). Play runs the real model (CorrFuse-EEG, `garn.onnx`) over the whole session (if the model is still loading, a playhead keeps the recording at rest playing until it answers): its reading draws in as a line under the traces and the gauge follows it, then the view zooms into scene 24 (the card's hero scene), the model's 4 s window slides over it and the gauge settles on the model's reading for that scene (the mean of its 9 windows, 0.08 Garn). The page supplies title, result panel and navigation. Harness: `#/moment/garnmeter`.

**Props**
- `sampleId` (default `user19-s3`, the whole session, 243 windows; a single scene such as `user19-s3-t13` also works).
- `mode` `auto | live | replay`. auto = real model (`analyze()`) on a laptop, stored outputs (`replay()`, tagged REPLAY) on a coarse pointer or a screen 600 px wide or less, and on any model failure.
- `state` `idle | result` pins the stage. `t` (ms, 0-6200) pins the timeline. Reduced motion jumps to the end state and stops the resting replay.
- `onResult(result, act, reading)` fires when the result settles and after every scene change. `reading` is what the gauge shows: `{ garn, trial, windows, source, notes }` (`notes` = the engine's fixed lines for a "How do we know?" layer: person label, Garn definition, ground analog, playback, and on replay "precomputed by the same model"). `act` is still the engine's Tier C decision for that scene (it follows the study's own rating, not the model); the stage does not show it and DF does not use it.
- `onState(state)`, `onReady()` (fires once the pinned state is drawn), `annotations` (default true; false leaves marks and the gauge's number only), `className`, `style`.
- Ref: `run()`, `reset()`, `focusOn(trial)`. (`checkIn` is gone.)
- Root attributes for scripts: `data-state`, `data-ready`, `data-beat`, `data-open` (0 = idle stage, 1 = session view), `data-source` (live | precomputed), `data-reading` (the gauge's settled value, 2 decimals), `data-focus`, `data-notes`, `data-narrow`.

**Layout** (all from the stage's own box, `layoutFor` in `draw.ts`)
- Wide (860 px or more and landscape): traces, legend and the session strip in a column at the left (the strip is taller now that the rail is gone); a column of two panels at the right: the **scalp map** on top, the **Garn gauge** below (about half the height).
- Otherwise (phones, portrait): the two panels share a row between the traces and the legend (at idle: at the foot of the stage).

**Tokens** (set on `.gm-root` or any parent). `--m-stage`, `--m-ink`, `--m-ink-2`, `--m-mark` (the model's 4 s window), `--m-accent` (**the model's reading**: its line on the strip, the lit arc of the gauge, the scene's mean), `--m-field-hi` / `--m-field-lo` (scalp map), `--m-glow` (optional, falls back to `--m-accent`), `--m-font`, `--m-font-mono`. `--m-ok`, `--m-watch`, `--m-alert` are no longer used. Internal: `--gm-u`, the type scale.

**Beats** (`timeline.ts`: `frameAt(t, data)` is pure; `BEATS`, `DURATION` and `HERO_TRIAL` are exported)
| Beat | ms | What it shows about the model |
|---|---|---|
| calibrate | 0-400 | The traces make room for the strip; the 8 s at rest draw in with each channel's spread (which the model divides by). Holds here if the model is slower. |
| session | 400-2800 | The whole recording plays through the model; its reading (raw output per 4 s window) draws in as a lit line; the gauge follows the engine's smoothed reading (`garnEma`). |
| focus | 2800-3700 | Zoom into scene 24; the gauge moves to that scene's first window. |
| read | 3700-5500 | The model's 4 s window slides over its 9 positions; the gauge follows each window's reading; the scalp map follows the measured theta. |
| settle | 5500-6200 | The gauge settles on the scene's mean; a bar marks it on the strip. |

**At rest the stage keeps living, on real data only** (about 40 frames a second, paused when the tab is hidden, off with reduced motion or a pinned `t`): idle replays the 8 s at rest with a playhead; the result replays the scene in view with the model's window sliding again. The gauge stays on the scene's mean.

**The two instruments**
- **Scalp map** ("THETA POWER", "A measurement, not model output."): measured theta power vs rest at the 14 electrodes (`windows[].theta`), never model output.
- **Garn gauge** ("GARN METER · THE MODEL"): a lit arc from 0 to the model's reading, a knob and a short needle, ticks every 0.1 Garn, "the model reads", the number, "Garn", and under the arc what the number is ("smoothed, as the session plays" / "scene 24: one 4 s window" / "scene 24: mean of its 9 readings"). No zones, no status word: Tier C, the reading is not used for alerts.

**Labels on the stage**: the idle sentence; once playing, "Recorded brainwaves, at rest / whole session / scene N" with a time scale; "what the model reads" on the 4 s window; the legend (`LIVE` or `REPLAY`, "the model's reading, every half second", and one quiet "EXPERIMENTAL MODEL" tag; no accuracy number on the stage, per the owner); strip axis "1 Garn" / "0", the "scene N" tag, the cue words under the ribbon. A visually hidden line repeats the gauge's value for screen readers.

**Interaction**: after the result, tap, drag or arrow-key the session strip to bring another scene into view; the gauge moves to the model's reading for it (scene 13 reads 0.42).

**`GarnScalp`** (`./scalp`): the scalp map as a small standalone figure with its key.

**Harness only**: Play / Reset; the reading line under the stage; "How do we know?" sheet. `?bare=1` = marks only (posters), `?skin=light` = token example. Posters `public/_posters/garnmeter.jpg` and `garnmeter_portrait.jpg` were re-rendered from this stage in r4 (bare, settled result, DF tokens).

**Downloads**: `session_eeg.bin` 1.61 MB, `session.json` 4 KB, `card.json` 14 KB, `topomap.json.gz` 19 KB on mount. Live adds `garn.onnx` 0.52 MB plus the shared onnxruntime-web runtime; replay adds `outputs.json.gz` 139 KB.

**Display choices that are not model output**: big artefacts are bent by a soft limiter; the zoomed-out view is a min/max envelope; the electrodes' glow is the trace's own amplitude; the gauge travels between two outputs but the number printed is always an engine value. The module asks for the wasm backend for this model (`preferBackends('garnmeter/garn', ['wasm'])`).

**Gaps**: touch checked only in an emulated browser; the animation plays the finished result (it does not stream window by window); on a busy laptop the live model can hold the calibration beat for several seconds.

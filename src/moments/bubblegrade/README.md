# BubbleGrade moment: "you can hear it" (stage only)

The real Doppler heart clip drawn as the log-mel picture the model itself read. Press: the clip plays aloud, a playhead
crosses it, the sound it has heard brightens, the model's attention tints it column by column, and the bubble grade
settles on its own gauge in the gutter. Since k1 (r3, 04:30) the model is seen making up its mind while the sound plays:
- **Estimate strip** (under the seconds): the running expected grade drawn as a trace in step with the audio (it is the
  needle's own value at every past moment), a dot for what each 5-s slice says on its own, a flash and a ring on the
  trace's head each time a slice lands, and a level line plus "final 2.82" when the grade locks at the end. Its grade
  axis is **zoomed** to the smallest 0.1-snapped range that holds every reading (at least 0.4 tall), and says so:
  "zoomed in: grade 2.5 to 3.1 of 0 to IV", the range's ends on the axis, and a bracket on the 0 to IV gauge.
- **Side panel** (left column; a band on top on a narrow stage): a drawn chest with the probe spot over the heart
  ("probe over the heart", marked "AI-generated illustration"; it carries no measurement). The heart pulses with this
  recording's own low-band loudness (the spectrogram's lowest 16 mel bands, smoothed) and glows with the bubble-map
  value at the playhead. Under it, "chance the grade is at least" IV / III / II / I: the newest slice's P(grade >= k)
  while listening (a trail shows where each bar was, a flash marks each change), the whole clip's `clip.pGe` at the
  end; the grade is the highest bar past the middle line (0.5), exactly as the engine counts g.
No title, action card or navigation: the page adds those.
Harness: `#/moment/bubblegrade`.
```tsx
import BubbleGradeMoment, { type BubbleGradeMomentHandle } from '../../moments/bubblegrade'
<BubbleGradeMoment ref={ref} onResult={(r, act) => …} onState={…} style={{ height: '62svh' }} />
// the page's main button, inside its tap handler:  ref.current?.run({ sound: true })
```
Give the root a height (className or style); it fills its box. It sets `data-qa="hero"`, `data-ready`, `data-state`,
plus `data-source` (live | precomputed), `data-beat`, `data-grade`, `data-alert`, `data-clip-s`, `data-sound`,
`data-paused` (1 while stopped mid-clip) and `data-technician` (the technician's grade for the clip).

**Props.** `sampleId` (default `grade-3`; never showcase `grade-4`) · `mode` `auto | live | replay` (auto: real model on
a laptop; stored outputs on a phone, after a failure, and for pinned frames) · `state` `idle | result` (pins) · `t` ms
(pins the clock) · `onResult(result, act)` at the settled result · `onState(state)` · `onLive({clipS, slices, grade,
E, A, alert})` once per heard slice, so the page can change its status word once · `onLoading(0..1 | null)` ·
`rate` (silent clock speed, default 3) · `bare` (specimen and marks only, as in the posters) · `className`, `style`.
**Ref.** `run({ sound? })` (with `sound: true` the clip is heard at 1x, unless the person has muted it with the speaker
button; if the sound cannot start within 3 s it goes on silently), `reset()`, `seek(seconds)`, `setSound(on)`,
`restyle()` (re-read tokens after a theme change).
**The one interaction.** Drag (or arrow keys, Home, End) on the picture moves the playhead; release plays on. Space
pauses and resumes; while stopped the time chip reads "paused at 3.2 s". A tap on the idle picture starts with sound.
**Words on the stage** (all in the component): "heart sound, 15.7 s" (top left, always) · "bubble grade" (names the
gauge) · seconds under the rail every 5 s · "model attention" with a swatch of the tint · "model: alert" or
"model: no alert" beside the needle · "technician" at the technician's grade, shown only at the result · strip:
"running estimate", "each slice alone", "zoomed in: grade a to b of 0 to IV", the running value (two decimals, "final"
at the end), "the first reading lands after 5 seconds" before it · side: "probe over the heart", "AI-generated
illustration", "chance the grade is at least", "latest 5-second slice" / "whole clip", "the grade is the highest bar
past the middle line".
**Layout.** The stage splits itself by size: a side column (21.5% of the width, 204-310 px) on stages 700 px or wider,
a top band (112-150 px) below that; the strip takes 21% of the height (96-176 px). A short stage drops the band first,
then shrinks and drops the strip, so the sound picture keeps at least 160 px. `bare` shows the sound picture only.
**Tokens** (set on the root or any ancestor; plain colours, they are also read into the canvas):
`--m-stage` #0a222e stage and silence · `--m-ink` #e2f1f2 loudest sound, playhead, labels · `--m-ink-2` quiet labels ·
`--m-mark` #ff8f3a the attention tint · `--m-mark-hot` #ffe8be the ridge line · `--m-accent` (default = ink) needle
once the alert is on, focus ring; set it to the status colour only if the needle is your status mark ·
`--m-font` Newsreader · `--m-font-mono` Geist Mono. Light skins work: `?theme=paper`.
**Beats** (one clock; while listening, clock ms = clip ms; times for `grade-3`, 15.7 s; `?t=<ms>` shows the exact frame):
- `listen` 0 to 15,696: playhead = clip time. Left of it the picture is at full strength. The tint (one flat colour
  per column, strength = 0.62 x the bubble-map value, no pitch meaning) and the ridge (height = the same value,
  0 to 1) rise 0.6 s behind it. The bracket is the 5 s the model hears.
- `first-slice` 5,000: the first 5-s slice is heard, so the needle appears at the grade so far (running mean) with
  its words. They read "model: alert" once the running P(grade >= III) has reached tau; that happens once.
- `slices` every 1,000: the needle and the strip's trace glide (600 ms) to the running mean; its last stop is exactly
  `clip.E`. The lit numeral is the running grade. The slice's dot pops in on the strip, the head flashes (900 ms), the
  bars move to that slice's own P(grade >= k).
- `settle` 15,696 to 16,596: playhead and bracket leave; the lit numeral is `clip.grade`; the technician's grade is
  underlined and named, so a miss (`grade-4`: technician IV, model III) is drawn on the gauge. The strip's level line
  sweeps in, the chip lifts off the trace and reads "final", the bars switch to the whole clip.
Silent runs play the clock at 3x (about 6 s). With sound the audio element is the clock (1x). Reduced motion: end state.
**Downloads.** Idle and replay: `samples.json` 4 KB, `precomputed/<id>.json` 5 KB, `<id>.spec.u8.gz` 45-80 KB. Sound
(the first run with sound): `clips/<id>.wav` 0.33-0.58 MB. Live (first run on a laptop): the 29.4 MB model in two
parts plus the shared onnxruntime-web files; 1.2-2.8 s here, then every run starts at once.
**Tags the page must show.** `LIVE` or `REPLAY` from `result.source` (in layer 2: "precomputed by the same model").
The stage carries "model attention" itself (`HONESTY.bubbleMap` in layer 2). With the action show `HONESTY.card`.
**Gaps.** Not tried on a real phone (Edge emulation only). `grade-0` barely moves even zoomed (0 to 0.4): that is
the model's real output, shown as a flat line. The tint says when, never which pitch. Idle shows the
stored picture even in live mode. Dropped files, gain and crop are not wired.

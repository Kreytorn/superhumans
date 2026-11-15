# VeinSqueeze moment: "the wink"

Stage only: two real ultrasound clips, the model's marks, one hold control. No title, number card or action card.
`import { VeinSqueezeMoment } from '../../moments/veinsqueeze'` · harness `#/moment/veinsqueeze` with `?state=idle|result`, `?t=<ms>`, `?sample=clip-a..clip-f`, `?mode=auto|live|replay`, `?poster=1`.

## Props (all optional) and ref
- `sampleId` (`"clip-a"`): the clip the page is about. a/b show the same-patient pair A + B; c/d show C + D (two patients); e and f show one clip.
- `mode` (`"auto"`): auto = live `analyze()` on a laptop, `replay()` on a phone (coarse pointer or under 700 px) or when the model fails.
- `state` `"idle" | "result"`: jump there with no animation; the stage stays usable. `t` (ms): pins the timeline, input is ignored.
- `onResult(result, act, all)`: fires when the result settles; `result` and `act` belong to `sampleId`, `all` has every clip on stage.
- `onState(state)` idle, running, result, error · `onMode("live" | "replay")` · `onReady()` · `bare` (no words, no control) · `spaceKey` (true: Space anywhere presses) · `className`, `style`.
- Ref: `run()` plays it through without a hold, `reset()` goes back to rest. Letting go of the control at any point (a tap, a short hold, a scripted click) also plays the rest through to the result; only `reset()` goes back to rest.
- Root: `data-state`, `data-ready` (with `state` or `t` set it waits for that frame), `data-pinned`, `data-beat`, `data-press` (0-100), `data-mode`, `data-layout` (`row` in a wide box, `col` in a tall one). It fills its width at 16:10; give it a height and `aspect-ratio: auto` to size it yourself (frames crop to fit, centred on the vein).

## Tokens (set on the root; every colour and font comes from these)
`--m-stage` background · `--m-ink` words and the classifier's bar · `--m-ink-2` quiet words · `--m-line` chart rules · `--m-mark` what the model drew (outline, curve, lowest point) · `--m-accent` the viewer's press (hold fill, focus ring) · `--m-font` · `--m-font-mono` (the Space key cap only) · `--m-radius` frame corners · `--m-pad`, `--m-gap`.
Optional (added in the k2 notes pass, unset by default): `--m-chart-h` fixes the height of the squeeze chart under each picture. Default: 27.5% of the stage height in a wide box (96-270 px; about 238 px in a 1440x900 window), 12.5% in a tall one (72-140 px). The pictures take the rest, so a taller chart makes them wider than tall (about 1.66:1 at 1440x900) and the canvas shows the full width of each real frame, cropped top and bottom around the vein; never stretched.

## Beats (`timeline.ts`: `pose(t)` is a pure function of the clock; reduced motion shows the end state)
| Beat | ms | What it shows about the model |
|---|---|---|
| rest | 0 | Both clips at their first real frame, each with SAM 2's stored outline of that frame drawn in yellow and the word "vein" inside it: one shape per picture to bet on and to press. Where SAM 2 was given an artery click, the word "artery" sits at that click. Under the pictures the bet, written from the expert labels on stage ("One of these veins has a clot."), and the rule at the same weight ("A healthy vein squashes flat when pressed."): side by side in a wide box, both under the first picture in a tall one. The control says "Hold to press on both veins". No chart yet. |
| outline | 0-450 | The press arms: the outline tints, "vein" leaves, the bet gives way to the chart. |
| press | 450-3050 | The hold. Real frames in clip order, from the first frame to the frame where SAM 2 measured the smallest area. The still part of the clip runs by in the first 15% of the hold; the last 1.5 s of real clip before the lowest point fill the rest, so the vein is moving for most of the press. The outline tracks every frame; the dotted shape marked "start" is the outline on the first frame; the curve (vein area against its start) draws to the playhead. Let go and it plays on to the result. |
| band | 3050-3850 | The lowest point lands with its value ("43% of start"), the rest of the clip's curve follows dimmed, then the band word from `squeeze.band` (the 50% and 10% rules are the band limits, our product rule). On clip A the words "view shifts here" appear on the picture under "start" (model brief: its dip is a view shift, not a squeeze). |
| opinion | 3850-5050 | Only now the classifier's `clotProb` per clip: "AI clot chance", bar, value. The first row carries the tag LIVE or REPLAY (`result.mode`), which exists only with that row. "above alarm" / "below alarm" (`result.aboveTau`) is said once, on the row with the highest value; the small triangle under every bar is the alarm threshold `result.tau` at its true place. With the values, the expert's label lands in the corner of each picture ("Expert: clot" / "Expert: no clot", `sample.expert.thrombosis`): the answer to the bet. Clip F adds the tag "False alarm". The clock waits at 3850 until the model has answered. |
| settled | 5050 | `data-state="result"`, `onResult` fires. Holding again replays from the press and re-runs the model. |

## What every mark is (nothing on stage is unlabelled)
Yellow outline: SAM 2's outline on the frame shown ("vein" at rest) · "artery": SAM 2's stored artery click on the first frame · dotted outline + "start": the outline on the first frame · chart "vein area" (said once, on the first chart), ticks start / 50% / 10%: area against the start of the clip · dot + "64% of start": the lowest point (`squeeze.rMin`) · bar + value: the classifier's clip value, linear 0-100% · triangle: the alarm threshold · "Expert: clot / no clot": the dataset's expert label, not the model.

## What it downloads
Replay path about 1.7 MB: two webm clips (0.54 + 0.83 MB), two SAM 2 JSON (0.25 MB), samples and stored outputs (under 10 KB), two fonts (53 KB). Live adds the 20.3 MB model and two 0.8 MB model inputs, fetched once the clips are on screen and run once to warm up (that run is thrown away; the press starts its own). In memory: 48 decoded frames per clip (30 on touch), about 44 MB.

## Tags (three words or fewer each)
- `LIVE` or `REPLAY`: the stage prints it itself, on the "AI clot chance" row (`[data-tag="mode"]`). A page must not print a second one, and never before a result exists (at rest it would read as a live scan).
- `Best case` for A + B: the page shows it; the sentence is `HONESTY_HERO_PAIR` in `result.honesty`.
- Inside "How do we know?": every line of `result.honesty`, `HONESTY_SQUEEZE`, `HONESTY_BANDS`, `HONESTY_HELD_OUT` and `act.caveats`, verbatim. Also there: every shipped clip is above the alarm threshold, clip B's 1.3% included (the stage says "above alarm" once; the screen-reader line says it per clip).

## Gaps
- Clip B's band word is "partly closed" (SAM 2 lowest 43%), not "closed fully"; the stage prints the engine's word. C + D (`sampleId="clip-d"`) winks harder (16%) but is two patients and not the best-case pair.
- Clip A stays round for the whole hold and only jumps at the very end, where the view shifts. "view shifts here" is a per-clip note from the model brief (`LOWEST_NOTE` in index.tsx), not an engine field.
- "artery" after the first frame: SAM 2 stored the artery click for the first frame only. On clip A the word follows the centre of the vein outline (hand-checked on the frames: it stays on the artery through the view shift; `ARTERY_FOLLOWS`). On clip C it is shown at rest only. B, D, E, F have no artery word (no click, or the click is on a later frame).
- The threshold triangle sits at 0.55% of a linear bar, so it is at the bar's left end by design. `act()` is the same flight-surgeon tier for A and B.
- Clips are webm only: a browser that cannot decode them gets the error state with a retry, no still image. C to F are 170-190 px wide sources, so they look soft at 1440.
- Touch was checked in phone emulation only, not on a real phone. Clip F has no outline, so it shows frames, the expert label and the AI value only.
- In a tall box at rest the space under the second picture is empty (the chart takes it once the press starts).

## k2 notes pass (r3, Sun 15 Nov 04:30)
Owner's note: "stretch the images a little on their width ... make the graph below a little bigger". Pictures went from about 690x600 to 697x420 at 1440x900 (wider than tall, full frame width shown, undistorted); the chart from about 180 to 238 px tall (phone: 80 to 101 px). Curve 3 px with a glow of its own colour; while the press runs the dot is a white-hot pen with a halo; the lowest value and the AI line are larger (value up to 32 px, bar 8 px thick and up to 230 px long). Bet sentences up to 54 px. Hold control 60 px tall, 18 px type. Fixed: in a wide box the rule line was printed twice at rest (under both pictures). On a phone the AI line no longer wraps, so the pictures keep their size when the values land. Props, ref, root attributes and all `--m-*` tokens unchanged.

# TrackTrace moment (stage only)

`import TrackTraceMoment from '../../moments/tracktrace'`. It fills its parent (give the parent a size) and draws one canvas plus a few words on the stage. No title or navigation. Harness: `#/moment/tracktrace`.

**Props**
- `sampleId`: a gallery nucleus id **pins** the stage to that nucleus (as before; `nucleus-238`, `nucleus-239`, `nucleus-241` all still work). **Left out (new default): a pool.** Every visit (mount) and every new run shows the next nucleus of a shuffled pool of 14 real held-out nuclei (`pool.ts`), never the same one twice in a row and no repeat until all 14 have been shown (the deck is kept in `localStorage`, key `ttm-pool-v1`; the very first visit opens with `nucleus-238`). `pool` (new, optional): your own list of gallery ids to cycle through instead. `stepper` (new, default true): the on-stage "Next nucleus" pill; `false` hides it. `onSample(id)` (new): the nucleus now on stage. `mode` `auto | live | replay`: auto runs IonScan live on a laptop, and replays stored outputs on a phone (coarse pointer or under 700 px), when pinned, or after any failure.
- `state` `idle | result` pins the stage; `t` (ms) pins the timeline (see the new beat times below). A pinned stage with no `sampleId` shows the pool's first nucleus, `nucleus-238`, so stills stay the same. Reduced motion jumps to the end state.
- `promise`: the one line on the idle stage, saying what pressing will find (a default is built in; `''` removes it). It fades out when the reading starts.
- `onResult(result, act, well)` once per run at the settled result (`act` = whole-sample "what to do next", from the engine). `onState(state)`, `onReady(bool)`.
- `onBeat({ beat, scan, count, read, line, picked })` on every change, so a page can land its own words in step.
- `annotate` (default true) draws the words; `tapToRun` (default true) lets a tap on the idle nucleus start it. `className`, `style`.
- Ref: `run()`, `reset()`, and new `next()` (step to the next pool nucleus; from idle it lands idle, after or during a run it reads the new one at once; no-op when pinned). `run()` on a nucleus that was already read moves to the next one first (with a pinned `sampleId` it replays the same one, as before). Key `N` on the focused stage = `next()`. Root attributes: `data-ready`, `data-state`, `data-beat`, `data-count`, `data-line`, `data-read`, `data-picked`, `data-picked-source`, `data-source`, `data-narrow`, `data-sample` (id on stage), `data-step` (1 = the pool is active), `data-swap` (1 while one nucleus fades out for the next).

**Tokens** (set on the root or any ancestor)
`--m-stage` #0b0f12 stage, `--m-specimen` #ece7db nucleus brightness, `--m-ink` #f4f2ec reading light, text, and the stage's own pointer (the frame on a tile and the thin line to the lens), `--m-ink-2` #8a9299 grid, lens rim, second text, `--m-mark` #ff4fb0 only what the model drew (circles, line, centre dots), `--m-accent` #fff only the rings on the ten most-weighted nuclei, `--m-font` (inherits), `--m-font-mono` (tags), `--m-size` 15px. Colours are read when the sample loads: after changing them, remount (change `key`). The stage is dark because the micrograph is; seat it on a light page.

**Beats** (one clock, about 11.2 s, 1.6 x slower than the first cut so each beat can be read; `BEATS` and `BEAT_TIMES` are exported, read the times from there)
| ms | beat | what it shows about the model |
|---|---|---|
| 0 | specimen | the nucleus, scaled up until it bleeds past the stage edges, with the promise line |
| 0-700 | tokens | the camera eases back to IonScan's whole 128 x 128 input, which becomes the 32 x 32 grid it reads |
| 700-3100 | scans | eight scans, 300 ms each, in the real order: rows, columns, both diagonals, each forward then backward. The token being read is lit; the trail behind it is as bright as the input it read. It repeats until the model answers (at most 9 s after the press; then the stored outputs are shown, tagged REPLAY) |
| 3100-4900 | foci | live only: the decoder's probability map blooms; then a circle (the decoder's own centre and radius) lands on each part above 0.5, one after the other (up to 150 ms apart, 440 ms each). First circle at about 3.6 s |
| 4900-6100 | line | the geometric line fit grows from its centre to the engine's p0 and p1 and no further (620 ms), only if the rule fired; circles on it get a dot; "no straight line" otherwise; then a hold to read it |
| 6100-8100 | pullback | no cut: the view opens until the nucleus is one framed tile among the 583 of its sample; the lens docks outside the mosaic (left column on a wide stage, top band on a phone) |
| 8100-10300 | sample | tiles light in batches of 16 in scan order, each with a dot per stored circle centre |
| 10300-11200 | verdict | the ten nuclei the sample model weighted most are ringed (all ten always visible) and named in the sample sentence |

**The pool** (`pool.ts`, all held-out, chosen by look and by label, never by result). Ten come from the one sample whose images ship (`P242_G4`, iron ions), so their runs pull back to the 583-nucleus grid: `nucleus-238`, `-003`, `-007`, `-011`, `-004`, `-010` (line drawn), `-009`, `-000` (several spots, no line), `-013`, `-012` (one spot). Four come from other samples and end at 6100 ms on the nucleus (`act` then comes from their sample's stored verdict): `-239` (iron ions, five spots in a line), `-241` and `-146` (X-rays, scattered, no line), `-038` (not irradiated, no spots). The deck never deals two of those four in a row. Swapping nuclei is a 0.2 s fade out and a fade in, and the new nucleus rests 0.65 s before its reading starts; the 583-tile sheet is built once and reused. Every count and line on screen is the engine's output for that nucleus (checked for all 14 in `k1.mjs`).

**The interaction:** after the result, point at any nucleus (hover, tap, drag, or arrow keys; Escape goes back): its tile gets a frame and the docked lens shows it with its count as the large number beside the lens. On a laptop IonScan runs live on it (about 0.1-0.15 s, tagged LIVE, real circles). On a phone it shows the stored outputs (tagged REPLAY): those hold centres only, so they are drawn as centre dots, never as circles with a made-up size.

**Next nucleus:** a pill on the stage (bottom-left corner at idle; beside the count and the LIVE / REPLAY tag at the result). It is drawn only when the pool is active (`data-step="1"`). With `annotate={false}` it stays in the corner at the result too.

**Downloads:** idle 0.24 MB (index 163 KB + one nucleus file 59-79 KB). Behind it for `nucleus-238`: the sample, 3.9 MB (3.8 MB images, 84 KB outputs, 33 KB verdicts). Live mode adds the two models, 13.7 MB, plus the onnxruntime runtime.

**Words and tags** (the stage draws them itself unless `annotate={false}`; a page that writes its own must keep the same two tags)
- Tag 1, beside the lens: `LIVE <ms>` or `REPLAY`, for the nucleus the lens shows now (`data-picked-source`, else `result.source`).
- Tag 2, beside the sample sentence: `precomputed` (the 583-nucleus scan is always the stored replay).
- `geometric line fit` (`HONESTY.lineLabel`) is plain second-line text under "N in a straight line", not a tag. `HONESTY.batch` goes in "How do we know?" wherever the sample verdict is shown.
- Never show `result.trackDir`. The scans show reading order only, never a found direction. Never extend the line past p0-p1.

**Gaps:** not tried on a real phone (emulated touch only); the pull-back draws 583 tiles per frame and may drop frames on an old phone. On a phone the tiles are about 15 px, so pointing is easier by dragging than by tapping. A pinned `t` or `state` always uses stored outputs unless `mode="live"`, and never shows the idle promise line when pinned past the start.

# RESULT: TrackTrace moment, k1 polish (r3, Sun 15 Nov, 04:20, from the owner's feedback, built by Claude)

**His words.** "the image changes from a pool of whatever is available... not same image over and over. Animation a little too fast also the grid is really cool."

**Changed.**
1. **A pool of 14 nuclei instead of one** (`pool.ts`): ten from the shipped sample (all pull back to the 583 grid: six with a line, two scattered, two with one spot) and four from other samples that end on the nucleus (iron low dose with a perfect line, two X-ray, one not irradiated with no spots). Every visit and every new run deals the next one from a shuffled deck: no repeat until all 14 are used, never the same twice in a row, never two "ends on the nucleus" runs in a row. `sampleId` still pins one nucleus. New optional props `pool`, `stepper`, `onSample`; new ref method `next()`.
2. **A "Next nucleus" pill on the stage** (corner at idle, beside the count at the result; key N). After a result it reads the new nucleus at once. Swaps fade, no hard cut.
3. **Slower timeline: 11.2 s instead of 7.0 s** (1.6 x). Scans 300 ms each (was 175), circles land one by one over 1.7 s (was 0.9 s), the line grows in 0.62 s and holds 1.2 s, pull-back 2.0 s, sample read 2.2 s, verdict 0.9 s. `?t=` and `state` pinning and reduced motion work as before (`BEAT_TIMES` carries the new times).
4. **The grid, the lens and the colours are untouched.** Posters not refreshed: the default look (nucleus-238 at the result, pinned) is the same picture.
5. **Late fixes (04:25).** A frame pinned past the start (`state=result` or `t>0`) no longer shows the idle promise line fading out behind the lens (it ghosted in pinned stills and in pages that mount at the result). The live-run wait is capped at 9 s instead of 20 s: on a slow first model load the scans no longer loop for 20 s; the stored outputs are shown, tagged REPLAY.

**Checked** (`k1.mjs`, shots in `work/Web/shots/moment-tracktrace/k1/`). All 14 pool nuclei at the result: count and line equal the engine's stored outputs (14 of 14); the ten in-sample ones reach the verdict beat. Two passes of the deck: 14 different nuclei each, different order, no back-to-back repeat. Flow at 1440 and at 390 (phone emulation): first visit nucleus-238, run, Next (auto-read), "read another", reload = a new nucleus. Type-check clean for this folder (whole app, 0 errors at 04:22). Rounds r4 (pinned film, idle and result at 1440 and 390, pool of 14 re-checked: 14 of 14 equal the engine) and r5 (live flow at both sizes after the fixes; first run 18.8 s on this busy machine, was 35 s).

**Gaps.** Not tried on a real phone. Pages that pass `sampleId` (protos A, B, D) stay on nucleus-238 by their own choice and get no pill. A page that keys its own captions to fixed millisecond values (not `onBeat`) would be out of step with the slower clock. In dev, a hot reload of the page counts as a new visit, so the nucleus changes. `qa.mjs` (the older check script) still holds the old millisecond values. Gate re-run at 04:29: PASS at 1440 and 390, 10 controls, 0 dead (`work/Web/shots/moment-tracktrace/k1/gate/`).

---

# RESULT: TrackTrace moment (r3, Sun 15 Nov, 01:30, fix batch after review, built by Claude)

**What it is.** The TrackTrace stage as one reusable component (`index.tsx`): the real nucleus bleeding past the stage with one promise line, IonScan's 32 x 32 grid and its eight scans in the model's own order, circles landing where the foci decoder fired, the line only when the rule fires, then a pull-back with no cut to all 583 nuclei of the sample and the sample verdict. About 7 s (first circle 2.1 s, verdict 6.4 s). One timeline, a pure function of a clock (`stage.ts`). The interaction: point at any of the 583 nuclei; the lens, docked outside the mosaic, shows it with its count as the one large number.

**Routes.** `#/moment/tracktrace` with `?state=idle|result`, `?t=<ms>`, `?sample=nucleus-239|nucleus-241`, `?mode=live|replay`, `?annotate=0`, `?bare=1`. Posters: `app/public/_posters/tracktrace.jpg` (1600x1000), `tracktrace_portrait.jpg` (900x1200). Shots: `work/Web/shots/moment-tracktrace/fixed/` (gate report in `fixed/gate/`).

**Fixed in this batch.** White rings are named in the sample sentence and all ten always show (the lens no longer sits on the mosaic). Two tags only: LIVE or REPLAY beside the lens, `precomputed` beside the sample sentence; "geometric line fit" is plain text. The line stops at the engine's p0-p1 (`extendLine` deleted). Stored nuclei under the lens get centre dots, not circles of an invented radius. The frame and thin line that point from a tile to the lens are drawn in ink, not in the model's colour. Harness: light page, bar of fixed height (stage 728 px at idle, running and result on a phone).

**Checked.** Type-check clean (whole app, 0 errors). Gate passes at 1440 and 390: 14 controls, 0 dead, budget inside the limits (result: 41 words, 9 blocks, 3 numbers). Counts equal the engine: `nucleus-238` 8 spots, 6 in line; `-239` 5 and 5; `-241` 8, no line. Laptop LIVE 123 ms; live lens 152 ms. Reduced motion lands on the end state.

**Gaps.** Not tried on a real phone. Only `nucleus-238` has a sample to pull back to; the other nuclei end on the nucleus with a row of words, not the large number. Phone tiles are about 15 px. Frame rate of the pull-back not measured. Tokens are read at load, so a restyle needs a remount. onnxruntime prints two warnings through `console.error` when the model loads (engine, not this folder); the gate counts them when they fall inside its window.

**Added.** Nothing installed. The harness imports two installed Fontsource faces, Schibsted Grotesk and Spline Sans Mono (both OFL 1.1); the moment inherits the page's fonts. `qa.mjs` is a dev-only check script. **Defaults I caught.** Cyan or amber marks on black; a scan beam as decoration; a floating lens that covered what it pointed at; a corner status tag; the pointer drawn in the model's colour. Kept on purpose: a mono face on the two honesty tags only, and a dark stage on a light page, because the micrograph is dark.

**Ideas for the full build.** Open with `nucleus-238` beside `nucleus-241`, "which one met the iron ion?", then run both. Show the count under the lens against NASA's 2016 count.

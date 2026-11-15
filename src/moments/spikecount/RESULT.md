# SpikeCount stage, NOTES version (k2, Sun 15 Nov 2026, 04:35)

**Owner's notes applied**
1. Image large: two 545 px squares at 1440 x 900 (was one small photo); full width (366 px each) on a phone.
2. Image + image + number: the raw microscope photo with the outliner's outlines | the same field with every cell lit in its grade colour | the spiky % with a grade bar, a lens on one cell, and what to do next.
3. Line and outlines in step: one clock; all drawing is clipped to the sweep line, so an outline appears exactly as the line passes it, and the cell is counted when the line clears it (checked at 600, 1500, 2600, 3700, 4640 ms).
4. More real spiky material: a strip of 12 real graded cells (2 per grade, smooth disc to grade 4, plus cup) from the gallery, enlarged, each with this photo's count; press a grade to show only those cells. Idle shows one real grade-3 cell enlarged: "Looking for spiky cells like this".

**Route:** `#/moment/spikecount` (`?state=result`, `?t=<ms>`, `?sample=field-81|121|184`, `?mode=live|replay`, `?bare=1`).
**Shots:** `work/Web/shots/k2/spikecount_k/screen_1440.png`, `screen_390.png`; rounds in `r1`-`r4`. Posters refreshed in `app/public/_posters/`.
**Extra material:** none added; all from `app/public/spikecount/` (RedTell, CC BY 4.0).
**Unfinished:** the live run tonight (machine shared by many agents) took over 30 s to load the 45 MB models and fell back to REPLAY, as designed; on an idle laptop the brief measures about 3 s. Not tried on a real phone.

**r4 (Sun 15 Nov, the owner's note: "remove scrub bar and day pick, and a second page with an architecture diagram")**
- Harness `#/moment/spikecount`: one main button only; no scrub bar, no day picker (tests still pin through `?state`, `?t`, `?sample`). On a phone the page scrolls, not the stage, so the scroll is reachable by keyboard (axe `scrollable-region-focusable`).
- DF page `#/proto/DF/spikecount`: opens on field-96; below the stage, the problem, then the architecture figure (`app/public/spikecount/architecture.*`, title "SpikeCount, two networks in a row"; its grade colours now match the stage's).
- While the two models load on a laptop (live run), the panel keeps its idle look (the real grade-3 cell, the two networks; root `data-pre="1"`) instead of a big "0" and a row of zero counts. On a 320 px phone the grade notes wrap instead of being cut.
- Shots: `work/Web/shots/r4qa/spikecount/`.

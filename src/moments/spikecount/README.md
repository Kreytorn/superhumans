# SpikeCount moment (stage only)

`import SpikeCountMoment from '../../moments/spikecount'`. It fills its parent (give the parent a size) and draws two square canvases, the number, and a strip of real example cells. No title or navigation. Harness: `#/moment/spikecount`.

**Layout: image + image + number.**
- Square 1, "Microscope photo": the real held-out field (572 x 572 grey) with the outliner's outline around every cell (border cells dashed).
- Square 2, "As the model reads it": the same field on a dark ground, every cell lit in the colour of its grade.
- The number: spiky % of the field (counts up as cells are graded), "N of M cells", a bar of the six grades, a lens (the model's own 96 px crop window of one cell, enlarged), and "What to do next" (tier name + headline from `spike.act()`), with the `LIVE <ms> · WebGPU` or `REPLAY · precomputed with the same model` tag.
- Below: "What “spiky” means": six groups of two real cells each (`app/public/spikecount/gallery/`, expert-outlined cells that expert and model graded the same), smooth disc to grade 4, plus cup; each shows how many cells of that grade the model found in this photo. Pressing a group (after the result) shows only those cells in both squares.
- Phone (under 760 px wide, `data-narrow="1"`): the number on top, both squares full width stacked, the cells in a 3 x 2 grid; the stage scrolls vertically inside itself.

**Props**
- `sampleId` one of the 31 held-out fields, `field-<n>` (default `field-96`). `mode` `auto | live | replay`: auto runs the two real models on a laptop, and replays the stored outputs (`replay()`) on a phone (coarse pointer or under 700 px), and after any failure or a 30 s timeout.
- `state` `idle | result` pins the stage; `t` (ms) pins the clock. Pinned stages use the stored outputs.
- `promise`: the one line on the idle stage (`''` removes it). `tapToRun` (default true): a tap on an idle square starts it.
- `bare` (optional): the two squares only (used for the posters).
- `onResult(result, act)` once per run at the settled result; `onState(state)`; `onReady(bool)`. `className`, `style`.
- Ref: `run()`, `reset()`.
- Root attributes: `data-ready`, `data-state` (`idle | running | result | error`), `data-phase` (0 before the sweep, 1 sweeping, 2 number landed, 3 next step up), `data-count` (cells cleared by the line), `data-spiky`, `data-source` (`live | precomputed`), `data-narrow`, `data-bare`, `data-pick` (the grade being shown alone, or empty), `data-pre` (1 before the reading: idle, or a live run still loading the models; the panel keeps its idle look then).

**One clock** (`BEAT_TIMES`, exported): the sweep line crosses both squares at the same x from 450 to 4650 ms at constant speed; 4780 the % lands; 5200 "What to do next"; 5700 end.
**Line and outlines are in step by construction:** everything the models drew is clipped to the line, so a cell's outline is drawn exactly where the line has passed, flares while the line is on it, and the cell is counted (number, bar, strip counts, lens) the moment the line clears its right edge.

**After the result:** point at (or tap) any cell: it lights in both squares, a chip names its grade and confidence, and the lens shows it enlarged. Press a grade in the strip to show only those cells.

**Tokens** (set on the root or an ancestor; colours are read when the sample loads)
`--m-stage` #05070a stage, `--m-pane` #04060a ground of square 2, `--m-ink` #f3f1ea text and the sweep line, `--m-ink-2` #8f99a4 second text, `--m-rule` hairlines, `--m-c-disc` #58c8ff, `--m-c-e1` #ffd75e, `--m-c-e2` #ff9d3f, `--m-c-e3` #ff5b52, `--m-c-e4` #ff3d94, `--m-c-cup` #b9a0ff (grade colours), `--m-font`, `--m-font-mono`, `--m-size` 15px.

**Truth:** every outline, grade, count, % and next step on screen is the engine's output for that field (`replay()` stored Python run of the same two models, or `analyze()` live). The example cells are labelled as examples of the classes, not live output. The foot line shows `HONESTY.data`, `HONESTY.notDiagnosis` and `HONESTY.oneFieldOneSample` verbatim. No drawn or generated pictures.

**Material:** fields, gallery cells: RedTell (Sadafi et al. 2023, Front Physiol 14:1058720, Zenodo 7801430, CC BY 4.0), already shipped in `app/public/spikecount/` (see its `manifest.json`).

**Checks:** `node src/moments/spikecount/qa.mjs <port> <outDir> [all|shots|posters|live|sync]` (installed Edge via playwright-core). Posters: `app/public/_posters/spikecount.jpg` (1600 x 1000) and `spikecount_portrait.jpg` (900 x 1200) are `?bare=1&state=result` at those sizes.

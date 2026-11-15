# WORLDS, "Six worlds" (r3, Sun 15 Nov; polished 05:00-05:35)

**Idea.** One small solar system fills the screen and is the home page. Each of its six worlds wears one of our real samples as its surface, lit by one sun. Press a world: the others fade, time stops, the camera flies in, the world turns to face you and becomes the plain real sample, and the check's working screen opens beside it. Back resumes time and pulls the camera out.

**Routes.** `#/proto/WORLDS/home`, `#/proto/WORLDS/<tracktrace|bubblegrade|spikecount|veinsqueeze|braindrift|garnmeter>` (direct links land flown in). `?still=1` shows the no-WebGL still. Dev server: port 5323.

**Polish pass (05:00-05:35).**
- Worlds now orbit fully round the sun, inner ones faster (about 50 s for TrackTrace, about 5 min for Garn Meter); the opening view is still the composed one.
- Real bloom (`@react-three/postprocessing`, mipmap blur, half resolution, threshold 0.88): the sun and the brightest rims glow.
- Blood-cell belt: each cell now shows its own membrane and spikes (edge from the photo's local contrast), and cells are larger, so they read as real cells from far away.
- Garn Meter world fixed: tonight's new poster is dark, so the old colour inversion turned it white.
- Name tags carry a faint backing and, on phones, the "what it is made from" line too.
- Still fallback: orbit ellipses through every world, sun-facing light and night side on each sample, glowing sun, stars, the "made from" line.
- Every check page has a scroll section (`story.tsx`, `story.css`): the problem and its story with a real picture, then how the check works, then "Back to the check" and a big "Next world". TrackTrace goes deepest: five steps of how IonScan reads a nucleus, the eight scans drawn in the model's own order (marked AI-generated illustration), 0.954 and 3.19 M, and the architecture figure on a white card in a thin frame, captioned "IonScan, our own 3.2 M-parameter network". All words are from `work/Web/cards` and `work/Web/models`.
- SpikeCount now uses the new shared stage (`moments/spikecount`); its frame is 15:8 on laptops so the % never clips.
- Test hooks: `data-qa="primary"` (TrackTrace tag on home, Run on a check page), `data-qa="hero"`, `data-state`.

**Checked.** `node qa/gate.mjs` on home: PASS (0 dead controls, no console errors; budget notes only: 17-18 text blocks). Run gives a result and a "what to do next" line on SpikeCount, TrackTrace, VeinSqueeze (1440 and 390). The story controls work at 1440 and 390 (`controls.mjs`). Type-check is clean for this folder. Shots: `work/Web/shots/polish-WORLDS/`.

**Unfinished / honest notes.**
- Bloom and the orbits were not tried on real integrated graphics or a real phone (headless Edge only); frame rate not measured.
- With full orbits a world sometimes passes behind the headline or in front of the sun, and tags can overlap for a moment.
- On a phone the still fallback is not tuned (it uses the laptop positions).
- The page-level "What to do next" box repeats the line the SpikeCount stage already shows.

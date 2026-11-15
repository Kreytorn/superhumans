# BubbleGrade w2: "the listening record" (free version)
- Idea: the real Doppler clip is drawn as a record: the log-mel picture the model read bent into a ring, model attention in orange, the waveform as an inner ring, the bubble map as an outer ridge. One press plays the sound and runs the model (live on laptops, stored outputs on phones or after 24 s); the grade lands in the hub. Around it: a 60-ms live scope, per-slice alert bars, belief over the five grades, six real recordings to load.
- Route: `#/proto/bubblegrade_w2/home` (`?state=result` pins the settled result from stored outputs; `?sample=grade-0` picks a clip). Laptops prefetch the model 1.5 s after the page settles.
- Scroll: 01 the problem (NASA photo, reticle on the astronaut), 02 where to listen (chest hologram, marked AI-generated illustration), 03 wall of the six recordings (press one to play it), 04 the work (meta.json numbers, "is it cheating?" floors, one diver's dive curve, limits), 05 what to do next (symptom checklist drives `act()`).
- Every result, number and honesty line comes from `engine/bubblegrade` (`analyze`/`replay`/`act`, `HONESTY`), `meta.json` or `dive_curve.json`; grade-4 shown as a miss.
- Extra material: `assets/eva_b.jpg` = NASA S84-27031 (Bruce McCandless II, STS-41B, 1984, images.nasa.gov), public domain. Clips: Blogg et al. 2026, Zenodo 16877955, GPL-3.0-or-later. Risk wording: research/03 (NASA HRP, Risk of DCS).
- Fonts: Big Shoulders, Instrument Serif, Geist, Geist Mono (Fontsource, OFL).
- Shots: `work/Web/shots/k2/bubblegrade_w2/` (screen_1440, screen_390, scroll_1440, plus wall and next sections; rounds in r1-r7).
- Unfinished: on this busy machine the live model took 15-45 s to open (measured 1.2-2.8 s on a quiet laptop), so pinned shots show REPLAY; not run through `qa/gate.mjs` (hero box is 33% of the first screen); not tried on a real phone.
- Dev helper: `_snap.mjs` (screenshots), safe to delete.

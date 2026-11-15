# RESULT: BrainDrift stage, k2 NOTES version (Sun 15 Nov, 04:35)

**Owner's note.** "Brain drift. So much potential here tht im not gonna say anything I bet you can crate a 10x cooler looking thing here." Kept everything the stage does (props, ref, tokens, beats, honesty tags, numbers) and made it look like an instrument reading a real brain.

**What is new on screen** (all from the shipped meshes and Model B outputs; README "Look (k2)" has the details).
1. Hologram brain: the near half is a glass shell whose 4 mm contours light as the reading plane passes; the solid half has cavity shadow, a cool rim light and a glowing cut edge; the fluid spaces are lit from inside with two glow shells (started by the earlier k2 pass, kept and tuned).
2. Entrance on a natural open: a side view of the whole brain, the camera glides in and the cut opens to the resting slice (2.6 s; skipped when pinned or with reduced motion).
3. Reading frame: a thin frame of light with 10 mm ticks travels with the reading plane while the model reads.
4. Fluid through the tissue: the ventricle surface behind the slice shows as a soft outline of light once measured.
5. Swell flare at each frame swap; a steady read trace on the glass after the read; cool class-map palette; rim-shaped legend swatch; two far washes of light in the backdrop.

**Routes.** `#/moment/braindrift` (`?state=idle|result`, `?t=<ms>`, `?sample=flight-f050`, `?mode=live|replay`, `?poster=1`, `?labels=0`, `?tags=0`, `?theme=paper`). Open it without `?state` to see the entrance.

**Shots.** `work/Web/shots/k2/braindrift_k/screen_1440.png`, `screen_390.png` (settled result); rounds `r5`-`r9` and `final/` (read beat `3900_*.png`, gate). Earlier k2 rounds `r1`-`r4`. Posters refreshed 04:31: `app/public/_posters/braindrift.jpg`, `braindrift_portrait.jpg`.

**Checked.** `tsc` clean for this folder. Every number on screen is the engine's (replay here: +9.2 % measured, put in +10.7 %; 2.4 mm against 2.46 mm). SIMULATION tag kept. `qa/gate.mjs` on `moment/braindrift`: PASS, 16 controls, 0 dead (`final/gate/gate.json`; a first run failed on a cold 22 s load and on the harness Reset during the entrance, which now ends the entrance).

**Not done.** The PVS web (Model A) is not shown: its meshes belong to three other people and do not align with the flight brain, so putting them inside it would be a false picture; it needs its own specimen. No bloom pass (kept for integrated graphics). Swell flare is subtle while the fluid is still grey. Not tried on a real phone, Firefox or Safari.

**Added.** No packages, no new assets, no network. `capture.mjs` gained `quick` and `intro` modes (dev only).

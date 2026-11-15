# BubbleGrade w1, "the listening chamber" (immersive)
Idea: the real heart recording (the log-mel picture the model reads) becomes a 3D wireframe landscape you stand in (three.js + bloom). One press plays the sound and runs the model live; the landscape rises behind the playhead, amber marks model attention, and a point-cloud sphere pulses with the loudness under the playhead.
Route: `#/proto/bubblegrade_w1/home` (`?clip=grade-0..4|dcs-dive`, `?state=result`). Shots: `work/Web/shots/k2/bubblegrade_w1/` (screen_1440, screen_390, scroll_1440 to scroll_4, run_* mid-run frames).
While it plays: a "listening now" console (a scope of the last 4 s: loudness line over attention bars, plus live meters), a countdown ring to the first 5-s verdict, then the running grade, the needle and per-slice bars. Result: grade vs technician, LIVE/REPLAY tag, act() headline + tier + symptom chips that re-run act().
Scroll: 01 problem (ISS sunrise photo, animated airlock-to-heart diagram), 02 six real clips as strips (grade IV shown as a miss), 03 after the dive (dive_curve.json: technician vs model over 321 min), 04 the work (meta.json counts, slice grades of the current clip, "is it cheating?" floors, honesty lines, credits).
Every number comes from the engine (replay/analyze/act) or meta.json / dive_curve.json at run time. Phones use replay() and say REPLAY.
Extra material: `earth_sunrise_iss074e0409626.jpg` (copied from protos/DF), NASA ISS crew photograph iss074e0409626, public domain (NASA imagery). The heart-and-vein SVG carries the "AI-generated illustration" mark.
Clips: Blogg et al. 2026 (Zenodo 16877955), GPL-3.0-or-later, credited on the page.
Unfinished: the live model can take 4-10 s to load on a busy machine (until then the tag reads LOADING/STARTING MODEL and the stored outputs drive the reveal). The diagram scrolls sideways on phones. Not tried on a real phone. qa/gate.mjs was not run.
Dev-only: `_shots.mjs` (modes all | run | final | pin | scroll).

# WORLDS, "Six worlds" (r3, Sun 15 Nov)

**Idea.** One small solar system fills the screen and is the home page. Each of its six worlds wears one of our real samples as its surface, lit by one sun: the cell nucleus with its bright damage spots (TrackTrace), a ringed world whose bands and rings are the real heart-sound spectrogram (BubbleGrade), a drifting belt of real red blood cells cut out of the microscope photo (SpikeCount), the vein ultrasound (VeinSqueeze), the brain MRI with its blue fluid spaces (BrainDrift) and a striped, pulsing world of real brainwaves (Garn Meter). Press a world: the others fade, time stops, the camera flies in, the world turns to face you and becomes the plain real sample, and the check's working screen opens beside it. Back resumes time and pulls the camera out.

**Routes.** `#/proto/WORLDS/home`, and `#/proto/WORLDS/<tracktrace|bubblegrade|spikecount|veinsqueeze|braindrift|garnmeter>` (direct links land already flown in). `?still=1` shows the still fallback used when WebGL is missing. Dev server: port 5323.

**Files.** `index.tsx` (page shell, module page, still fallback), `Scene.tsx` (three.js scene and all shaders), `stages.tsx` (hosts the five moment components and a SpikeCount stage from `replay()`), `data.ts`, `worlds.css`, `flow.mjs`, `intro.mjs`, `arch.mjs` (dev-only walk-through tests). No downloaded assets: every texture is one of our own files in `app/public/_posters/` and `app/public/spikecount/fields/96.png`; background, sun, rings and lighting are procedural shaders. Fonts: Instrument Serif, Geist, Geist Mono (Fontsource, OFL).

**Motion.** Opening move (the camera arrives from above and settles), the view leans slightly with the pointer, hovering a world lights its orbit and name tag, the tab pauses when hidden, drawing stops while a check is open. Pixel ratio capped at 2 (1.5 on touch).

**Checked.** All six worlds: press, fly in, page opens, Run gives a result and a "what to do next" line, Back and Escape return home, "Next world" flies from one world to the next (1440x900, and 390x844 with touch). No sideways scroll. Type-check clean for this folder.

**Unfinished / honest notes.**
- The worlds swing slowly along their orbits around a composed place instead of circling the sun, so no world ever leaves the screen or sits behind the headline.
- No post-processing bloom (kept light for integrated graphics); glow is drawn with additive sprites.
- Not tried on a real phone or on real integrated graphics, only in headless Edge. Frame rate was not measured.
- The still fallback is plain (round crops of the samples on a dark sky).
- From a distance the blood cells read as red discs; the real photo only becomes obvious on the way in.

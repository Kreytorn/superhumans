# MARS "Mission to Mars" (r3, Sun 15 Nov)

**Idea.** The home page is one film shot of the flight from Earth to Mars: the Sun and its glare, Earth lit and turning, Mars ahead, the transfer path as a fine line, our ship as a point of light on it. The six checks are six moments on the path, in the order a crew meets them (Garn Meter, BubbleGrade, VeinSqueeze, SpikeCount, TrackTrace, BrainDrift). Press one: the camera glides along the path to the ship, time stops (ship, clouds, path dashes and the drawing loop all halt), and the check opens beside the ship. Back resumes time and pulls the camera out.

**Routes.** `#/proto/MARS/home`, `#/proto/MARS/<garnmeter|bubblegrade|veinsqueeze|spikecount|tracktrace|braindrift>`. `?still=1` forces the no-WebGL picture. Dev server: port 5321.

**Files.** `scene.ts` plain three.js and all shaders (planet surfaces are painted once into textures at start-up, then cost three texture reads a frame); `index.tsx` page, spots, check page; `stages.tsx` hosts the five moment stages plus a SpikeCount replay stage; `mars.css`; `data.ts`; `_shot.mjs`, `_cam.mjs` and `_fps.mjs` are dev-only tools.

**Assets.** None downloaded. Everything in the scene is drawn by code (no textures, no models); the corner mark says "AI-generated imagery". Fonts: Instrument Serif, Geist, Geist Mono (installed Fontsource packages).

**Honest notes on the picture.** Planet sizes are enlarged and distances compressed so both planets fit one shot; Earth's light leans a little toward the lens so more of the day side shows. TrackTrace's stop draws a frozen pink ray through the hull (illustration only, no number).

**Unfinished.**
- Measured in headless Edge on this laptop's integrated GPU (Intel Arc 140T, `_fps.mjs`, frame limit off): 553 frames a second at 1440x900, 309 at 1920x1080, 206 at device pixel ratio 2. Not yet watched by a person in a normal browser window, and not on a real phone (pixel count is capped at about 3.6 M, device pixel ratio at 2, 1.5 on touch; drawing stops at a stop and when the tab is hidden).
- Phone home works (the frame tilts so the path climbs the screen) but is less grand than the laptop shot; Earth and Mars name tags are hidden there.
- No per-moment scene dressing besides the cosmic ray (no spacewalk figure, etc.). SpikeCount is a replay of stored outlines, not a live run.
- A lost WebGL context is not recovered (reload fixes it).

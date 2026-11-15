# S2 — "Cinematic Web Experience" take (r3, Sun 15 Nov 2026, 03:25)

- **Idea:** a crew member drawn in light stands above a planet's sunrise; the six real specimens float round the figure as glass lenses, each wired to its body site. Real-time 3D (react-three-fiber, bloom), not a star wallpaper.
- **Routes:** `#/proto/S2/home` and `#/proto/S2/<tracktrace|bubblegrade|spikecount|veinsqueeze|braindrift|garnmeter>`.
- **Home:** every lens, body site, lens label, numbered tab, the readout card and the white button open a check (keys 1-6 too); the camera pushes into the chosen lens on the way out. With nobody pointing, the readout walks through the six checks.
- **Module page (one design for all six):** the working stage large on the right; lens, name, one sentence, a Run and a Reset button, a status word and previous/next on the left; 01-06 steps on top. TrackTrace adds the IonScan figure on a white card below.
- **SpikeCount** has its own stage here: the real field 96 with the stored model outlines from `replay('field-96')`, drawn in the model's cell order; the percentage is computed from that result at run time.
- **Phones (390 px):** words first, then the same 3D scene, then six rows with the real images; module pages stack. No WebGL: the six rows replace the scene. Reduced motion: no sway, no streaks, no entrance.
- **Performance:** pixel ratio capped at 1.5 and dropped to 1 if frames fall; measured 61 fps on this laptop's integrated Intel Arc GPU.
- **Checked:** type-check clean for this folder; every button pressed by script; screenshots in `work/Web/shots/oneshot-S2/` (1440, 390, 1920).
- **Unfinished:** the figure is a simple stacked-ring body (no face or hands detail); phone lenses have no labels (the rows below carry them); module pages were shot idle and mid-run but not checked on a real phone or a projector; no "How do we know?" layer and no result/ACT line outside the stages' own words.
- **Sources used:** fonts Unbounded, Geist, Geist Mono (Fontsource, OFL); three.js, @react-three/fiber, drei, postprocessing; Phosphor icons. The body figure is drawn by code and carries the "AI-generated illustration" mark.

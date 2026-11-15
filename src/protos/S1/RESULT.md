# S1 "Orrery" (r3 one-shot, Anthropic frontend-aesthetics prompt)

- **Idea:** the six checks are six real specimens in orbit round the one in focus. Black of space, bone-white type, one accent (international orange, the launch-suit colour), light from a planet limb at sunrise and from the lens in the centre. Fonts: Anybody (wide display), Hanken Grotesk (text), Martian Mono (labels).
- **Routes:** `#/proto/S1/home` and `#/proto/S1/<tracktrace|bubblegrade|spikecount|veinsqueeze|braindrift|garnmeter>`.
- **Home:** the orbit turns by itself and the spotlight moves every 4 s; hover or tap a specimen to put it in the centre lens, click it (or the lens, or "Open the check") to fly in. Keys: arrows turn, 1-6 open. Type scales from 1280x720 to 1920x1080; phone layout stacks.
- **Module page (one design for all six):** huge name, the one sentence, one orange button that runs the real stage (src/moments/*, restyled only through their tokens), "What to do next" filled from the stage's own result, top nav with six lenses + arrows, pager at the bottom.
- **SpikeCount:** own small stage in `stages.tsx`: the real field 96 with the stored outlines from `replay('field-96')` drawn in a sweep; counts come from the result (tagged REPLAY).
- **TrackTrace:** IonScan architecture figure on a white card in a thin frame under the stage.
- **Checked:** all six run to a result at 1440x900 (shots in `work/Web/shots/oneshot-S1/run/`), idle shots at 1440 and 390 per route, no type errors in this folder.
- **Unfinished:** no body hologram; SpikeCount is replay only (no live model, no "before flight" comparison); the home lens for Garn Meter is the poster with inverted colours; reduced-motion only shortens animations; not tested inside Electron.
- **Files:** `index.tsx` (home + module page), `stages.tsx` (stage wrapper + SpikeCount), `data.ts` (texts, lens crops), `s1.css`, `_shot.mjs` (dev screenshot helper).

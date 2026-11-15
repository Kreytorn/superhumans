# DF: the dark body map, made real (polish pass, r3, Sun 15 Nov 05:40)

**Idea (unchanged):** the old dark home made real: a glowing glass body under an aurora sky, six callouts, a real-sample window; pressing a check flies the camera into that body spot and lands on the check page.

**Routes:** `#/proto/DF/home`, `#/proto/DF/<tracktrace|bubblegrade|spikecount|veinsqueeze|braindrift|garnmeter>`. Dev server port 5310 (`VITE_CACHE_DIR=node_modules/.vite-DF`).

**This pass**
- Every check page now scrolls to a second screen (`story.tsx`, `story.css`): the problem and its story beside real imagery, then three short "how it works" steps, one trust number with its limit line, and Back / Next check. Words and numbers from `work/Web/cards` and `work/Web/models` only. A button under the stage ("The problem, and how it works") scrolls there.
- TrackTrace goes deepest: four steps of how IonScan reads a nucleus, an animated eight-scan diagram in the real order (rows, columns, both diagonals, each both ways; marked "AI-generated diagram"), and the architecture SVG on a white card in a thin frame, captioned "IonScan, our own 3.2 M-parameter network".
- SpikeCount uses the new shared stage (`moments/spikecount`), full width; its button sits in the header (the stage prints its own number and next step).
- Fixed: BubbleGrade shows "A bubble is a warning; symptoms are the diagnosis." with the action; VeinSqueeze shows a "Best case" tag (hover = the HONESTY_HERO_PAIR sentence) and all its honesty lines under "How do we know?"; TrackTrace's who-acts is two lines plus a small "(Space Radiation Analysis Group)"; TrackTrace adds HONESTY.batch; Garn Meter's still is no longer colour-inverted.
- Zoom: the figure is now redrawn by its own camera during the flight (canvas widened to the screen and counter-scaled), so it stays sharp and shows the shader's close-range detail; blur cut from 9 px to 3 px late in the flight. On a phone, opening from the list first scrolls the body spot into view, so the flight goes into the body, not the screen centre.
- Robustness: the figure shader compiles in parallel (KHR_parallel_shader_compile, forced after 6 s), a slow GPU gets a lighter canvas, and the page reports ready after 5.4 s even if the reveal crawls. Gate fixes: `data-state` on the home root, `data-qa="primary"` on the sample window, visible text as accessible names, `inert` instead of `aria-hidden` while flying.

**QA:** `node qa/gate.mjs --route proto/DF/home --budget warn` PASS (25 controls, 0 dead); type-check clean for DF files.

**Unfinished / known:** in the qa harness browser (`--use-angle=d3d11 --enable-features=Vulkan`) the figure shader takes 20 s or more to compile, so the body appears late there (not in the default Edge used for screenshots). The flight was checked as frozen frames (`window.__dfZoom`), not on a real phone. `check_spike.tsx` (the old in-house SpikeCount) is now unused. The home still has more words and text blocks than the gate budget (notes, not failures).

**Shots:** `work/Web/shots/polish-DF/` (home_1440, home_390, check_tracktrace_1440, check_tracktrace_scroll_1440, check_spikecount_1440; frames and gate output under `tmp/` and `gate/`).

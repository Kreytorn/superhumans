# Garn Meter W1 (free, immersive): "The horizon tilts"
- Idea: a point-cloud head (true-normal rim light, profile view) wears 14 rings of the real recorded brainwaves, one ring per electrode, one turn = the 4 s the model reads. The ring plane is the gauge: only the crew check-in tilts it and swirls the dust; the model's reading is a thin tick, labelled with the engine's honesty line.
- Route: `#/proto/garnmeter_w1/home` (`?state=result` pins the settled result for screenshots). Port 5606.
- First screen: name + card sentence, Run (live `analyze()`, falls back to `replay()` after 9 s, tag LIVE/REPLAY), 1.0 Garn gauge, model 0.08 tick, ACT card from `act()` (2 steps + link to all 4, promethazine / screen-task toggles), tappable 1-7 check-in, 27-scene strip (tap a scene, e.g. 13 = false alarm).
- Scroll story: 01 "7 in 10" as a slowly turning sunflower disc of 588 person-missions (419 glow); 02 the Garn ladder + Stevenson quote; 03 the whole 224 s session wall coloured by check-in vs "if brainwaves drove the alarm", the measured theta scalp map (`GarnScalp`), 94% / 0.42 / 0.08 from the result, 4 ROC curves from card.json; 04 green/yellow/red cards from `act()`; 05 pipeline + facts and citations.
- Every number on screen comes from the engine (result, act, STRINGS, card.json) at run time. Which disc dots glow is a stable shuffle (count only is data).
- Material: only our own data in app/public/garnmeter/ (EEG session, outputs, topomap, card.json). No external images. Fonts: Unbounded, Geist, Geist Mono (SIL OFL, Fontsource). three.js (MIT).
- The head and rings are a drawing: marked "AI-generated illustration · the brainwaves are real recordings".
- Shots: work/Web/shots/k2/garnmeter_w1/screen_1440.png, screen_390.png, scroll_1440.png (+ scroll_390, full_*.jpg; rounds in r1/).
- Unfinished: head reads weaker at 390 px; sections 04-05 still carry small text; no electrode-mute what-if; on a very busy machine the first Run shows REPLAY.

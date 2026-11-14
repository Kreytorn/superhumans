# qa: proof that every control works

Run from `app/`, with your dev server up. Uses installed Microsoft Edge through playwright-core (WebGPU on).
Give `--port` + `--route` (hash route, e.g. `proto/A/home`), or `--url` with a full address.

## capture.mjs: screenshots, filmstrip, metrics
`node qa/capture.mjs --port 5220 --route "proto/A/home" --out qa/out/A-home [--states idle,result] [--sizes 1440x900,390x844] [--film] [--t 0,300,800,1500,2500,4000]`
- Opens the route with `?state=<state>`, waits up to 20 s for `[data-ready="1"]`, saves `<state>_<width>.png` and a `.jpg` copy (at most 1440 px wide; read these). Widths of 500 px or less use phone emulation (touch, mobile user agent, scale 2).
- `--film`: from idle it presses `[data-qa="primary"]` (900 ms hold if it has `data-hold`) and saves `film_<width>_<ms>.png` in real time, plus one strip `film_<width>.jpg`. If you pass `--t` and the view changes with `?t=<ms>`, frames are pinned instead.
- `metrics.json`: per state and size the words, text blocks, numbers, hero share, fonts, text colours, sideways scroll, console errors, failed and outside requests.

## gate.mjs: pass or fail
`node qa/gate.mjs --port 5220 --route "proto/A/home" --out qa/out/A-home-gate [--budget warn] [--max-controls 60]`
Exit 0 = pass, 1 = fail; details in `gate.json` (`failures`, `dead_controls`, `budget_breaches`, `links`, `keyboard`, `axe`, `console`, `skipped_controls`, `timings`, `checked_at`). At 1440x900 and 390x844 (phone) it fails on:
- no `data-ready` in 20 s, or `?state=idle|result` not matching `data-state`;
- console errors, page errors, unhandled rejections, failed requests, HTTP 400+, any request to another origin (these are blocked);
- a **dead control** (below), a broken in-app link, or browser Back not restoring the view;
- the primary action not reachable by Tab or not answering Enter/Space (arrows for a slider);
- axe critical or serious findings (WCAG 2.2 AA tags), at idle and result;
- sideways scroll at 1440, 390 or 320 px.
Budget breaches (own list; they fail the gate unless `--budget warn`): hero under 50 % of the first viewport, over 60 words, 12 text blocks or 4 numbers, at idle and at result. More than 3 fonts or text colours is a note only.

## What counts as dead
Every visible, enabled control is used once from a fresh load: buttons, links, inputs, selects, summary, interactive roles, `tabindex >= 0`, `[data-qa="primary"]`, `[data-hold]`, `[onclick]`. Click or tap; ArrowRight then ArrowLeft for sliders; a typed character for text fields; a 900 ms press for `data-hold`. It is **dead** if within 1.2 s none of these happen: a DOM change outside the control, a change on the control that is still there at the end, a URL change, a media or Web Audio call, a scroll, focus moving elsewhere, a clipboard write, a popup, download, dialog or new request. Hover and focus styling, a pressed flash that leaves no trace, and anything that already ticks by itself do not count. A control covered by another element is dead ("covered by ..."). Controls that appear after using another one (a sheet, a menu) are checked one level deep.

## Hooks a page must set (BRIEF, "Test hooks")
- Root: `data-ready="1"` when idle and loaded; `data-state="idle|running|result|error"` kept current.
- `data-qa="hero"` on the specimen, `data-qa="primary"` on the main action, `data-qa="tick"` on chart tick labels (left out of word, block and number counts).
- `data-hold` on press-and-hold controls. Honour `?state=idle`, `?state=result`, and ideally `?t=<ms>`.

## Known limits
- Only DOM-visible effects count. A control that changes only canvas pixels is reported dead: mirror the change in text or an aria attribute.
- Text drawn on a canvas is not counted. Hero share is the element's box, not what is painted in it.
- Drag and scrub gestures on a canvas or a plain div are not tried; give them a role (`slider`) so arrow keys test them.
- Already-selected tabs and radios, outside links and native media controls are listed under `skipped_controls`, not used. Depth stops at one level; at most 60 controls per size.
- Numbers split into separate boxes (one digit per flex item) count once each; `@number-flow/react` is read through its label.
- Fixture for the tools themselves: `/qa/fixtures/page.html?fault=dead,flash,noise,covered,scroll,hero,words,numbers,console,external,axe,badlink,nokey` (no fault = clean, must pass).

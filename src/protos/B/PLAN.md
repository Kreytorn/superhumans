# Prototype B plan: Body Map
**Idea.** A body chart on grey paper: each check is a status ring on the spot it is taken from, and pressing a spot opens the real sample out of that spot onto one fixed stage.
**Palette.** Paper `#E8E4DC`, figure `#FAF8F4` (edge `#CFC9BE`), ink `#1D1B19`, second ink `#655F58`, model pencil `#2148F0` (the only hue the machine uses), status amber `#A86400` (on the status mark only). No accent, no gradient, no shadow.
**Type.** Bricolage Grotesque (sentence 44/46 at 1440, 21-25 px at 390, weight 600; hero number 72 and 46, weight 700). Instrument Sans (labels 16/600, status 15/500, buttons 16/600, tags 12/600). No serif, no mono.
**Spacing and radius.** 8 px grid; column padding 40 (16 on a phone). Radius 0 on the stage and tabs, 999 on the one ink button, 16 on the phone sheet top only. 1 px hairlines.
```
HOME 1440x900                                   HOME 390x844
+-----------540-----------+------900x900------+ +--------390x430--------+
| Six AI health checks    |  blood photo,     | | blood photo, outlines |
| for astronauts...       |  whole, stored    | | 58.5% spiky; 5.2% ..  |
|  o crown --- Space sick |  outlines drawn   | | [Open the blood check]|
|  o head  --- Brain      |  in cell order    | +-----------------------+
|  o chest --- Heart bub. |                   | | Six AI health checks..|
|  (o| elbow - Blood  ----+--                 | | Five are quiet. One...|
|  o thigh --- Leg vein   | 58.5% spiky ...   | | fig | six 44 px rows, |
|  -o- ray --- Cosmic rays| [Open blood check]| | ure | each a tap      |
SPIKECOUNT 1440x900                             SPIKECOUNT 390x844
+-----------540-----------+------900x900------+ +--------390x430--------+
| < Body                  |              LIVE | | < Body         REPLAY |
| Every red blood cell... |  blood photo,     | | blood photo + outlines|
| How many red cells...?  |  model outlines   | +-----------------------+
| [Grade this blood]      |  on the cells     | | Every red blood cell..|
| 58.5% spiky ------------+--                 | | [ Grade this blood ]  |
| 5.2% before flight .:'  |                   | | 58.5% spiky   5.2% .. |
| (o| Crew medic: run ... |                   | | (o| Crew medic: run...|
| How do we know?         |                   | | How do we know?       |
```
**The SpikeCount moment** (one press; both models finish first, then the result is drawn):
| Beat | ms | What changes | What it shows about the model |
|---|---|---|---|
| Press | 0 | Button dips, reads "Loading the two models", then "Reading the photo" | the two real models run (stored outputs on a phone) |
| Outlines | 0-1350 | One cell outline every 26 ms, top of the photo to the bottom, in blue pencil | the outliner's mask edge, in its own cell order |
| Hatching | with each cell | Spiky cells fill with hatch, denser by grade; discs stay empty | the grader's top choice of six shapes |
| Count | 0-1770 | A leader runs from the photo to the number; it reads spiky / drawn so far and lands on 58.5% | 31 of 53, computed, not scripted |
| Compare | 1890 | "5.2% before flight" and the four-step mission chart (each step can be pressed) | the stored preflight photo, tagged Illustrative |
| Act | 2250 | Status mark (ring + 1 bar, amber) and the sentence for the crew medic | the engine's `act()` tier |
**Three ways this turns generic, and the guard.**
1. A clip-art or uncanny body: the figure is five capsules and a circle with one flat fill, no face or hands; sites are status rings, not icons.
2. A labelled wellness infographic in the cream-serif-terracotta costume: grey paper, grotesk only, ink button, no warm accent; only the blood leader is ink at rest, the rest are paper-edge grey until hover or focus.
3. A dashboard beside a small picture: the stage is a fixed square the full height of the screen and never moves between Home and a check; the number hangs off it on a leader, never in a card.

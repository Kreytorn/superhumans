# Prototype D "Drape": plan (r3, Sun 15 Nov, 00:47)
**Idea.** One flat operating-room green drape with a single hard-cut window; the only thing exposed is the sample that needs you, and every word sits on the drape (small green tabs notch into the window where a word must touch the sample).
**Palette.** Drape `#12574A`; ink bone `#F2EEE3`; quiet ink `#A9C4B8`; model marks lilac `#CDB8FF` (2 px) over keyline `#0C1F1B`, inside the window only; status marks only: amber `#FFC53D` (crew medic), red `#FF8473` (flight surgeon), grey `#6F9186` (abort, always off). Layer two is the drape turned over: a bone panel with green ink.
**Type.** Anybody Variable (width axis 60-140, weights 300 and 800 only): check names fitted to one column width by the font's own axis; hero number 88 / 52 px. Hanken Grotesk: sentence 26/32 (19/26 phone) w500, action 20/28, buttons 16 w600, tags 12 w500. Sentence case. **Spacing, radius.** One design unit `u = min(100vw/1440, 100svh/900)`; margins 44u; 8u steps; radius 0; no shadows, borders, gradients.
```
HOME 1440x900                                   SPIKECOUNT 1440x900
+--------------------------+------------------+ +--------------------------+------------------+
| Six AI health checks...  |          [REPLAY]| | < All six checks         |            [LIVE]|
| o Radiation          You |                  | | BLOOD (fitted, 800)      |                  |
| o Bubbles            You |   blood photo    | | Every red blood cell,... |   blood photo    |
| O|BLOOD       Crew medic |   812 x 812      | | [ Grade this blood ]     |   812 x 812      |
| o Veins              You |   stored         | | 58.5% SPIKY (fitted; its tab cuts into ->)  |
| o Brain              You |   outlines       | | of 53 cells outlined     |   lilac outlines |
| o Nausea             You |[58.5% spiky; 5.2%| | 5.2% before flight (Ill.)|                  |
| Five are quiet... (Ill.) |  before flight]  | | O| Crew medic: run the... |                  |
| [Open the blood check]  How do we know?     | | How do we know?          |                  |
+--------------------------+------------------+ +--------------------------+------------------+
HOME 390x844          SPIKECOUNT 390x844, idle        ...and after the press
+------------------+  +--------------------+          +--------------------+
| photo 390x425    |  |[< All six]   [LIVE]|          | photo + outlines   |
| [Open blood chk] |  | photo, 55 % tall   |          | BLOOD              |
| Six AI health... |  | BLOOD (tab, 64 px) |          | 58.5% SPIKY        |
| o Radiation  You |  | Every red blood... |          | of 53 cells / 5.2% |
| O|BLOOD Crew med |  | [Grade this blood] |          | O| Crew medic: ... |
| ... 6 rows 46 px |  | How do we know?    |          | [Grade again]      |
| Five are quiet.. |  +--------------------+          | How do we know?    |
+------------------+                                  +--------------------+
```
**The SpikeCount moment** (ms after the result arrives; `?t=` pins it):
| beat | ms | what changes | what it shows about the model |
|---|---|---|---|
| press | before 0 | the button reads the real stage: loading the outliner, the grader, outlining | two models really load and run |
| outlines | 40 x i | cell i's outline draws (240 ms), in the outliner's own cell order, top to bottom | each line is one cell's mask edge |
| fills | on close | spiky cells fill lilac, 20-50 % by grade; discs and cups stay hollow | the grader's top choice per cell |
| count | each close | hero % = spiky so far / drawn so far; "of N cells outlined" climbs | the % is a ratio of counted cells: 31 of 53 |
| compare, act | +180, +480 | "5.2% before flight" (Illustrative), then the amber mark and the action sentence cut in | your own preflight is the yardstick; the rule fired on advanced cells |
**Three ways this turns generic, and the guard.**
1. A fashion poster where type beats the sample: the window is never under 50 %; type shrinks before the window does; the product sentence is plain Hanken.
2. A heritage-green costume or a stretched-type gimmick: no serif, gold, cream page, texture or border; width only from the font axis (60-140), never CSS scale; two weights.
3. A card list in disguise, or the hero-metric template: rows are bare type with no boxes; the number is a fitted phrase whose tab touches the photo it measures, never a stat row.

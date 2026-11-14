# Prototype A "Viewbox": plan (r3, Sun 15 Nov, 00:50; moment table updated 01:50 after the review batch)
**Idea.** A radiologist's light box: one lit white surface, six real films hung in pitch order, and you pull one out to read it; the films are the only navigation.
**Palette.** Lit surface `#F2F5F4`, film base `#0B0D0E` (material only), ink `#12171A`, secondary ink `#58636A`, film print `#E9EEEE`, petrol `#0E4A5A` (button fill, focus ring), model marks `#2FD2F4` (only on film, 2 px over a dark keyline), crew-medic amber `#B96A00` on surface / `#FFB629` on film (status mark only).
**Type.** Newsreader (opsz): the one sentence 46/50 at 1440, 28/33 at 390; hero number 64 / 44, weight 500, tabular. Geist: names 16/600, status 15/500, button 16/600, tags 12/500, edge print 13/500 tabular. Three text colours (ink, secondary, film print).
**Spacing and radius.** 8 px unit; 8 px lit gaps between films; 24 px gutters; films have radius 0, no border, no shadow. Only the button has a radius (4 px).

```
HOME 1440x900                                   HOME 390x844
+------------------------------------------+    +----------------------+
| Six AI health checks...   Five are quiet. |    | Six AI health checks |
| (Newsreader 46, 2 lines)  One asks... Ill.|    | for astronauts...    |
+----+----+--------------+----+----+----+---+    | Five are quiet. ...  |
| TT | BG |  BLOOD 660   | VS | BD | GM |        |[name what|== still ==]|
|148 |148 |  outlines    |148 |148 |148 |        |[name what|== still ==]|
|dim |dim | [Open the    |dim |dim |dim |        |[ BLOOD band 300 px   ]|
|    |    |  blood check]|    |    |    |        |[ outlines + button   ]|
+----+----+--------------+----+----+----+        |[name what|== still ==]| x3
| name status (x6, under each film)     |        +----------------------+
SPIKECOUNT 1440x900                             SPIKECOUNT 390x844
+--+--+----------------------+--+--+--+-------+  +----------------------+
|s |s |  blood photo 852 sq  |s |s |s | Every |  | blood photo 390x425  |
|p |p |  cyan outlines drawn |p |p |p | red.. |  | outlines on it       |
|i |i |  on the cells        |i |i |i | 58.5% |  +--strip of 6 slivers--+
|n |n |                      |n |n |n | Crew  |  | Every red blood cell.|
|e |e | LIVE 53 cells outl.  |e |e |e | medic |  | [ Grade this blood ] |
+--+--+----------------------+--+--+--+ How?  +  | 58.5% spiky / action |
```
**The SpikeCount moment** (clock starts when both models have answered; `?t=<ms>` pins it):
| beat | ms | what changes | what it shows about the model |
|---|---|---|---|
| press | before 0 | button presses in; laptop: the two models were fetched and run once when the check opened, so the outlines start at once (stored ones, tagged REPLAY, until the live answer is in; then LIVE) | the two models really run (laptop) or stored outputs load (phone, REPLAY) |
| draw | 0 to 2120 | one cell every 40 ms, in the model's own order (top to bottom): cyan outline; spiky cells also get a cyan fill, deeper by grade | outline = edge of that cell in the outliner's mask; fill = the grader's top shape |
| count | 0 to 2120 | "n cells outlined" and "n spiky" climb on the film edge, next to the key (filled = spiky, empty = smooth); no percentage yet | cells drawn so far and how many of them the grader called spiky |
| land | 2120 | "58.5% spiky" lands once in the answer column | spiky cells over all cells: 31 of 53 |
| compare | 2300 | "5.2% before flight" (Illustrative) appears under the number | the crew member's own baseline, not a fixed limit |
| act | 2600 | status mark turns to Crew medic and the action sentence lands | advanced cells crossed the baseline plus our 10-point margin |

**Three ways this turns generic, and the guard.**
1. A card grid: guard = unequal film widths, no radius or shadow, the row bleeds off both edges, one film is open and five are dim.
2. A hospital PACS viewer: guard = no toolbar, no thumbnails with metadata; one control per film; edge print is one tag and one count.
3. A hero-metric dashboard: guard = the number sits level with the photo it measures, in the same row as the film, with one comparison and one sentence; no stat row.

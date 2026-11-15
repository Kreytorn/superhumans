// Dev-only: look at the press move frame by frame. The dev build exposes window.__v01.pose(gate, t), which holds
// the camera (and the sheet of light) at point t of the glide, so slow headless screenshots cannot skip frames.
//   node src/protos/V01/_tools/film.mjs <outDir> <gateIndex> [WxH] [t,t,...]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? '.')
const gate = Number(process.argv[3] ?? 0)
const [w, h] = (process.argv[4] ?? '1440x900').split('x').map(Number)
const ts = (process.argv[5] ?? '0,0.15,0.3,0.45,0.6,0.7,0.8,0.9,1').split(',').map(Number)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--hide-scrollbars'] })
const phone = w <= 500
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
const page = await ctx.newPage()
const logs = []
page.on('pageerror', (e) => logs.push(e.message.slice(0, 200)))
await page.goto('about:blank')
await page.goto(`http://localhost:5501/#/proto/V01/home`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 45000 })
await page.waitForTimeout(400)
for (const t of ts) {
  await page.evaluate(([i, t]) => window.__v01.pose(i, t), [gate, t])
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(out, `move_${w}_${String(Math.round(t * 100)).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 82 })
}
if (logs.length) console.log(logs.join('\n'))
await browser.close()

// Poses the move into a room at set points (view box + the move's phase attributes, transitions let settle),
// then shoots the module page's first frames. node src/protos/V03/_tools/pose.mjs <outDir> [WxH] [room]
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg, size = '1440x900', room = 'bubblegrade'] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const mobile = width < 600
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile })
await page.goto('http://localhost:5503/#/proto/V03/home', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
if (mobile) await page.locator(`.v03-svg-home [data-room="${room}"]`).tap()
else {
  await page.hover(`.v03-svg-home [data-room="${room}"]`)
  await page.mouse.move(2, 2)
}
await page.waitForTimeout(500)
for (const t of [0.45, 0.62, 0.74, 0.86, 1]) {
  await page.evaluate(
    async ([room, t]) => {
      const d = await import('/src/protos/V03/data.ts')
      const root = document.querySelector('.v03-home')
      const c = d.checkById(room)
      const a = d.restVB(innerWidth, innerHeight)
      const b = d.roomVB(c, innerWidth, innerHeight)
      const v = d.vbString(d.mixVB(a, b, d.easeInOut(t), [0, 0, 0, 0]))
      for (const s of document.querySelectorAll('.v03-home svg.v03-svg')) s.setAttribute('viewBox', v)
      root.dataset.leaving = room
      if (t >= 0.6) root.dataset.sillfade = '1'
      if (t >= 0.75) root.dataset.landing = '1'
    },
    [room, t],
  )
  await page.waitForTimeout(450)
  await page.screenshot({ path: join(out, `pose_${room}_${width}_${String(Math.round(t * 100)).padStart(3, '0')}.png`) })
}
await page.evaluate((room) => (location.hash = `#/proto/V03/${room}`), room)
await page.waitForSelector('.v03-module', { timeout: 20000 })
for (const ms of [30, 350, 900]) {
  await page.waitForTimeout(ms === 30 ? 30 : ms - (ms === 350 ? 30 : 350))
  await page.screenshot({ path: join(out, `pose_${room}_${width}_page_${String(ms).padStart(4, '0')}.png`) })
}
await browser.close()

// Films the move into a room with the CDP screencast (real frame times), then keeps frames at set times after the press.
// node src/protos/V03/_tools/film.mjs <outDir> [WxH] [room] [back]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg = 'film', size = '1440x731', room = 'tracktrace', back] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:5503/#/proto/V03/home', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(1500)
const cdp = await page.context().newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', (f) => {
  frames.push({ t: f.metadata.timestamp * 1000, data: f.data })
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: width, maxHeight: height, everyNthFrame: 1 })
const el = page.locator(`.v03-svg-home [data-room="${room}"]`)
await el.hover()
await page.waitForTimeout(500)
const wall = () => Date.now()
const tPress = wall()
await el.click()
let tRoute = 0
for (let i = 0; i < 120; i++) {
  if (page.url().includes(`/V03/${room}`)) {
    tRoute = wall() - tPress
    break
  }
  await page.waitForTimeout(20)
}
let tReady = 0
for (let i = 0; i < 200; i++) {
  if (await page.$(".v03-module[data-ready=\"1\"]")) {
    tReady = wall() - tPress
    break
  }
  await page.waitForTimeout(25)
}
await page.waitForTimeout(Math.max(0, 3400 - (wall() - tPress)))
let tBack = 0
if (back) {
  tBack = wall()
  await page.click('.v03-m-back')
  await page.waitForTimeout(2000)
}
await cdp.send('Page.stopScreencast')
await browser.close()
console.log('route changed', tRoute, 'ms after the press; page ready at', tReady, 'ms;', frames.length, 'frames')
const pick = (at, name) => {
  let best = null
  for (const f of frames) if (f.t <= at && (!best || f.t > best.t)) best = f
  if (best) writeFileSync(join(out, name), Buffer.from(best.data, 'base64'))
}
for (const t of [0, 250, 500, 650, 800, 950, 1100, 1250, 1400, 1600, 2000, 2600, 3200]) pick(tPress + t, `move_${String(t).padStart(4, '0')}.jpg`)
if (back) for (const t of [100, 400, 700, 1000, 1500]) pick(tBack + t, `back_${String(t).padStart(4, '0')}.jpg`)

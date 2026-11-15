// V03 dev shots: home idle, a room on hover, a room on keyboard focus, the zoom half way and landed.
// node src/protos/V03/_tools/shots.mjs <outDir> [WxH] [room]
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg = 'shots', size = '1440x900', room = 'bubblegrade'] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const mobile = width < 600
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push(e.message))
const base = 'http://localhost:5503/#/proto/V03/home'
await page.goto(base, { waitUntil: 'load' })
if (process.env.INTRO) {
  // the ship drawing itself: frames at about these times after the home mounts
  await page.waitForSelector('.v03-home', { timeout: 20000 })
  const t0 = Date.now()
  for (const t of [250, 700, 1150, 1600, 2100]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
    await page.screenshot({ path: join(out, `intro_${width}_${t}.png`) })
  }
}
await page.waitForSelector('[data-ready="1"]', { timeout: 20000 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(out, `idle_${width}.png`) })

if (!mobile) {
  await page.hover(`.v03-svg-home [data-room="${room}"]`)
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `hover_${room}_${width}.png`) })
  await page.mouse.move(2, 2)
  await page.waitForTimeout(400)
  await page.focus('.v03-svg-home [data-room="garnmeter"]')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `focus_${width}.png`) })
  await page.mouse.move(2, 2)
}
await page.goto('about:blank')
await page.goto(base, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 20000 })
const target = mobile ? room : 'tracktrace'
const el = page.locator(`.v03-svg-home [data-room="${target}"]`)
if (mobile) {
  // first tap brings a room into focus, the second goes in
  await el.tap()
  await page.waitForTimeout(450)
  await page.screenshot({ path: join(out, `tap1_${width}.png`) })
  await el.tap()
} else await el.click()
await page.waitForTimeout(520)
await page.screenshot({ path: join(out, `zoom_half_${width}.png`) })
await page.waitForTimeout(1600)
await page.screenshot({ path: join(out, `landed_${width}.png`) })
console.log(page.url())
if (logs.length) console.log('errors:\n' + logs.join('\n'))
await browser.close()

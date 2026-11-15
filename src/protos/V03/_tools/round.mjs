// V03 polish shots. node src/protos/V03/_tools/round.mjs <outDir> <mode> [WxH] [room]
//   home:  settled home            intro: frames at fixed times after load
//   zoom:  press a room, frames through the move and the landing
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg = 'shots', mode = 'home', size = '1440x900', room = 'tracktrace'] = process.argv.slice(2)
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

if (mode === 'intro') {
  // warm the cache once, then time a fresh load
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
  await page.goto('about:blank')
  await page.goto(base, { waitUntil: 'commit' })
  await page.waitForSelector('.v03-home', { timeout: 20000 })
  const t0 = Date.now()
  for (const t of [300, 600, 900, 1200, 1500, 2000]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
    await page.screenshot({ path: join(out, `intro_${width}_${t}.png`) })
  }
} else {
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
  await page.waitForTimeout(400)
  if (mode === 'home') {
    await page.screenshot({ path: join(out, `home_${width}x${height}.png`) })
    if (!mobile) {
      await page.hover(`.v03-svg-home [data-room="${room}"]`)
      await page.waitForTimeout(500)
      await page.screenshot({ path: join(out, `hover_${room}_${width}x${height}.png`) })
    }
  } else if (mode === 'zoom') {
    // let the home settle and preload, as a person would
    await page.waitForTimeout(1200)
    const el = page.locator(`.v03-svg-home [data-room="${room}"]`)
    if (mobile) {
      await el.tap()
      await page.waitForTimeout(400)
      await el.tap()
    } else {
      await el.hover()
      await page.waitForTimeout(400)
      await el.click()
    }
    const t0 = Date.now()
    for (const t of [150, 450, 750, 1000, 1200, 1400, 1700, 2400]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
      await page.screenshot({ path: join(out, `zoom_${room}_${width}_${t}.png`) })
    }
    console.log('url', page.url(), 'at', Date.now() - t0)
  }
}
if (logs.length) console.log('errors:\n' + logs.join('\n'))
await browser.close()

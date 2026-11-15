// Dev-only: freeze the zoom at a few positions (window.__dfZoom) and save each frame.
// node src/protos/DF/_zoom.mjs <module id> <out prefix> [WxH]
import { chromium } from 'playwright-core'
const [id = 'bubblegrade', prefix = '../work/Web/shots/DF/r2_zoom_1440', size = '1440x900'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto('http://localhost:5310/#/proto/DF/home', { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df[data-ready="1"]', { timeout: 45000 })
await page.waitForTimeout(400)
const marks = [0.18, 0.38, 0.55, 0.7, 0.84, 0.94]
for (let i = 0; i < marks.length; i++) {
  await page.evaluate(([m, v]) => window.__dfZoom(m, v), [id, marks[i]])
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${prefix}_${i + 1}.png` })
}
console.log(id, size, 'frames at', marks.join(' '), logs.length ? logs.join('\n') : 'no errors')
await browser.close()

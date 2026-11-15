// Dev-only: press a chamber and take screenshots back to back through the flight.
// node src/protos/V04/_tools/burst.mjs <n> <outprefix> [WxH] [count]
import { chromium } from 'playwright-core'
const [n = '1', out, size = '1440x900', count = '10'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'load' })
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(400)
const t0 = Date.now()
await page.evaluate((n) => document.querySelector(`.v04-ch:nth-child(${n})`).click(), n)
for (let i = 0; i < Number(count); i++) {
  await page.screenshot({ path: `${out}_${String(i).padStart(2, '0')}.png`, type: 'png' })
  console.log(i, Date.now() - t0, await page.evaluate(() => document.querySelector('.v04')?.dataset.phase))
}
await browser.close()

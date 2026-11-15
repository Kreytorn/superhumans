// Dev-only: screenshots of this prototype (installed Edge through playwright-core).
// node src/protos/bubblegrade_w2/_snap.mjs <outDir> <WxH> <mode: pin|press> [sections]
import { chromium } from 'playwright-core'
const [out, size = '1440x900', mode = 'pin', sections = ''] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width <= 500
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push('pageerror ' + e.message))
const base = 'http://localhost:5608/#/proto/bubblegrade_w2/home'
await page.goto(mode === 'pin' ? base + '?state=result' : base, { waitUntil: 'domcontentloaded', timeout: 120000 })
if (mode === 'press') {
  await page.waitForSelector('.bgw2[data-ready="1"]', { timeout: 90000 })
  await page.click('[data-qa="primary"]')
  await page.waitForSelector('.bgw2.is-running', { timeout: 120000 })
  await page.waitForTimeout(7000)
  await page.screenshot({ path: `${out}/mid_${width}.png` })
}
await page.waitForSelector('.bgw2[data-state="result"]', { timeout: 120000 })
await page.waitForSelector('.bgw2[data-ready="1"]', { timeout: 120000 })
await page.waitForTimeout(1500)
console.log('source', await page.getAttribute('.bgw2', 'data-source'))
await page.screenshot({ path: `${out}/screen_${width}.png` })
for (const sel of sections.split(',').filter(Boolean)) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/sec_${sel.replace(/[^a-z0-9]/gi, '')}_${width}.png` })
}
if (logs.length) console.log(logs.slice(0, 10).join('\n'))
await browser.close()

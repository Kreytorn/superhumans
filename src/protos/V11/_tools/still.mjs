// Dev-only: save the still picture shown under the live scene (and alone when WebGL is missing), and print where the
// six jewels and their names sit in it. node src/protos/V11/_tools/still.mjs <WxH> <out.jpg> [dsf]
import { chromium } from 'playwright-core'
const [size, out, dsf = '1'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(dsf), hasTouch: phone, isMobile: phone })
await page.goto(`http://localhost:5511/#/proto/V11/home`, { waitUntil: 'load' })
await page.waitForSelector('.v11[data-ready="1"]', { timeout: 40000 })
// the resting pose, with no drift, so the picture and the first live frame agree
await page.evaluate(() => window.__v11.freeze())
await page.waitForTimeout(700)
const spots = await page.evaluate(() => window.__v11.spots())
await page.addStyleTag({ content: '.v11-home,.v11-mark,.v11-veil{display:none!important}.v11-canvas{transition:none!important}' })
await page.waitForTimeout(80)
await page.screenshot({ path: out, type: 'jpeg', quality: 86 })
console.log(JSON.stringify(spots))
await browser.close()

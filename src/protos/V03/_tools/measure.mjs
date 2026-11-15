// node src/protos/V03/_tools/measure.mjs <route> <WxH> <selector,selector>
import { chromium } from 'playwright-core'
const [route, size, sels] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const mobile = width < 600
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile })
await page.goto(`http://localhost:5503/#/proto/V03/${route}`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
const r = await page.evaluate((sels) => {
  const o = { scrollH: document.documentElement.scrollHeight, innerH: innerHeight }
  for (const s of sels.split(',')) {
    o[s] = [...document.querySelectorAll(s)].slice(0, 3).map((e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)} fs=${cs.fontSize} lh=${cs.lineHeight}` })
  }
  return o
}, sels)
console.log(JSON.stringify(r, null, 1))
await browser.close()

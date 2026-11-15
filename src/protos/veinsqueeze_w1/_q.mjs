// Dev-only quick shot: node src/protos/veinsqueeze_w1/_q.mjs <out.png> <WxH> [query] [scrollSelector]
import { chromium } from 'playwright-core'
const [out, size = '1440x900', q = 'state=result', sel = ''] = process.argv.slice(2)
const [w, h] = size.split('x').map(Number)
const phone = w <= 500
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
page.on('console', (m) => m.type() === 'error' && console.log('console', m.text().slice(0, 200)))
await page.goto(`http://localhost:5604/#/proto/veinsqueeze_w1/home?${q}`, { waitUntil: 'load' })
await page.waitForSelector('.vw1[data-ready="1"]', { timeout: 150000 }).catch(() => console.log('no ready'))
if (sel) {
  await page.evaluate((s) => { const r = document.querySelector('.vw1'); const el = r.querySelector(s); r.scrollTo({ top: el.getBoundingClientRect().top + r.scrollTop - 20, behavior: 'instant' }) }, sel)
}
await page.waitForTimeout(2000)
await page.screenshot({ path: out })
const sw = await page.evaluate(() => { const r = document.querySelector('.vw1'); return r.scrollWidth - r.clientWidth })
if (sw > 0) console.log('sideways', sw)
await browser.close()

// Dev-only (polish 2): pictures of the way back frozen at a share of the flight. node backhold.mjs <out> <module> <WxH> <k1,k2,..>
import { chromium } from 'playwright-core'
const [out, id = 'bubblegrade', size = '1440x900', ks = '0.2,0.35,0.5,0.7'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
for (const k of ks.split(',')) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(`http://localhost:5504/#/proto/V04/${id}?hold=${k}`, { waitUntil: 'load' })
  await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
  await page.click('.v04-back')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${out}_k${k}.png` })
  await page.close()
}
await browser.close()

// Tabs through the home and reports any scroll of the scene; shoots the VeinSqueeze room in keyboard focus.
// node src/protos/V03/_tools/focus.mjs <outDir> [WxH]
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg, size = '1440x900'] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:5503/#/proto/V03/home', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(300)
const seen = []
for (let i = 0; i < 9; i++) {
  await page.keyboard.press('Tab')
  await page.waitForTimeout(120)
  const r = await page.evaluate(() => {
    const h = document.querySelector('.v03-home')
    const a = document.activeElement
    return { room: a?.getAttribute('data-room') ?? a?.className ?? a?.tagName, homeTop: h?.scrollTop, docTop: document.scrollingElement?.scrollTop, stageTop: document.querySelector('.v03-stage')?.scrollTop }
  })
  seen.push(r)
  if (r.room === 'veinsqueeze') {
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(out, `focus_veinsqueeze_${width}x${height}.png`) })
  }
}
console.log(JSON.stringify(seen))
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(400)
console.log('after ArrowRight:', await page.evaluate(() => [document.activeElement?.getAttribute('data-room'), document.querySelector('.v03-home')?.scrollTop]))
await browser.close()

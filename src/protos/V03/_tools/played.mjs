// Load a module page, press its run button, wait, and shoot the viewport (and the full page).
// node src/protos/V03/_tools/played.mjs <outDir> <WxH> <route> [waitMs]
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg, size, route, waitMs = '6500'] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const mobile = width < 600
const touch = mobile || !!process.env.TOUCH
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: touch, isMobile: mobile })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push(e.message))
await page.goto(`http://localhost:5503/#/proto/V03/${route}`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(300)
const name = `${route}_${width}x${height}${process.env.TOUCH ? "_touch" : ""}`
await page.screenshot({ path: join(out, `${name}_before.png`) })
const btn = page.locator('.v03-m-run')
if (await btn.isVisible()) {
  await btn.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `${name}_running.png`) })
  console.log('label while running:', await btn.innerText(), 'aria-disabled', await btn.getAttribute('aria-disabled'))
}
await page.waitForTimeout(Number(waitMs))
await page.screenshot({ path: join(out, `${name}_after.png`) })
await page.screenshot({ path: join(out, `${name}_after_full.png`), fullPage: true })
console.log('label after:', (await btn.isVisible()) ? await btn.innerText() : '(hidden)', 'scrollH', await page.evaluate(() => document.documentElement.scrollHeight))
if (logs.length) console.log('errors:\n' + logs.join('\n'))
await browser.close()

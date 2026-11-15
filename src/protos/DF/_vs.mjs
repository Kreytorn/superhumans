// Dev-only: hold the VeinSqueeze control on the check page, wait for the result, save the screen.
import { chromium } from 'playwright-core'
const [out] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5310/#/proto/DF/veinsqueeze', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.df-check [data-ready="1"]', { timeout: 60000 }).catch(() => {})
await page.waitForTimeout(2500)
const hold = page.locator('[data-hold], button:has-text("Hold")').first()
const b = await hold.boundingBox()
if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(3300); await page.mouse.up() }
await page.waitForSelector('.df-check[data-state="result"]', { timeout: 60000 }).catch(() => console.log('no result'))
await page.waitForTimeout(1500)
await page.screenshot({ path: out })
console.log(await page.evaluate(() => document.querySelector('.df-check-panel')?.innerText.slice(0, 300)))
await browser.close()

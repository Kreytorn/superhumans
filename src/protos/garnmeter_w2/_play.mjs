// node src/protos/garnmeter_w2/_play.mjs <port>   presses Play from idle, waits for the result, then taps scene 13
import { chromium } from 'playwright-core'
const port = process.argv[2] || '5612'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)))
await page.goto(`http://localhost:${port}/#/proto/garnmeter_w2/home`, { waitUntil: 'load' })
await page.waitForSelector('.g2[data-ready="1"]', { timeout: 60000 })
await page.click('[data-qa="primary"]')
await page.waitForSelector('.g2[data-state="result"]', { timeout: 90000 })
console.log('after play:', await page.textContent('.g2-act-h'), '|', await page.textContent('.g2-tags'))
await page.locator('.g2-tile').nth(12).click()
await page.waitForTimeout(2500)
console.log('focus after tile 13:', await page.getAttribute('.gm-root', 'data-focus'), 'scrollY', await page.evaluate(() => scrollY))
console.log('errors:', errs.length ? errs : 'none')
await browser.close()

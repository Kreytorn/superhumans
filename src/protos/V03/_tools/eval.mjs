// node src/protos/V03/_tools/eval.mjs <route> <WxH> "<js expression>"
import { chromium } from 'playwright-core'
const [route, size, expr] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const mobile = width < 600
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push(e.message))
await page.goto(`http://localhost:5503/#/proto/V03/${route}`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(300)
console.log(JSON.stringify(await page.evaluate(expr), null, 1))
if (logs.length) console.log('errors:', logs.join('\n'))
await browser.close()

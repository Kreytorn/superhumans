// Dev-only: open a check's page, press "Back to the crystal", and take a picture after the camera has flown home.
import { chromium } from 'playwright-core'
const [out] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('pageerror', (e) => logs.push(e.message))
await page.goto('http://localhost:5511/#/proto/V11/bubblegrade', { waitUntil: 'load' })
await page.waitForSelector('.v11[data-ready="1"]', { timeout: 30000 })
await page.click('.v11-back')
await page.waitForTimeout(2200)
const info = await page.evaluate(() => ({ phase: document.querySelector('.v11').dataset.phase, ready: document.querySelector('.v11').dataset.ready, vis: [...document.querySelectorAll('.v11-ch')].map((b) => b.dataset.vis).join('') }))
await page.screenshot({ path: out })
console.log(JSON.stringify(info), logs.join(' | '))
await browser.close()

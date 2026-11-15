// Dev-only: drop the scene's WebGL context and check that the page rebuilds it.
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto('http://localhost:5324/#/proto/HOLE/home', { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]')
await page.waitForTimeout(3000)
await page.evaluate(() => { const c = document.querySelector('.hole canvas'); c.dataset.old = '1'; c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext() })
await page.waitForTimeout(2500)
console.log('after loss:', await page.evaluate(() => { const c = document.querySelector('.hole canvas'); return { canvas: !!c, fresh: c && !c.dataset.old, lost: c && c.getContext('webgl2').isContextLost(), webgl: document.querySelector('.hole').dataset.webgl, clock: document.querySelector('.hole-clock-v').textContent } }))
await page.screenshot({ path: process.argv[2] })
await page.keyboard.press('3')
await page.waitForSelector('.hole[data-phase="open"]', { timeout: 8000 }).then(() => console.log('press after rebuild: opens')).catch(() => console.log('press after rebuild: did NOT open'))
if (errs.length) console.log(errs.slice(-5).join('\n'))
await browser.close()

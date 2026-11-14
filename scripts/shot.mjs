// Dev-only screenshot driver: installed Microsoft Edge via playwright-core (no browser download).
// node scripts/shot.mjs <url> <out.png> [WxH] [waitForText] [--headed] [--gpu]
import { chromium } from 'playwright-core'

const [url, out, size = '1920x1080', waitText = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const headed = process.argv.includes('--headed')
const gpu = process.argv.includes('--gpu')
const [width, height] = size.split('x').map(Number)
const args = ['--hide-scrollbars', '--force-device-scale-factor=1']
if (gpu) args.push('--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11')
const browser = await chromium.launch({ channel: 'msedge', headless: !headed, args })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url, { waitUntil: 'load' })
if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 60000 }).catch(() => logs.push('[shot] wait text not found: ' + waitText))
await page.waitForTimeout(500)
await page.screenshot({ path: out })
const text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
console.log(text)
if (logs.length) console.log('--- console ---\n' + logs.slice(-30).join('\n'))
await browser.close()

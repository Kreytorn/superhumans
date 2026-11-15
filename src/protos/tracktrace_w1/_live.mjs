// Dev-only: press Scan at 1440 and record. node src/protos/tracktrace_w1/_live.mjs
import { chromium } from 'playwright-core'
const OUT = '../work/Web/shots/k2/tracktrace_w1/'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const logs = []
p.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`))
p.on('pageerror', (e) => logs.push('[pageerror] ' + e.message.slice(0, 300)))
await p.goto('http://localhost:5601/#/proto/tracktrace_w1/home', { waitUntil: 'load' })
await p.waitForSelector('.w1[data-ready="1"]', { timeout: 30000 })
await p.waitForTimeout(2500)
await p.screenshot({ path: OUT + 'idle_1440.png' })
await p.click('[data-qa="primary"]')
const t0 = Date.now()
const shots = [1800, 6000]
for (const ms of shots) { await p.waitForTimeout(ms - (Date.now() - t0)); await p.screenshot({ path: OUT + `run_1440_${ms}.png` }) }
await p.waitForSelector('.w1[data-state="result"]', { timeout: 40000 }).catch(() => logs.push('no result'))
await p.waitForTimeout(1200)
await p.screenshot({ path: OUT + 'live_run_1440.png' })
console.log('t', Date.now() - t0, 'src', await p.evaluate(() => document.querySelector('.ttm')?.getAttribute('data-source')), await p.evaluate(() => document.querySelector('.w1-rail')?.innerText.replace(/\n/g, ' | ')))
console.log(logs.filter((l) => !l.includes('[vite]')).slice(0, 15).join('\n'))
await browser.close()

// Dev-only screenshots of this take. From app/: node src/protos/tracktrace_w2/_shot.mjs [desk|phone|all] [--full]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const what = process.argv[2] || 'all'
const full = process.argv.includes('--full')
const out = '../work/Web/shots/k2/tracktrace_w2'
mkdirSync(out, { recursive: true })
const url = 'http://localhost:5607/#/proto/tracktrace_w2/home'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] })
const logs = []

async function run(width, height, phone) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[${width}] [error] ${m.text().slice(0, 300)}`))
  page.on('pageerror', (e) => logs.push(`[${width}] [pageerror] ${e.message.slice(0, 300)}`))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('.w2[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push(`[${width}] not ready`))
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/idle_${width}.png` })
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(2300)
  await page.screenshot({ path: `${out}/mid_${width}.png` })
  await page.waitForSelector('.w2[data-state="result"]', { timeout: 40000 }).catch(() => logs.push(`[${width}] no result`))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/screen_${width}.png` })
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (sw > 0) logs.push(`[${width}] sideways scroll ${sw}px`)
  const tops = await page.evaluate(() => ['w2-problem', 'w2-work'].map((id) => Math.round(document.getElementById(id).getBoundingClientRect().top + window.scrollY)))
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  const stops = phone ? [tops[0]] : [tops[0], tops[0] + height - 60, tops[0] + 2 * (height - 60), tops[1], tops[1] + height - 60]
  let k = 0
  for (const y of stops) {
    if (y > total - 200) break
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(k === 0 ? 2600 : 1400)
    await page.screenshot({ path: k === 0 ? `${out}/scroll_${width}.png` : `${out}/scroll_${width}_${k + 1}.png` })
    k++
  }
  if (full || phone) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/full_${width}.png`, fullPage: true })
  }
  await ctx.close()
}

if (what === 'desk' || what === 'all') await run(1440, 900, false)
if (what === 'phone' || what === 'all') await run(390, 844, true)
console.log(logs.length ? logs.join('\n') : 'no errors')
await browser.close()

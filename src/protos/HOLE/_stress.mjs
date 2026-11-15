// Dev-only: open many checks in a row (press each, then Next), then go home; and the reduced-motion cut.
// node src/protos/HOLE/_stress.mjs [n]
import { chromium } from 'playwright-core'
const n = Number(process.argv[2] || 14)
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--enable-precise-memory-info'],
})
const logs = []
const watch = (page) => {
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message))
  page.on('crash', () => logs.push('[CRASH]'))
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
watch(page)
await page.goto('http://localhost:5324/#/proto/HOLE/tracktrace', { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]', { timeout: 30000 })
const mem = () => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6))
const seen = []
for (let i = 0; i < n; i++) {
  await page.waitForSelector('.hole-mod', { timeout: 20000 }).catch(() => logs.push('no module page at step ' + i))
  await page.waitForTimeout(1500)
  await page.click('.hole-run', { timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const id = await page.evaluate(() => document.querySelector('.hole-mod')?.getAttribute('data-id'))
  seen.push(`${id}:${await mem()}MB`)
  await page.click('.hole-foot .is-next', { timeout: 3000 }).catch((e) => logs.push('next: ' + e.message.split('\n')[0]))
}
await page.click('.hole-back').catch(() => {})
await page.waitForTimeout(3500)
const home = await page.evaluate(() => ({ phase: document.querySelector('.hole')?.dataset.phase, clock: document.querySelector('.hole-clock-v')?.textContent, canvases: document.querySelectorAll('canvas').length }))
console.log('steps', seen.join(' '))
console.log('home after', JSON.stringify(home), `${await mem()}MB`)

// reduced motion: a press cuts straight to the check
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const p2 = await ctx.newPage()
watch(p2)
await p2.goto('http://localhost:5324/#/proto/HOLE/home', { waitUntil: 'load' })
await p2.waitForSelector('.hole[data-ready="1"]', { timeout: 30000 })
const t0 = Date.now()
await p2.keyboard.press('3')
await p2.waitForSelector('.hole-mod', { timeout: 10000 })
const tOpen = Date.now() - t0
await p2.click('.hole-back')
const t1 = Date.now()
await p2.waitForFunction(() => document.querySelector('.hole')?.dataset.phase === 'home' && document.querySelector('.hole-clock-v')?.textContent === '1.00', null, { timeout: 10000 })
console.log('reduced motion: open in', tOpen, 'ms; home again in', Date.now() - t1, 'ms')
console.log(logs.length ? logs.join('\n') : 'no errors')
await browser.close()

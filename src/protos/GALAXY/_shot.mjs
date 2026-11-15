// Dev-only screenshots of this take. node src/protos/GALAXY/_shot.mjs [home|fly|mods|phone|all]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const what = process.argv[2] || 'home'
const out = '../work/Web/shots/theme-GALAXY'
mkdirSync(out, { recursive: true })
const base = 'http://localhost:5322/#/proto/GALAXY/'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const logs = []
async function open(size, view, touch = false) {
  const [width, height] = size
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`))
  await page.goto(base + view, { waitUntil: 'load' })
  await page.waitForSelector('.gx[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready: ' + view))
  return page
}
function page_err(page) {
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`))
  page.on('console', (m) => m.type() === 'error' && logs.push(`[error] ${m.text().slice(0, 300)}`))
}
const ids = ['tracktrace', 'bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift', 'garnmeter']

if (what === 'home' || what === 'all') {
  const p = await open([1440, 900], 'home')
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/home_1440.png` })
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2) }; requestAnimationFrame(f) }))
  console.log('fps', fps)
  await p.hover('.gx-label-bubblegrade')
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${out}/home_1440_hover.png` })
  await p.close()
}
if (what === 'fly' || what === 'all') {
  const p = await open([1440, 900], 'home')
  await p.waitForTimeout(1200)
  await p.click('.gx-label-bubblegrade')
  for (const ms of [500, 900, 1300]) {
    await p.waitForTimeout(400)
    await p.screenshot({ path: `${out}/fly_${ms}.png` })
  }
  await p.waitForSelector('.gx.is-open', { timeout: 8000 }).catch(() => logs.push('never opened'))
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/fly_open.png` })
  await p.click('.gx-back')
  await p.waitForTimeout(2200)
  await p.screenshot({ path: `${out}/fly_back.png` })
  console.log('after back hash', await p.evaluate(() => location.hash))
  // every spot opens its check
  for (let i = 0; i < 6; i++) {
    await p.locator('.gx-spot').nth(i).click({ force: true })
    await p.waitForSelector('.gx.is-open', { timeout: 8000 }).catch(() => logs.push('spot never opened ' + i))
    console.log('spot', i, await p.evaluate(() => location.hash))
    await p.keyboard.press('Escape')
    await p.waitForSelector('.gx.is-home[data-ready="1"]', { timeout: 8000 }).catch(() => logs.push('never home ' + i))
    await p.waitForTimeout(300)
  }
  await p.close()
}
if (what === 'mods' || what === 'all') {
  for (const id of ids) {
    const p = await open([1440, 900], id)
    await p.waitForTimeout(3500)
    await p.screenshot({ path: `${out}/${id}_1440.png` })
    if (id === 'tracktrace') {
      await p.evaluate(() => document.querySelector('.gx-mod-scroll').scrollTo(0, 99999))
      await p.waitForTimeout(600)
      await p.screenshot({ path: `${out}/${id}_1440_arch.png` })
      await p.evaluate(() => document.querySelector('.gx-mod-scroll').scrollTo(0, 0))
    }
    await p.click('.gx-run')
    await p.waitForTimeout(id === 'braindrift' ? 9000 : 7500)
    await p.screenshot({ path: `${out}/${id}_1440_run.png` })
    console.log(id, 'state', await p.evaluate(() => document.querySelector('.gx-mod')?.getAttribute('data-state')))
    await p.close()
  }
}
if (what === 'phone' || what === 'all') {
  const p = await open([390, 844], 'home', true)
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/home_390.png` })
  await p.locator('.gx-label-veinsqueeze').tap()
  await p.waitForSelector('.gx.is-open', { timeout: 8000 }).catch(() => logs.push('phone never opened'))
  await p.waitForTimeout(3000)
  await p.screenshot({ path: `${out}/veinsqueeze_390.png` })
  await p.close()
  const q = await open([390, 844], 'tracktrace', true)
  await q.waitForTimeout(3000)
  await q.screenshot({ path: `${out}/tracktrace_390.png` })
  await q.close()
}
if (what === 'sizes') {
  for (const [w, h] of [[1920, 1080], [1366, 768], [820, 1180]]) {
    const p = await open([w, h], 'home')
    await p.waitForTimeout(2600)
    await p.screenshot({ path: `${out}/home_${w}.png` })
    await p.close()
  }
}
if (what === 'form') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  page_err(p)
  await p.goto(base + 'home', { waitUntil: 'load' })
  await p.waitForSelector('.gx-canvas')
  for (let i = 0; i < 7; i++) {
    await p.waitForTimeout(330)
    await p.screenshot({ path: `${out}/form_${i}.png` })
  }
  await p.close()
}
if (what === 'raypin') {
  for (const v of ['0.6', '1.5', '3.4']) {
    const p = await open([1440, 900], 'home?ray=' + v)
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${out}/_raypin_${v}.png`, clip: { x: 520, y: 60, width: 640, height: 560 } })
    await p.close()
  }
}
if (what === 'ray') {
  const p = await open([1440, 900], 'home')
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(60)
    await p.screenshot({ path: `${out}/ray_${i}.png` })
  }
  await p.close()
}
if (what === 'next') {
  const p = await open([1440, 900], 'bubblegrade')
  await p.waitForTimeout(800)
  await p.click('.gx-next')
  await p.waitForTimeout(1000)
  await p.screenshot({ path: `${out}/next_mid.png` })
  await p.waitForSelector('.gx.is-open', { timeout: 8000 }).catch(() => logs.push('next never opened'))
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/next_open.png` })
  console.log('next hash', await p.evaluate(() => location.hash))
  await p.close()
}
if (what === 'still') {
  const p = await open([1440, 900], 'home?nogl=1')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${out}/home_1440_still.png` })
  await p.close()
}
if (logs.length) console.log('--- console ---\n' + [...new Set(logs)].slice(0, 30).join('\n'))
await browser.close()

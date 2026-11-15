// Dev-only (polish 2): times the move into a chamber and the way back, and a press made during the way back.
// node src/protos/V04/_tools/fly2.mjs <outprefix> [WxH] [n] [--frames 300,700,...] [--backpress m]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const val = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')))
const [out, size = '1440x900', n = '1'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && !m.text().includes('VerifyEachNode') && logs.push(`[error] ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'load' })
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(500)
const startLog = (ms) =>
  page.evaluate((ms) => {
    window.__log = []
    const t0 = performance.now()
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__log.push(`${Math.round(e.startTime - t0)} LONGTASK ${Math.round(e.duration)}ms`))).observe({ type: 'longtask' })
    } catch {}
    let last = ''
    const loop = () => {
      const r = document.querySelector('.v04')
      const fl = document.querySelector('.v04-flash')
      const mod = document.querySelector('.v04-mod')
      const s = `${r?.dataset.phase} ready=${r?.dataset.ready} ${location.hash.slice(10)} flash=${fl ? (+getComputedStyle(fl).opacity).toFixed(2) : '-'} mod=${mod ? getComputedStyle(mod).visibility[0] + (+getComputedStyle(mod).opacity).toFixed(2) : '-'}`
      if (s !== last || window.__all) window.__log.push(`${Math.round(performance.now() - t0)} ${s}`)
      last = s
      if (performance.now() - t0 < ms) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }, ms)
const frames = val('--frames', '')
if (a.includes('--all')) await page.evaluate(() => (window.__all = 1))
await startLog(2600)
const c0 = Date.now()
await page.evaluate((n) => document.querySelector(`.v04-ch:nth-child(${n})`).click(), n)
if (frames) {
  for (const t of frames.split(',').map(Number)) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - c0)))
    await page.screenshot({ path: `${out}_in${String(t).padStart(4, '0')}.png` })
  }
}
await page.waitForTimeout(Math.max(0, 2700 - (Date.now() - c0)))
console.log('IN:\n' + (await page.evaluate(() => window.__log)).join('\n'))
await page.waitForTimeout(800)
// the way back, with a press made during it
await startLog(3200)
const b0 = Date.now()
await page.click('.v04-back')
const bp = val('--backpress', '')
if (frames && !bp) {
  for (const t of [150, 300, 450, 600, 800]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - b0)))
    await page.screenshot({ path: `${out}_back${String(t).padStart(4, '0')}.png` })
  }
}
if (bp) {
  await page.waitForTimeout(Number(val('--bpat', '400')))
  const ok = await page.evaluate((m) => {
    const b = document.querySelector(`.v04-ch:nth-child(${m})`)
    if (!b) return 'no button'
    const r = b.getBoundingClientRect()
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return `vis=${b.dataset.vis} hit=${el === b || b.contains(el)}`
  }, bp)
  console.log(`press during back at ${val('--bpat', '400')} ms:`, ok)
  await page.mouse.click(...(await page.evaluate((m) => {
    const r = document.querySelector(`.v04-ch:nth-child(${m})`).getBoundingClientRect()
    return [r.left + r.width / 2, r.top + r.height / 2]
  }, bp)))
}
await page.waitForTimeout(3300)
console.log('BACK:\n' + (await page.evaluate(() => window.__log)).join('\n'))
console.log('final hash', await page.evaluate(() => location.hash))
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()

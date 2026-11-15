// Dev-only: TrackTrace below the fold, "How do we know?", a live run with its timing, the lens, and Home's film.
//   node src/protos/A/_tt.mjs <outDir>   (dev server on :5201)
import { chromium, devices } from 'playwright-core'
const out = process.argv[2] ?? '.'
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-webgpu'] })
const errs = []
async function page(w, h, phone) {
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13'], viewport: { width: w, height: h } } : { viewport: { width: w, height: h } })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && errs.push(`${w}: ${m.text()}`))
  p.on('pageerror', (e) => errs.push(`${w}: pageerror ${e.message}`))
  return p
}
for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
  const p = await page(w, h, phone)
  await p.goto('http://localhost:5201/#/proto/A/tracktrace?state=result')
  await p.waitForSelector('.vb[data-ready="1"]')
  await p.waitForTimeout(400)
  if (!phone) await p.click('.vb-tt-down')
  else await p.evaluate(() => document.querySelector('.vb-tt-below').scrollIntoView())
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `${out}/below_${w}.png` })
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.click('.vb-foot .vb-link')
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${out}/how_${w}.png` })
  await p.goto('http://localhost:5201/#/proto/A/home?state=result')
  await p.waitForSelector('.vb[data-ready="1"]')
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}/home_${w}.png` })
  await p.context().close()
}
// a live run on a laptop: time to the first circle and to the result; then point at a nucleus
{
  const p = await page(1440, 900, false)
  await p.goto('http://localhost:5201/#/proto/A/tracktrace')
  await p.waitForSelector('.vb[data-ready="1"]')
  await p.waitForTimeout(2500)
  const t0 = Date.now()
  await p.click('[data-qa="primary"]')
  let first = null
  let res = null
  let cap = false
  while (Date.now() - t0 < 30000) {
    const s = await p.evaluate(() => ({ state: document.querySelector('.vb').dataset.state, edge: document.querySelector('.vb-edge').innerText.replace(/\s+/g, ' '), num: document.querySelector('.vb-hero')?.innerText ?? '' }))
    if (!cap && /how IonScan reads every nucleus/.test(s.edge) && /of 8/.test(s.edge)) {
      cap = true
      await p.screenshot({ path: `${out}/live_scans_1440.png` })
    }
    if (first === null && s.num) first = Date.now() - t0
    if (s.state === 'result') {
      res = Date.now() - t0
      break
    }
    await p.waitForTimeout(40)
  }
  await p.waitForTimeout(500)
  const snap = () => p.evaluate(() => ({ source: document.querySelector('.vb').dataset.source, edge: document.querySelector('.vb-edge').innerText.replace(/\s+/g, ' '), answer: document.querySelector('.vb-result').innerText.replace(/\s+/g, ' ') }))
  console.log('live run', { captionSeen: cap, firstCircleMs: first, resultMs: res }, await snap())
  await p.screenshot({ path: `${out}/live_result_1440.png` })
  await p.mouse.move(520, 560)
  await p.waitForTimeout(700)
  console.log('lens', await snap())
  await p.screenshot({ path: `${out}/live_lens_1440.png` })
  await p.context().close()
}
console.log('console errors:', errs.length ? errs : 'none')
await b.close()

// Interaction probe for prototype B's two moment-based checks (dev only): the live press, the lens over the
// sample, the scroll to the IonScan figure, the second layer, the path from Home, and the phone path.
//   node src/protos/B/probe-track.mjs <out dir> [tracktrace|bubblegrade]     (dev server on :5202)
import { chromium } from 'playwright-core'
const out = process.argv[2]
const view = process.argv[3] ?? 'tracktrace'
const track = view === 'tracktrace'
const base = 'http://localhost:5202/#/proto/B/'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] })
const log = []
async function page(w, h, phone = false, scale = 1) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : scale, hasTouch: phone, isMobile: phone })
  const p = await ctx.newPage()
  p.on('console', (m) => { if (m.type() === 'error') log.push(`[console ${w}] ${m.text().slice(0, 200)}`) })
  p.on('pageerror', (e) => log.push(`[pageerror ${w}] ${e.message.slice(0, 200)}`))
  return p
}
const ready = (p) => p.waitForSelector('.pb[data-ready="1"]', { timeout: 20000 })
const state = (p) => p.evaluate(() => document.querySelector('.pb')?.getAttribute('data-state') + ' view=' + document.querySelector('.pb')?.getAttribute('data-view'))
const text = (p, sel) => p.textContent(sel, { timeout: 1500 }).catch(() => 'none')

// 1. laptop: one press runs the model live
let p = await page(1440, 900)
await p.goto(base + view); await ready(p)
await p.waitForTimeout(track ? 4000 : 800)
const t0 = Date.now()
await p.click('[data-qa="primary"]')
await p.waitForTimeout(1200)
console.log('after press:', await state(p), '| button:', await text(p, '[data-qa="primary"]'), track ? '| caption: ' + (await text(p, '.pbt-cap')) : '| sound: ' + (await p.evaluate(() => document.querySelector('[data-sound]')?.getAttribute('data-sound'))))
await p.screenshot({ path: `${out}/${view}_press_running_1440.png` })
await p.waitForSelector('.pb[data-state="result"]', { timeout: 90000 }).catch(() => console.log('NO RESULT in 90 s'))
console.log('result after', Date.now() - t0, 'ms:', await state(p), '| num:', await text(p, '.pb-hero-num'), '| cmp:', await text(p, '.pbt-cmp'), '| act:', await text(p, '.pbt-band'))
await p.screenshot({ path: `${out}/${view}_press_result_1440.png` })
if (track) {
  // the lens over another nucleus of the sample
  await p.mouse.move(1100, 400); await p.waitForTimeout(700)
  console.log('lens:', await text(p, '.pb-hero-num'), '|', await text(p, '.pbt-cmp'))
  await p.screenshot({ path: `${out}/${view}_lens_1440.png` })
  await p.mouse.move(300, 700); await p.waitForTimeout(300)
  // the figure, one scroll step below
  await p.click('.pbt-down'); await p.waitForTimeout(900)
  console.log('scrollY after "Inside IonScan":', await p.evaluate(() => Math.round(scrollY)), '| figure loaded:', await p.evaluate(() => document.querySelector('.pbt-arch-fig img')?.naturalWidth))
  await p.screenshot({ path: `${out}/${view}_arch_1440.png` })
  await p.evaluate(() => scrollTo(0, 0))
}
await p.click('.pbt-foot .pb-how-btn'); await p.waitForTimeout(600)
console.log('layer open:', await p.evaluate(() => document.querySelector('dialog.pb-how')?.open))
await p.screenshot({ path: `${out}/${view}_how_1440.png` })
await p.close()

// 2. from Home: the entry on the body opens this view
p = await page(1440, 900)
await p.goto(base + 'home'); await ready(p)
await p.click('.pb-label[href$="' + view + '"]'); await p.waitForTimeout(1500)
console.log('from Home:', await p.evaluate(() => location.hash), await state(p))
await p.close()

// 3. phone: stored outputs, tap to run
p = await page(390, 844, true)
await p.goto(base + view); await ready(p)
await p.tap('[data-qa="primary"]')
await p.waitForTimeout(1300)
await p.screenshot({ path: `${out}/${view}_press_running_390.png` })
await p.waitForSelector('.pb[data-state="result"]', { timeout: 40000 }).catch(() => console.log('NO RESULT (phone)'))
console.log('phone result:', await state(p), '| num:', await text(p, '.pb-hero-num'), '| act:', await text(p, '.pbt-below'))
await p.screenshot({ path: `${out}/${view}_press_result_390.png` })
if (track) {
  await p.evaluate(() => document.querySelector('.pbt-arch')?.scrollIntoView()); await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}/${view}_arch_390.png` })
}
await p.close()

console.log(log.length ? log.join('\n') : 'console clean')
await browser.close()

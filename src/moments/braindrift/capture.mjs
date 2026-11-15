// Dev-only capture driver for the BrainDrift moment (installed Microsoft Edge through playwright-core).
//   node src/moments/braindrift/capture.mjs posters|shots|sizes|strip|touch|live|extra [port] [subfolder of the shots folder]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [what = 'shots', port = '5214', sub = ''] = process.argv.slice(2)
const base = `http://localhost:${port}/#/moment/braindrift`
const app = resolve(import.meta.dirname, '../../..')
const shots = resolve(app, '../work/Web/shots/moment-braindrift', sub)
const posters = resolve(app, 'public/_posters')
mkdirSync(shots, { recursive: true })
mkdirSync(posters, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-webgpu'],
})

async function open(query, w, h, { touch = false, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`${base}${query}`, { waitUntil: 'load' })
  await page.waitForSelector('.bdm[data-ready="1"]', { timeout: 90000 }).catch(() => logs.push('[capture] never ready'))
  await page.waitForTimeout(700)
  return { ctx, page, logs }
}
const attrs = (page) => page.evaluate(() => ({ ...document.querySelector('.bdm').dataset, out: document.querySelector('[data-harness-out]')?.textContent, status: document.querySelector('.bdm-status')?.textContent }))

async function still(name, query, w, h, opts = {}) {
  const { ctx, page, logs } = await open(query, w, h, opts)
  const path = opts.jpeg ?? resolve(shots, `${name}.png`)
  await page.screenshot(opts.jpeg ? { path, type: 'jpeg', quality: 90 } : { path })
  console.log(name, JSON.stringify(await attrs(page)), logs.slice(0, 6).join(' | '))
  await ctx.close()
}

if (what === 'posters') {
  await still('poster', '?poster=1', 1600, 1000, { jpeg: resolve(posters, 'braindrift.jpg') })
  await still('poster_portrait', '?poster=1', 900, 1200, { jpeg: resolve(posters, 'braindrift_portrait.jpg') })
}
if (what === 'shots') {
  await still('idle_1440', '?state=idle', 1440, 900)
  await still('result_1440', '?state=result', 1440, 900)
  await still('idle_390', '?state=idle', 390, 844, { touch: true, scale: 2 })
  await still('result_390', '?state=result', 390, 844, { touch: true, scale: 2 })
}
if (what === 'sizes') {
  for (const [w, h, touch] of [[1024, 700, false], [320, 568, true], [844, 390, true]]) {
    await still(`idle_${w}x${h}`, '?state=idle', w, h, { touch })
    await still(`result_${w}x${h}`, '?state=result', w, h, { touch })
  }
}
if (what === 'strip') {
  for (const t of [600, 1500, 1900, 2700, 3900, 5100, 5900, 6500]) {
    await still(`strip_1440_t${String(t).padStart(4, '0')}`, `?t=${t}`, 1440, 900)
    await still(`strip_390_t${String(t).padStart(4, '0')}`, `?t=${t}`, 390, 844, { touch: true, scale: 1 })
  }
}
if (what === 'touch') {
  // a phone: drag the slider by touch, release, wait for the result; it must say REPLAY
  const { ctx, page, logs } = await open('', 390, 844, { touch: true, scale: 2 })
  console.log('start', JSON.stringify(await attrs(page)))
  const box = await page.locator('[data-qa="primary"]').boundingBox()
  const y = box.y + box.height / 2
  const cdp = await ctx.newCDPSession(page)
  const tp = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  await tp('touchStart', box.x + 14)
  for (let s = 1; s <= 12; s++) {
    await tp('touchMove', box.x + 14 + ((box.width - 28) * s) / 12)
    await page.waitForTimeout(40)
    if (s === 6) {
      console.log('mid-drag', JSON.stringify(await attrs(page)))
      await page.screenshot({ path: resolve(shots, 'touch_390_drag.png') })
    }
  }
  await tp('touchEnd', 0)
  await page.waitForTimeout(600)
  console.log('released', JSON.stringify(await attrs(page)))
  await page.waitForSelector('.bdm[data-state="result"]', { timeout: 30000 }).catch(() => logs.push('[capture] no result'))
  await page.waitForTimeout(300)
  console.log('result', JSON.stringify(await attrs(page)))
  await page.screenshot({ path: resolve(shots, 'touch_390_result.png') })
  // the two end buttons by tap
  await page.locator('.bdm-end-a').tap()
  await page.waitForTimeout(300)
  console.log('after tap Before flight', JSON.stringify(await attrs(page)))
  console.log(logs.join(' | '))
  await ctx.close()
}
if (what === 'live') {
  // a laptop: press Run, the real model reads the brain; then the keyboard path
  const { ctx, page, logs } = await open('?mode=live', 1440, 900)
  await page.locator('[data-harness-run]').click()
  const t0 = Date.now()
  for (const at of [1200, 3000, 5000]) {
    await page.waitForTimeout(at - (Date.now() - t0))
    console.log(`+${at}`, JSON.stringify(await attrs(page)))
  }
  await page.screenshot({ path: resolve(shots, 'live_1440_running.png') })
  await page.waitForSelector('.bdm[data-state="result"]', { timeout: 120000 }).catch(() => logs.push('[capture] no result'))
  await page.waitForTimeout(300)
  console.log('result after ms', Date.now() - t0, JSON.stringify(await attrs(page)))
  await page.screenshot({ path: resolve(shots, 'live_1440_result.png') })
  await page.locator('[data-qa="primary"]').focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(300)
  console.log('keys to f050', JSON.stringify(await attrs(page)))
  await page.waitForSelector('.bdm[data-state="result"]', { timeout: 120000 }).catch(() => logs.push('[capture] no result 2'))
  await page.waitForTimeout(300)
  console.log('f050 result', JSON.stringify(await attrs(page)))
  await page.screenshot({ path: resolve(shots, 'live_1440_f050.png') })
  console.log(logs.join(' | '))
  await ctx.close()
}
if (what === 'extra') {
  // restyle from outside
  await still('theme_paper_1440', '?state=result&theme=paper', 1440, 900)
  // reduced motion: Run goes straight to the end state
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(`${base}?mode=replay`)
    await page.waitForSelector('.bdm[data-ready="1"]', { timeout: 60000 })
    await page.locator('[data-harness-run]').click()
    await page.waitForTimeout(900)
    console.log('reduced motion, 0.9 s after Run', JSON.stringify(await attrs(page)))
    await ctx.close()
  }
  // mouse drag on a laptop (replay so it is quick): mid-drag shot, then release at the middle stop
  {
    const { ctx, page, logs } = await open('?mode=replay', 1440, 900)
    const box = await page.locator('[data-qa="primary"]').boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + 12, y)
    await page.mouse.down()
    for (let s = 1; s <= 10; s++) {
      await page.mouse.move(box.x + 12 + ((box.width - 24) * 0.76 * s) / 10, y)
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(500)
    console.log('mouse mid-drag', JSON.stringify(await attrs(page)), await page.locator('.bdm-note').innerText({ timeout: 3000 }).catch(() => '?'))
    await page.screenshot({ path: resolve(shots, 'drag_1440.png') })
    await page.mouse.up()
    await page.waitForSelector('.bdm[data-state="result"]', { timeout: 30000 }).catch(() => logs.push('[capture] no result'))
    console.log('mouse released', JSON.stringify(await attrs(page)), logs.join(' | '))
    await ctx.close()
  }
  // a mesh that fails to load: the error state and its retry
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    let block = true
    await page.route('**/flight_brain.glb', (r) => (block ? r.abort() : r.continue()))
    await page.goto(`${base}?mode=replay`)
    await page.waitForSelector('.bdm[data-state="error"]', { timeout: 30000 }).catch(() => console.log('no error state'))
    console.log('error state', JSON.stringify(await attrs(page)), await page.locator('.bdm-error').innerText({ timeout: 3000 }).catch(() => '?'))
    await page.screenshot({ path: resolve(shots, 'error_1440.png') })
    block = false
    await page.locator('.bdm-btn').click({ timeout: 3000 }).catch(() => console.log('no retry button'))
    await page.waitForSelector('.bdm[data-ready="1"]', { timeout: 30000 }).catch(() => console.log('retry never ready'))
    console.log('after Try again', JSON.stringify(await attrs(page)))
    await ctx.close()
  }
}
// quick look: one page per size, ?t frames swapped by the hash (the harness remounts on t), into <sub>
//   node src/moments/braindrift/capture.mjs quick <port> <sub> [t,t,...] [sizes 1440x900,390x844]
if (what === 'quick') {
  const ts = (process.argv[5] ?? '0,3300,6999,result').split(',')
  const sizes = (process.argv[6] ?? '1440x900,390x844').split(',')
  for (const sz of sizes) {
    const [w, h] = sz.split('x').map(Number)
    const phone = w <= 500
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => console.log('[pageerror]', e.message))
    page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()))
    for (const t of ts) {
      const q = t === 'result' ? '?state=result' : t === 'idle' ? '?state=idle' : t === 'poster' ? '?poster=1' : `?t=${t}`
      await page.goto(`${base}${q}`, { waitUntil: 'load' })
      await page.waitForSelector('.bdm[data-ready="1"]', { timeout: 60000 }).catch(() => console.log('never ready', t))
      await page.waitForTimeout(900)
      await page.screenshot({ path: resolve(shots, `${t}_${w}.png`) })
      console.log(sz, t, JSON.stringify(await attrs(page)))
    }
    await ctx.close()
  }
}
// the entrance on a natural open: frames after data-ready, in real time
if (what === 'intro') {
  const sizes = (process.argv[5] ?? '1440x900').split(',')
  for (const sz of sizes) {
    const [w, h] = sz.split('x').map(Number)
    const phone = w <= 500
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => console.log('[pageerror]', e.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.waitForSelector('.bdm[data-ready="1"]', { timeout: 60000 })
    const t0 = Date.now()
    for (const ms of [250, 900, 1500, 2100, 3400]) {
      await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)))
      await page.screenshot({ path: resolve(shots, `intro_${w}_${ms}.png`) })
    }
    console.log(sz, JSON.stringify(await attrs(page)), await page.evaluate(() => document.querySelector('.bdm').hasAttribute('data-intro')))
    // then a run in real time: the fly beat (frames swap in, the fluid flares at each swap) and the read
    await page.click('[data-harness-run]')
    const t1 = Date.now()
    for (const ms of [450, 900, 1300, 3000, 5200]) {
      await page.waitForTimeout(Math.max(0, ms - (Date.now() - t1)))
      await page.screenshot({ path: resolve(shots, `run_${w}_${ms}.png`) })
    }
    await ctx.close()
  }
}
await browser.close()

// Dev-only check for the TrackTrace moment (not part of the app bundle). Run from app/ with the dev server up:
//   node src/moments/tracktrace/qa.mjs [stills] [posters] [touch] [mouse] [controls] [live] [cold] [extra] [reduced]
// Writes the two posters to public/_posters/ and screenshots to ../work/Web/shots/moment-tracktrace/fixed/.
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const want = new Set(process.argv.slice(2))
const all = want.size === 0
const base = 'http://localhost:5211/#/moment/tracktrace'
const shots = resolve('../work/Web/shots/moment-tracktrace/fixed')
const posters = resolve('public/_posters')
mkdirSync(shots, { recursive: true })
mkdirSync(posters, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars'],
})
const log = []
async function open(ctx, query) {
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') log.push(`[console] ${m.text()}`) })
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`))
  await page.goto('about:blank')
  await page.goto(base + query)
  await page.waitForSelector('.ttm-harness[data-ready="1"]', { timeout: 40000 })
  await page.evaluate(() => document.fonts.ready)
  return page
}
const attr = (page, name) => page.getAttribute('.ttm', name)

// what the stage holds right now: visible tags, visible words, and the stage size
const census = (page) => page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    let o = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o > 0.05 && r.width > 0 && r.height > 0
  }
  const root = document.querySelector('.ttm')
  const tags = [...root.querySelectorAll('.ttm-tag')].filter(vis).map((e) => e.textContent.trim())
  const texts = [...root.querySelectorAll('.ttm-promise, .ttm-note, .ttm-sample')].filter(vis).map((e) => e.innerText.split(/\s+/).join(' ').trim()).filter(Boolean)
  const r = root.getBoundingClientRect()
  return { tags, words: texts.join(' ').split(' ').filter(Boolean).length, texts, stage: [Math.round(r.width), Math.round(r.height)] }
})
const say = async (label, page) => console.log(label, JSON.stringify(await census(page)))

if (all || want.has('stills')) {
  const film = [0, 200, 700, 1300, 1750, 2100, 2500, 3100, 3500, 4200, 4900, 5600, 6400, 7000]
  for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
    for (const st of ['idle', 'result']) {
      const page = await open(ctx, `?state=${st}`)
      await page.waitForTimeout(350)
      await page.screenshot({ path: resolve(shots, `${st}_${w}.png`) })
      await say(`${st} ${w}:`, page)
      await page.close()
    }
    for (const ms of film) {
      const page = await open(ctx, `?t=${ms}`)
      await page.waitForTimeout(250)
      await page.screenshot({ path: resolve(shots, `film_${w}_${String(ms).padStart(5, '0')}.png`) })
      await page.close()
    }
    await ctx.close()
  }
}

if (all || want.has('posters')) {
  for (const [w, h, name] of [[1600, 1000, 'tracktrace.jpg'], [900, 1200, 'tracktrace_portrait.jpg']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const page = await open(ctx, '?state=result&bare=1&annotate=0')
    await page.waitForTimeout(300)
    await page.screenshot({ path: resolve(posters, name), type: 'jpeg', quality: 90 })
    console.log('poster', name, await attr(page, 'data-state'))
    await ctx.close()
  }
}

if (all || want.has('touch')) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await open(ctx, '')
  const box = await page.locator('.ttm').boundingBox()
  const t0 = Date.now()
  // tapping the idle specimen starts the run
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForSelector('.ttm[data-state="running"]', { timeout: 3000 })
  console.log('touch: tap on specimen -> running')
  await page.waitForTimeout(900)
  await page.screenshot({ path: resolve(shots, 'touch_scans_390.png') })
  const boxRun = await page.locator('.ttm').boundingBox()
  await page.waitForFunction(() => Number(document.querySelector('.ttm').dataset.count) > 0, null, { timeout: 20000 })
  console.log('touch: first circle after', Date.now() - t0, 'ms')
  await page.waitForSelector('.ttm[data-state="result"]', { timeout: 40000 })
  const box2 = await page.locator('.ttm').boundingBox()
  console.log('touch: result after', Date.now() - t0, 'ms, source =', await attr(page, 'data-source'), ', stage height idle / running / result:', box.height, boxRun.height, box2.height)
  await say('touch result:', page)
  await page.touchscreen.tap(box.x + box.width * 0.72, box.y + box.height * 0.74)
  await page.waitForTimeout(250)
  console.log('touch: tap on a tile -> data-picked =', await attr(page, 'data-picked'), ', source =', await attr(page, 'data-picked-source'))
  await say('touch picked:', page)
  await page.screenshot({ path: resolve(shots, 'touch_pick_390.png') })
  await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.82)
  await page.waitForTimeout(250)
  await page.screenshot({ path: resolve(shots, 'touch_pick_low_390.png') })
  await page.tap('[data-qa="primary"]')
  await page.waitForSelector('.ttm[data-state="running"]', { timeout: 3000 })
  console.log('touch: primary -> running again')
  await ctx.close()
}

if (all || want.has('mouse')) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await open(ctx, '?state=result')
  const box = await page.locator('.ttm').boundingBox()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.55)
  await page.waitForTimeout(150)
  console.log('mouse: hover -> data-picked =', await attr(page, 'data-picked'))
  await say('mouse picked (pinned, stored):', page)
  await page.screenshot({ path: resolve(shots, 'pick_1440.png') })
  await page.mouse.move(2, 2)
  await page.locator('.ttm').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(150)
  console.log('keys: arrows -> data-picked =', await attr(page, 'data-picked'))
  await page.keyboard.press('Escape')
  console.log('keys: Escape -> data-picked =', JSON.stringify(await attr(page, 'data-picked')))
  await ctx.close()
}

if (all || want.has('controls')) {
  // every control in the bar, with mouse at 1440 and touch at 390: it must change something a script can see
  for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
    const page = await open(ctx, '?mode=replay')
    const snap = () => page.evaluate(() => location.hash + '|' + document.querySelector('.ttm-harness').outerHTML.length + '|' + document.querySelector('.ttm').dataset.state + '|' + document.querySelector('.ttm').dataset.sample)
    const press = (sel) => (phone ? page.tap(sel) : page.click(sel))
    const results = []
    const use = async (name, fn) => {
      const a = await snap()
      await fn()
      await page.waitForTimeout(700)
      results.push(`${name}: ${(await snap()) !== a ? 'ok' : 'DEAD'}`)
    }
    await use('primary (run)', () => press('[data-qa="primary"]'))
    await use('primary (stop)', () => press('[data-qa="primary"]'))
    for (const i of [1, 2, 0]) await use(`sample ${i}`, () => press(`.ttm-harness-samples button:nth-child(${i + 1})`))
    await use('scrub', async () => { await page.locator('.ttm-harness-scrub input').focus(); await page.keyboard.press('ArrowRight') })
    await use('primary (from pinned)', () => press('[data-qa="primary"]'))
    await page.waitForSelector('.ttm[data-state="result"]', { timeout: 30000 })
    await use('primary (again)', () => press('[data-qa="primary"]'))
    await page.waitForSelector('.ttm[data-state="result"]', { timeout: 30000 })
    await use('stage arrow key', async () => { await page.locator('.ttm').focus(); await page.keyboard.press('ArrowRight') })
    await use('stage Escape', () => page.keyboard.press('Escape'))
    const box = await page.locator('.ttm').boundingBox()
    await use('stage point', () => (phone ? page.touchscreen.tap(box.x + box.width * 0.6, box.y + box.height * 0.6) : page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6)))
    console.log(`controls ${w}:`, results.join('; '))
    await ctx.close()
  }
}

if (all || want.has('extra')) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  for (const id of ['nucleus-239', 'nucleus-241']) {
    for (const st of ['idle', 'result']) {
      const page = await open(ctx, `?state=${st}&sample=${id}`)
      await page.waitForTimeout(300)
      await page.screenshot({ path: resolve(shots, `${st}_${id}_1440.png`) })
      console.log(id, st, 'count =', await attr(page, 'data-count'), ', line =', await attr(page, 'data-line'), '|', await page.getAttribute('.ttm-harness', 'data-answer'))
      await say(`${id} ${st}:`, page)
      await page.close()
    }
  }
  await ctx.close()
}

if (all || want.has('live')) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await open(ctx, '?mode=live')
  await page.waitForTimeout(2500)
  await page.click('[data-qa="primary"]')
  const t0 = Date.now()
  for (const ms of [900, 2050, 2400, 3200, 4300, 5600]) {
    await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)))
    await page.screenshot({ path: resolve(shots, `live_${String(ms).padStart(5, '0')}_1440.png`) })
  }
  await page.waitForSelector('.ttm[data-state="result"]', { timeout: 60000 })
  console.log('live: result after', Date.now() - t0, 'ms, source =', await attr(page, 'data-source'), ', count =', await attr(page, 'data-count'))
  await say('live result:', page)
  await page.screenshot({ path: resolve(shots, 'live_result_1440.png') })
  const box = await page.locator('.ttm').boundingBox()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.62)
  await page.waitForSelector('.ttm[data-picked-source="live"]', { timeout: 8000 }).catch(() => log.push('live lens did not answer'))
  console.log('live lens: picked =', await attr(page, 'data-picked'), ', source =', await attr(page, 'data-picked-source'))
  await say('live lens:', page)
  await page.screenshot({ path: resolve(shots, 'live_pick_1440.png') })
  await ctx.close()
}

if (all || want.has('cold')) {
  // press before the model has loaded: the scans must keep reading until it answers
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await open(ctx, '?mode=live')
  const t0 = Date.now()
  await page.click('[data-qa="primary"]')
  await page.waitForSelector('.ttm[data-state="result"]', { timeout: 60000 })
  console.log('cold live: result after', Date.now() - t0, 'ms, source =', await attr(page, 'data-source'), ', count =', await attr(page, 'data-count'))
  await ctx.close()
}

if (all || want.has('reduced')) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await open(ctx, '')
  const t0 = Date.now()
  await page.tap('[data-qa="primary"]')
  await page.waitForSelector('.ttm[data-state="result"]', { timeout: 20000 })
  console.log('reduced motion: result after', Date.now() - t0, 'ms, beat =', await attr(page, 'data-beat'), ', count =', await attr(page, 'data-count'))
  await ctx.close()
}

if (log.length) console.log('--- errors ---\n' + [...new Set(log)].slice(0, 20).join('\n'))
await browser.close()

// Screenshots, a filmstrip of the moment, and first-viewport metrics for one view.
//   node qa/capture.mjs --port <p> --route "proto/A/home" --out <dir>
//        [--states idle,result] [--sizes 1440x900,390x844] [--film] [--t 0,300,800,1500,2500,4000] [--url <full url>]
// Writes <state>_<width>.png, <state>_<width>.jpg (at most 1440 px wide), film_<width>_<ms>.png + film_<width>.jpg
// and metrics.json into <dir>. Exit code 0 unless the view could not be opened at all.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { attachGuard, baseUrl, launch, measure, newContext, openView, parseArgs, parseSize, pngSize, withParams } from './lib.mjs'

const o = parseArgs()
const base = baseUrl(o)
if (!base || typeof o.out !== 'string') {
  console.error('usage: node qa/capture.mjs --port <p> --route <hash route> --out <dir> [--states idle,result] [--sizes 1440x900,390x844] [--film] [--t 0,300,...] [--url <full url>]')
  process.exit(2)
}
const out = resolve(o.out)
mkdirSync(out, { recursive: true })
const states = String(o.states ?? 'idle,result').split(',').filter(Boolean)
const sizes = String(o.sizes ?? '1440x900,390x844').split(',').filter(Boolean).map(parseSize)
const times = String(typeof o.t === 'string' ? o.t : '0,300,800,1500,2500,4000').split(',').map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
const origin = new URL(base).origin

const browser = await launch(!!o.headed)
// A plain helper page turns PNG files into reviewer JPEGs and tiles the filmstrip (no image library needed).
const helperCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await helperCtx.route('http://qa.local/**', (route) => {
  const name = decodeURIComponent(new URL(route.request().url()).pathname.slice(1))
  if (name === 'blank') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>qa</title>' })
  return route.fulfill({ path: join(out, basename(name)) })
})
const helper = await helperCtx.newPage()
await helper.goto('http://qa.local/blank')

async function toJpeg(pngName, maxW = 1440) {
  const { width, height } = pngSize(join(out, pngName))
  const w = Math.min(width, maxW)
  const h = Math.round((height * w) / width)
  await helper.setViewportSize({ width: w, height: h })
  await helper.setContent(`<body style="margin:0;background:#000"><img src="http://qa.local/${encodeURIComponent(pngName)}" style="display:block;width:${w}px;height:${h}px"></body>`, { waitUntil: 'load' })
  const jpg = pngName.replace(/\.png$/, '.jpg')
  await helper.screenshot({ path: join(out, jpg), type: 'jpeg', quality: 84 })
  return jpg
}

async function strip(frames, name) {
  const cellW = Math.min(480, Math.floor(1440 / Math.min(frames.length, 6)))
  const cols = Math.min(frames.length, 6)
  const html = `<body style="margin:0;background:#111;font:13px system-ui,sans-serif;color:#eee"><div id="s" style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);width:${cols * cellW}px">${frames
    .map((f) => `<figure style="margin:0;padding:4px;box-sizing:border-box"><img src="http://qa.local/${encodeURIComponent(f.file)}" style="display:block;width:100%"><figcaption style="padding:3px 2px">${f.label}</figcaption></figure>`)
    .join('')}</div></body>`
  await helper.setViewportSize({ width: cols * cellW, height: 600 })
  await helper.setContent(html, { waitUntil: 'load' })
  await helper.locator('#s').screenshot({ path: join(out, name), type: 'jpeg', quality: 84 })
  return name
}

const metrics = { url: base, captured_at: new Date().toISOString(), states: {}, film: {}, files: [] }
let opened = 0

for (const size of sizes) {
  const ctx = await newContext(browser, size)
  const guard = await attachGuard(ctx, origin)
  const mark = () => ({ ce: guard.console_errors.length, pe: guard.page_errors.length, ex: guard.external_requests.length, fr: guard.failed_requests.length, br: guard.bad_responses.length })
  const since = (m) => ({
    console_errors: [...guard.console_errors.slice(m.ce), ...guard.page_errors.slice(m.pe).map((e) => `[pageerror] ${e}`)],
    failed_requests: [...guard.failed_requests.slice(m.fr), ...guard.bad_responses.slice(m.br)],
    external_requests: guard.external_requests.slice(m.ex),
  })
  const page = await ctx.newPage()

  for (const state of states) {
    const m0 = mark()
    const url = withParams(base, { state })
    const res = await openView(page, url)
    if (!res.error) opened++
    await page.waitForTimeout(400)
    const png = `${state}_${size.width}.png`
    await page.screenshot({ path: join(out, png) })
    const jpg = await toJpeg(png)
    const m = await page.evaluate(measure, size.width).catch((e) => ({ error: String(e.message) }))
    metrics.states[`${state}_${size.width}`] = {
      state, size: `${size.width}x${size.height}`, phone: size.phone, url,
      ready: res.ready, ready_ms: res.ready_ms, load_error: res.error, ...m, ...since(m0), png, jpg,
    }
    metrics.files.push(png, jpg)
    console.log(`${png}  ready=${res.ready} (${res.ready_ms} ms)  hero=${m.hero_share !== undefined ? Math.round(m.hero_share * 100) : '?'}%  words=${m.words}  blocks=${m.text_blocks}  numbers=${m.numbers}`)
  }

  if (o.film) {
    const film = { mode: 'realtime', frames: [], note: '' }
    const shoot = async (label, file) => { await page.screenshot({ path: join(out, file) }); film.frames.push({ file, label }); metrics.files.push(file) }
    // Pinned timeline: only when --t was given and the view really changes with ?t=<ms>.
    let pinned = false
    if (typeof o.t === 'string' && times.length > 1) {
      const a = await openView(page, withParams(base, { t: times[0] }))
      await page.waitForTimeout(250)
      const first = await page.screenshot()
      await openView(page, withParams(base, { t: times.at(-1) }))
      await page.waitForTimeout(250)
      const last = await page.screenshot()
      pinned = a.ready && !first.equals(last)
      if (!pinned) film.note = 'view ignores ?t=<ms> (first and last pinned frames are identical); filmed in real time instead'
    }
    if (pinned) {
      film.mode = 'pinned'
      for (const t of times) {
        await openView(page, withParams(base, { t }))
        await page.waitForTimeout(250)
        await shoot(`t=${t} ms (pinned)`, `film_${size.width}_${String(t).padStart(5, '0')}.png`)
      }
    } else {
      const res = await openView(page, withParams(base, { state: 'idle' }))
      await page.waitForTimeout(300)
      const primary = page.locator('[data-qa="primary"]').first()
      if (!res.ready || (await primary.count()) === 0) film.note = `no filmstrip: ${res.ready ? 'no [data-qa="primary"] on the page' : 'data-ready never set'}`
      else {
        await primary.scrollIntoViewIfNeeded().catch(() => {})
        const box = await primary.boundingBox()
        const hold = await primary.evaluate((el) => el.hasAttribute('data-hold'))
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2
        let release = null
        if (size.phone) {
          const cdp = await ctx.newCDPSession(page)
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
          release = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        } else {
          await page.mouse.move(x, y)
          await page.mouse.down()
          release = () => page.mouse.up()
        }
        const t0 = Date.now()
        let released = false
        const releaseAt = hold ? 900 : 0
        if (!hold) { await release(); released = true }
        for (const t of times) {
          if (!released && t >= releaseAt) {
            await page.waitForTimeout(Math.max(0, releaseAt - (Date.now() - t0)))
            await release(); released = true
          }
          await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
          const actual = Date.now() - t0
          await shoot(`t=${t} ms (real ${actual} ms)`, `film_${size.width}_${String(t).padStart(5, '0')}.png`)
        }
        if (!released) await release()
        film.end_state = await page.evaluate(() => document.querySelector('[data-state]')?.getAttribute('data-state') ?? null).catch(() => null)
      }
    }
    if (film.frames.length) { film.strip = await strip(film.frames, `film_${size.width}.jpg`); metrics.files.push(film.strip) }
    metrics.film[String(size.width)] = film
    console.log(`film_${size.width}: ${film.frames.length} frames, ${film.mode}${film.note ? ` (${film.note})` : ''}`)
  }
  await ctx.close()
}

writeFileSync(join(out, 'metrics.json'), JSON.stringify(metrics, null, 2))
await browser.close()
console.log(`metrics.json written to ${out}`)
process.exit(opened ? 0 : 1)

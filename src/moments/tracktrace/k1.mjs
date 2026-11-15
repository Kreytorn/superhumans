// Dev-only check for the k1 changes (pool of nuclei, step control, slower timeline). Run from app/ with the dev
// server on 5211:  node src/moments/tracktrace/k1.mjs <out dir> [flow] [deck] [pool] [phone]
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const out = resolve(process.argv[2] ?? '../work/Web/shots/moment-tracktrace/k1/r2')
const want = new Set(process.argv.slice(3))
const all = want.size === 0
mkdirSync(out, { recursive: true })
const base = 'http://localhost:5211/#/moment/tracktrace'
const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars'],
})
const log = { errors: [] }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function open(ctx, query = '') {
  // other agents edit this tree while we test: keep the dev server's hot reload from remounting the page under us
  await ctx.addInitScript(() => {
    window.WebSocket = class { addEventListener() {} removeEventListener() {} send() {} close() {} }
  })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(`[console] ${m.text().slice(0, 200)}`) })
  page.on('pageerror', (e) => log.errors.push(`[pageerror] ${e.message}`))
  await page.goto('about:blank')
  await page.goto(base + query)
  await page.waitForSelector('.ttm-harness[data-ready="1"]', { timeout: 40000 })
  await page.evaluate(() => document.fonts.ready)
  return page
}
const A = (page, n) => page.getAttribute('.ttm', n)
const snap = async (page) => ({
  sample: await A(page, 'data-sample'), state: await A(page, 'data-state'), beat: await A(page, 'data-beat'),
  count: await A(page, 'data-count'), line: await A(page, 'data-line'), source: await A(page, 'data-source'),
})
const result = (page) => page.waitForSelector('.ttm[data-state="result"]', { timeout: 60000 })

async function flow(name, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await open(ctx)
  const w = ctxOpts.viewport.width
  const rec = { first: await snap(page) }
  await page.screenshot({ path: `${out}/${name}_idle_${w}.png` })
  const t0 = Date.now()
  await page.click('[data-qa="primary"]')
  for (const t of [1300, 2600, 3900, 5400, 7200, 9400]) {
    await sleep(Math.max(0, t - (Date.now() - t0)))
    await page.screenshot({ path: `${out}/${name}_run_${String(t).padStart(5, '0')}_${w}.png` })
  }
  await result(page)
  rec.runMs = Date.now() - t0
  await sleep(300)
  rec.result1 = await snap(page)
  await page.screenshot({ path: `${out}/${name}_result_${w}.png` })
  // the step control: next nucleus, read at once
  const t1 = Date.now()
  await page.click('[data-qa="next"]')
  await sleep(110)
  await page.screenshot({ path: `${out}/${name}_swap_0110_${w}.png` })
  await sleep(Math.max(0, 600 - (Date.now() - t1)))
  rec.afterNext = await snap(page)
  await page.screenshot({ path: `${out}/${name}_swap_0600_${w}.png` })
  await result(page)
  await sleep(300)
  rec.result2 = await snap(page)
  await page.screenshot({ path: `${out}/${name}_result2_${w}.png` })
  // "read another one" from the page's own button
  await page.click('[data-qa="primary"]')
  await sleep(900)
  rec.afterAgain = await snap(page)
  await result(page)
  await sleep(300)
  rec.result3 = await snap(page)
  await page.screenshot({ path: `${out}/${name}_result3_${w}.png` })
  // a new visit shows the next one
  await page.reload()
  await page.waitForSelector('.ttm-harness[data-ready="1"]', { timeout: 40000 })
  rec.newVisit = await snap(page)
  await page.screenshot({ path: `${out}/${name}_revisit_${w}.png` })
  await ctx.close()
  return rec
}

if (all || want.has('flow')) log.flow1440 = await flow('flow', { viewport: { width: 1440, height: 900 } })
if (all || want.has('phone')) {
  log.flow390 = await flow('flow', {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
}

if (all || want.has('deck')) {
  // stepping at idle: one pass shows every nucleus once; the next pass never opens with the one just shown
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await open(ctx)
  const ids = [await A(page, 'data-sample')]
  for (let i = 0; i < 29; i++) {
    const before = ids[ids.length - 1]
    await page.click('[data-qa="next"]')
    await page.waitForFunction((b) => {
      const el = document.querySelector('.ttm')
      return el && el.getAttribute('data-sample') !== b && el.getAttribute('data-ready') === '1' && !el.hasAttribute('data-swap')
    }, before, { timeout: 10000 })
    ids.push(await A(page, 'data-sample'))
    if (i < 14) {
      await sleep(380)
      await page.screenshot({ path: `${out}/deck_${String(i + 1).padStart(2, '0')}_${ids[ids.length - 1]}_1440.png` })
    }
  }
  const pass1 = ids.slice(0, 14)
  const pass2 = ids.slice(14, 28)
  log.deck = {
    ids, pass1Unique: new Set(pass1).size, pass2Unique: new Set(pass2).size,
    backToBack: ids.some((v, i) => i > 0 && v === ids[i - 1]), sameOrder: pass1.join() === pass2.join(),
  }
  await ctx.close()
}

if (all || want.has('pool')) {
  // every nucleus of the pool at its settled result, pinned: counts and lines must equal the engine's stored outputs
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const g = await (await fetch('http://localhost:5211/tracktrace/gallery/gallery.json')).json()
  const ref = new Map(g.nuclei.map((n) => [n.id, n]))
  const poolIds = ['238', '003', '007', '011', '004', '010', '009', '000', '013', '012', '239', '241', '146', '038'].map((x) => `nucleus-${x}`)
  log.pool = []
  for (const id of poolIds) {
    const page = await open(ctx, `?sample=${id}&state=result`)
    await sleep(250)
    const s = await snap(page)
    const n = ref.get(id)
    log.pool.push({
      id, cond: n.cond, count: Number(s.count), refCount: n.ref.count, line: s.line === '1', refLine: n.ref.line.drawn, beat: s.beat,
      ok: Number(s.count) === n.ref.count && (s.line === '1') === n.ref.line.drawn,
    })
    await page.screenshot({ path: `${out}/pool_${id}_1440.png` })
    await page.close()
  }
  await ctx.close()
}

await browser.close()
writeFileSync(`${out}/k1.json`, JSON.stringify(log, null, 1))
console.log(JSON.stringify(log, null, 1))

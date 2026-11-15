// Dev-only screenshots for take V06 (installed Microsoft Edge through playwright-core, no download).
//   node src/protos/V06/_tools/shots.mjs <outDir> <job> [job...]
// jobs: home | L:<value>[:ui] | dive:<i>:<u> | hover:<i> | focus | film | intro | mod:<id> | back | still
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PORT = 5506
const BASE = `http://localhost:${PORT}/#/proto/V06`
const out = resolve(process.argv[2] ?? '.')
const jobs = process.argv.slice(3)
const phoneToo = process.env.PHONE !== '0'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})
const logs = []
async function ctxFor(size) {
  const phone = size.w <= 500
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 400)}`))
  return { ctx, page }
}
async function open(page, view, wait = true) {
  await page.goto('about:blank')
  const t0 = Date.now()
  await page.goto(`${BASE}/${view}`, { waitUntil: 'load' })
  if (wait) {
    await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 45000 }).catch(() => logs.push(`[shots] not ready: ${view}`))
    logs.push(`[shots] ${view} ready after ${Date.now() - t0} ms`)
  }
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(300)
}
const DESK = { w: 1440, h: 900 }
const PHONE = { w: 390, h: 844 }
const sizes = phoneToo ? [DESK, PHONE] : [DESK]
const shot = (page, name, opts = {}) => page.screenshot({ path: join(out, name), ...opts })

for (const job of jobs) {
  const [kind, a, b] = job.split(':')
  if (kind === 'q') {
    const query = job.split(':').slice(2).join(':')
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, `home?${query}`)
      await shot(page, `${a}_${size.w}.png`)
      await ctx.close()
    }
  } else if (kind === 'home') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home')
      await shot(page, `home_${size.w}.png`)
      await ctx.close()
    }
  } else if (kind === 'L') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, `home?L=${a}&ui=${b ?? 0}`)
      await shot(page, `L${a}_${size.w}.png`)
      await ctx.close()
    }
  } else if (kind === 'dive') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, `home?dive=${a}&du=${b}`)
      await shot(page, `dive${a}_${b}_${size.w}.png`)
      await ctx.close()
    }
  } else if (kind === 'hover') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'home?intro=0')
    const box = await page.locator('.v6-place').nth(Number(a)).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 })
    await page.waitForTimeout(900)
    await shot(page, `hover${a}_1440.png`)
    await ctx.close()
  } else if (kind === 'focus') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'home?intro=0')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(700)
    await shot(page, `focus_1440.png`)
    await ctx.close()
  } else if (kind === 'intro') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home', false)
      const t0 = Date.now()
      for (const t of [250, 1500, 2200, 2800, 3400, 4300, 5600, 7200]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
        await shot(page, `intro_${size.w}_${String(t).padStart(4, '0')}.png`)
      }
      await ctx.close()
    }
  } else if (kind === 'film') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home?intro=0')
      const el = page.locator('[data-qa="primary"]')
      const box = await el.boundingBox()
      if (size.w > 500) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      else await el.tap()
      const t0 = Date.now()
      for (const t of [0, 300, 600, 900, 1100, 1400, 2600]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
        await shot(page, `film_${size.w}_${String(t).padStart(4, '0')}.png`)
      }
      await ctx.close()
    }
  } else if (kind === 'mod') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, a)
      await page.waitForTimeout(1500)
      await shot(page, `mod_${a}_${size.w}.png`)
      if (a === 'tracktrace') await shot(page, `mod_${a}_${size.w}_full.png`, { fullPage: true })
      await ctx.close()
    }
  } else if (kind === 'back') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'bubblegrade')
    await page.locator('.v6-back').click()
    const t0 = Date.now()
    for (const t of [150, 500, 900, 1400, 2200]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
      await shot(page, `back_${String(t).padStart(4, '0')}.png`)
    }
    await ctx.close()
  } else if (kind === 'still') {
    for (const size of sizes) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home?intro=0')
      await page.addStyleTag({ content: '.v6-head,.v6-focus,.v6-rail,.v6-ai,.v6-places,.v6-shade{display:none!important}' })
      await page.waitForTimeout(300)
      await shot(page, `still_${size.w}.jpg`, { type: 'jpeg', quality: 86 })
      await ctx.close()
    }
  }
}
console.log(logs.join('\n'))
await browser.close()

// Dev-only: open a V10 route, optionally hover, focus or press a medallion, and save pictures.
// node src/protos/V10/_tools/shot.mjs <view> <out.png> [WxH] [--hover n] [--focus n] [--click n] [--frames 0,300,600]
//      [--after ms] [--run] [--scroll px] [--at ms] (--at: picture at a fixed time after load instead of data-ready)
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const withVal = ['--hover', '--focus', '--click', '--after', '--scroll', '--frames', '--at', '--back']
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && withVal.includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const t0 = Date.now()
await page.goto(`http://localhost:5510/#/proto/V10/${view}`, { waitUntil: 'load' })
if (flag('--at')) {
  await page.waitForTimeout(Number(val('--at')))
} else {
  await page.waitForSelector('.v10[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
}
const readyMs = Date.now() - t0
await page.waitForTimeout(Number(flag('--at') ? 0 : 300))
const nth = (n) => `.v10-med:nth-child(${n})`
if (flag('--hover')) await page.hover(nth(val('--hover')), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--focus')) {
  await page.keyboard.press('Tab')
  await page.focus(nth(val('--focus'))).catch((e) => logs.push('focus: ' + e.message))
}
if (flag('--click')) {
  const sel = nth(val('--click'))
  if (flag('--frames')) {
    const times = val('--frames').split(',').map(Number)
    const c0 = Date.now()
    await page.click(sel, { force: true }).catch((e) => logs.push('click: ' + e.message))
    for (const t of times) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - c0)))
      await page.screenshot({ path: out.replace(/\.png$/, `_${String(t).padStart(4, '0')}.png`) })
    }
  } else await page.click(sel, { force: true }).catch((e) => logs.push('click: ' + e.message))
}
if (flag('--back')) {
  // from a check's page: press Back, then pictures at the given times
  const times = val('--back').split(',').map(Number)
  await page.waitForSelector('.v10[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('page not ready'))
  const c0 = Date.now()
  await page.click('.v10-back').catch((e) => logs.push('back: ' + e.message))
  for (const t of times) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - c0)))
    await page.screenshot({ path: out.replace(/\.png$/, `_back${String(t).padStart(4, '0')}.png`) })
  }
}
if (flag('--run')) await page.click('.v10-run').catch((e) => logs.push('run: ' + e.message))
if (flag('--hover') || flag('--focus') || flag('--click') || flag('--run')) await page.waitForTimeout(Number(val('--after', 700)))
if (flag('--scroll')) {
  await page.evaluate((y) => document.querySelector('.v10-mod')?.scrollTo(0, y), Number(val('--scroll')))
  await page.waitForTimeout(400)
}
if (!flag('--frames') && !flag('--back')) await page.screenshot({ path: out })
const info = await page.evaluate(() => {
  const r = document.querySelector('.v10')
  const boxes = [...document.querySelectorAll('.v10-med')].map((b) => {
    const q = b.getBoundingClientRect()
    const l = b.querySelector('.v10-med-label')?.getBoundingClientRect()
    return `${Math.round(q.x)},${Math.round(q.y)} ${Math.round(q.width)} | label ${l ? `${Math.round(l.x)},${Math.round(l.y)} ${Math.round(l.width)}x${Math.round(l.height)}` : '-'}`
  })
  const stage = document.querySelector('.v10-stage')?.getBoundingClientRect()
  return { phase: r?.dataset.phase, hash: location.hash, sw: document.documentElement.scrollWidth, stage: stage ? `${Math.round(stage.width)}x${Math.round(stage.height)}` : null, state: document.querySelector('.v10-mod')?.getAttribute('data-state'), boxes }
})
console.log(view, size, 'ready', readyMs, 'ms', JSON.stringify(info))
if (logs.length) console.log(logs.slice(-12).join('\n'))
await browser.close()

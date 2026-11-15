// Dev-only: open a V04 route with the real GPU, optionally hover, focus, press or run things, wait, and save a picture.
// node src/protos/V04/_tools/shot.mjs <view> <out.png> [WxH] [--query a=b&c=d] [--wait ms] [--hover n] [--focus n] [--click n]
//      [--after ms] [--run] [--scroll px] [--frames 0,300,600] (with --click: one picture per time, named <out>_<ms>.png)
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const withVal = ['--query', '--wait', '--hover', '--focus', '--click', '--after', '--scroll', '--frames']
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
const q = val('--query', '')
const t0 = Date.now()
await page.goto(`http://localhost:5504/#/proto/V04/${view}${q ? `?${q}` : ''}`, { waitUntil: 'load' })
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
const readyMs = Date.now() - t0
await page.waitForTimeout(Number(val('--wait', 500)))
const nth = (n) => `.v04-ch:nth-child(${n})`
if (flag('--hover')) await page.hover(nth(val('--hover')), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--focus')) await page.focus(nth(val('--focus'))).catch((e) => logs.push('focus: ' + e.message))
if (flag('--focus')) await page.keyboard.press('Shift').catch(() => {})
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
if (flag('--run')) await page.click('.v04-run').catch((e) => logs.push('run: ' + e.message))
if (flag('--hover') || flag('--focus') || flag('--click') || flag('--run')) await page.waitForTimeout(Number(val('--after', 900)))
if (flag('--scroll')) {
  await page.evaluate((y) => document.querySelector('.v04-mod')?.scrollTo(0, y), Number(val('--scroll')))
  await page.waitForTimeout(400)
}
if (!flag('--frames')) await page.screenshot({ path: out })
const info = await page.evaluate(() => {
  const r = document.querySelector('.v04')
  const c = document.querySelector('.v04 canvas')
  const gl = c && (c.getContext('webgl2') || null)
  let renderer = ''
  try {
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''
  } catch {}
  const boxes = [...document.querySelectorAll('.v04-ch')].map((b) => {
    const q = b.getBoundingClientRect()
    return `${b.dataset.vis}:${Math.round(q.x)},${Math.round(q.y)} ${Math.round(q.width)}x${Math.round(q.height)}`
  })
  return { phase: r?.dataset.phase, hash: location.hash, canvas: c ? `${c.width}x${c.height}` : null, renderer: renderer.slice(0, 60), state: document.querySelector('.v04-mod')?.getAttribute('data-state'), sw: document.documentElement.scrollWidth, boxes }
})
console.log(view, size, 'ready', readyMs, 'ms', JSON.stringify(info))
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()

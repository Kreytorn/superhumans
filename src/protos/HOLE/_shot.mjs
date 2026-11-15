// Dev-only: open a HOLE route with the real GPU, optionally press things, wait, and save a screenshot.
// node src/protos/HOLE/_shot.mjs <view> <out.png> [WxH] [--click sel] [--run] [--wait ms] [--scroll px] [--hover sel] [--key k] [--query a=b]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const withVal = ['--wait', '--scroll', '--hover', '--key', '--click', '--query', '--wait2']
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && withVal.includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const q = val('--query', 'q=1')
await page.goto(`http://localhost:5324/#/proto/HOLE/${view}?${q}`, { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
await page.waitForTimeout(Number(val('--wait', 1800)))
if (flag('--key')) await page.keyboard.press(val('--key'))
if (flag('--hover')) await page.hover(val('--hover'), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
if (flag('--run')) await page.click('.hole-run').catch((e) => logs.push('run: ' + e.message))
if (flag('--key') || flag('--hover') || flag('--click') || flag('--run')) await page.waitForTimeout(Number(val('--wait2', 1200)))
if (flag('--scroll')) {
  await page.evaluate((y) => document.querySelector('.hole-mod')?.scrollTo(0, y), Number(val('--scroll')))
  await page.waitForTimeout(500)
}
await page.screenshot({ path: out })
const info = await page.evaluate(() => {
  const r = document.querySelector('.hole')
  const c = document.querySelector('.hole canvas')
  const gl = c && (c.getContext('webgl2') || null)
  let renderer = ''
  try {
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''
  } catch {}
  return { phase: r?.dataset.phase, hash: location.hash, canvas: c ? `${c.width}x${c.height}` : null, renderer, clock: document.querySelector('.hole-clock-v')?.textContent, state: document.querySelector('.hole-mod')?.getAttribute('data-state'), sw: document.documentElement.scrollWidth }
})
console.log(view, size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

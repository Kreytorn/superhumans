// Dev-only: open the home shot on the machine's real GPU (not software WebGL), report the renderer and frames per second.
// node src/protos/MARS/_fps.mjs [WxH] [dpr] [out.png]
import { chromium } from 'playwright-core'
const [size = '1440x900', dpr = '1', out] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu', '--disable-frame-rate-limit', '--disable-gpu-vsync'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(dpr) })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto('http://localhost:5321/#/proto/MARS/home', { waitUntil: 'load' })
await page.waitForSelector('.mars[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
await page.waitForTimeout(1500)
const info = await page.evaluate(async () => {
  const c = document.createElement('canvas').getContext('webgl2')
  const ext = c?.getExtension('WEBGL_debug_renderer_info')
  const renderer = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
  const cv = document.querySelector('.mars-canvas')
  let n = 0
  const t0 = performance.now()
  await new Promise((res) => {
    const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res() }
    requestAnimationFrame(tick)
  })
  return { renderer, fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), canvas: `${cv.width}x${cv.height}`, gl: document.querySelector('.mars').dataset.gl }
})
if (out) await page.screenshot({ path: out })
console.log(size, 'dpr', dpr, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()

// Dev-only: time the figure shader on the home (compile start, program ready, first draw), plus shots at set times.
// node src/protos/DF/_fixbench.mjs [--d3d] [--size WxH] [--shots prefix] [--port 5660] [--still]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const d3d = a.includes('--d3d')
const [width, height] = val('--size', '1440x900').split('x').map(Number)
const shots = val('--shots', '')
const port = val('--port', '5660')
const phone = width < 700
const args = ['--hide-scrollbars', '--force-device-scale-factor=1']
if (d3d) args.push('--use-angle=d3d11', '--enable-unsafe-webgpu')
const browser = await chromium.launch({ channel: 'msedge', headless: true, args })
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone, reducedMotion: a.includes('--still') ? 'reduce' : 'no-preference' })
// --hold ms: the shader reports "not compiled yet" for that long, to see the poster standing in
const hold = Number(val('--hold', '0'))
if (hold)
  await ctx.addInitScript((ms) => {
    const t0 = performance.now()
    const orig = WebGL2RenderingContext.prototype.getProgramParameter
    WebGL2RenderingContext.prototype.getProgramParameter = function (p, n) {
      if (n === 0x91b1 && performance.now() - t0 < ms) return false
      return orig.call(this, p, n)
    }
  }, hold)
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const t0 = Date.now()
await page.goto(`http://localhost:${port}/#/proto/DF/home`, { waitUntil: 'commit', timeout: 120000 })
const marks = async () =>
  page.evaluate(() => Object.fromEntries(performance.getEntriesByType('mark').filter((m) => m.name.startsWith('df-')).map((m) => [m.name, Math.round(m.startTime)])))
const times = shots ? [1000, 3000, 10000] : []
let i = 0
let m = {}
while (Date.now() - t0 < 60000) {
  const el = Date.now() - t0
  if (i < times.length && el >= times[i]) {
    await page.screenshot({ path: `${shots}_${times[i] / 1000}s.png` })
    i++
  }
  m = await marks().catch(() => ({}))
  if (m['df-fig-drawn'] && i >= times.length) break
  await page.waitForTimeout(50)
}
const info = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2')
  const ext = c && c.getExtension('WEBGL_debug_renderer_info')
  return {
    renderer: ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?',
    poster: document.querySelector('.df-poster') ? getComputedStyle(document.querySelector('.df-poster')).opacity : 'none',
    live: document.querySelector('.df')?.getAttribute('data-fig') ?? '',
  }
})
console.log(`${d3d ? 'd3d11' : 'default'} ${width}x${height}`, JSON.stringify(m), JSON.stringify(info))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

// Dev probe for V02: open a route in the QA Edge, report the GPU, frame rate, console and ready state, save a shot.
// node src/protos/V02/_tools/probe.mjs <route> <out.png> [WxH] [waitMs] [--hover=i] [--js=<expr>]
import { launch } from '../../../../qa/lib.mjs'

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flag = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const [route, out, size = '1440x900', waitMs = '6000'] = pos
const [width, height] = size.split('x').map(Number)
const browser = await launch(false)
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(flag('dpr') ?? 1), hasTouch: width < 700, isMobile: width < 700 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
if (process.argv.includes('--nogl')) {
  // pretend WebGL2 is missing, to see the still fallback
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return type === 'webgl2' && this.classList.contains('v02-gl') ? null : get.call(this, type, ...rest)
    }
  })
}
await page.goto(`http://localhost:5502/#/${route}`, { waitUntil: 'load' })
const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  if (!gl) return 'no webgl2'
  const e = gl.getExtension('WEBGL_debug_renderer_info')
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
})
const t0 = Date.now()
await page.waitForTimeout(Number(waitMs))
const hover = flag('hover')
if (hover !== undefined) {
  await page.locator('.v02-spot').nth(Number(hover)).hover({ force: true })
  await page.waitForTimeout(900)
}
const press = flag('press')
if (press !== undefined) {
  // film the dive: press organ <press>, shoot at the given times (ms after the press)
  const times = (flag('t') ?? '0,300,600,900,1300,2500').split(',').map(Number)
  await page.locator('.v02-spot').nth(Number(press)).click({ force: true })
  const t0 = Date.now()
  for (const t of times) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
    await page.screenshot({ path: out.replace(/\.png$/, `_p${String(t).padStart(4, '0')}.png`) })
  }
}
const js = flag('js')
if (js) console.log('js:', await page.evaluate(js))
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0
      const t = performance.now()
      const f = () => (++n, performance.now() - t < 2000 ? requestAnimationFrame(f) : res((n * 1000) / (performance.now() - t)))
      requestAnimationFrame(f)
    }),
)
const ready = await page.evaluate(() => document.querySelector('[data-ready]')?.getAttribute('data-ready') ?? null)
if (process.argv.includes('--full')) {
  // the module page scrolls inside its fixed root: shoot the root's whole height
  const h = await page.evaluate(() => document.querySelector('.v02')?.scrollHeight ?? 0)
  if (h > height) await page.setViewportSize({ width, height: h })
  await page.waitForTimeout(600)
}
await page.screenshot(out.endsWith('.jpg') ? { path: out, type: 'jpeg', quality: 86 } : { path: out })
const extra = Number(flag('shots') ?? 0)
for (let i = 1; i <= extra; i++) {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out.replace(/\.png$/, `_${i}.png`) })
}
console.log(`gpu: ${gpu}\nfps: ${Number(fps).toFixed(1)}  ready: ${ready}  waited: ${Date.now() - t0} ms`)
if (logs.length) console.log('--- console ---\n' + logs.slice(-30).join('\n'))
await browser.close()

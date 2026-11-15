import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--hide-scrollbars', '--enable-unsafe-webgpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const q of (process.argv[2] ?? 'intro=0').split('|')) {
  await page.goto('about:blank')
  await page.goto('http://localhost:5506/#/proto/V06/home?' + q, { waitUntil: 'load' })
  await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 40000 }).catch(() => {})
  const r = await page.evaluate(async () => {
    const ts = []
    const t0 = performance.now()
    while (performance.now() - t0 < 2500) ts.push(await new Promise((r) => requestAnimationFrame(r)))
    const d = ts.slice(1).map((t, i) => t - ts[i])
    d.sort((a, b) => a - b)
    const c = document.querySelector('.v6-gl')
    return { frames: d.length, median: d[d.length >> 1].toFixed(1), p90: d[Math.floor(d.length * 0.9)].toFixed(1), canvas: c ? `${c.width}x${c.height}` : 'none', gpu: (() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?' })() }
  })
  console.log(q, JSON.stringify(r))
}
await browser.close()

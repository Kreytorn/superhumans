// Dev-only: frame rate of the home scene at device pixel ratio 2. node src/protos/GALAXY/_fps.mjs
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
for (const [w, h, d] of [[1440, 900, 2], [1920, 1080, 1.5]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d })
  const p = await ctx.newPage()
  await p.goto('http://localhost:5322/#/proto/GALAXY/home', { waitUntil: 'load' })
  await p.waitForSelector('.gx[data-ready="1"]', { timeout: 30000 })
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3) }; requestAnimationFrame(f) }))
  const size = await p.evaluate(() => { const c = document.querySelector('.gx-canvas'); return c.width + 'x' + c.height })
  console.log(w, h, 'dpr', d, 'fps', fps.toFixed(1), 'canvas', size)
  await ctx.close()
}
await browser.close()

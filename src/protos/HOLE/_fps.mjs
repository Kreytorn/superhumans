// Dev-only: measure the home scene's frame time on the real GPU (no pinned quality, so the automatic scale acts).
import { chromium } from 'playwright-core'
const [size = '1440x900', dsf = '1'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(dsf) })
await page.goto(`http://localhost:5324/#/proto/HOLE/home`, { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]', { timeout: 30000 })
for (const label of ['first 3 s', 'after settle']) {
  const r = await page.evaluate(() => new Promise((res) => { const ts = []; let n = 0; const f = (t) => { ts.push(t); if (++n < 150) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); const c = document.querySelector('.hole canvas'); res({ median: d[Math.floor(d.length / 2)].toFixed(1), p95: d[Math.floor(d.length * 0.95)].toFixed(1), canvas: c.width + 'x' + c.height }) } }; requestAnimationFrame(f) }))
  console.log(size, 'dsf', dsf, label, JSON.stringify(r))
}
await browser.close()

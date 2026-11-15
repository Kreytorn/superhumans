// Dev-only: does the TrackTrace stage run as fast inside the HOLE page as in its own harness?
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
for (const [label, url, start] of [
    ['HOLE page', 'http://localhost:5324/#/proto/HOLE/tracktrace', async (p) => { await p.click('.hole-run') }],
  ['HOLE still', 'http://localhost:5324/#/proto/HOLE/tracktrace?still=1', async (p) => { await p.click('.hole-run') }],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('[data-beat][data-ready="1"]', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await start(page)
  const out = []
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(2000)
    out.push(await page.evaluate(() => { const r = document.querySelector('[data-beat]'); const h = document.querySelector('.hole'); return `${r?.dataset.state}/${r?.dataset.beat}/${r?.dataset.source}` + (h ? ` f:${window.__hole?.frames}` : '') }))
  }
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n < 60) requestAnimationFrame(f); else res(Math.round(60000 / (performance.now() - t0))) }; requestAnimationFrame(f) }))
  console.log(label, '| every 2 s:', out.join(' , '), '| page fps now', fps)
  await page.close()
}
await browser.close()

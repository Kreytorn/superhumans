// Dev-only (polish 2): when do the root, the title, the labels and data-ready arrive after navigation?
import { chromium } from 'playwright-core'
const size = process.argv[2] ?? '1440x900'
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
for (let run = 0; run < 2; run++) {
  const page = await browser.newPage({ viewport: { width, height } })
  const t0 = Date.now()
  await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'commit' })
  let last = ''
  while (Date.now() - t0 < 15000) {
    const s = await page.evaluate(() => {
      const r = document.querySelector('.v04')
      if (!r) return 'no root'
      const t = document.querySelector('.v04-title')
      const vis = [...document.querySelectorAll('.v04-ch')].filter((b) => b.dataset.vis === '1').length
      return `root title=${t ? (+getComputedStyle(t).opacity).toFixed(1) : '-'} labels=${vis} canvas=${!!document.querySelector('.v04 canvas')} ready=${r.dataset.ready}`
    }).catch(() => 'nav')
    if (s !== last) console.log(run, Date.now() - t0, s)
    last = s
    if (s.includes('ready=1')) break
    await page.waitForTimeout(50)
  }
  await page.close()
}
await browser.close()

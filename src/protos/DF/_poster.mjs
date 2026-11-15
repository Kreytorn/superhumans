// Dev-only: render the figure at rest (fully revealed, organs lit, no sway, no beat) into a 2x canvas the size of the
// 1440x900 home's figure box (616 x 900 css px) and save it as a PNG. node src/protos/DF/_poster.mjs <out.png> [--d3d]
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'
const out = process.argv[2]
const args = ['--hide-scrollbars', '--force-device-scale-factor=1']
if (process.argv.includes('--d3d')) args.push('--use-angle=d3d11')
const browser = await chromium.launch({ channel: 'msedge', headless: true, args })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5660/#/proto/none', { waitUntil: 'load' })
const url = await page.evaluate(async () => {
  const F = await import('/src/protos/DF/figure.ts')
  // the 1440x900 home: top 63, bottom 833, figure centre x 1005, box from x 697, 616 wide, 900 tall
  const cv = document.createElement('canvas')
  const fig = F.initFigure(cv)
  fig.resize(1232, 1800, 616, 697, 2)
  const cam = F.fitCam(1005, 63, 833)
  for (let i = 0; i < 2000; i++) {
    await new Promise((r) => requestAnimationFrame(r))
    if (fig.draw(F.settled(0, false), cam)) return cv.toDataURL('image/png')
  }
  return ''
})
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'))
console.log('saved', out, url.length)
await browser.close()
